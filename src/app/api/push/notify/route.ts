import { createClient as createServiceClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { pushUrlFor, sendPush } from "@/lib/push";

export const dynamic = "force-dynamic";

// Chiamata dal database (trigger su public.notifications, via pg_net) a ogni
// nuova notifica admin: la inoltra come push ai dispositivi registrati.
// A differenza del cron, qui il segreto è obbligatorio: senza, chiunque
// conosca l'URL potrebbe far comparire notifiche a piacere sul telefono dell'admin.
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

  const body = (await request.json().catch(() => null)) as {
    id?: string;
    type?: string;
    title?: string;
    message?: string;
    entity_table?: string | null;
  } | null;
  if (!body?.title) {
    return NextResponse.json({ error: "Payload non valido." }, { status: 400 });
  }

  const adminClient = createServiceClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey);
  const result = await sendPush(adminClient, {
    title: body.title,
    body: body.message ?? "",
    url: pushUrlFor(body.type ?? "", body.entity_table),
    tag: body.id,
  });
  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }
  return NextResponse.json({ sent: result.sent, failed: result.failed });
}
