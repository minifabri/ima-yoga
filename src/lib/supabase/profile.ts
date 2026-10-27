import { createClient } from "@/lib/supabase/server";

export type Profile = {
  id: string;
  auth_user_id: string | null;
  role: "admin" | "client";
  full_name: string;
  phone: string | null;
  notes: string | null;
  disabled: boolean;
  created_at: string;
  age_confirmed_at: string | null;
  marketing_emails: boolean;
  marketing_emails_updated_at: string | null;
  health_consent_at: string | null;
};

export async function getCurrentUserAndProfile() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { user: null, profile: null };

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("auth_user_id", user.id)
    .maybeSingle<Profile>();

  return { user, profile };
}
