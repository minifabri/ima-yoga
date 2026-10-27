import { redirect } from "next/navigation";
import { getCurrentUserAndProfile } from "@/lib/supabase/profile";
import { logout } from "@/app/actions";
import { confirmMyAge } from "./actions";
import { AreaShell } from "./AreaShell";

export default async function AreaLayout({ children }: LayoutProps<"/area">) {
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

  // Chi si è registrato con Google dalla pagina di login non ha mai
  // dichiarato l'età: glielo chiediamo una volta prima di entrare.
  if (profile && !profile.age_confirmed_at) {
    return (
      <main className="flex-1 flex items-center justify-center p-5" style={{ background: "var(--bg)" }}>
        <div
          className="w-full p-6 rounded-2xl text-center"
          style={{ maxWidth: 380, background: "var(--card)", border: "1px solid var(--border)" }}
        >
          <div style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 600, color: "var(--heading)" }} className="mb-2">
            Un&apos;ultima cosa
          </div>
          <div style={{ fontSize: 13.5, color: "var(--ink-soft)", lineHeight: 1.5 }} className="mb-5">
            Il servizio è riservato a chi ha almeno 16 anni. Confermando dichiari di avere almeno 16 anni e accetti i{" "}
            <a href="/termini" style={{ color: "var(--primary-dark)", fontWeight: 600 }}>Termini del servizio</a>.
          </div>
          <form action={confirmMyAge} className="mb-3">
            <button type="submit" className="w-full py-2.5 rounded-lg text-sm font-semibold text-white" style={{ background: "var(--primary)" }}>
              Ho almeno 16 anni
            </button>
          </form>
          <form action={logout}>
            <button type="submit" className="text-sm font-medium" style={{ color: "var(--ink-soft)" }}>
              Esci
            </button>
          </form>
        </div>
      </main>
    );
  }

  return (
    <AreaShell
      fullName={profile?.full_name || "!"}
      email={user.email || ""}
      clientId={profile?.id || ""}
      consents={{ marketingEmails: profile?.marketing_emails ?? false, healthConsent: !!profile?.health_consent_at }}
      // chi non ha mai scelto sulle email (es. registrato prima che la casella esistesse)
      askMarketingEmails={!!profile && !profile.marketing_emails && !profile.marketing_emails_updated_at}
    >
      {children}
    </AreaShell>
  );
}
