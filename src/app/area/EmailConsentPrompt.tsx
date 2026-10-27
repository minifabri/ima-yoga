"use client";

import { useState } from "react";
import { Mail, X } from "lucide-react";
import { COLORS, withAlpha } from "@/app/admin/colors";
import { setMyMarketingEmails } from "./actions";

// Domanda una tantum a chi non ha mai scelto sulle email non transazionali
// (di solito chi si è registrato prima che esistesse la casella). Rispondendo,
// marketing_emails_updated_at viene valorizzato e la domanda non torna più.
// Dopo "Sì" c'è Annulla; dopo "No" non cambia nulla, quindi basta chiudere.
export function EmailConsentPrompt() {
  const [state, setState] = useState<"ask" | "yes" | "no" | "hidden">("ask");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function answer(value: boolean, next: typeof state) {
    setPending(true);
    setError(null);
    const res = await setMyMarketingEmails(value);
    setPending(false);
    if (!res.ok) return setError("Salvataggio non riuscito, riprova.");
    setState(next);
  }

  if (state === "hidden") return null;

  const box = {
    background: withAlpha(COLORS.primary, 7),
    color: COLORS.primaryDark,
    border: `1px solid ${withAlpha(COLORS.primary, 20)}`,
  };
  const smallBtn = "px-3 rounded-lg text-xs font-semibold";

  return (
    <div className="flex flex-col gap-2 text-sm rounded-lg px-3 py-2.5 mb-4" style={box} role="region" aria-label="Email da ima yoga">
      <div className="flex items-start gap-2">
        <Mail size={15} color={COLORS.primary} style={{ flexShrink: 0, marginTop: 2 }} />
        <span className="flex-1">
          {state === "ask" && "Vuoi ricevere un'email quando escono nuove classi, eventi e sondaggi? Puoi disiscriverti quando vuoi."}
          {state === "yes" && "Fatto: ti scriveremo quando escono nuove classi, eventi e sondaggi."}
          {state === "no" && "Ok, niente email. Puoi cambiare idea da «Privacy e consensi»."}
        </span>
        {state !== "ask" && (
          <button
            onClick={() => setState("hidden")}
            aria-label="Chiudi"
            className="flex items-center justify-center"
            style={{ color: COLORS.inkSoft, flexShrink: 0, minWidth: 44, minHeight: 44, margin: "-12px -10px -12px 0" }}
          >
            <X size={14} />
          </button>
        )}
      </div>

      {state === "ask" && (
        <div className="flex gap-2 pl-6">
          <button
            disabled={pending}
            onClick={() => answer(true, "yes")}
            className={`${smallBtn} text-white disabled:opacity-60`}
            style={{ background: COLORS.primary, minHeight: 44, minWidth: 64 }}
          >
            Sì
          </button>
          <button
            disabled={pending}
            onClick={() => answer(false, "no")}
            className={`${smallBtn} disabled:opacity-60`}
            style={{ color: COLORS.primaryDark, border: `1px solid ${withAlpha(COLORS.primary, 33)}`, minHeight: 44, minWidth: 64 }}
          >
            No
          </button>
        </div>
      )}

      {state === "yes" && (
        <div className="pl-6">
          <button
            disabled={pending}
            onClick={() => answer(false, "no")}
            className={`${smallBtn} disabled:opacity-60`}
            style={{ color: COLORS.primaryDark, textDecoration: "underline", minHeight: 44 }}
          >
            Annulla
          </button>
        </div>
      )}

      {error && <div style={{ color: "var(--danger)", fontSize: 12.5 }} className="pl-6">{error}</div>}
    </div>
  );
}
