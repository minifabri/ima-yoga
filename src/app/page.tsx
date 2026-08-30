import { redirect } from "next/navigation";
import { getCurrentUserAndProfile } from "@/lib/supabase/profile";

export default async function HomePage() {
  const { user, profile } = await getCurrentUserAndProfile();

  if (user && profile?.role === "admin") redirect("/admin");
  if (user && profile?.role === "client") redirect("/area");

  redirect("/login");
}
