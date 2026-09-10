"use client";

import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Status = "idle" | "pending" | "sent" | "error";

export function InterestCallout({ source }: { source: string }) {
  const [status, setStatus] = useState<Status>("idle");
  const supabase = useMemo(() => createClient(), []);

  async function handleClick() {
    if (status === "pending" || status === "sent") return;
    setStatus("pending");
    const { error } = await supabase.rpc("submit_interest_signal", { p_source: source });
    setStatus(error ? "error" : "sent");
  }

  return (
    <div className="online-callout">
      <h2>Ima Yoga, anche da casa.</h2>
      <p>
        Sto pensando a un modo per portare alcune pratiche anche online. Se ti piacerebbe praticare insieme anche a
        distanza, fammelo sapere.
      </p>
      {status === "sent" ? (
        <p className="online-callout-feedback">
          Grazie per il feedback <span aria-hidden="true">✦</span>
        </p>
      ) : (
        <button type="button" className="cover-cta-ghost" onClick={handleClick} disabled={status === "pending"}>
          {status === "error" ? "Riprova" : "Mi interessa"} <span aria-hidden="true">✦</span>
        </button>
      )}
    </div>
  );
}
