import type { SupabaseClient } from "@supabase/supabase-js";
import { sendClassReminderEmail } from "@/lib/notifications";
import { INDIVIDUAL_LESSON_TITLE } from "@/lib/classTitle";
import { sendPush } from "@/lib/push";

const ROME_DATE = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Rome" }); // yyyy-mm-dd
const ROME_TIME = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Europe/Rome",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
}); // HH:mm

// Logica condivisa tra i due cron di promemoria lezione (vedi vercel.json:
// uno alle 18:00 per le lezioni di domani, uno alle 11:00 per chi si
// iscrive lo stesso giorno) e il pulsante "Esegui ora" in admin — query e
// invio sono identici, cambia solo la finestra di date e il job_name con
// cui l'esito finisce in cron_job_logs. reminder_sent_at su bookings evita
// i doppi invii sia tra le due schedule sia per i rilanci manuali.
export async function runClassRemindersJob(
  adminClient: SupabaseClient,
  opts: { jobName: string; onlyToday?: boolean }
): Promise<{ ok: boolean; sent: number; skipped: number; error?: string }> {
  const startedAt = new Date();
  try {
    const now = new Date();
    const todayDate = ROME_DATE.format(now);
    const nowLocalTime = ROME_TIME.format(now);
    const [y, m, d] = todayDate.split("-").map(Number);
    const tomorrowDate = ROME_DATE.format(new Date(Date.UTC(y, m - 1, d + 1)));
    const untilDate = opts.onlyToday ? todayDate : tomorrowDate;

    const { data: bookings, error } = await adminClient
      .from("bookings")
      .select(
        "id, client_id, profiles(full_name, auth_user_id), classes!inner(class_date, class_time, is_individual, class_types(name))"
      )
      .eq("status", "booked")
      .is("reminder_sent_at", null)
      .gte("classes.class_date", todayDate)
      .lte("classes.class_date", untilDate);

    if (error) throw new Error(error.message);

    let sent = 0;
    let skipped = 0;

    for (const booking of bookings ?? []) {
      const profile = Array.isArray(booking.profiles) ? booking.profiles[0] : booking.profiles;
      const cls = Array.isArray(booking.classes) ? booking.classes[0] : booking.classes;
      const classType = cls ? (Array.isArray(cls.class_types) ? cls.class_types[0] : cls.class_types) : null;

      // Le lezioni individuali non hanno tipologia: nel testo diventano "la lezione individuale".
      const className = cls?.is_individual ? `la ${INDIVIDUAL_LESSON_TITLE.toLowerCase()}` : classType?.name;

      if (!profile?.auth_user_id || !cls || !className) {
        skipped++;
        continue;
      }

      const isToday = cls.class_date === todayDate;
      // Lezione di oggi già iniziata: il promemoria non serve più, e non va
      // considerato un mancato invio da recuperare al prossimo giro.
      if (isToday && cls.class_time.slice(0, 5) <= nowLocalTime) {
        skipped++;
        continue;
      }

      const { data: userData } = await adminClient.auth.admin.getUserById(profile.auth_user_id);
      const email = userData?.user?.email;
      if (!email) {
        skipped++;
        continue;
      }

      const firstName = (profile.full_name || "").trim().split(/\s+/)[0] || "";
      const ok = await sendClassReminderEmail({
        to: email,
        firstName,
        className,
        date: cls.class_date,
        time: cls.class_time.slice(0, 5),
        isToday,
      });

      if (ok) {
        await adminClient.from("bookings").update({ reminder_sent_at: new Date().toISOString() }).eq("id", booking.id);
        sent++;
      } else {
        skipped++;
      }
    }

    console.log(`[${opts.jobName}] today=${todayDate} until=${untilDate} sent=${sent} skipped=${skipped}`);
    await adminClient.from("cron_job_logs").insert({
      job_name: opts.jobName,
      status: "ok",
      started_at: startedAt.toISOString(),
      sent,
      skipped,
      details: { today: todayDate, until: untilDate, onlyToday: !!opts.onlyToday },
    });

    return { ok: true, sent, skipped };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[${opts.jobName}]`, message);
    await adminClient.from("cron_job_logs").insert({
      job_name: opts.jobName,
      status: "error",
      started_at: startedAt.toISOString(),
      error: message,
    });
    return { ok: false, sent: 0, skipped: 0, error: message };
  }
}

// Promemoria per l'admin, non per le clienti: un push con le lezioni di
// domani (orario, tipologia, iscritti). Parte solo dal cron serale — non dal
// pulsante "Esegui ora" né dal giro del mattino — così arriva una volta al
// giorno. Senza lezioni domani non manda nulla.
export async function sendTomorrowClassesPush(adminClient: SupabaseClient): Promise<{ classes: number; sent: number; error?: string }> {
  const [y, m, d] = ROME_DATE.format(new Date()).split("-").map(Number);
  const tomorrowDate = ROME_DATE.format(new Date(Date.UTC(y, m - 1, d + 1)));

  const { data, error } = await adminClient
    .from("classes")
    .select("class_time, capacity, is_individual, class_types(name), bookings(status, profiles(full_name))")
    .eq("class_date", tomorrowDate)
    .order("class_time");
  if (error) return { classes: 0, sent: 0, error: error.message };

  const lines: string[] = [];
  for (const cls of data ?? []) {
    const bookings = cls.bookings ?? [];
    const booked = bookings.filter((b) => b.status === "booked");
    const waitlist = bookings.length - booked.length;
    const time = cls.class_time.slice(0, 5);

    if (cls.is_individual) {
      // Uno slot individuale senza prenotazione è solo una disponibilità, non una lezione.
      if (booked.length === 0) continue;
      const profile = Array.isArray(booked[0].profiles) ? booked[0].profiles[0] : booked[0].profiles;
      lines.push(`${time} ${INDIVIDUAL_LESSON_TITLE}${profile?.full_name ? ` · ${profile.full_name}` : ""}`);
      continue;
    }

    const classType = Array.isArray(cls.class_types) ? cls.class_types[0] : cls.class_types;
    const count = cls.capacity > 0 ? `${booked.length}/${cls.capacity}` : `${booked.length}`;
    lines.push(`${time} ${classType?.name || "Classe"} · ${count} iscritti${waitlist > 0 ? ` (+${waitlist} in attesa)` : ""}`);
  }

  if (lines.length === 0) return { classes: 0, sent: 0 };

  const result = await sendPush(adminClient, {
    title: lines.length === 1 ? "Domani: 1 lezione" : `Domani: ${lines.length} lezioni`,
    body: lines.join("\n"),
    url: "/admin/calendario",
    tag: `tomorrow-classes-${tomorrowDate}`,
  });
  return { classes: lines.length, sent: result.sent, error: result.error };
}
