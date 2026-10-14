"use client";

import { useState } from "react";
import Link from "next/link";
import { X } from "lucide-react";
import { COLORS } from "@/app/admin/colors";
import { updateMyConsents } from "./actions";

export type Consents = { marketingEmails: boolean; healthConsent: boolean };

// "Privacy e consensi" dal menu profilo: la cliente decide da sola se ricevere
// le email su eventi/sondaggi e se l'insegnante può usare le informazioni
// sulla salute che le racconta. Le email di servizio (conferme, promemoria
// delle lezioni prenotate) partono comunque.
export function PrivacySettingsModal({ initial, onClose }: { initial: Consents; onClose: () => void }) {
  const [marketingEmails, setMarketingEmails] = useState(initial.marketingEmails);
  const [healthConsent, setHealthConsent] = useState(initial.healthConsent);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setPending(true);
    setError(null);
    const res = await updateMyConsents({ marketingEmails, healthConsent });
    setPending(false);
    if (!res.ok) return setError(res.error || "Salvataggio non riuscito, riprova.");
    onClose();
  }

  return (
    <div
      className="fixed inset-0 flex items-center justify-center p-4"
      style={{ background: "rgba(74,58,115,0.35)", zIndex: 50 }}
      onMouseDown={(e) => e.target === e.currentTarget && !pending && onClose()}
    >
      <div className="w-full p-5" style={{ maxWidth: 420, background: COLORS.card, borderRadius: 18, boxShadow: "0 16px 44px rgba(74,58,115,0.16)" }}>
        <div className="flex items-center justify-between mb-3">
          <div style={{ fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 600, color: COLORS.heading }}>Privacy e consensi</div>
          {!pending && (
            <button onClick={onClose}>
              <X size={18} />
            </button>
          )}
        </div>

        <div className="flex flex-col gap-4">
          <label className="flex items-start gap-2.5" style={{ cursor: "pointer" }}>
            <input type="checkbox" checked={marketingEmails} onChange={(e) => setMarketingEmails(e.target.checked)} style={{ marginTop: 3 }} />
            <span style={{ fontSize: 13, lineHeight: 1.5, color: COLORS.ink }}>
              <strong>Email su eventi e sondaggi</strong>
              <br />
              <span style={{ color: COLORS.inkSoft }}>
                Inviti a nuovi eventi e sondaggi. Le email legate alle tue prenotazioni arrivano comunque.
              </span>
            </span>
          </label>

          <label className="flex items-start gap-2.5" style={{ cursor: "pointer" }}>
            <input type="checkbox" checked={healthConsent} onChange={(e) => setHealthConsent(e.target.checked)} style={{ marginTop: 3 }} />
            <span style={{ fontSize: 13, lineHeight: 1.5, color: COLORS.ink }}>
              <strong>Informazioni sulla salute</strong>
              <br />
              <span style={{ color: COLORS.inkSoft }}>
                Acconsento che la mia insegnante annoti e usi le informazioni sulla mia salute che le comunico (infortuni,
                dolori, gravidanza…) solo per adattare la pratica e le sequenze personalizzate. Se tolgo il consenso, non
                verranno più usate.
              </span>
            </span>
          </label>

          {error && (
            <div className="text-sm rounded-lg px-3 py-2" style={{ background: "#F6E7E2", color: COLORS.danger }}>
              {error}
            </div>
          )}

          <button
            onClick={save}
            disabled={pending}
            className="py-2.5 rounded-lg text-sm font-semibold text-white disabled:opacity-60"
            style={{ background: COLORS.primary }}
          >
            {pending ? "Salvataggio…" : "Salva"}
          </button>

          <div className="text-center" style={{ fontSize: 11.5, color: COLORS.inkSoft }}>
            <Link href="/privacy" style={{ textDecoration: "underline" }}>Informativa Privacy</Link>
            {" · "}
            <Link href="/termini" style={{ textDecoration: "underline" }}>Termini del servizio</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
