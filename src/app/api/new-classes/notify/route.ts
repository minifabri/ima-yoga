import { createClient as createServiceClient } from "@supabase/supabase-js";
import { after, NextResponse } from "next/server";
import { sendNewClassesEmail } from "@/lib/notifications";
import { unsubscribeUrl } from "@/lib/unsubscribe";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Resend accetta poche richieste al secondo: tra un'email e l'altra si aspetta
// un po', tanto il lavoro gira dopo aver risposto (vedi after più sotto).
const SEND_GAP_MS = 600;

// Chiamata dal database (via pg_net, dentro announce_new_classes) quando parte
// l'avviso riepilogativo delle nuove classi: l'avviso in-app e il push li fa
// già il database, qui si mandano solo le email, e solo a chi ha acconsentito
// alle email non transazionali (profiles.marketing_emails).
// Stesso segreto del webhook dei push (vedi app/api/push/notify).
export async function POST(request: Request) {
  const secret = process.env.PUSH_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "PUSH_WEBHOOK_SECRET non configurata." }, { status: 503 });
  }
  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Non autorizzato." }, { status: 401 });
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    return NextResponse.json({ error: "SUPABASE_SERVICE_ROLE_KEY non configurata." }, { status: 500 });
  }

  const body = (await request.json().catch(() => null)) as { class_ids?: string[] } | null;
  const classIds = body?.class_ids?.filter((id) => typeof id === "string") ?? [];
  if (classIds.length === 0) {
    return NextResponse.json({ error: "Payload non valido." }, { status: 400 });
  }

  const adminClient = createServiceClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey);
  const origin = process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin;

  // pg_net chiude la connessione dopo pochi secondi: si risponde subito e le
  // email partono dopo.
  after(async () => {
    const { data: classRows, error: classesErr } = await adminClient
      .from("classes")
      .select("class_date, class_time, class_types(name)")
      .in("id", classIds)
      .eq("published", true)
      .order("class_date")
      .order("class_time");
    if (classesErr || !classRows?.length) {
      if (classesErr) console.error("[new-classes] classi:", classesErr.message);
      return;
    }
    const classes = classRows.map((c) => {
      const type = Array.isArray(c.class_types) ? c.class_types[0] : c.class_types;
      return { date: c.class_date, time: String(c.class_time).slice(0, 5), name: type?.name || "Classe" };
    });

    const { data: profiles, error: profilesErr } = await adminClient
      .from("profiles")
      .select("id, auth_user_id, full_name")
      .eq("role", "client")
      .eq("disabled", false)
      .eq("marketing_emails", true)
      .not("auth_user_id", "is", null);
    if (profilesErr) {
      console.error("[new-classes] clienti:", profilesErr.message);
      return;
    }

    let sent = 0;
    let attempted = 0;
    for (const profile of profiles ?? []) {
      const { data: userData } = await adminClient.auth.admin.getUserById(profile.auth_user_id!);
      const email = userData?.user?.email;
      if (!email) continue;
      if (attempted++ > 0) await new Promise((r) => setTimeout(r, SEND_GAP_MS));
      const ok = await sendNewClassesEmail({
        to: email,
        fullName: profile.full_name || "",
        classes,
        calendarUrl: `${origin}/area/calendario`,
        unsubscribeUrl: unsubscribeUrl(origin, profile.id),
      });
      if (ok) sent++;
    }

    await adminClient.rpc("log_work", {
      p_action: "notify_new_classes_email",
      p_table: "classes",
      p_entity_id: null,
      p_description: `Email nuove classi (${classes.length}) inviate: ${sent} su ${profiles?.length ?? 0} clienti con consenso.`,
    });
  });

  return NextResponse.json({ queued: classIds.length }, { status: 202 });
}
