import { createClient as createServiceClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { sendClassReminderEmail } from "@/lib/notifications";

export const dynamic = "force-dynamic";

const JOB_NAME = "class-reminders";

const ROME_DATE = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Rome" }); // yyyy-mm-dd
const ROME_TIME = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Europe/Rome",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
}); // HH:mm

// Gira una volta al giorno (vedi vercel.json, 16:00 UTC = 17:00 CET / 18:00
// CEST, mai prima delle 17 locali) e manda il promemoria a chi ha una
// prenotazione confermata (non in lista d'attesa) e un account con email,
// per le lezioni di domani. Include anche le lezioni di oggi non ancora
// iniziate: è un recupero per il caso in cui l'esecuzione di ieri sia
// saltata o fallita (è già successo: redeploy proprio nella finestra del
// cron), così il promemoria arriva comunque invece di perdersi in
// silenzio — reminder_sent_at su bookings evita i doppi invii sia per i
// rilanci sia per questo recupero.
export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Non autorizzato." }, { status: 401 });
    }
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    return NextResponse.json({ error: "SUPABASE_SERVICE_ROLE_KEY non configurata." }, { status: 500 });
  }
  const adminClient = createServiceClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey);
  const startedAt = new Date();

  // L'esito va anche su cron_job_logs (tabella admin-only), non solo nei
  // log di Vercel: quelli scadono in pochi giorni, troppo poco per capire
  // cosa è successo quando qualcuno segnala un promemoria mancato solo il
  // giorno dopo.
  try {
    const now = new Date();
    const todayDate = ROME_DATE.format(now);
    const nowLocalTime = ROME_TIME.format(now);
    const [y, m, d] = todayDate.split("-").map(Number);
    const tomorrowDate = ROME_DATE.format(new Date(Date.UTC(y, m - 1, d + 1)));

    const { data: bookings, error } = await adminClient
      .from("bookings")
      .select(
        "id, client_id, profiles(full_name, auth_user_id), classes!inner(class_date, class_time, class_types(name))"
      )
      .eq("status", "booked")
      .is("reminder_sent_at", null)
      .gte("classes.class_date", todayDate)
      .lte("classes.class_date", tomorrowDate);

    if (error) throw new Error(error.message);

    let sent = 0;
    let skipped = 0;

    for (const booking of bookings ?? []) {
      const profile = Array.isArray(booking.profiles) ? booking.profiles[0] : booking.profiles;
      const cls = Array.isArray(booking.classes) ? booking.classes[0] : booking.classes;
      const classType = cls ? (Array.isArray(cls.class_types) ? cls.class_types[0] : cls.class_types) : null;

      if (!profile?.auth_user_id || !cls || !classType?.name) {
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
        className: classType.name,
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

    console.log(`[cron/class-reminders] today=${todayDate} tomorrow=${tomorrowDate} sent=${sent} skipped=${skipped}`);
    await adminClient.from("cron_job_logs").insert({
      job_name: JOB_NAME,
      status: "ok",
      started_at: startedAt.toISOString(),
      sent,
      skipped,
      details: { today: todayDate, tomorrow: tomorrowDate },
    });

    return NextResponse.json({ today: todayDate, tomorrow: tomorrowDate, sent, skipped });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[cron/class-reminders]", message);
    await adminClient.from("cron_job_logs").insert({
      job_name: JOB_NAME,
      status: "error",
      started_at: startedAt.toISOString(),
      error: message,
    });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
