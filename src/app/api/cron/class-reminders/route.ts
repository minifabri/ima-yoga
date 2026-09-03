import { createClient as createServiceClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { sendClassReminderEmail } from "@/lib/notifications";

export const dynamic = "force-dynamic";

// Gira una volta al giorno (vedi vercel.json, 16:00 UTC = 17:00 CET / 18:00
// CEST, mai prima delle 17 locali) e manda il promemoria per le lezioni di
// domani a chi ha una prenotazione confermata (non in lista d'attesa) e un
// account con email. reminder_sent_at su bookings evita i doppi invii se il
// cron viene rilanciato.
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

  const tomorrow = new Date();
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  const tomorrowDate = tomorrow.toISOString().slice(0, 10);

  const { data: bookings, error } = await adminClient
    .from("bookings")
    .select(
      "id, client_id, profiles(full_name, auth_user_id), classes!inner(class_date, class_time, class_types(name))"
    )
    .eq("status", "booked")
    .is("reminder_sent_at", null)
    .eq("classes.class_date", tomorrowDate);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

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
    });

    if (ok) {
      await adminClient.from("bookings").update({ reminder_sent_at: new Date().toISOString() }).eq("id", booking.id);
      sent++;
    } else {
      skipped++;
    }
  }

  return NextResponse.json({ date: tomorrowDate, sent, skipped });
}
