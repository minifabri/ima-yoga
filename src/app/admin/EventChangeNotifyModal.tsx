"use client";

import { useEffect, useState } from "react";
import { BellRing, X } from "lucide-react";
import { Modal } from "./ui";
import { COLORS, withAlpha } from "./colors";
import { createClient } from "@/lib/supabase/client";
import { fetchEventBookings } from "./data";
import { formatEventDay, type EventChange, type EventSchedule } from "@/lib/eventChange";
import type { EventItem } from "./types";

// Domanda che compare dopo aver salvato un evento con data, orario o luogo
// diversi: "Avviso chi è prenotato?". Sì manda push + avviso in area, No
// chiude e basta. Se non c'è nessuna persona prenotata con account, la
// domanda non ha senso e il modale si chiude da solo.
export function EventChangeNotifyModal({
  event,
  before,
  change,
  onClose,
  onConfirm,
}: {
  event: EventItem;
  before: EventSchedule;
  change: EventChange;
  onClose: () => void;
  onConfirm: () => Promise<{ ok: boolean; error?: string }>;
}) {
  const [counts, setCounts] = useState<{ clients: number; guests: number } | null>(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchEventBookings(createClient(), event.id)
      .then((bookings) => {
        const clients = bookings.filter((b) => b.clientId).length;
        const guests = bookings.length - clients;
        if (clients === 0) onClose();
        else setCounts({ clients, guests });
      })
      .catch(() => onClose());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event.id]);

  if (!counts) return null;

  async function handleConfirm() {
    if (sending) return;
    setSending(true);
    setError("");
    const res = await onConfirm().catch(() => ({ ok: false, error: undefined }));
    setSending(false);
    if (res.ok) onClose();
    else setError(res.error || "Invio non riuscito.");
  }

  const rows: { label: string; from: string; to: string }[] = [];
  if (change.dateChanged) rows.push({ label: "Giorno", from: formatEventDay(before.date), to: formatEventDay(event.date) });
  if (change.timeChanged) rows.push({ label: "Orario", from: before.time.slice(0, 5), to: event.time });
  if (change.locationChanged) rows.push({ label: "Luogo", from: before.location || "—", to: event.location || "—" });

  const people = counts.clients === 1 ? "la persona prenotata" : `le ${counts.clients} persone prenotate`;

  return (
    <Modal onClose={onClose} width={420}>
      <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: `1px solid ${COLORS.border}` }}>
        <div className="flex items-center gap-1.5" style={{ fontFamily: "var(--font-display)", fontSize: 17, fontWeight: 600, color: COLORS.heading }}>
          <BellRing size={16} /> Avviso {people}?
        </div>
        <button onClick={onClose} aria-label="Chiudi" className="flex items-center justify-center" style={{ width: 44, height: 44 }}>
          <X size={18} />
        </button>
      </div>

      <div className="p-5 overflow-y-auto" style={{ flex: 1 }}>
        <div className="mb-3" style={{ fontSize: 13, color: COLORS.ink }}>
          Hai cambiato «{event.name}»:
        </div>
        <div className="flex flex-col gap-1.5 mb-3">
          {rows.map((r) => (
            <div key={r.label} style={{ fontSize: 13 }}>
              <span style={{ fontWeight: 600, color: COLORS.heading }}>{r.label}: </span>
              <span style={{ color: COLORS.inkSoft, textDecoration: "line-through" }}>{r.from}</span>
              <span style={{ color: COLORS.inkSoft }}> → </span>
              <span style={{ fontWeight: 600, color: COLORS.ink }}>{r.to}</span>
            </div>
          ))}
        </div>
        <div style={{ fontSize: 12, color: COLORS.inkSoft }}>
          Arriva una notifica sul telefono a chi le ha attivate, e un avviso nella sua area personale.
          {counts.guests > 0 &&
            ` ${counts.guests === 1 ? "1 ospite senza account non riceve" : `${counts.guests} ospiti senza account non ricevono`} nulla: va avvisato a mano.`}
        </div>

        {error && (
          <div className="text-sm rounded-lg px-3 py-2 mt-3" style={{ background: withAlpha(COLORS.danger, 14), color: COLORS.danger }}>
            {error}
          </div>
        )}
      </div>

      <div className="flex items-center justify-end gap-2 px-5 py-4" style={{ borderTop: `1px solid ${COLORS.border}` }}>
        <button onClick={onClose} className="px-4 rounded-lg text-sm font-medium" style={{ border: `1px solid ${COLORS.border}`, minHeight: 44 }}>
          No
        </button>
        <button
          onClick={handleConfirm}
          disabled={sending}
          className="px-4 rounded-lg text-sm font-semibold text-white disabled:opacity-60"
          style={{ background: COLORS.primary, minHeight: 44 }}
        >
          {sending ? "Invio…" : "Sì, avvisa"}
        </button>
      </div>
    </Modal>
  );
}
