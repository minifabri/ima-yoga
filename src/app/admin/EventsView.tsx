"use client";

import { useEffect, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { Plus, Users, Pencil, Eye, EyeOff, ExternalLink, PartyPopper, AlertCircle, Check } from "lucide-react";
import { COLORS, withAlpha } from "./colors";
import { EventFormModal } from "./EventFormModal";
import { EventBookingsPanel } from "./EventBookingsPanel";
import { deleteEvent, fetchEvents, saveEvent } from "./data";
import type { EventItem } from "./types";

type ModalState = { mode: "new" } | { mode: "edit"; event: EventItem } | null;

export function EventsView({ supabase }: { supabase: SupabaseClient }) {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<ModalState>(null);
  const [bookingsFor, setBookingsFor] = useState<EventItem | null>(null);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSave(event: Omit<EventItem, "id"> & { id?: string }) {
    const saved = await saveEvent(supabase, event);
    setEvents((cur) => (event.id ? cur.map((e) => (e.id === saved.id ? saved : e)) : [...cur, saved]));
    showToast(event.id ? "Evento aggiornato." : "Evento creato.");
  }

  function handleDelete(id: string) {
    setEvents((cur) => cur.filter((e) => e.id !== id));
    deleteEvent(supabase, id).catch(() => showToast("Eliminazione non riuscita."));
  }

  const sorted = [...events].sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time));

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
          <PartyPopper size={28} className="mb-2" />
          <div style={{ fontSize: 13.5 }}>Nessun evento creato finora.</div>
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {sorted.map((ev) => (
            <div key={ev.id} className="flex items-center gap-3 p-3.5 rounded-xl flex-wrap" style={{ background: COLORS.card, border: `1px solid ${COLORS.border}` }}>
              <div
                className="flex items-center justify-center rounded-lg flex-shrink-0 overflow-hidden"
                style={{ width: 48, height: 48, background: COLORS.subtle }}
              >
                {ev.imageLightUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={ev.imageLightUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                  <PartyPopper size={18} color={COLORS.inkSoft} />
                )}
              </div>

              <div style={{ flex: 1, minWidth: 160 }}>
                <div className="flex items-center gap-1.5" style={{ fontSize: 14, fontWeight: 600 }}>
                  {ev.name}
                  {ev.published ? (
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
                  {ev.date} · {ev.time} · €{ev.price.toFixed(2)} {ev.capacity > 0 ? `· ${ev.capacity} posti` : "· posti illimitati"}
                </div>
              </div>

              <div className="flex items-center gap-1.5 flex-shrink-0">
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
                <button
                  onClick={() => setBookingsFor(ev)}
                  title="Prenotazioni e pagamenti"
                  className="flex items-center gap-1.5 px-2.5 py-2 rounded-lg text-xs font-semibold"
                  style={{ border: `1px solid ${withAlpha(COLORS.primary, 33)}`, color: COLORS.primaryDark }}
                >
                  <Users size={14} /> Prenotazioni
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
    </div>
  );
}
