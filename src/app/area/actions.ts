"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { sendPush, storePushSubscription, type PushSubscriptionInput } from "@/lib/push";

const DELETE_CONFIRM_WORD = "UTTHITA HASTA PADANGUSTHASANA";

export type DeleteAccountState = { error: string | null };

export async function deleteOwnAccount(_prevState: DeleteAccountState, formData: FormData): Promise<DeleteAccountState> {
  const confirmWord = String(formData.get("confirm") || "").trim();
  if (confirmWord !== DELETE_CONFIRM_WORD) {
    return { error: `Scrivi "${DELETE_CONFIRM_WORD}" per confermare.` };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Non autenticato." };

  const { error: rpcError } = await supabase.rpc("self_delete_account");
  if (rpcError) return { error: rpcError.message };

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (serviceKey) {
    const adminClient = createServiceClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey);
    await adminClient.auth.admin.deleteUser(user.id);
  }

  await supabase.auth.signOut();
  redirect("/login?account_deleted=1");
}

// ---------------------------------------------------------
// Consensi (età, email su eventi/sondaggi, dati sulla salute) — vedi la
// funzione set_my_consents nel database, che aggiorna solo il proprio profilo.
// ---------------------------------------------------------
export async function confirmMyAge() {
  const supabase = await createClient();
  await supabase.rpc("set_my_consents", { p_age_confirmed: true });
  revalidatePath("/area", "layout");
}

export async function updateMyConsents(consents: {
  marketingEmails: boolean;
  healthConsent: boolean;
}): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_my_consents", {
    p_marketing_emails: consents.marketingEmails,
    p_health_consent: consents.healthConsent,
  });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/area", "layout");
  return { ok: true };
}

// Risposta alla domanda «Vuoi ricevere email…?» in area (EmailConsentPrompt).
export async function setMyMarketingEmails(value: boolean): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_my_consents", { p_marketing_emails: value });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/area", "layout");
  return { ok: true };
}

// ---------------------------------------------------------
// Notifiche push della cliente (vedi admin/PushSettings.tsx e src/lib/push.ts)
// ---------------------------------------------------------
// push_subscriptions non ha policy RLS per le clienti: si scrive con la chiave
// di servizio, sempre e solo sulle righe dell'utente loggato.
async function requireUserContext() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ctx: null, error: "Non autenticato." };

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) return { ctx: null, error: "Notifiche non ancora configurate sul server." };

  const adminClient = createServiceClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey);
  return { ctx: { user, adminClient }, error: undefined as string | undefined };
}

export async function saveMyPushSubscription(
  subscription: PushSubscriptionInput,
  userAgent: string
): Promise<{ ok: boolean; error?: string }> {
  const { ctx, error } = await requireUserContext();
  if (!ctx) return { ok: false, error };

  return storePushSubscription(ctx.adminClient, subscription, ctx.user.id, userAgent);
}

export async function removeMyPushSubscription(endpoint: string): Promise<{ ok: boolean; error?: string }> {
  const { ctx, error } = await requireUserContext();
  if (!ctx) return { ok: false, error };

  const { error: deleteError } = await ctx.adminClient
    .from("push_subscriptions")
    .delete()
    .eq("endpoint", endpoint)
    .eq("auth_user_id", ctx.user.id);
  if (deleteError) return { ok: false, error: deleteError.message };
  return { ok: true };
}

export async function sendMyTestPush(endpoint: string): Promise<{ ok: boolean; error?: string }> {
  const { ctx, error } = await requireUserContext();
  if (!ctx) return { ok: false, error };

  const result = await sendPush(
    ctx.adminClient,
    { title: "ima yoga", body: "Le notifiche su questo dispositivo funzionano.", url: "/area", tag: "push-test" },
    { authUserId: ctx.user.id },
    endpoint
  );
  if (result.error) return { ok: false, error: result.error };
  if (result.sent === 0) return { ok: false, error: "Invio non riuscito: prova a disattivare e riattivare le notifiche." };
  return { ok: true };
}
