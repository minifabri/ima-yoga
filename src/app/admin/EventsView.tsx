"use client";

import { useEffect, useMemo, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { Plus, Users, Pencil, Eye, EyeOff, ExternalLink, Ticket, AlertCircle, Check, Lock, LockOpen, Archive, ArchiveRestore, Calculator, X } from "lucide-react";
import { COLORS, withAlpha } from "./colors";
import { Modal } from "./ui";
import { EventFormModal } from "./EventFormModal";
import { EventBookingsPanel } from "./EventBookingsPanel";
import { EventBudgetCalculator, computeTotals } from "./EventBudgetCalculator";
import { deleteEvent, fetchEventBudgets, fetchEvents, saveEvent, setEventArchived, setEventBookingsOpen } from "./data";
import type { EventBudget, EventItem } from "./types";

type ModalState = { mode: "new" } | { mode: "edit"; event: EventItem } | null;

const fmtEUR = new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });

export function EventsView({ supabase }: { supabase: SupabaseClient }) {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [budgets, setBudgets] = useState<EventBudget[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<ModalState>(null);
  const [bookingsFor, setBookingsFor] = useState<EventItem | null>(null);
  const [budgetFor, setBudgetFor] = useState<EventItem | null>(null);
  const [toast, setToast] = useState("");

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(""), 2600);
  }

  useEffect(() => {
    fetchEvents(supabase)
      .then(setEvents)
      .catch(() => showToast("Errore nel caricamento degli eventi."))
      .finally(() => setLoading(false));
    fetchEventBudgets(supabase)
      .then(setBudgets)
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const budgetByEventId = useMemo(() => Object.fromEntries(budgets.filter((b) => b.eventId).map((b) => [b.eventId as string, b])), [budgets]);

  function handleBudgetSaved(b: EventBudget) {
    setBudgets((cur) => (cur.some((x) => x.id === b.id) ? cur.map((x) => (x.id === b.id ? b : x)) : [b, ...cur]));
    setBudgetFor(null);
  }
  function handleBudgetDeleted(id: string) {
    setBudgets((cur) => cur.filter((b) => b.id !== id));
    setBudgetFor(null);
  }

  async function handleSave(event: Omit<EventItem, "id"> & { id?: string }) {
    const saved = await saveEvent(supabase, event);
    setEvents((cur) => (event.id ? cur.map((e) => (e.id === saved.id ? saved : e)) : [...cur, saved]));
    showToast(event.id ? "Evento aggiornato." : "Evento creato.");
  }

  function handleDelete(id: string) {
    setEvents((cur) => cur.filter((e) => e.id !== id));
    deleteEvent(supabase, id).catch(() => showToast("Eliminazione non riuscita."));
  }

  function toggleBookingsOpen(ev: EventItem) {
    const next = !ev.bookingsOpen;
    setEvents((cur) => cur.map((e) => (e.id === ev.id ? { ...e, bookingsOpen: next } : e)));
    setEventBookingsOpen(supabase, ev.id, next).catch(() => {
      setEvents((cur) => cur.map((e) => (e.id === ev.id ? { ...e, bookingsOpen: ev.bookingsOpen } : e)));
      showToast("Errore nel cambiare lo stato delle iscrizioni.");
    });
  }

  function toggleArchived(ev: EventItem) {
    const next = !ev.archived;
    setEvents((cur) => cur.map((e) => (e.id === ev.id ? { ...e, archived: next } : e)));
    setEventArchived(supabase, ev.id, next)
      .then(() => showToast(next ? "Evento archiviato." : "Evento riattivato."))
      .catch(() => {
        setEvents((cur) => cur.map((e) => (e.id === ev.id ? { ...e, archived: ev.archived } : e)));
        showToast("Errore nell'archiviazione.");
      });
  }

  const sorted = [...events].sort((a, b) => {
    if (a.archived !== b.archived) return a.archived ? 1 : -1;
    return (b.date + b.time).localeCompare(a.date + a.time);
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div style={{ fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 600, color: COLORS.heading }}>Eventi</div>
        <button
          onClick={() => setModal({ mode: "new" })}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold text-white"
          style={{ background: COLORS.primary }}
        >
          <Plus size={15} /> Nuovo evento
        </button>
      </div>

      {toast && (
        <div className="mb-4 flex items-center gap-2 text-sm rounded-lg px-3 py-2" style={{ background: COLORS.subtle, color: COLORS.primaryDark }}>
          {toast.includes("riuscit") || toast.includes("Errore") ? <AlertCircle size={15} color={COLORS.danger} /> : <Check size={15} />}
          {toast}
        </div>
      )}

      {loading ? (
        <div style={{ fontSize: 13, color: COLORS.inkSoft }}>Caricamento…</div>
      ) : sorted.length === 0 ? (
        <div className="flex flex-col items-center justify-center text-center py-14" style={{ color: COLORS.inkSoft }}>
          <Ticket size={28} className="mb-2" />
          <div style={{ fontSize: 13.5 }}>Nessun evento creato finora.</div>
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {sorted.map((ev) => (
            <div
              key={ev.id}
              className="flex items-center gap-3 p-3.5 rounded-xl flex-wrap"
              style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, opacity: ev.archived ? 0.6 : 1 }}
            >
              <div
                className="flex items-center justify-center rounded-lg flex-shrink-0 overflow-hidden"
                style={{ width: 48, height: 48, background: COLORS.subtle }}
              >
                {ev.imageLightUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={ev.imageLightUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                  <Ticket size={18} color={COLORS.inkSoft} />
                )}
              </div>

              <div style={{ flex: 1, minWidth: 160 }}>
                <div className="flex items-center gap-1.5" style={{ fontSize: 14, fontWeight: 600 }}>
                  {ev.name}
                  {ev.archived ? (
                    <span
                      className="inline-flex items-center rounded-full"
                      style={{ fontSize: 10, fontWeight: 700, color: COLORS.inkSoft, background: COLORS.subtle, padding: "1px 7px" }}
                    >
                      Archiviato
                    </span>
                  ) : ev.published ? (
                    <span title="Pubblicato" className="inline-flex">
                      <Eye size={13} color={COLORS.success} />
                    </span>
                  ) : (
                    <span title="Bozza" className="inline-flex">
                      <EyeOff size={13} color={COLORS.gold} />
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 12, color: COLORS.inkSoft }}>
                  {ev.date} · {ev.time}
                  {ev.location ? ` · ${ev.location}` : ""} · €{ev.price.toFixed(2)} {ev.capacity > 0 ? `· ${ev.capacity} posti` : "· posti illimitati"}
                </div>
                {budgetByEventId[ev.id] &&
                  (() => {
                    const b = budgetByEventId[ev.id];
                    const t = computeTotals(b.items, b.days, b.ticketPrice, b.participants);
                    return (
                      <div className="mt-1 inline-flex items-center gap-1" style={{ fontSize: 11, fontWeight: 600, color: t.profit >= 0 ? COLORS.success : COLORS.danger }}>
                        <Calculator size={11} /> Preventivo: guadagno netto {fmtEUR.format(t.profit)}
                      </div>
                    );
                  })()}
              </div>

              <div className="flex items-center gap-1.5 flex-shrink-0">
                {!ev.archived && (
                  <>
                    <button
                      onClick={() => toggleBookingsOpen(ev)}
                      title={ev.bookingsOpen ? "Iscrizioni aperte — clicca per chiudere" : "Iscrizioni chiuse — clicca per riaprire"}
                      className="flex items-center justify-center rounded-lg"
                      style={{
                        width: 34,
                        height: 34,
                        border: `1px solid ${withAlpha(ev.bookingsOpen ? COLORS.success : COLORS.danger, 33)}`,
                        color: ev.bookingsOpen ? COLORS.success : COLORS.danger,
                        background: withAlpha(ev.bookingsOpen ? COLORS.success : COLORS.danger, 8),
                      }}
                    >
                      {ev.bookingsOpen ? <LockOpen size={14} /> : <Lock size={14} />}
                    </button>
                    <a
                      href={`/eventi/${ev.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="Apri pagina pubblica"
                      className="flex items-center justify-center rounded-lg"
                      style={{ width: 34, height: 34, border: `1px solid ${COLORS.border}`, color: COLORS.primaryDark }}
                    >
                      <ExternalLink size={14} />
                    </a>
                  </>
                )}
                <button
                  onClick={() => setBudgetFor(ev)}
                  title="Calcola conti (incassi, spese, pareggio)"
                  className="flex items-center justify-center rounded-lg"
                  style={{ width: 34, height: 34, border: `1px solid ${COLORS.border}` }}
                >
                  <Calculator size={14} />
                </button>
                <button
                  onClick={() => setBookingsFor(ev)}
                  title="Prenotazioni e pagamenti"
                  className="flex items-center gap-1.5 px-2.5 py-2 rounded-lg text-xs font-semibold"
                  style={{ border: `1px solid ${withAlpha(COLORS.primary, 33)}`, color: COLORS.primaryDark }}
                >
                  <Users size={14} /> Prenotazioni
                </button>
                <button
                  onClick={() => toggleArchived(ev)}
                  title={ev.archived ? "Riattiva evento" : "Archivia evento (resta lo storico, sparisce dalla pagina pubblica)"}
                  className="flex items-center justify-center rounded-lg"
                  style={{ width: 34, height: 34, border: `1px solid ${COLORS.border}` }}
                >
                  {ev.archived ? <ArchiveRestore size={14} /> : <Archive size={14} />}
                </button>
                <button
                  onClick={() => setModal({ mode: "edit", event: ev })}
                  title="Modifica"
                  className="flex items-center justify-center rounded-lg"
                  style={{ width: 34, height: 34, border: `1px solid ${COLORS.border}` }}
                >
                  <Pencil size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {modal && (
        <EventFormModal
          data={modal}
          onClose={() => setModal(null)}
          onSave={async (event) => {
            await handleSave(event);
            setModal(null);
          }}
          onDelete={(id) => {
            handleDelete(id);
            setModal(null);
          }}
        />
      )}

      {bookingsFor && <EventBookingsPanel event={bookingsFor} onClose={() => setBookingsFor(null)} />}

      {budgetFor && (
        <Modal onClose={() => setBudgetFor(null)} width={760}>
          <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: `1px solid ${COLORS.border}` }}>
            <div>
              <div style={{ fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 600, color: COLORS.heading }}>Conti — {budgetFor.name}</div>
              <div style={{ fontSize: 12, color: COLORS.inkSoft }}>
                {budgetFor.date} · {budgetFor.time}
              </div>
            </div>
            <button onClick={() => setBudgetFor(null)} className="flex items-center justify-center" style={{ width: 36, height: 36 }}>
              <X size={18} />
            </button>
          </div>
          <div className="p-5 overflow-y-auto" style={{ flex: 1 }}>
            <EventBudgetCalculator
              supabase={supabase}
              budget={budgetByEventId[budgetFor.id] || null}
              initialEvent={budgetFor}
              events={events}
              budgets={budgets}
              onSaved={handleBudgetSaved}
              onDeleted={handleBudgetDeleted}
            />
          </div>
        </Modal>
      )}
    </div>
  );
}
