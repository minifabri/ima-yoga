import { redirect } from "next/navigation";
import { getCurrentUserAndProfile } from "@/lib/supabase/profile";
import { logout } from "@/app/actions";
import { AreaApp } from "./AreaApp";

export default async function AreaPage() {
  const { user, profile } = await getCurrentUserAndProfile();

  if (!user) redirect("/login");
  if (profile?.role === "admin") redirect("/admin");

  if (profile?.disabled) {
    return (
      <main className="flex-1 flex items-center justify-center p-5" style={{ background: "var(--bg)" }}>
        <div
          className="w-full p-6 rounded-2xl text-center"
          style={{ maxWidth: 380, background: "var(--card)", border: "1px solid var(--border)" }}
        >
          <div style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 600, color: "var(--heading)" }} className="mb-2">
            Account sospeso
          </div>
          <div style={{ fontSize: 13.5, color: "var(--ink-soft)" }} className="mb-5">
            Il tuo account è momentaneamente disabilitato e non puoi accedere alle prenotazioni. Contattaci direttamente per riattivarlo.
          </div>
          <form action={logout}>
            <button type="submit" className="text-sm font-medium" style={{ color: "var(--ink-soft)" }}>
              Esci
            </button>
          </form>
        </div>
      </main>
    );
  }

  return <AreaApp fullName={profile?.full_name || "!"} email={user.email || ""} />;
}
