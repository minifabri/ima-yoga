import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUserAndProfile } from "@/lib/supabase/profile";
import { ThemeToggle } from "./admin/ThemeToggle";
import { Deck } from "./cover/Deck";

export default async function HomePage() {
  const { user, profile } = await getCurrentUserAndProfile();

  if (user && profile?.role === "admin") redirect("/admin");
  if (user && profile?.role === "client") redirect("/area");

  return (
    <main className="flex-1 flex flex-col" style={{ background: "var(--bg)" }}>
      <header className="flex items-center justify-between px-5 pt-6">
        <div style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 500, color: "var(--heading)" }}>
          ima yoga
        </div>
        <div className="flex items-center gap-3">
          <Link href="/login" className="text-sm font-medium" style={{ color: "var(--ink-soft)" }}>
            Accedi
          </Link>
          <ThemeToggle size={34} />
        </div>
      </header>

      <div className="flex-1 flex flex-col items-center justify-center">
        <p className="mb-2 text-center px-5" style={{ fontSize: 13, color: "var(--ink-soft)" }}>
          Scegli una carta per iniziare
        </p>
        <Deck />
      </div>
    </main>
  );
}
