import { redirect } from "next/navigation";
import { getCurrentUserAndProfile } from "@/lib/supabase/profile";

export default async function CalendarioPubblicoPage() {
  const { user, profile } = await getCurrentUserAndProfile();

  if (!user) redirect("/login?next=/calendario");

  redirect(profile?.role === "admin" ? "/admin/calendario" : "/area/calendario");
}
