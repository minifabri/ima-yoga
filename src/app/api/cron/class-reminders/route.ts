import { createClient as createServiceClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { runClassRemindersJob } from "@/lib/classRemindersJob";

export const dynamic = "force-dynamic";

// Due schedule su questo stesso endpoint (vedi vercel.json):
// - default (18:00 CEST/17:00 CET): lezioni di domani, più oggi come
//   recupero se il giro di ieri è saltato o fallito.
// - ?window=same-day (11:00 CEST/10:00 CET): solo lezioni di oggi, per chi
//   si iscrive dopo il giro serale di ieri — non deve toccare le lezioni di
//   domani, che restano compito del giro delle 18:00.
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

  const onlyToday = new URL(request.url).searchParams.get("window") === "same-day";
  const jobName = onlyToday ? "class-reminders-same-day" : "class-reminders";

  const result = await runClassRemindersJob(adminClient, { jobName, onlyToday });
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }
  return NextResponse.json({ sent: result.sent, skipped: result.skipped });
}
