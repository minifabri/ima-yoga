"use client";

import { useState } from "react";
import { Calendar, Check, X } from "lucide-react";
import { COLORS, withAlpha } from "@/app/admin/colors";
import { isPastClass } from "./helpers";
import type { AvailableIndividualSlot } from "./types";

function formatSlotLabel(slot: AvailableIndividualSlot): string {
  const label = new Date(`${slot.date}T00:00:00Z`).toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });
  return `${label} · ${slot.time}`;
}

// Componente presentazionale (niente accesso diretto a supabase): stato e
// chiamate vivono in AreaShell (submitIndividualClassRequest), qui solo
// selezione multipla delle date proposte + nota facoltativa. Stessa chrome
// "fixed inset-0" hand-rolled già usata altrove in AreaShell/prenotazioni,
// nessuna libreria di dialog in questo progetto.
export function RequestIndividualClassModal({
  slots,
  loading,
  pending,
  onClose,
  onSubmit,
}: {
  slots: AvailableIndividualSlot[];
  loading: boolean;
  pending: boolean;
  onClose: () => void;
  onSubmit: (slotIds: string[], notes: string) => Promise<void>;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [notes, setNotes] = useState("");

  const upcoming = slots.filter((s) => !isPastClass(s.date, s.time)).sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));

  function toggleSelect(id: string) {
    setSelected((cur) => {
      const next = new Set(cur);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleSubmit() {
    if (selected.size === 0 || pending) return;
    await onSubmit(Array.from(selected), notes.trim());
  }

  return (
    <div
      className="fixed inset-0 flex items-center justify-center p-4"
      style={{ background: "rgba(74,58,115,0.35)", zIndex: 50 }}
      onMouseDown={(e) => e.target === e.currentTarget && !pending && onClose()}
    >
      <div
        className="w-full overflow-hidden"
        style={{ maxWidth: 420, background: COLORS.card, borderRadius: 18, boxShadow: "0 16px 44px rgba(74,58,115,0.16)", maxHeight: "88dvh", display: "flex", flexDirection: "column" }}
      >
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: `1px solid ${COLORS.border}` }}>
          <div style={{ fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 600, color: COLORS.heading }}>Richiedi una lezione individuale</div>
          <button onClick={onClose} disabled={pending} className="flex items-center justify-center disabled:opacity-60" style={{ width: 36, height: 36 }}>
            <X size={18} />
          </button>
        </div>

        <div className="p-5 overflow-y-auto" style={{ flex: 1 }}>
          <div style={{ fontSize: 12.5, color: COLORS.inkSoft, lineHeight: 1.5 }} className="mb-3">
            Scegli una o più date tra quelle disponibili e attendi conferma.
          </div>

          {loading ? (
            <div style={{ fontSize: 13, color: COLORS.inkSoft }} className="py-6 text-center">
              Caricamento date disponibili…
            </div>
          ) : upcoming.length === 0 ? (
            <div style={{ fontSize: 13, color: COLORS.inkSoft }} className="py-6 text-center">
              Al momento non ci sono date disponibili. Scrivimi direttamente per organizzarne una insieme.
            </div>
          ) : (
            <div className="flex flex-col gap-1.5 mb-4">
              {upcoming.map((s) => {
                const isSelected = selected.has(s.id);
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => toggleSelect(s.id)}
                    className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-left"
                    style={{
                      border: `1px solid ${isSelected ? COLORS.primary : COLORS.border}`,
                      background: isSelected ? withAlpha(COLORS.primary, 12) : "transparent",
                    }}
                  >
                    <span
                      className="flex items-center justify-center rounded-md flex-shrink-0"
                      style={{ width: 20, height: 20, border: `1.5px solid ${isSelected ? COLORS.primary : COLORS.inkSoft}`, background: isSelected ? COLORS.primary : "transparent" }}
                    >
                      {isSelected && <Check size={13} color="#fff" />}
                    </span>
                    <Calendar size={14} color={COLORS.primary} style={{ flexShrink: 0 }} />
                    <span style={{ fontSize: 13.5, fontWeight: 600, color: COLORS.ink, textTransform: "capitalize" }}>{formatSlotLabel(s)}</span>
                  </button>
                );
              })}
            </div>
          )}

          {upcoming.length > 0 && (
            <div style={{ fontSize: 12, color: COLORS.inkSoft, lineHeight: 1.5 }} className="mb-4">
              Non trovi nessuna data adatta? Scrivimi direttamente per organizzarne una insieme.
            </div>
          )}

          {upcoming.length > 0 && (
            <label className="block">
              <div style={{ fontSize: 11.5, fontWeight: 600, color: COLORS.inkSoft, marginBottom: 4 }}>Nota (facoltativa)</div>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder="Per esempio cosa vorresti lavorare in questa lezione"
                style={{
                  width: "100%",
                  border: `1px solid ${COLORS.border}`,
                  borderRadius: 9,
                  padding: "8px 10px",
                  fontSize: 13,
                  background: COLORS.bg,
                  color: COLORS.ink,
                  outline: "none",
                  resize: "vertical",
                }}
              />
            </label>
          )}
        </div>

        {upcoming.length > 0 && (
          <div className="flex justify-end gap-2 px-5 py-4" style={{ borderTop: `1px solid ${COLORS.border}` }}>
            <button onClick={onClose} disabled={pending} className="px-3.5 py-2 rounded-lg text-sm font-medium disabled:opacity-60" style={{ border: `1px solid ${COLORS.border}` }}>
              Annulla
            </button>
            <button
              onClick={handleSubmit}
              disabled={selected.size === 0 || pending}
              className="px-3.5 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-60"
              style={{ background: COLORS.primary }}
            >
              {pending ? "Invio…" : "Invia richiesta"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
