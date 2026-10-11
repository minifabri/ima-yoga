import type { SupabaseClient } from "@supabase/supabase-js";
import webpush from "web-push";

export type PushPayload = { title: string; body: string; url: string; tag?: string };

// A chi va il push: ai dispositivi dell'admin oppure a quelli di una sola
// cliente. La tabella push_subscriptions è unica, quindi ogni invio va sempre
// filtrato sul proprietario: senza, gli avvisi del gestionale ("X si è
// iscritta…") arriverebbero anche sui telefoni delle clienti.
export type PushAudience = { admins: true } | { authUserId: string };

export type PushSubscriptionInput = { endpoint?: string; keys?: { p256dh?: string; auth?: string } };

type SubscriptionRow = { id: string; endpoint: string; p256dh: string; auth: string };

// Pagina dell'admin da aprire al tap, per tipo di notifica (vedi
// NotificationType in src/app/admin/types.ts). I tipi non elencati aprono la home.
const URL_BY_TYPE: Record<string, string> = {
  registration: "/admin/clienti",
  enrollment: "/admin/calendario",
  cancellation: "/admin/calendario",
  class_full: "/admin/calendario",
  survey_response: "/admin/sondaggi",
  individual_class_request: "/admin/lezioni-individuali",
};

// Prenotazioni e disdette degli eventi condividono il tipo con quelle delle
// classi ("enrollment"/"cancellation"): a distinguerle è la tabella di origine.
export function pushUrlFor(type: string, entityTable?: string | null): string {
  if (entityTable === "event_bookings") return "/admin/eventi";
  return URL_BY_TYPE[type] ?? "/admin";
}

function configure(): boolean {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) return false;
  // Il "subject" è il contatto che Apple/Google usano se l'invio dà problemi:
  // deve essere un mailto: o un URL https valido, altrimenti Apple rifiuta il push.
  const subject = process.env.ADMIN_NOTIFICATION_EMAIL
    ? `mailto:${process.env.ADMIN_NOTIFICATION_EMAIL}`
    : process.env.NEXT_PUBLIC_SITE_URL || "https://ima-yoga.vercel.app";
  webpush.setVapidDetails(subject, publicKey, privateKey);
  return true;
}

async function audienceUserIds(adminClient: SupabaseClient, audience: PushAudience): Promise<string[]> {
  if ("authUserId" in audience) return [audience.authUserId];
  const { data } = await adminClient.from("profiles").select("auth_user_id").eq("role", "admin").not("auth_user_id", "is", null);
  return (data ?? []).map((row) => row.auth_user_id as string);
}

// Salva (o riassegna) la sottoscrizione del dispositivo all'utente loggato.
// L'endpoint è unico per browser/app installata: se sullo stesso dispositivo
// entra un altro account, la riga passa a lui.
export async function storePushSubscription(
  adminClient: SupabaseClient,
  subscription: PushSubscriptionInput,
  authUserId: string,
  userAgent: string
): Promise<{ ok: boolean; error?: string }> {
  const endpoint = subscription.endpoint;
  const p256dh = subscription.keys?.p256dh;
  const auth = subscription.keys?.auth;
  if (!endpoint || !p256dh || !auth) return { ok: false, error: "Sottoscrizione non valida." };

  const { error } = await adminClient
    .from("push_subscriptions")
    .upsert({ endpoint, p256dh, auth, auth_user_id: authUserId, user_agent: userAgent.slice(0, 300) }, { onConflict: "endpoint" });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

// Manda il push a tutti i dispositivi del destinatario (o a uno solo, per la
// prova). Le sottoscrizioni scadute — app rimossa dalla Home, permesso
// revocato — rispondono 404/410 e vengono cancellate.
export async function sendPush(
  adminClient: SupabaseClient,
  payload: PushPayload,
  audience: PushAudience,
  onlyEndpoint?: string
): Promise<{ sent: number; failed: number; error?: string }> {
  if (!configure()) return { sent: 0, failed: 0, error: "Chiavi VAPID non configurate." };

  const userIds = await audienceUserIds(adminClient, audience);
  if (userIds.length === 0) return { sent: 0, failed: 0 };

  let query = adminClient.from("push_subscriptions").select("id, endpoint, p256dh, auth").in("auth_user_id", userIds);
  if (onlyEndpoint) query = query.eq("endpoint", onlyEndpoint);
  const { data, error } = await query;
  if (error) return { sent: 0, failed: 0, error: error.message };

  const rows = (data ?? []) as SubscriptionRow[];
  const body = JSON.stringify(payload);
  const expired: string[] = [];
  let sent = 0;
  let failed = 0;

  await Promise.all(
    rows.map(async (row) => {
      try {
        await webpush.sendNotification({ endpoint: row.endpoint, keys: { p256dh: row.p256dh, auth: row.auth } }, body, {
          TTL: 60 * 60 * 24,
        });
        sent++;
      } catch (err) {
        failed++;
        const status = (err as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) expired.push(row.id);
      }
    })
  );

  if (expired.length) await adminClient.from("push_subscriptions").delete().in("id", expired);
  return { sent, failed };
}
