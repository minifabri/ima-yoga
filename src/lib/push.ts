import type { SupabaseClient } from "@supabase/supabase-js";
import webpush from "web-push";

export type PushPayload = { title: string; body: string; url: string; tag?: string };

type SubscriptionRow = { id: string; endpoint: string; p256dh: string; auth: string };

// Pagina dell'admin da aprire al tap, per tipo di notifica (vedi
// NotificationType in src/app/admin/types.ts). I tipi non elencati aprono la home.
const URL_BY_TYPE: Record<string, string> = {
  registration: "/admin/clienti",
  enrollment: "/admin/calendario",
  cancellation: "/admin/calendario",
  survey_response: "/admin/sondaggi",
  individual_class_request: "/admin/lezioni-individuali",
};

export function pushUrlForType(type: string): string {
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

// Manda il push a tutti i dispositivi registrati (o a uno solo, per la prova
// da Impostazioni). Le sottoscrizioni scadute — app rimossa dalla Home,
// permesso revocato — rispondono 404/410 e vengono cancellate.
export async function sendPush(
  adminClient: SupabaseClient,
  payload: PushPayload,
  onlyEndpoint?: string
): Promise<{ sent: number; failed: number; error?: string }> {
  if (!configure()) return { sent: 0, failed: 0, error: "Chiavi VAPID non configurate." };

  let query = adminClient.from("push_subscriptions").select("id, endpoint, p256dh, auth");
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
