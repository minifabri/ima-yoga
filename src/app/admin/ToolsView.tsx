"use client";

import { useEffect, useMemo, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { Plus, X, Link2, Calculator as CalculatorIcon, AlertCircle } from "lucide-react";
import { COLORS, withAlpha } from "./colors";
import { Modal } from "./ui";
import { EventBudgetCalculator, computeTotals } from "./EventBudgetCalculator";
import { fetchEventBudgets, fetchEvents } from "./data";
import type { EventBudget, EventItem } from "./types";

const fmtEUR = new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });

export function ToolsView({ supabase }: { supabase: SupabaseClient }) {
  const [budgets, setBudgets] = useState<EventBudget[]>([]);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [editing, setEditing] = useState<EventBudget | "new" | null>(null);

  useEffect(() => {
    Promise.all([fetchEventBudgets(supabase), fetchEvents(supabase)])
      .then(([b, ev]) => {
        setBudgets(b);
        setEvents(ev);
      })
      .catch(() => setLoadError(true))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const eventById = useMemo(() => Object.fromEntries(events.map((e) => [e.id, e])), [events]);

  function handleSaved(b: EventBudget) {
    setBudgets((cur) => (cur.some((x) => x.id === b.id) ? cur.map((x) => (x.id === b.id ? b : x)) : [b, ...cur]));
    setEditing(null);
  }
  function handleDeleted(id: string) {
    setBudgets((cur) => cur.filter((b) => b.id !== id));
    setEditing(null);
  }

  const sorted = [...budgets].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 600, color: COLORS.heading }}>Strumenti</div>
        <button
          onClick={() => setEditing("new")}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold text-white"
          style={{ background: COLORS.primary }}
        >
          <Plus size={15} /> Nuovo conto
        </button>
      </div>

      <div className="mb-4" style={{ fontSize: 12.5, color: COLORS.inkSoft }}>
        Calcola incassi, spese e punto di pareggio di un ritiro o evento — puoi salvare più simulazioni ed eventualmente collegarne una a un evento esistente.
      </div>

      {loadError && (
        <div className="mb-4 flex items-center gap-2 text-sm rounded-lg px-3 py-2" style={{ background: withAlpha(COLORS.danger, 10), color: COLORS.danger }}>
          <AlertCircle size={15} /> Errore nel caricamento dei conti salvati.
        </div>
      )}

      {loading ? (
        <div style={{ fontSize: 13, color: COLORS.inkSoft }}>Caricamento…</div>
      ) : sorted.length === 0 ? (
        <div className="flex flex-col items-center justify-center text-center py-14" style={{ color: COLORS.inkSoft }}>
          <CalculatorIcon size={28} className="mb-2" />
          <div style={{ fontSize: 13.5 }}>Nessun conto salvato finora.</div>
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {sorted.map((b) => {
            const totals = computeTotals(b.items, b.days, b.ticketPrice, b.participants);
            const ev = b.eventId ? eventById[b.eventId] : null;
            return (
              <button
                key={b.id}
                onClick={() => setEditing(b)}
                className="flex items-center gap-3 p-3.5 rounded-xl flex-wrap text-left"
                style={{ background: COLORS.card, border: `1px solid ${COLORS.border}` }}
              >
                <div style={{ flex: 1, minWidth: 160 }}>
                  <div className="flex items-center gap-1.5 flex-wrap" style={{ fontSize: 14, fontWeight: 600 }}>
                    {b.name || "Conto senza nome"}
                    {ev && (
                      <span
                        className="inline-flex items-center gap-1 rounded-full"
                        style={{ fontSize: 10.5, fontWeight: 600, color: COLORS.primaryDark, background: withAlpha(COLORS.primary, 10), padding: "1px 8px" }}
                      >
                        <Link2 size={10} /> {ev.name}
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 12, color: COLORS.inkSoft }}>
                    {totals.participants} partecipanti · biglietto {fmtEUR.format(totals.price)} · {b.days} {b.days === 1 ? "giorno" : "giorni"}
                  </div>
                </div>
                <div style={{ fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 600, color: totals.profit >= 0 ? COLORS.success : COLORS.danger }}>
                  {fmtEUR.format(totals.profit)}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {editing && (
        <Modal onClose={() => setEditing(null)} width={760}>
          <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: `1px solid ${COLORS.border}` }}>
            <div style={{ fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 600, color: COLORS.heading }}>
              {editing === "new" ? "Nuovo conto" : editing.name || "Conto"}
            </div>
            <button onClick={() => setEditing(null)} className="flex items-center justify-center" style={{ width: 36, height: 36 }}>
              <X size={18} />
            </button>
          </div>
          <div className="p-5 overflow-y-auto" style={{ flex: 1 }}>
            <EventBudgetCalculator
              supabase={supabase}
              budget={editing === "new" ? null : editing}
              events={events}
              budgets={budgets}
              onSaved={handleSaved}
              onDeleted={handleDeleted}
            />
          </div>
        </Modal>
      )}
    </div>
  );
}
