import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserAndProfile } from "@/lib/supabase/profile";
import { claimAdmin } from "@/app/actions";
import { AdminApp } from "./AdminApp";
import { fetchAdminData } from "./data";

export default async function AdminPage() {
  const { user, profile } = await getCurrentUserAndProfile();

  if (!user) redirect("/login");

  const supabase = await createClient();

  if (profile?.role === "admin") {
    const initial = await fetchAdminData(supabase);
    return <AdminApp initial={initial} />;
  }

  const { data: adminExists } = await supabase.rpc("admin_exists");

  return (
    <main className="flex-1 flex items-center justify-center p-5" style={{ background: "var(--bg)" }}>
      <div
        className="w-full p-6 rounded-2xl text-center"
        style={{ maxWidth: 380, background: "var(--card)", border: "1px solid var(--border)" }}
      >
        {adminExists ? (
          <>
            <div style={{ fontSize: 14, fontWeight: 600, color: "var(--ink)" }} className="mb-1">
              Accesso riservato
            </div>
            <div style={{ fontSize: 13, color: "var(--ink-soft)" }}>
              Il tuo account non ha i permessi di amministratore.
            </div>
          </>
        ) : (
          <>
            <div style={{ fontSize: 14, fontWeight: 600, color: "var(--ink)" }} className="mb-1">
              Nessun admin ancora configurato
            </div>
            <div style={{ fontSize: 13, color: "var(--ink-soft)" }} className="mb-4">
              Sei il primo ad accedere: diventa amministratore per gestire calendario, clienti e pagamenti.
            </div>
            <form action={claimAdmin}>
              <button
                type="submit"
                className="px-4 py-2 rounded-lg text-sm font-semibold text-white"
                style={{ background: "var(--primary)" }}
              >
                Diventa admin
              </button>
            </form>
          </>
        )}
      </div>
    </main>
  );
}
