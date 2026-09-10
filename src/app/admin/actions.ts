"use server";

import { createClient as createServiceClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { headers } from "next/headers";
import { logAdminAction } from "@/lib/supabase/audit";
import { addPersonalNotices } from "./data";
import { sendSurveyPublishedEmail } from "@/lib/notifications";

function generateTempPassword(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  let out = "";
  for (let i = 0; i < 10; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

async function requireAdminContext() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ctx: null, error: "Non autenticato." };

  const { data: myProfile } = await supabase.from("profiles").select("role").eq("auth_user_id", user.id).maybeSingle();
  if (myProfile?.role !== "admin") return { ctx: null, error: "Solo l'admin può eseguire questa operazione." };

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) return { ctx: null, error: "Chiave di servizio non configurata (SUPABASE_SERVICE_ROLE_KEY)." };

  const adminClient = createServiceClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey);
  return { ctx: { supabase, adminClient }, error: undefined as string | undefined };
}

type AdminCtx = NonNullable<Awaited<ReturnType<typeof requireAdminContext>>["ctx"]>;

async function getClientAuthUser(ctx: AdminCtx, clientId: string) {
  const { data: client } = await ctx.supabase.from("profiles").select("auth_user_id").eq("id", clientId).maybeSingle();
  if (!client?.auth_user_id) return { error: "Questo cliente non ha un account di accesso." };

  const { data, error } = await ctx.adminClient.auth.admin.getUserById(client.auth_user_id);
  if (error || !data?.user) return { error: error?.message || "Utente non trovato." };
  return { user: data.user };
}

async function getOrigin(): Promise<string | undefined> {
  const hdrs = await headers();
  const host = hdrs.get("host");
  const proto = hdrs.get("x-forwarded-proto") || "https";
  return host ? `${proto}://${host}` : undefined;
}

export async function adminResetClientPassword(clientId: string): Promise<{ ok: boolean; password?: string; error?: string }> {
  const { ctx, error } = await requireAdminContext();
  if (!ctx) return { ok: false, error };

  const found = await getClientAuthUser(ctx, clientId);
  if ("error" in found) return { ok: false, error: found.error };

  const password = generateTempPassword();
  const { error: updErr } = await ctx.adminClient.auth.admin.updateUserById(found.user.id, { password });
  if (updErr) return { ok: false, error: updErr.message };

  await logAdminAction(
    ctx.supabase,
    "admin_reset_client_password",
    "profiles",
    clientId,
    `Password reimpostata dall'admin per ${found.user.email ?? "cliente"}.`
  );

  return { ok: true, password };
}

export async function adminGetClientAuthStatus(
  clientId: string
): Promise<{ ok: boolean; email?: string; emailConfirmed?: boolean; error?: string }> {
  const { ctx, error } = await requireAdminContext();
  if (!ctx) return { ok: false, error };

  const found = await getClientAuthUser(ctx, clientId);
  if ("error" in found) return { ok: false, error: found.error };

  return { ok: true, email: found.user.email ?? undefined, emailConfirmed: !!found.user.email_confirmed_at };
}

export async function adminResendActivationEmail(clientId: string): Promise<{ ok: boolean; error?: string }> {
  const { ctx, error } = await requireAdminContext();
  if (!ctx) return { ok: false, error };

  const found = await getClientAuthUser(ctx, clientId);
  if ("error" in found) return { ok: false, error: found.error };
  if (!found.user.email) return { ok: false, error: "Questo account non ha un indirizzo email." };
  if (found.user.email_confirmed_at) return { ok: false, error: "L'email di questo cliente è già verificata." };

  const { error: resendErr } = await ctx.supabase.auth.resend({ type: "signup", email: found.user.email });
  if (resendErr) return { ok: false, error: resendErr.message };

  await logAdminAction(
    ctx.supabase,
    "admin_resend_activation_email",
    "profiles",
    clientId,
    `Email di attivazione reinviata dall'admin a ${found.user.email}.`
  );

  return { ok: true };
}

export async function adminResendPasswordReset(clientId: string): Promise<{ ok: boolean; error?: string }> {
  const { ctx, error } = await requireAdminContext();
  if (!ctx) return { ok: false, error };

  const found = await getClientAuthUser(ctx, clientId);
  if ("error" in found) return { ok: false, error: found.error };
  if (!found.user.email) return { ok: false, error: "Questo account non ha un indirizzo email." };

  const origin = await getOrigin();
  const { error: resetErr } = await ctx.supabase.auth.resetPasswordForEmail(found.user.email, {
    redirectTo: origin ? `${origin}/reset-password` : undefined,
  });
  if (resetErr) return { ok: false, error: resetErr.message };

  await logAdminAction(
    ctx.supabase,
    "admin_resend_password_reset",
    "profiles",
    clientId,
    `Email di reset password reinviata dall'admin a ${found.user.email}.`
  );

  return { ok: true };
}

// Notifica opzionale (email e/o avviso in-sito) inviata a tutti i clienti
// attivi quando l'admin pubblica un sondaggio. Le email vanno lette dal
// client service-role perché l'indirizzo vive in auth.users, non in
// profiles (stesso motivo per cui il cron dei promemoria lezione usa
// adminClient.auth.admin.getUserById per ogni destinatario).
export async function notifySurveyPublished(
  surveyId: string,
  surveySlug: string,
  surveyTitle: string,
  opts: { sendEmail: boolean; sendSiteNotice: boolean }
): Promise<{ ok: boolean; emailsSent?: number; noticesSent?: number; error?: string }> {
  const { ctx, error } = await requireAdminContext();
  if (!ctx) return { ok: false, error };
  if (!opts.sendEmail && !opts.sendSiteNotice) return { ok: true, emailsSent: 0, noticesSent: 0 };

  const { data: clientProfiles, error: clientsErr } = await ctx.supabase
    .from("profiles")
    .select("id, auth_user_id, full_name")
    .eq("role", "client")
    .eq("disabled", false);
  if (clientsErr) return { ok: false, error: clientsErr.message };

  const origin = await getOrigin();
  const linkPath = `/sondaggi/${surveySlug}`;
  const surveyUrl = `${origin || "https://ima-yoga.vercel.app"}${linkPath}`;

  let emailsSent = 0;
  let noticesSent = 0;

  if (opts.sendSiteNotice && clientProfiles && clientProfiles.length > 0) {
    const clientIds = clientProfiles.map((c) => c.id);
    await addPersonalNotices(ctx.supabase, clientIds, `Nuovo sondaggio disponibile: «${surveyTitle}». Tocca qui per rispondere.`, {
      kind: "survey_published",
      linkPath,
    });
    noticesSent = clientIds.length;
  }

  if (opts.sendEmail && clientProfiles) {
    for (const profile of clientProfiles) {
      if (!profile.auth_user_id) continue;
      const { data: userData } = await ctx.adminClient.auth.admin.getUserById(profile.auth_user_id);
      const email = userData?.user?.email;
      if (!email) continue;
      const ok = await sendSurveyPublishedEmail({ to: email, fullName: profile.full_name || "", surveyTitle, surveyUrl });
      if (ok) emailsSent++;
    }
  }

  await logAdminAction(
    ctx.supabase,
    "notify_survey_published",
    "surveys",
    surveyId,
    `Notifica pubblicazione sondaggio "${surveyTitle}" — email: ${emailsSent}, avvisi: ${noticesSent}.`
  );

  return { ok: true, emailsSent, noticesSent };
}
