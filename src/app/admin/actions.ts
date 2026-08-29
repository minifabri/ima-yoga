"use server";

import { createClient as createServiceClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

function generateTempPassword(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  let out = "";
  for (let i = 0; i < 10; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

export async function adminResetClientPassword(clientId: string): Promise<{ ok: boolean; password?: string; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Non autenticato." };

  const { data: myProfile } = await supabase.from("profiles").select("role").eq("auth_user_id", user.id).maybeSingle();
  if (myProfile?.role !== "admin") return { ok: false, error: "Solo l'admin può resettare le password." };

  const { data: client } = await supabase.from("profiles").select("auth_user_id").eq("id", clientId).maybeSingle();
  if (!client?.auth_user_id) return { ok: false, error: "Questo cliente non ha un account di accesso." };

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) return { ok: false, error: "Chiave di servizio non configurata (SUPABASE_SERVICE_ROLE_KEY)." };

  const adminClient = createServiceClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey);
  const password = generateTempPassword();
  const { error } = await adminClient.auth.admin.updateUserById(client.auth_user_id, { password });
  if (error) return { ok: false, error: error.message };

  return { ok: true, password };
}
