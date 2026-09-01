"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Check,
  Clock,
  X,
  Moon,
  PackagePlus,
  Lock,
  LayoutGrid,
  List,
  CheckSquare,
  Square,
  CalendarClock,
  ChevronDown,
  History,
  Download,
  User,
  Gift,
  Megaphone,
  Bell,
  Sparkles,
  Bug,
  AtSign,
  MessageCircle,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { logout } from "@/app/actions";
import { COLORS, withAlpha } from "@/app/admin/colors";
import { ThemeToggle } from "@/app/admin/ThemeToggle";
import { WEEKDAYS, MONTHS, dateKey, isSameDay, getCalendarDays } from "@/app/admin/utils";
import * as db from "./data";
import { downloadIcsFile } from "@/lib/ics";
import { notifyClassFull } from "@/lib/notifications";
import type { Announcement, ClassType, ClientNotice, Level, MyBooking, MyLedgerEntry, MyPackage, PublicClass } from "./types";

const DISMISSED_ANNOUNCEMENTS_KEY = "ima-yoga-dismissed-announcements";

function formatLune(amount: number): string {
  const rounded = Math.round(amount * 100) / 100;
  const label = Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(2);
  return `${label} lune`;
}

function isPastClass(dateStr: string, timeStr: string): boolean {
  const dt = new Date(`${dateStr}T${(timeStr || "00:00").padEnd(5, "0")}:00`);
  return dt.getTime() < Date.now();
}

function availabilityLabel(c: PublicClass): { text: string; color: string } {
  if (c.myStatus === "booked") return { text: "Prenotata", color: COLORS.primaryDark };
  if (c.myStatus === "waitlist") return { text: "In lista d'attesa", color: COLORS.primaryDark };
  if (isPastClass(c.date, c.time)) return { text: "Lezione svolta", color: COLORS.inkSoft };
  if (!c.bookingsOpen) return { text: "Iscrizioni chiuse", color: COLORS.inkSoft };
  if (c.capacity <= 0) return { text: "Posti liberi", color: COLORS.success };
  const remaining = c.capacity - c.bookedCount;
  if (remaining <= 0) return { text: "Al completo", color: COLORS.danger };
  if (remaining === 1) return { text: "Ultimo posto libero", color: COLORS.gold };
  return { text: "Posti liberi", color: COLORS.success };
}

function typeInitials(name?: string): string {
  if (!name) return "?";
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

function canStillCancel(dateStr: string, timeStr: string): boolean {
  const dt = new Date(`${dateStr}T${(timeStr || "00:00").padEnd(5, "0")}:00`);
  return dt.getTime() - Date.now() >= 24 * 60 * 60 * 1000;
}

function errorMessage(err: unknown): string | null {
  if (err && typeof err === "object" && "message" in err && typeof (err as { message: unknown }).message === "string") {
    return (err as { message: string }).message;
  }
  return null;
}

export function AreaApp({ fullName, email }: { fullName: string; email: string }) {
  const supabase = useMemo(() => createClient(), []);
  const [view, setView] = useState<"calendar" | "mine">("calendar");
  const [viewDate, setViewDate] = useState(new Date());
  const [calendarMode, setCalendarMode] = useState<"grid" | "list">("grid");
  const [onlyMine, setOnlyMine] = useState(false);
  const [classTypes, setClassTypes] = useState<ClassType[]>([]);
  const [levels, setLevels] = useState<Level[]>([]);
  const [classes, setClasses] = useState<PublicClass[]>([]);
  const [bookingsOpen, setBookingsOpen] = useState(true);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [dismissedAnnouncementIds, setDismissedAnnouncementIds] = useState<string[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const raw = localStorage.getItem(DISMISSED_ANNOUNCEMENTS_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });
  const [myBookings, setMyBookings] = useState<MyBooking[]>([]);
  const [myPackages, setMyPackages] = useState<MyPackage[]>([]);
  const [myLedger, setMyLedger] = useState<MyLedgerEntry[]>([]);
  const [myNotices, setMyNotices] = useState<ClientNotice[]>([]);
  const [selected, setSelected] = useState<PublicClass | null>(null);
  const [justBookedId, setJustBookedId] = useState<string | null>(null);
  const [justCancelledId, setJustCancelledId] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordPending, setPasswordPending] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportMessage, setReportMessage] = useState("");
  const [reportError, setReportError] = useState<string | null>(null);
  const [reportPending, setReportPending] = useState(false);

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setPasswordError(null);
    if (newPassword.length < 6) {
      setPasswordError("La password deve avere almeno 6 caratteri.");
      return;
    }
    setPasswordPending(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setPasswordPending(false);
    if (error) {
      setPasswordError("Non è stato possibile aggiornare la password.");
      return;
    }
    setChangePasswordOpen(false);
    setNewPassword("");
    showToast("Password aggiornata.");
  }

  async function handleSubmitReport(e: React.FormEvent) {
    e.preventDefault();
    setReportError(null);
    if (!reportMessage.trim()) {
      setReportError("Scrivi qualche parola su cosa non ha funzionato.");
      return;
    }
    setReportPending(true);
    try {
      await db.submitIssueReport(supabase, reportMessage.trim());
      setReportOpen(false);
      setReportMessage("");
      showToast("Segnalazione inviata, grazie!");
    } catch (err) {
      setReportError(errorMessage(err) || "Non è stato possibile inviare la segnalazione.");
    } finally {
      setReportPending(false);
    }
  }
  const [toast, setToast] = useState<{ message: string; icon: "check" | "rose" } | null>(null);

  function showToast(msg: string, icon: "check" | "rose" = "check") {
    setToast({ message: msg, icon });
    setTimeout(() => setToast(null), 2600);
  }

  useEffect(() => {
    (async () => {
      const [types, lvls, open, notices, personalNotices] = await Promise.all([
        db.fetchClassTypes(supabase),
        db.fetchLevels(supabase),
        db.fetchBookingsOpen(supabase),
        db.fetchActiveAnnouncements(supabase),
        db.fetchMyNotices(supabase),
      ]);
      setClassTypes(types);
      setLevels(lvls);
      setBookingsOpen(open);
      setAnnouncements(notices);
      setMyNotices(personalNotices);
    })();
  }, [supabase]);

  function dismissAnnouncement(id: string) {
    setDismissedAnnouncementIds((cur) => {
      const next = [...cur, id];
      try {
        localStorage.setItem(DISMISSED_ANNOUNCEMENTS_KEY, JSON.stringify(next));
      } catch {
        // vedi commento sopra
      }
      return next;
    });
  }

  function dismissNotice(id: string) {
    setMyNotices((cur) => cur.filter((n) => n.id !== id));
    db.markNoticeRead(supabase, id).catch(() => {});
  }

  const visibleAnnouncements = announcements.filter((a) => !dismissedAnnouncementIds.includes(a.id));

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
  const visibleClasses = useMemo(() => (onlyMine ? classes.filter((c) => c.myStatus) : classes), [classes, onlyMine]);
  const classesByDay = useMemo(() => {
    const map: Record<string, PublicClass[]> = {};
    for (const c of visibleClasses) (map[c.date] = map[c.date] || []).push(c);
    Object.values(map).forEach((list) => list.sort((a, b) => a.time.localeCompare(b.time)));
    return map;
  }, [visibleClasses]);
  const listDays = useMemo(() => days.filter((d) => (classesByDay[dateKey(d)] || []).length > 0), [days, classesByDay]);

  async function goToNextClass() {
    const todayStr = dateKey(new Date());
    const { data, error } = await supabase
      .from("classes")
      .select("class_date")
      .gte("class_date", todayStr)
      .order("class_date")
      .order("class_time")
      .limit(1);
    if (error || !data || data.length === 0) {
      showToast("Nessuna lezione futura in programma.");
      return;
    }
    const [y, m] = data[0].class_date.split("-").map(Number);
    setViewDate(new Date(y, m - 1, 1));
  }

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
      const updated = next.find((x) => x.id === c.id) || null;
      setSelected(updated);
      if (status === "booked") {
        setJustBookedId(c.id);
      }
      if (status === "booked" && updated && updated.capacity > 0 && updated.bookedCount >= updated.capacity) {
        notifyClassFull({
          className: typeById[updated.typeId]?.name || "Classe",
          date: updated.date,
          time: updated.time,
          capacity: updated.capacity,
        }).catch(() => {});
      }
      await refreshMine();
    } catch (err) {
      showToast(errorMessage(err) || "Non è stato possibile completare la prenotazione.");
    } finally {
      setPending(false);
    }
  }

  async function handleCancel(classId: string) {
    setPending(true);
    try {
      await db.cancelBooking(supabase, classId);
      showToast("Prenotazione appassita. Rifiorirai alla prossima lezione.", "rose");
      setJustBookedId((cur) => (cur === classId ? null : cur));
      setJustCancelledId(classId);
      const next = await refreshClasses();
      setSelected((cur) => (cur ? next.find((x) => x.id === cur.id) || null : null));
      await refreshMine();
    } catch (err) {
      showToast(errorMessage(err) || "Non è stato possibile cancellare la prenotazione.");
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
            <button
              onClick={() => setReportOpen(true)}
              className="flex items-center justify-center rounded-lg"
              style={{ width: 36, height: 36, border: `1px solid ${COLORS.border}`, color: COLORS.inkSoft }}
              title="Segnala un problema"
            >
              <Bug size={15} />
            </button>
            <ThemeToggle />
            <div className="relative">
              <button
                onClick={() => setProfileMenuOpen((v) => !v)}
                className="flex items-center justify-center rounded-lg"
                style={{ width: 36, height: 36, border: `1px solid ${COLORS.border}`, color: COLORS.ink }}
                title="Account"
              >
                <User size={17} />
              </button>
              {profileMenuOpen && (
                <>
                  <div className="fixed inset-0" style={{ zIndex: 40 }} onClick={() => setProfileMenuOpen(false)} />
                  <div
                    className="absolute right-0 mt-2 p-3 rounded-xl"
                    style={{ zIndex: 41, minWidth: 220, background: COLORS.card, border: `1px solid ${COLORS.border}`, boxShadow: "0 8px 24px rgba(74,58,115,0.14)" }}
                  >
                    <div
                      style={{ fontSize: 12, color: COLORS.inkSoft, wordBreak: "break-all", borderBottom: `1px solid ${COLORS.border}` }}
                      className="mb-2 pb-2"
                    >
                      {email}
                    </div>
                    <button
                      onClick={() => {
                        setProfileMenuOpen(false);
                        setChangePasswordOpen(true);
                      }}
                      className="w-full text-left py-1.5 text-sm font-medium"
                      style={{ color: COLORS.ink }}
                    >
                      Cambia password
                    </button>
                    <form action={logout}>
                      <button type="submit" className="w-full text-left py-1.5 text-sm font-medium" style={{ color: COLORS.danger }}>
                        Esci
                      </button>
                    </form>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {myNotices.length > 0 && (
          <div className="flex flex-col gap-2 mb-4">
            {myNotices.map((n) => (
              <div
                key={n.id}
                className="flex items-start gap-2 text-sm rounded-lg px-3 py-2.5"
                style={{ background: withAlpha(COLORS.primary, 12), color: COLORS.primaryDark, border: `1px solid ${withAlpha(COLORS.primary, 30)}` }}
              >
                <Bell size={15} color={COLORS.primary} style={{ flexShrink: 0, marginTop: 1 }} />
                <span className="flex-1 flex items-center gap-1.5 flex-wrap">
                  {n.message}
                  {n.kind === "package_assigned" && <Sparkles size={13} color={COLORS.gold} style={{ flexShrink: 0 }} />}
                </span>
                <button onClick={() => dismissNotice(n.id)} title="Chiudi" style={{ color: COLORS.inkSoft, flexShrink: 0 }}>
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        )}

        {visibleAnnouncements.length > 0 && (
          <div className="flex flex-col gap-2 mb-4">
            {visibleAnnouncements.map((a) => (
              <div
                key={a.id}
                className="flex items-start gap-2 text-sm rounded-lg px-3 py-2.5"
                style={{ background: withAlpha(COLORS.gold, 14), color: COLORS.primaryDark, border: `1px solid ${withAlpha(COLORS.gold, 33)}` }}
              >
                <Megaphone size={15} color={COLORS.gold} style={{ flexShrink: 0, marginTop: 1 }} />
                <span className="flex-1">{a.message}</span>
                <button onClick={() => dismissAnnouncement(a.id)} title="Chiudi" style={{ color: COLORS.inkSoft, flexShrink: 0 }}>
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        )}

        {toast && (
          <div className="mb-4 flex items-center gap-2 text-sm rounded-lg px-3 py-2" style={{ background: COLORS.subtle, color: COLORS.primaryDark }}>
            {toast.icon === "rose" ? <span style={{ fontSize: 15, lineHeight: 1 }}>🥀</span> : <Check size={15} />}{" "}
            {toast.message}
          </div>
        )}

        {view === "calendar" ? (
          <div>
            {!bookingsOpen && (
              <div className="mb-4 flex items-center gap-2 text-sm rounded-lg px-3 py-2" style={{ background: withAlpha(COLORS.gold, 16), color: COLORS.gold }}>
                <Lock size={15} /> Le iscrizioni non sono ancora aperte.
              </div>
            )}
            <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
              <div style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 600, textTransform: "capitalize", color: COLORS.heading }}>
                {MONTHS[viewDate.getMonth()]} {viewDate.getFullYear()}
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setViewDate(new Date())}
                  className="px-2.5 py-1.5 rounded-lg text-xs font-medium"
                  style={{ border: `1px solid ${COLORS.border}` }}
                >
                  Oggi
                </button>
                <button
                  onClick={goToNextClass}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium mr-1"
                  style={{ border: `1px solid ${COLORS.border}` }}
                >
                  <CalendarClock size={13} /> Prossima lezione
                </button>
                <button
                  onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1))}
                  className="flex items-center justify-center rounded-lg"
                  style={{ width: 34, height: 34, border: `1px solid ${COLORS.border}` }}
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1))}
                  className="flex items-center justify-center rounded-lg"
                  style={{ width: 34, height: 34, border: `1px solid ${COLORS.border}` }}
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <div className="flex rounded-lg overflow-hidden" style={{ border: `1px solid ${COLORS.border}` }}>
                <button
                  onClick={() => setCalendarMode("grid")}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium"
                  style={{ background: calendarMode === "grid" ? COLORS.primary : "transparent", color: calendarMode === "grid" ? "#fff" : COLORS.ink }}
                >
                  <LayoutGrid size={13} /> Calendario
                </button>
                <button
                  onClick={() => setCalendarMode("list")}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium"
                  style={{ background: calendarMode === "list" ? COLORS.primary : "transparent", color: calendarMode === "list" ? "#fff" : COLORS.ink }}
                >
                  <List size={13} /> Elenco
                </button>
              </div>
              <button onClick={() => setOnlyMine((v) => !v)} className="flex items-center gap-1.5 text-xs font-medium" style={{ color: onlyMine ? COLORS.primaryDark : COLORS.inkSoft }}>
                {onlyMine ? <CheckSquare size={15} color={COLORS.primary} /> : <Square size={15} />} Solo le mie prenotazioni
              </button>
            </div>

            {calendarMode === "grid" ? (
              <>
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
                        className="flex flex-col rounded-[10px] sm:rounded-xl p-1 sm:p-1.5 min-h-[56px] sm:min-h-[84px]"
                        style={{
                          background: inMonth ? COLORS.card : "transparent",
                          border: `1.5px solid ${inMonth ? COLORS.border : "transparent"}`,
                          opacity: inMonth ? 1 : 0.4,
                        }}
                      >
                        {/* Mobile: card minimale */}
                        <div className="sm:hidden flex flex-col flex-1">
                          <span
                            style={{
                              fontSize: 10.5,
                              fontWeight: isToday ? 700 : 500,
                              color: isToday ? "#fff" : COLORS.ink,
                              background: isToday ? COLORS.primary : "transparent",
                              width: 16,
                              height: 16,
                              borderRadius: 999,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              marginBottom: 3,
                            }}
                          >
                            {d.getDate()}
                          </span>
                          <div className="flex flex-col gap-1">
                            {dayClasses.map((c) => {
                              const type = typeById[c.typeId];
                              const color = type?.color || COLORS.primary;
                              const avail = availabilityLabel(c);
                              return (
                                <button
                                  key={c.id}
                                  onClick={() => setSelected(c)}
                                  title={`${c.time} · ${type?.name || "Classe"}`}
                                  className="flex flex-col items-center justify-center w-full"
                                  style={{
                                    minHeight: 26,
                                    padding: "3px 2px",
                                    borderRadius: 5,
                                    background: withAlpha(color, 12),
                                    borderLeft: `2.5px solid ${color}`,
                                    gap: 2,
                                  }}
                                >
                                  <span className="flex items-center gap-0.5" style={{ fontSize: 9.5, fontWeight: 800, color: COLORS.ink, letterSpacing: 0.3 }}>
                                    {c.isFree && <Gift size={8} color={COLORS.gold} />}
                                    {typeInitials(type?.name)}
                                  </span>
                                  <span style={{ width: 5, height: 5, borderRadius: 999, background: avail.color, flexShrink: 0 }} />
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* Desktop: card completa, come in origine */}
                        <div className="hidden sm:flex sm:flex-col sm:flex-1">
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
                              const avail = availabilityLabel(c);
                              return (
                                <button
                                  key={c.id}
                                  onClick={() => setSelected(c)}
                                  className="text-left truncate"
                                  style={{
                                    fontSize: 10.5,
                                    padding: "3px 6px",
                                    borderRadius: 6,
                                    background: withAlpha(color, 12),
                                    borderLeft: `3px solid ${color}`,
                                    color: COLORS.ink,
                                  }}
                                >
                                  <div className="flex items-center gap-1" style={{ fontWeight: 700 }}>
                                    {c.time}
                                    {c.isFree && <span title="Classe gratuita" className="inline-flex"><Gift size={10} color={COLORS.gold} /></span>}
                                  </div>
                                  <div>{type?.name || "Classe"}</div>
                                  <div style={{ color: avail.color, fontWeight: 600 }}>{avail.text}</div>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            ) : (
              <div className="flex flex-col gap-4">
                {listDays.length === 0 && (
                  <div style={{ fontSize: 13, color: COLORS.inkSoft }} className="px-1">
                    Nessuna lezione in programma questo mese.
                  </div>
                )}
                {listDays.map((d) => {
                  const key = dateKey(d);
                  const dayClasses = classesByDay[key] || [];
                  const isToday = isSameDay(d, new Date());
                  return (
                    <div key={key}>
                      <div
                        style={{ fontSize: 11.5, fontWeight: 700, color: isToday ? COLORS.primary : COLORS.inkSoft, textTransform: "capitalize" }}
                        className="mb-1.5"
                      >
                        {WEEKDAYS[(d.getDay() + 6) % 7]} {d.getDate()} {MONTHS[d.getMonth()].slice(0, 3)}
                        {isToday && " · Oggi"}
                      </div>
                      <div className="flex flex-col gap-1.5">
                        {dayClasses.map((c) => {
                          const type = typeById[c.typeId];
                          const color = type?.color || COLORS.primary;
                          const avail = availabilityLabel(c);
                          return (
                            <button
                              key={c.id}
                              onClick={() => setSelected(c)}
                              className="flex items-center justify-between text-left p-2.5 rounded-lg w-full gap-2"
                              style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderLeft: `3px solid ${color}` }}
                            >
                              <div>
                                <div className="flex items-center gap-1" style={{ fontSize: 12.5, fontWeight: 700 }}>
                                  {c.time} · {type?.name || "Classe"}
                                  {c.isFree && <span title="Classe gratuita" className="inline-flex"><Gift size={11} color={COLORS.gold} /></span>}
                                </div>
                                <div style={{ fontSize: 11, color: COLORS.inkSoft }}>{levelById[c.levelId]?.name}</div>
                              </div>
                              <span style={{ fontSize: 11, fontWeight: 700, color: avail.color, whiteSpace: "nowrap" }}>{avail.text}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
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
                    const cancellable = canStillCancel(b.date, b.time);
                    return (
                      <div key={b.id} className="flex items-center justify-between p-3 rounded-xl flex-wrap gap-2" style={{ background: COLORS.card, border: `1px solid ${COLORS.border}` }}>
                        <div>
                          <div className="flex items-center gap-1" style={{ fontSize: 13.5, fontWeight: 600 }}>
                            {b.date} · {b.time} — {type?.name || "Classe"}
                            {b.isFree && <span title="Classe gratuita" className="inline-flex"><Gift size={11} color={COLORS.gold} /></span>}
                          </div>
                          <div style={{ fontSize: 11.5, color: COLORS.inkSoft }}>
                            {level?.name} {b.status === "waitlist" && <span style={{ color: COLORS.gold, fontWeight: 700 }}>· In lista d&apos;attesa</span>}
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() =>
                              downloadIcsFile(`${type?.name || "Classe"}-${b.date}`, [
                                { date: b.date, time: b.time, title: type?.name || "Classe", description: level?.name },
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
              </div>
            </div>

            {pastBookings.length > 0 && (
              <div className="mt-6">
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
                      const type = typeById[b.typeId];
                      const level = levelById[b.levelId];
                      return (
                        <div key={b.id} className="p-2.5 rounded-lg" style={{ background: COLORS.card, border: `1px solid ${COLORS.border}` }}>
                          <div style={{ fontSize: 12.5, fontWeight: 600 }}>
                            {b.date} · {b.time} — {type?.name || "Classe"}
                          </div>
                          <div style={{ fontSize: 11, color: COLORS.inkSoft }}>{level?.name}</div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        <div className="mt-8 pt-5 flex items-center justify-center gap-5" style={{ borderTop: `1px solid ${COLORS.border}` }}>
          <a
            href="https://www.instagram.com/ima.yo.ga/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5"
            style={{ fontSize: 13, fontWeight: 600, color: COLORS.inkSoft }}
          >
            <AtSign size={16} /> Instagram
          </a>
          <a
            href="https://chat.whatsapp.com/E3P9O46soqKDiUqgd3YOaf"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5"
            style={{ fontSize: 13, fontWeight: 600, color: COLORS.inkSoft }}
          >
            <MessageCircle size={16} /> WhatsApp
          </a>
        </div>
      </div>

      {selected && (
        <div
          className="fixed inset-0 flex items-center justify-center p-4"
          style={{ background: "rgba(74,58,115,0.35)", zIndex: 50 }}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) {
              setSelected(null);
              setJustBookedId(null);
              setJustCancelledId(null);
            }
          }}
        >
          <div
            className={`relative w-full p-5 ${justBookedId === selected.id ? "booking-celebration-card" : ""}`}
            style={{ maxWidth: 380, background: COLORS.card, borderRadius: 18, boxShadow: "0 16px 44px rgba(74,58,115,0.16)", overflow: "hidden" }}
          >
            <div className="flex items-center justify-between mb-3">
              <div style={{ fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 600, color: COLORS.heading }}>
                {typeById[selected.typeId]?.name || "Classe"}
              </div>
              <button
                onClick={() => {
                  setSelected(null);
                  setJustBookedId(null);
                  setJustCancelledId(null);
                }}
              >
                <X size={18} />
              </button>
            </div>
            <div className="flex items-center gap-1.5 flex-wrap mb-1">
              <span style={{ fontSize: 13, color: COLORS.inkSoft }}>
                {selected.date} · {selected.time}
              </span>
              {selected.isFree && (
                <span
                  className="inline-flex items-center gap-1 rounded-full"
                  style={{ fontSize: 10.5, fontWeight: 700, color: COLORS.gold, background: withAlpha(COLORS.gold, 16), padding: "1px 8px" }}
                >
                  <Gift size={10} /> Gratuita
                </span>
              )}
            </div>
            <div style={{ fontSize: 13, color: COLORS.inkSoft }} className="mb-3">
              {levelById[selected.levelId]?.name}
            </div>
            {(typeById[selected.typeId]?.description || selected.description) && (
              <div className="mb-3 p-2.5 rounded-lg" style={{ background: COLORS.subtle, fontSize: 12.5, color: COLORS.ink, lineHeight: 1.4 }}>
                {typeById[selected.typeId]?.description && <div>{typeById[selected.typeId]?.description}</div>}
                {selected.description && (
                  <div className={typeById[selected.typeId]?.description ? "mt-1.5" : ""}>{selected.description}</div>
                )}
              </div>
            )}
            <div className="mb-4" style={{ fontSize: 12.5, fontWeight: 600, color: availabilityLabel(selected).color }}>
              {availabilityLabel(selected).text}
            </div>

            {selected.myStatus === "booked" && justBookedId === selected.id && (
              <div className="booking-celebration-text mb-3 text-center" style={{ fontFamily: "var(--font-display)", fontSize: 17, fontWeight: 600, color: COLORS.gold }}>
                Complimenti, la lezione è tua!
              </div>
            )}

            {!selected.myStatus && justCancelledId === selected.id && (
              <div className="booking-celebration-text mb-3 text-center">
                <div style={{ fontSize: 26, lineHeight: 1 }} className="mb-1">
                  🥀
                </div>
                <div style={{ fontSize: 13, color: COLORS.inkSoft }}>Prenotazione appassita. Rifiorirai alla prossima lezione.</div>
              </div>
            )}

            {selected.myStatus === "booked" && canStillCancel(selected.date, selected.time) && (
              <div className="flex items-center gap-1.5 mb-3 justify-center" style={{ fontSize: 11.5, color: COLORS.inkSoft }}>
                <Clock size={12} style={{ flexShrink: 0 }} />
                Ricordati di disdire in tempo se non potrai partecipare.
              </div>
            )}

            {selected.myStatus === "booked" && (
              <button
                onClick={() =>
                  downloadIcsFile(`${typeById[selected.typeId]?.name || "Classe"}-${selected.date}`, [
                    {
                      date: selected.date,
                      time: selected.time,
                      title: typeById[selected.typeId]?.name || "Classe",
                      description: levelById[selected.levelId]?.name,
                    },
                  ])
                }
                className="w-full mb-2 py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-1.5"
                style={{ border: `1px solid ${COLORS.border}`, color: COLORS.primaryDark }}
              >
                <Download size={14} /> Aggiungi al calendario
              </button>
            )}

            {selected.myStatus ? (
              canStillCancel(selected.date, selected.time) ? (
                <button
                  disabled={pending}
                  onClick={() => handleCancel(selected.id)}
                  className="w-full py-2.5 rounded-lg text-sm font-semibold"
                  style={{ color: COLORS.danger, border: `1px solid ${withAlpha(COLORS.danger, 33)}` }}
                >
                  {selected.myStatus === "waitlist" ? "Esci dalla lista d'attesa" : "Cancella prenotazione"}
                </button>
              ) : (
                <div style={{ fontSize: 12.5, color: COLORS.inkSoft, fontStyle: "italic" }} className="text-center">
                  Meno di 24 ore alla lezione: per cancellare, contattaci direttamente.
                </div>
              )
            ) : isPastClass(selected.date, selected.time) ? (
              <div style={{ fontSize: 12.5, color: COLORS.inkSoft, fontStyle: "italic" }} className="text-center">
                Questa lezione è già passata.
              </div>
            ) : !bookingsOpen ? (
              <div style={{ fontSize: 12.5, color: COLORS.gold, fontWeight: 600 }} className="text-center">
                Le iscrizioni non sono ancora aperte.
              </div>
            ) : !selected.bookingsOpen ? (
              <div style={{ fontSize: 12.5, color: COLORS.inkSoft, fontWeight: 600 }} className="text-center">
                Le iscrizioni per questa classe non sono aperte.
              </div>
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

      {changePasswordOpen && (
        <div
          className="fixed inset-0 flex items-center justify-center p-4"
          style={{ background: "rgba(74,58,115,0.35)", zIndex: 50 }}
          onMouseDown={(e) => e.target === e.currentTarget && setChangePasswordOpen(false)}
        >
          <div className="w-full p-5" style={{ maxWidth: 340, background: COLORS.card, borderRadius: 18, boxShadow: "0 16px 44px rgba(74,58,115,0.16)" }}>
            <div className="flex items-center justify-between mb-3">
              <div style={{ fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 600, color: COLORS.heading }}>Cambia password</div>
              <button onClick={() => setChangePasswordOpen(false)}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleChangePassword} className="flex flex-col gap-3">
              <label className="block">
                <div style={{ fontSize: 11.5, fontWeight: 600, color: COLORS.inkSoft, marginBottom: 4 }}>Nuova password</div>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  minLength={6}
                  required
                  autoComplete="new-password"
                  style={{ width: "100%", border: `1px solid ${COLORS.border}`, borderRadius: 9, padding: "8px 10px", fontSize: 13, background: COLORS.bg, color: COLORS.ink, outline: "none" }}
                />
              </label>
              {passwordError && (
                <div className="text-sm rounded-lg px-3 py-2" style={{ background: "#F6E7E2", color: COLORS.danger }}>
                  {passwordError}
                </div>
              )}
              <button
                type="submit"
                disabled={passwordPending}
                className="py-2.5 rounded-lg text-sm font-semibold text-white disabled:opacity-60"
                style={{ background: COLORS.primary }}
              >
                {passwordPending ? "Salvataggio…" : "Salva"}
              </button>
            </form>
          </div>
        </div>
      )}

      {reportOpen && (
        <div
          className="fixed inset-0 flex items-center justify-center p-4"
          style={{ background: "rgba(74,58,115,0.35)", zIndex: 50 }}
          onMouseDown={(e) => e.target === e.currentTarget && setReportOpen(false)}
        >
          <div className="w-full p-5" style={{ maxWidth: 360, background: COLORS.card, borderRadius: 18, boxShadow: "0 16px 44px rgba(74,58,115,0.16)" }}>
            <div className="flex items-center justify-between mb-2">
              <div style={{ fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 600, color: COLORS.heading }}>Segnala un problema</div>
              <button onClick={() => setReportOpen(false)}>
                <X size={18} />
              </button>
            </div>
            <div style={{ fontSize: 12.5, color: COLORS.inkSoft, lineHeight: 1.4 }} className="mb-3">
              Anche i guru possono sbagliare, ogni tanto — raccontaci cosa non ha funzionato.
            </div>
            <form onSubmit={handleSubmitReport} className="flex flex-col gap-3">
              <textarea
                value={reportMessage}
                onChange={(e) => setReportMessage(e.target.value)}
                rows={4}
                required
                placeholder="Cosa hai trovato che non va?"
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
              {reportError && (
                <div className="text-sm rounded-lg px-3 py-2" style={{ background: "#F6E7E2", color: COLORS.danger }}>
                  {reportError}
                </div>
              )}
              <button
                type="submit"
                disabled={reportPending}
                className="py-2.5 rounded-lg text-sm font-semibold text-white disabled:opacity-60"
                style={{ background: COLORS.primary }}
              >
                {reportPending ? "Invio…" : "Invia segnalazione"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
