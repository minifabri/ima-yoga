import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUserAndProfile } from "@/lib/supabase/profile";

export default async function HomePage() {
  const { user, profile } = await getCurrentUserAndProfile();

  if (user && profile?.role === "admin") redirect("/admin");
  if (user && profile?.role === "client") redirect("/area");

  return (
    <main className="flex-1 flex items-center justify-center p-5" style={{ background: "var(--bg)" }}>
      <div className="text-center">
        <div
          style={{ fontFamily: "var(--font-display)", fontSize: 40, fontWeight: 500, color: "var(--heading)" }}
        >
          ima yoga
        </div>
        <div className="mt-1 mb-6" style={{ fontSize: 13, color: "var(--ink-soft)" }}>
          Calendario classi e prenotazioni
        </div>
        <div className="flex items-center justify-center gap-3">
          <Link
            href="/login"
            className="px-4 py-2 rounded-lg text-sm font-semibold text-white"
            style={{ background: "var(--primary)" }}
          >
            Accedi
          </Link>
          <Link
            href="/signup"
            className="px-4 py-2 rounded-lg text-sm font-semibold"
            style={{ border: "1px solid var(--border)", color: "var(--ink)" }}
          >
            Registrati
          </Link>
        </div>
      </div>
    </main>
  );
}
