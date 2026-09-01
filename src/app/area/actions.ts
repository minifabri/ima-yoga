"use server";

import { redirect } from "next/navigation";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

const DELETE_CONFIRM_WORD = "NAMASTE";

export type DeleteAccountState = { error: string | null };

export async function deleteOwnAccount(_prevState: DeleteAccountState, formData: FormData): Promise<DeleteAccountState> {
  const confirmWord = String(formData.get("confirm") || "").trim().toUpperCase();
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
