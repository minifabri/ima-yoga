import { redirect } from "next/navigation";
import { getCurrentUserAndProfile } from "@/lib/supabase/profile";
import { AreaApp } from "./AreaApp";

export default async function AreaPage() {
  const { user, profile } = await getCurrentUserAndProfile();

  if (!user) redirect("/login");
  if (profile?.role === "admin") redirect("/admin");

  return <AreaApp fullName={profile?.full_name || "!"} />;
}
