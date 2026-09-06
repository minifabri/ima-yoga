"use client";

import { useEffect, useState } from "react";
import { X, Check, Trash2, UserPlus, Mail } from "lucide-react";
import { Modal, Badge, CapacityBar } from "./ui";
import { COLORS, withAlpha } from "./colors";
import { createClient } from "@/lib/supabase/client";
import * as db from "./data";
import type { EventBookingItem, EventItem } from "./types";

export function EventBookingsPanel({ event, onClose }: { event: EventItem; onClose: () => void }) {
  const supabase = createClient();
  const [bookings, setBookings] = useState<EventBookingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  useEffect(() => {
    db.fetchEventBookings(supabase, event.id)
      .then(setBookings)
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event.id]);

  function togglePaid(booking: EventBookingItem) {
    const paid = booking.paymentStatus !== "paid";
    setBookings((cur) => cur.map((b) => (b.id === booking.id ? { ...b, paymentStatus: paid ? "paid" : "unpaid" } : b)));
    db.markEventBookingPaid(supabase, booking.id, paid).catch(() => {});
  }

  function removeBooking(id: string) {
    setBookings((cur) => cur.filter((b) => b.id !== id));
    setConfirmDeleteId(null);
    db.deleteEventBooking(supabase, id).catch(() => {});
  }

  const booked = bookings.filter((b) => b.status === "booked");
  const waitlist = bookings.filter((b) => b.status === "waitlist");
  const seats = booked.reduce((sum, b) => sum + (b.plusOne ? 2 : 1), 0);
  const outstanding = bookings.filter((b) => b.paymentStatus === "unpaid").reduce((sum, b) => sum + b.price * (b.plusOne ? 2 : 1), 0);

  return (
    <Modal onClose={onClose} width={560}>
      <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: `1px solid ${COLORS.border}` }}>
        <div>
          <div style={{ fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 600, color: COLORS.heading }}>{event.name}</div>
          <div style={{ fontSize: 12, color: COLORS.inkSoft }}>
            {event.date} · {event.time}
          </div>
        </div>
        <button onClick={onClose} className="flex items-center justify-center" style={{ width: 36, height: 36 }}>
          <X size={18} />
        </button>
      </div>

      <div className="p-5 overflow-y-auto" style={{ flex: 1 }}>
        <div className="mb-4">
          <CapacityBar booked={seats} capacity={event.capacity} waiting={waitlist.length} />
        </div>

        {outstanding > 0 && (
          <div className="mb-4 px-3 py-2 rounded-lg text-sm font-semibold" style={{ background: withAlpha(COLORS.danger, 10), color: COLORS.danger }}>
            Da riscuotere: €{outstanding.toFixed(2)}
          </div>
        )}

        {loading ? (
          <div style={{ fontSize: 13, color: COLORS.inkSoft }}>Caricamento…</div>
        ) : bookings.length === 0 ? (
          <div style={{ fontSize: 13, color: COLORS.inkSoft }}>Nessuna prenotazione finora.</div>
        ) : (
          <div className="flex flex-col gap-2">
            {[...booked, ...waitlist].map((b) => (
              <div key={b.id} className="flex items-center justify-between p-3 rounded-xl flex-wrap gap-2" style={{ background: COLORS.card, border: `1px solid ${COLORS.border}` }}>
                <div>
                  <div className="flex items-center gap-1.5" style={{ fontSize: 13.5, fontWeight: 600 }}>
                    {b.displayName}
                    {!b.clientId && <Badge color={COLORS.inkSoft}>Ospite</Badge>}
                    {b.status === "waitlist" && <Badge color={COLORS.gold}>Lista d&apos;attesa</Badge>}
                    {b.plusOne && (
                      <span className="inline-flex items-center gap-0.5" style={{ fontSize: 11, color: COLORS.inkSoft }}>
                        <UserPlus size={11} /> {b.plusOneName}
                      </span>
                    )}
                  </div>
                  {b.guestEmail && (
                    <div className="flex items-center gap-1" style={{ fontSize: 11.5, color: COLORS.inkSoft }}>
                      <Mail size={11} /> {b.guestEmail}
                    </div>
                  )}
                  <div style={{ fontSize: 11.5, color: COLORS.inkSoft }}>€{(b.price * (b.plusOne ? 2 : 1)).toFixed(2)}</div>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => togglePaid(b)}
                    className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg"
                    style={{
                      color: b.paymentStatus === "paid" ? COLORS.success : COLORS.danger,
                      border: `1px solid ${withAlpha(b.paymentStatus === "paid" ? COLORS.success : COLORS.danger, 33)}`,
                      background: withAlpha(b.paymentStatus === "paid" ? COLORS.success : COLORS.danger, 8),
                    }}
                  >
                    <Check size={12} /> {b.paymentStatus === "paid" ? "Pagato" : "Da pagare"}
                  </button>
                  {confirmDeleteId === b.id ? (
                    <button onClick={() => removeBooking(b.id)} className="text-xs font-semibold px-2.5 py-1.5 rounded-lg text-white" style={{ background: COLORS.danger }}>
                      Conferma
                    </button>
                  ) : (
                    <button onClick={() => setConfirmDeleteId(b.id)} title="Cancella prenotazione" className="flex items-center justify-center rounded-lg" style={{ width: 30, height: 30, color: COLORS.inkSoft }}>
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
}
