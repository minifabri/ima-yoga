"use client";

import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Status = "idle" | "pending" | "sent" | "error";
type Kind = "live" | "registrate" | "entrambe";

const OPTIONS: { kind: Exclude<Kind, "entrambe">; name: string; description: string }[] = [
  {
    kind: "live",
    name: "Lezioni in diretta",
    description: "In streaming, all'orario della lezione: ci colleghiamo e pratichiamo insieme, in tempo reale.",
  },
  {
    kind: "registrate",
    name: "Video registrati",
    description: "Pratiche già registrate, da fare quando vuoi e quante volte vuoi, con i tuoi tempi.",
  },
];

export function InterestCallout({ source }: { source: string }) {
  const [status, setStatus] = useState<Status>("idle");
  const supabase = useMemo(() => createClient(), []);

  async function choose(kind: Kind) {
    if (status === "pending" || status === "sent") return;
    setStatus("pending");
    const { error } = await supabase.rpc("submit_interest_signal", { p_source: source, p_kind: kind });
    setStatus(error ? "error" : "sent");
  }

  return (
    <div className="online-callout">
      <h2>Ima Yoga, anche da casa.</h2>
      <p>
        Sto pensando a due modi per praticare insieme anche a distanza. Dimmi quale ti piacerebbe di più.
      </p>
      {status === "sent" ? (
        <p className="online-callout-feedback">
          Grazie per il feedback <span aria-hidden="true">✦</span>
        </p>
      ) : (
        <>
          <div className="online-callout-options">
            {OPTIONS.map((o) => (
              <button
                key={o.kind}
                type="button"
                className="online-callout-option"
                onClick={() => choose(o.kind)}
                disabled={status === "pending"}
              >
                <span className="online-callout-option-name">{o.name}</span>
                <span className="online-callout-option-desc">{o.description}</span>
              </button>
            ))}
          </div>
          <button type="button" className="online-callout-both" onClick={() => choose("entrambe")} disabled={status === "pending"}>
            Mi interessano entrambe <span aria-hidden="true">✦</span>
          </button>
          {status === "error" && (
            <p className="online-callout-error" role="alert">
              Non è andata a buon fine, riprova.
            </p>
          )}
        </>
      )}
    </div>
  );
}
