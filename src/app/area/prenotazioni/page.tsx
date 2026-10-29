"use client";

import { useState } from "react";
import { ChevronDown, Clock, Download, Gift, History, Info, Moon, PackagePlus, Sparkles, User, X } from "lucide-react";
import { COLORS, withAlpha } from "@/app/admin/colors";
import { dateKey, owedAmount } from "@/app/admin/utils";
import { downloadIcsFile } from "@/lib/ics";
import { classTitle } from "@/lib/classTitle";
import { canStillCancel, formatLune, isPastClass } from "../helpers";
import { useArea } from "../AreaShell";
import type { MyEventBooking } from "../types";

export default function AreaPrenotazioniPage() {
  const {
    myBookings,
    myEventBookings,
    myPackages,
    myLedger,
    typeById,
    levelById,
    pending,
    handleCancel,
    handleCancelEvent,
    myOverdue,
  } = useArea();
  const [confirmCancelEvent, setConfirmCancelEvent] = useState<MyEventBooking | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);

  const todayKey = dateKey(new Date());
  const upcomingBookings = [...myBookings].filter((b) => b.date >= todayKey).sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
  const pastBookings = [...myBookings].filter((b) => b.date < todayKey).sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time));

  const outstandingFromClasses = myBookings
    .filter((b) => b.status === "booked" && (b.paymentStatus === "unpaid" || b.paymentStatus === "partial"))
    .reduce((sum, b) => sum + Math.max(0, b.price - b.paymentAmount), 0);
  const ledgerBalance = myLedger.reduce((sum, e) => sum + (e.kind === "debt" ? e.amount : -e.amount), 0);
  const totalOwed = outstandingFromClasses + ledgerBalance;

  function openHistory() {
    setHistoryOpen(true);
    requestAnimationFrame(() => document.getElementById("storico-classi")?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }

  return (
    <div>
      {myOverdue.count > 0 && (
        <div
          className="mb-5 flex items-start gap-2.5 rounded-xl px-3.5 py-2.5"
          style={{ background: withAlpha(COLORS.gold, 10), border: `1px solid ${withAlpha(COLORS.gold, 35)}` }}
        >
          <Info size={15} color={COLORS.goldText} className="flex-shrink-0" style={{ marginTop: 2 }} />
          <div style={{ fontSize: 12.5, color: COLORS.ink, lineHeight: 1.45 }}>
            Un piccolo promemoria: {myOverdue.count === 1 ? "risulta 1 lezione già svolta" : `risultano ${myOverdue.count} lezioni già svolte`} ancora da saldare (
            {formatLune(myOverdue.total)}). Puoi regolare alla prossima lezione.{" "}
            {pastBookings.length > 0 && (
              <button onClick={openHistory} className="font-semibold underline" style={{ color: COLORS.goldText }}>
                Vedi quali
              </button>
            )}
          </div>
        </div>
      )}

      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <Clock size={16} color={COLORS.heading} />
          <div style={{ fontFamily: "var(--font-display)", fontSize: 19, fontWeight: 600, color: COLORS.heading }}>Prossime classi</div>
        </div>
        {upcomingBookings.length === 0 ? (
          <div style={{ fontSize: 13, color: COLORS.inkSoft }}>Nessuna prenotazione in programma.</div>
        ) : (
          <div className="flex flex-col gap-2">
            {upcomingBookings.map((b) => {
              const title = classTitle(b.isPersonal, b.typeId, typeById);
              const level = levelById[b.levelId];
              const cancellable = canStillCancel(b.date, b.time);
              return (
                <div key={b.id} className="flex items-center justify-between p-3 rounded-xl flex-wrap gap-2" style={{ background: COLORS.card, border: `1px solid ${COLORS.border}` }}>
                  <div>
                    <div className="flex items-center gap-1" style={{ fontSize: 13.5, fontWeight: 600 }}>
                      {b.date} · {b.time} — {title}
                      {b.isFree && <span title="Classe gratuita" className="inline-flex"><Gift size={11} color={COLORS.gold} /></span>}
                      {b.isPersonal && <span title="Lezione individuale" className="inline-flex"><User size={11} color={COLORS.primary} /></span>}
                    </div>
                    <div style={{ fontSize: 11.5, color: COLORS.inkSoft }}>
                      {level?.name} {b.status === "waitlist" && <span style={{ color: COLORS.goldText, fontWeight: 700 }}>· In lista d&apos;attesa</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() =>
                        downloadIcsFile(`${title}-${b.date}`, [
                          { date: b.date, time: b.time, title, description: level?.name },
                        ])
                      }
                      title="Aggiungi al calendario"
                      className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg"
                      style={{ color: COLORS.primaryDark, border: `1px solid ${COLORS.border}` }}
                    >
                      <Download size={12} /> Calendario
                    </button>
                    {cancellable ? (
                      <button
                        disabled={pending}
                        onClick={() => handleCancel(b.classId)}
                        className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg"
                        style={{ color: COLORS.danger, border: `1px solid ${withAlpha(COLORS.danger, 33)}` }}
                      >
                        <X size={12} /> Cancella
                      </button>
                    ) : (
                      <span style={{ fontSize: 11, color: COLORS.inkSoft, fontStyle: "italic" }}>Per cancellare ora, contattaci</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {myEventBookings.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles size={16} color={COLORS.heading} />
            <div style={{ fontFamily: "var(--font-display)", fontSize: 19, fontWeight: 600, color: COLORS.heading }}>I tuoi eventi</div>
          </div>
          <div className="flex flex-col gap-2">
            {myEventBookings.map((b) => {
              const pastEvent = isPastClass(b.date, b.time);
              return (
                <div
                  key={b.id}
                  className="flex items-center justify-between p-3 rounded-xl flex-wrap gap-2"
                  style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, opacity: pastEvent ? 0.6 : 1 }}
                >
                  <div>
                    <div style={{ fontSize: 13.5, fontWeight: 600 }}>
                      {b.date} · {b.time} — {b.eventName}
                      {b.plusOne && <span style={{ fontWeight: 500, color: COLORS.inkSoft }}> · +1 {b.plusOneName}</span>}
                    </div>
                    <div style={{ fontSize: 11.5, color: COLORS.inkSoft }}>
                      {pastEvent ? (
                        <span style={{ fontStyle: "italic" }}>
                          Evento passato
                          {b.status === "booked" && b.paymentStatus !== "paid" && b.price > 0 && (
                            <span style={{ fontStyle: "normal", color: COLORS.goldText, fontWeight: 600 }}> · Da saldare {formatLune(b.price * (b.plusOne ? 2 : 1))}</span>
                          )}
                        </span>
                      ) : b.status === "waitlist" ? (
                        <span style={{ color: COLORS.goldText, fontWeight: 700 }}>In lista d&apos;attesa</span>
                      ) : b.paymentStatus === "paid" ? (
                        <span style={{ color: COLORS.success, fontWeight: 600 }}>Pagato</span>
                      ) : (
                        <span style={{ color: COLORS.danger, fontWeight: 600 }}>Da saldare {formatLune(b.price * (b.plusOne ? 2 : 1))}</span>
                      )}
                    </div>
                  </div>
                  {!pastEvent &&
                    (b.cancellationDisabled ? (
                      <span style={{ fontSize: 11, color: COLORS.inkSoft, fontStyle: "italic" }}>Per cancellare ora, contattaci</span>
                    ) : (
                      <button
                        disabled={pending}
                        onClick={() => setConfirmCancelEvent(b)}
                        className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg"
                        style={{ color: COLORS.danger, border: `1px solid ${withAlpha(COLORS.danger, 33)}` }}
                      >
                        <X size={12} /> Cancella
                      </button>
                    ))}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <PackagePlus size={16} color={COLORS.heading} />
          <div style={{ fontFamily: "var(--font-display)", fontSize: 19, fontWeight: 600, color: COLORS.heading }}>Il tuo pacchetto</div>
        </div>
        {myPackages.length === 0 ? (
          <div style={{ fontSize: 13, color: COLORS.inkSoft }}>Nessun pacchetto attivo.</div>
        ) : (
          <div className="flex flex-col gap-2">
            {myPackages.map((p) => {
              const debt = p.price - p.paidAmount;
              return (
                <div key={p.id} className="p-3 rounded-xl" style={{ background: COLORS.card, border: `1px solid ${COLORS.border}` }}>
                  <div style={{ fontSize: 13.5, fontWeight: 600 }} className="mb-1">
                    {p.used}/{p.size} lezioni svolte · {p.remaining} disponibili
                  </div>
                  <div style={{ fontSize: 12, color: COLORS.inkSoft }}>Assegnato il {p.date}</div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: debt > 0 ? COLORS.danger : COLORS.success }} className="mt-1">
                    {debt > 0 ? `Da saldare ${formatLune(debt)} di ${formatLune(p.price)}` : `Saldato · ${formatLune(p.price)}`}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div>
        <div className="flex items-center gap-2 mb-2">
          <Moon size={16} color={COLORS.heading} />
          <div style={{ fontFamily: "var(--font-display)", fontSize: 19, fontWeight: 600, color: COLORS.heading }}>Il tuo saldo</div>
        </div>
        <div className="p-3 rounded-xl mb-2" style={{ background: COLORS.card, border: `1px solid ${COLORS.border}` }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: totalOwed > 0 ? COLORS.danger : COLORS.success }}>
            {totalOwed > 0 ? `Da saldare: ${formatLune(totalOwed)}` : "Nessun saldo in sospeso"}
          </span>
          {totalOwed > 0 && myOverdue.total > 0 && (
            <div style={{ fontSize: 11.5, color: COLORS.inkSoft }} className="mt-0.5">
              di cui {formatLune(myOverdue.total)} per lezioni o eventi già svolti
            </div>
          )}
        </div>
      </div>

      {pastBookings.length > 0 && (
        <div className="mt-6" id="storico-classi" style={{ scrollMarginTop: 16 }}>
          <button
            onClick={() => setHistoryOpen((v) => !v)}
            className="flex items-center gap-2 w-full text-left"
            style={{ color: COLORS.heading }}
          >
            <History size={16} />
            <span style={{ fontFamily: "var(--font-display)", fontSize: 19, fontWeight: 600 }}>Storico classi svolte</span>
            <span style={{ fontSize: 12, color: COLORS.inkSoft }}>({pastBookings.length})</span>
            <ChevronDown
              size={16}
              color={COLORS.inkSoft}
              style={{ marginLeft: "auto", transform: historyOpen ? "rotate(180deg)" : "none", transition: "transform .15s" }}
            />
          </button>
          {historyOpen && (
            <div className="flex flex-col gap-1.5 mt-2">
              {pastBookings.map((b) => {
                const title = classTitle(b.isPersonal, b.typeId, typeById);
                const level = levelById[b.levelId];
                const owed = b.status === "booked" ? owedAmount({ status: b.paymentStatus, amount: b.paymentAmount, price: b.price }) : 0;
                return (
                  <div
                    key={b.id}
                    className="p-2.5 rounded-lg"
                    style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderLeft: owed > 0 ? `3px solid ${COLORS.goldText}` : undefined }}
                  >
                    <div style={{ fontSize: 12.5, fontWeight: 600 }}>
                      {b.date} · {b.time} — {title}
                    </div>
                    <div style={{ fontSize: 11, color: COLORS.inkSoft }}>
                      {level?.name}
                      {owed > 0 && <span style={{ color: COLORS.goldText, fontWeight: 600 }}> · Da saldare {formatLune(owed)}</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {confirmCancelEvent && (
        <div
          className="fixed inset-0 flex items-center justify-center p-4"
          style={{ background: "rgba(74,58,115,0.35)", zIndex: 50 }}
          onMouseDown={(e) => e.target === e.currentTarget && setConfirmCancelEvent(null)}
        >
          <div className="w-full p-5" style={{ maxWidth: 360, background: COLORS.card, borderRadius: 18, boxShadow: "0 16px 44px rgba(74,58,115,0.16)" }}>
            <div style={{ fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 600, color: COLORS.heading }} className="mb-1">
              Cancellare la prenotazione?
            </div>
            <div style={{ fontSize: 13, color: COLORS.inkSoft }} className="mb-4">
              {confirmCancelEvent.eventName} — {confirmCancelEvent.date} · {confirmCancelEvent.time}. L&apos;azione non può essere annullata.
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setConfirmCancelEvent(null)}
                className="px-3 py-2 rounded-lg text-sm font-medium"
                style={{ border: `1px solid ${COLORS.border}` }}
              >
                Torna indietro
              </button>
              <button
                disabled={pending}
                onClick={() => {
                  const eventId = confirmCancelEvent.eventId;
                  setConfirmCancelEvent(null);
                  handleCancelEvent(eventId);
                }}
                className="px-3 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-60"
                style={{ background: COLORS.danger }}
              >
                Cancella prenotazione
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
