"use server";

import { createClient as createServiceClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { headers } from "next/headers";

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

  return { ok: true };
}
