"use client";

import { CalendarClock, User, X } from "lucide-react";
import { COLORS, withAlpha } from "@/app/admin/colors";
import { useArea } from "./AreaShell";

// Punto d'ingresso alla richiesta di lezione individuale, condiviso tra il
// calendario (desktop) e la home mobile: se c'è già una richiesta in attesa
// mostra lo stato con "Annulla richiesta", altrimenti il pulsante che apre
// il modale.
export function IndividualClassRequestCard() {
  const { myIndividualClassRequest, openIndividualRequestModal, cancelMyIndividualClassRequest, pending } = useArea();

  if (myIndividualClassRequest) {
    return (
      <div className="p-3.5 rounded-xl" style={{ background: withAlpha(COLORS.gold, 10), border: `1px solid ${withAlpha(COLORS.gold, 35)}` }}>
        <div className="flex items-center gap-2 mb-1" style={{ fontSize: 13.5, fontWeight: 700, color: COLORS.heading }}>
          <CalendarClock size={15} color={COLORS.gold} />
          Richiesta di lezione individuale in attesa di conferma
        </div>
        <div style={{ fontSize: 12, color: COLORS.inkSoft }} className="mb-2">
          Date proposte: {myIndividualClassRequest.proposedSlots.map((s) => `${s.date} · ${s.time}`).join(" — ") || "—"}
        </div>
        <button
          disabled={pending}
          onClick={cancelMyIndividualClassRequest}
          className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg disabled:opacity-60"
          style={{ color: COLORS.danger, border: `1px solid ${withAlpha(COLORS.danger, 33)}` }}
        >
          <X size={12} /> Annulla richiesta
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={openIndividualRequestModal}
      className="w-full flex items-center gap-3 p-3 rounded-xl text-left"
      style={{ background: COLORS.card, border: `1px solid ${COLORS.border}` }}
    >
      <span
        className="flex items-center justify-center rounded-full flex-shrink-0"
        style={{ width: 34, height: 34, background: withAlpha(COLORS.primary, 12), color: COLORS.primary }}
      >
        <User size={16} />
      </span>
      <span className="flex-1">
        <span style={{ display: "block", fontSize: 13.5, fontWeight: 600, color: COLORS.ink }}>Ti piacerebbe una lezione individuale?</span>
        <span style={{ display: "block", fontSize: 12, color: COLORS.inkSoft }}>Scegli tra le date che propongo e ti confermo appena possibile</span>
      </span>
    </button>
  );
}
