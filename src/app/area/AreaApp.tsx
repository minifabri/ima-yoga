"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Check, Clock, X, Wallet, PackagePlus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { logout } from "@/app/actions";
import { COLORS } from "@/app/admin/colors";
import { WEEKDAYS, MONTHS, dateKey, isSameDay, getCalendarDays } from "@/app/admin/utils";
import * as db from "./data";
import type { ClassType, Level, MyBooking, MyLedgerEntry, MyPackage, PublicClass } from "./types";

export function AreaApp({ fullName }: { fullName: string }) {
  const supabase = useMemo(() => createClient(), []);
  const [view, setView] = useState<"calendar" | "mine">("calendar");
  const [viewDate, setViewDate] = useState(new Date());
  const [classTypes, setClassTypes] = useState<ClassType[]>([]);
  const [levels, setLevels] = useState<Level[]>([]);
  const [classes, setClasses] = useState<PublicClass[]>([]);
  const [myBookings, setMyBookings] = useState<MyBooking[]>([]);
  const [myPackages, setMyPackages] = useState<MyPackage[]>([]);
  const [myLedger, setMyLedger] = useState<MyLedgerEntry[]>([]);
  const [selected, setSelected] = useState<PublicClass | null>(null);
  const [pending, setPending] = useState(false);
  const [toast, setToast] = useState("");

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(""), 2600);
  }

  useEffect(() => {
    (async () => {
      const [types, lvls] = await Promise.all([db.fetchClassTypes(supabase), db.fetchLevels(supabase)]);
      setClassTypes(types);
      setLevels(lvls);
    })();
  }, [supabase]);

  const days = useMemo(() => getCalendarDays(viewDate), [viewDate]);

  useEffect(() => {
    const from = dateKey(days[0]);
    const to = dateKey(days[days.length - 1]);
    db.fetchPublicClasses(supabase, from, to).then(setClasses).catch(() => showToast("Errore nel caricamento del calendario."));
  }, [days, supabase]);

  async function refreshMine() {
    const [bookings, packages, ledger] = await Promise.all([
      db.fetchMyBookings(supabase),
      db.fetchMyPackages(supabase),
      db.fetchMyLedger(supabase),
    ]);
    setMyBookings(bookings);
    setMyPackages(packages);
    setMyLedger(ledger);
  }

  useEffect(() => {
    (async () => {
      try {
        await refreshMine();
      } catch {
        showToast("Errore nel caricamento dei tuoi dati.");
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase]);

  const typeById = useMemo(() => Object.fromEntries(classTypes.map((t) => [t.id, t])), [classTypes]);
  const levelById = useMemo(() => Object.fromEntries(levels.map((l) => [l.id, l])), [levels]);
  const classesByDay = useMemo(() => {
    const map: Record<string, PublicClass[]> = {};
    for (const c of classes) (map[c.date] = map[c.date] || []).push(c);
    Object.values(map).forEach((list) => list.sort((a, b) => a.time.localeCompare(b.time)));
    return map;
  }, [classes]);

  async function refreshClasses() {
    const from = dateKey(days[0]);
    const to = dateKey(days[days.length - 1]);
    const next = await db.fetchPublicClasses(supabase, from, to);
    setClasses(next);
    return next;
  }

  async function handleBook(c: PublicClass) {
    setPending(true);
    try {
      const status = await db.bookClass(supabase, c.id);
      showToast(status === "booked" ? "Prenotazione confermata." : "Classe piena: sei in lista d'attesa.");
      const next = await refreshClasses();
      setSelected(next.find((x) => x.id === c.id) || null);
      await refreshMine();
    } catch {
      showToast("Non è stato possibile completare la prenotazione.");
    } finally {
      setPending(false);
    }
  }

  async function handleCancel(classId: string) {
    setPending(true);
    try {
      await db.cancelBooking(supabase, classId);
      showToast("Prenotazione cancellata.");
      const next = await refreshClasses();
      setSelected((cur) => (cur ? next.find((x) => x.id === cur.id) || null : null));
      await refreshMine();
    } catch {
      showToast("Non è stato possibile cancellare la prenotazione.");
    } finally {
      setPending(false);
    }
  }

  const todayKey = dateKey(new Date());
  const upcomingBookings = [...myBookings].filter((b) => b.date >= todayKey).sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
  const pastBookings = [...myBookings].filter((b) => b.date < todayKey).sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time));

  const outstandingFromClasses = myBookings
    .filter((b) => b.status === "booked" && (b.paymentStatus === "unpaid" || b.paymentStatus === "partial"))
    .reduce((sum, b) => sum + Math.max(0, b.price - b.paymentAmount), 0);
  const ledgerBalance = myLedger.reduce((sum, e) => sum + (e.kind === "debt" ? e.amount : -e.amount), 0);
  const totalOwed = outstandingFromClasses + ledgerBalance;

  return (
    <div style={{ fontFamily: "var(--font-body)", background: COLORS.bg, color: COLORS.ink, minHeight: "100vh" }}>
      <div className="p-5" style={{ maxWidth: 860, margin: "0 auto" }}>
        <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
          <div>
            <div style={{ fontWeight: 700, fontSize: 10, letterSpacing: 2.5, color: COLORS.gold, textTransform: "uppercase" }}>Ciao {fullName.split(" ")[0]}</div>
            <div style={{ fontFamily: "var(--font-display)", fontWeight: 500, fontSize: 26, lineHeight: 1, color: COLORS.heading }}>ima yoga</div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex rounded-lg overflow-hidden" style={{ border: `1px solid ${COLORS.border}` }}>
              <button
                onClick={() => setView("calendar")}
                className="px-3 py-2 text-sm font-medium"
                style={{ background: view === "calendar" ? COLORS.primary : "transparent", color: view === "calendar" ? "#fff" : COLORS.ink }}
              >
                Calendario
              </button>
              <button
                onClick={() => setView("mine")}
                className="px-3 py-2 text-sm font-medium"
                style={{ background: view === "mine" ? COLORS.primary : "transparent", color: view === "mine" ? "#fff" : COLORS.ink }}
              >
                Le mie prenotazioni
              </button>
            </div>
            <form action={logout}>
              <button type="submit" className="text-sm font-medium px-2" style={{ color: COLORS.inkSoft }}>
                Esci
              </button>
            </form>
          </div>
        </div>

        {toast && (
          <div className="mb-4 flex items-center gap-2 text-sm rounded-lg px-3 py-2" style={{ background: COLORS.subtle, color: COLORS.primaryDark }}>
            <Check size={15} /> {toast}
          </div>
        )}

        {view === "calendar" ? (
          <div>
            <div className="flex items-center justify-between mb-4">
              <div style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 600, textTransform: "capitalize", color: COLORS.heading }}>
                {MONTHS[viewDate.getMonth()]} {viewDate.getFullYear()}
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setViewDate(new Date())}
                  className="px-3 py-1.5 rounded-lg text-sm font-medium mr-1"
                  style={{ border: `1px solid ${COLORS.border}` }}
                >
                  Oggi
                </button>
                <button
                  onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1))}
                  className="flex items-center justify-center rounded-lg"
                  style={{ width: 36, height: 36, border: `1px solid ${COLORS.border}` }}
                >
                  <ChevronLeft size={17} />
                </button>
                <button
                  onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1))}
                  className="flex items-center justify-center rounded-lg"
                  style={{ width: 36, height: 36, border: `1px solid ${COLORS.border}` }}
                >
                  <ChevronRight size={17} />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-7 mb-1">
              {WEEKDAYS.map((w) => (
                <div key={w} className="text-center py-2" style={{ fontSize: 11, fontWeight: 600, color: COLORS.inkSoft, textTransform: "uppercase" }}>
                  {w}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1.5">
              {days.map((d, i) => {
                const inMonth = d.getMonth() === viewDate.getMonth();
                const key = dateKey(d);
                const dayClasses = classesByDay[key] || [];
                const isToday = isSameDay(d, new Date());
                return (
                  <div
                    key={i}
                    className="flex flex-col"
                    style={{
                      minHeight: 84,
                      borderRadius: 12,
                      padding: 6,
                      background: inMonth ? COLORS.card : "transparent",
                      border: `1.5px solid ${inMonth ? COLORS.border : "transparent"}`,
                      opacity: inMonth ? 1 : 0.4,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 11.5,
                        fontWeight: isToday ? 700 : 500,
                        color: isToday ? "#fff" : COLORS.ink,
                        background: isToday ? COLORS.primary : "transparent",
                        width: 19,
                        height: 19,
                        borderRadius: 999,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        marginBottom: 4,
                      }}
                    >
                      {d.getDate()}
                    </span>
                    <div className="flex flex-col gap-1">
                      {dayClasses.map((c) => {
                        const type = typeById[c.typeId];
                        const color = type?.color || COLORS.primary;
                        const full = c.capacity > 0 && c.bookedCount >= c.capacity;
                        return (
                          <button
                            key={c.id}
                            onClick={() => setSelected(c)}
                            className="text-left truncate"
                            style={{
                              fontSize: 10.5,
                              padding: "3px 6px",
                              borderRadius: 6,
                              background: color + "1E",
                              borderLeft: `3px solid ${color}`,
                              color: COLORS.ink,
                            }}
                          >
                            <div style={{ fontWeight: 700 }}>{c.time}</div>
                            <div>{type?.name || "Classe"}</div>
                            <div style={{ color: c.myStatus ? COLORS.primaryDark : full ? COLORS.danger : COLORS.success, fontWeight: 600 }}>
                              {c.myStatus === "booked" ? "Prenotata" : c.myStatus === "waitlist" ? "In lista d'attesa" : full ? "Al completo" : "Posti liberi"}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div>
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
                    const type = typeById[b.typeId];
                    const level = levelById[b.levelId];
                    return (
                      <div key={b.id} className="flex items-center justify-between p-3 rounded-xl flex-wrap gap-2" style={{ background: COLORS.card, border: `1px solid ${COLORS.border}` }}>
                        <div>
                          <div style={{ fontSize: 13.5, fontWeight: 600 }}>
                            {b.date} · {b.time} — {type?.name || "Classe"}
                          </div>
                          <div style={{ fontSize: 11.5, color: COLORS.inkSoft }}>
                            {level?.name} {b.status === "waitlist" && <span style={{ color: COLORS.gold, fontWeight: 700 }}>· In lista d&apos;attesa</span>}
                          </div>
                        </div>
                        <button
                          disabled={pending}
                          onClick={() => handleCancel(b.classId)}
                          className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg"
                          style={{ color: COLORS.danger, border: `1px solid ${COLORS.danger}55` }}
                        >
                          <X size={12} /> Cancella
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

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
                        <div style={{ fontSize: 12, color: COLORS.inkSoft }}>Acquistato il {p.date}</div>
                        <div style={{ fontSize: 12, fontWeight: 600, color: debt > 0 ? COLORS.danger : COLORS.success }} className="mt-1">
                          {debt > 0 ? `Da saldare €${debt.toFixed(2)} di €${p.price}` : `Saldato · €${p.price}`}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div>
              <div className="flex items-center gap-2 mb-2">
                <Wallet size={16} color={COLORS.heading} />
                <div style={{ fontFamily: "var(--font-display)", fontSize: 19, fontWeight: 600, color: COLORS.heading }}>Il tuo saldo</div>
              </div>
              <div className="p-3 rounded-xl mb-2" style={{ background: COLORS.card, border: `1px solid ${COLORS.border}` }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: totalOwed > 0 ? COLORS.danger : COLORS.success }}>
                  {totalOwed > 0 ? `Da saldare: €${totalOwed.toFixed(2)}` : "Nessun saldo in sospeso"}
                </span>
              </div>
              {pastBookings.length > 0 && (
                <div style={{ fontSize: 11.5, color: COLORS.inkSoft }}>{pastBookings.length} classi svolte finora.</div>
              )}
            </div>
          </div>
        )}
      </div>

      {selected && (
        <div className="fixed inset-0 flex items-center justify-center p-4" style={{ background: "rgba(74,58,115,0.35)", zIndex: 50 }} onMouseDown={(e) => e.target === e.currentTarget && setSelected(null)}>
          <div className="w-full p-5" style={{ maxWidth: 380, background: COLORS.card, borderRadius: 18, boxShadow: "0 16px 44px rgba(74,58,115,0.16)" }}>
            <div className="flex items-center justify-between mb-3">
              <div style={{ fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 600, color: COLORS.heading }}>
                {typeById[selected.typeId]?.name || "Classe"}
              </div>
              <button onClick={() => setSelected(null)}>
                <X size={18} />
              </button>
            </div>
            <div style={{ fontSize: 13, color: COLORS.inkSoft }} className="mb-1">
              {selected.date} · {selected.time}
            </div>
            <div style={{ fontSize: 13, color: COLORS.inkSoft }} className="mb-4">
              {levelById[selected.levelId]?.name}
            </div>
            <div className="mb-4" style={{ fontSize: 12.5 }}>
              {selected.capacity > 0 ? `${selected.bookedCount}/${selected.capacity} posti occupati` : `${selected.bookedCount} iscritti`}
              {selected.waitlistCount > 0 && <span style={{ color: COLORS.gold, fontWeight: 700 }}> · {selected.waitlistCount} in lista d&apos;attesa</span>}
            </div>

            {selected.myStatus ? (
              <button
                disabled={pending}
                onClick={() => handleCancel(selected.id)}
                className="w-full py-2.5 rounded-lg text-sm font-semibold"
                style={{ color: COLORS.danger, border: `1px solid ${COLORS.danger}55` }}
              >
                {selected.myStatus === "waitlist" ? "Esci dalla lista d'attesa" : "Cancella prenotazione"}
              </button>
            ) : (
              <button
                disabled={pending}
                onClick={() => handleBook(selected)}
                className="w-full py-2.5 rounded-lg text-sm font-semibold text-white"
                style={{ background: COLORS.primary }}
              >
                {selected.capacity > 0 && selected.bookedCount >= selected.capacity ? "Aggiungimi in lista d'attesa" : "Prenota"}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
