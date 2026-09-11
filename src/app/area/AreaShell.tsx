"use client";

import { createContext, useActionState, useContext, useEffect, useMemo, useState, type CSSProperties, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowLeft,
  AtSign,
  Bell,
  Bug,
  Check,
  ClipboardList,
  Clock,
  Download,
  Gift,
  Megaphone,
  MessageCircle,
  PackagePlus,
  Sparkles,
  Trash2,
  User,
  UserCheck,
  X,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { logout } from "@/app/actions";
import { deleteOwnAccount, type DeleteAccountState } from "./actions";
import { COLORS, withAlpha } from "@/app/admin/colors";
import { ThemeToggle } from "@/app/admin/ThemeToggle";
import { Logo } from "@/app/admin/Logo";
import { dateKey, getCalendarDays } from "@/app/admin/utils";
import * as db from "./data";
import { downloadIcsFile } from "@/lib/ics";
import { notifyClassFull } from "@/lib/notifications";
import { availabilityLabel, canStillCancel, errorMessage, formatNoticeDate, isPastClass } from "./helpers";
import type { Announcement, ClassType, ClientNotice, Level, MyBooking, MyEventBooking, MyLedgerEntry, MyPackage, PublicClass, PublicEvent } from "./types";

const DISMISSED_ANNOUNCEMENTS_KEY = "ima-yoga-dismissed-announcements";

type AreaContextValue = {
  classTypes: ClassType[];
  levels: Level[];
  typeById: Record<string, ClassType>;
  levelById: Record<string, Level>;
  classes: PublicClass[];
  events: PublicEvent[];
  bookingsOpen: boolean;
  viewDate: Date;
  setViewDate: (d: Date) => void;
  days: Date[];
  goToNextClass: () => void;
  setSelected: (c: PublicClass | null) => void;
  myBookings: MyBooking[];
  myEventBookings: MyEventBooking[];
  myPackages: MyPackage[];
  myLedger: MyLedgerEntry[];
  pending: boolean;
  handleBook: (c: PublicClass) => Promise<void>;
  handleCancel: (classId: string) => Promise<void>;
  handleCancelEvent: (eventId: string) => Promise<void>;
};

const AreaContext = createContext<AreaContextValue | null>(null);

export function useArea() {
  const ctx = useContext(AreaContext);
  if (!ctx) throw new Error("useArea must be used within <AreaShell>");
  return ctx;
}

export function AreaShell({ fullName, email, children }: { fullName: string; email: string; children: ReactNode }) {
  const supabase = useMemo(() => createClient(), []);
  const pathname = usePathname();
  const isHome = pathname === "/area";
  const isMine = pathname === "/area/prenotazioni";

  const [viewDate, setViewDate] = useState(new Date());
  const [classTypes, setClassTypes] = useState<ClassType[]>([]);
  const [levels, setLevels] = useState<Level[]>([]);
  const [classes, setClasses] = useState<PublicClass[]>([]);
  const [events, setEvents] = useState<PublicEvent[]>([]);
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
  const [myEventBookings, setMyEventBookings] = useState<MyEventBooking[]>([]);
  const [myPackages, setMyPackages] = useState<MyPackage[]>([]);
  const [myLedger, setMyLedger] = useState<MyLedgerEntry[]>([]);
  const [myNotices, setMyNotices] = useState<ClientNotice[]>([]);
  const [unreadNoticeCount, setUnreadNoticeCount] = useState(0);
  const [selected, setSelected] = useState<PublicClass | null>(null);
  const [justBookedId, setJustBookedId] = useState<string | null>(null);
  const [justCancelledId, setJustCancelledId] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordPending, setPasswordPending] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportMessage, setReportMessage] = useState("");
  const [reportError, setReportError] = useState<string | null>(null);
  const [reportPending, setReportPending] = useState(false);
  const [deleteAccountOpen, setDeleteAccountOpen] = useState(false);
  const [deleteConfirmWord, setDeleteConfirmWord] = useState("");
  const [deleteAccountState, deleteAccountFormAction, deleteAccountPending] = useActionState<DeleteAccountState, FormData>(
    deleteOwnAccount,
    { error: null }
  );
  const [toast, setToast] = useState<{ message: string; icon: "check" | "rose" } | null>(null);

  function showToast(msg: string, icon: "check" | "rose" = "check") {
    setToast({ message: msg, icon });
    setTimeout(() => setToast(null), 2600);
  }

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
      setUnreadNoticeCount(personalNotices.filter((n) => !n.read).length);
    })();
  }, [supabase]);

  function toggleNotifications() {
    setProfileMenuOpen(false);
    setNotificationsOpen((v) => {
      const next = !v;
      if (next && unreadNoticeCount > 0) {
        setUnreadNoticeCount(0);
        setMyNotices((cur) => cur.map((n) => (n.read ? n : { ...n, read: true })));
        db.markAllNoticesRead(supabase).catch(() => {});
      }
      return next;
    });
  }

  function dismissAnnouncement(id: string) {
    setDismissedAnnouncementIds((cur) => {
      const next = [...cur, id];
      try {
        localStorage.setItem(DISMISSED_ANNOUNCEMENTS_KEY, JSON.stringify(next));
      } catch {
        // localStorage non disponibile (es. modalità privata): l'app funziona comunque
      }
      return next;
    });
  }

  function deleteNotice(id: string) {
    setMyNotices((cur) => cur.filter((n) => n.id !== id));
    db.deleteMyNotice(supabase, id).catch(() => {});
  }

  const visibleAnnouncements = announcements.filter((a) => !dismissedAnnouncementIds.includes(a.id));

  const days = useMemo(() => getCalendarDays(viewDate), [viewDate]);

  useEffect(() => {
    const from = dateKey(days[0]);
    const to = dateKey(days[days.length - 1]);
    db.fetchPublicClasses(supabase, from, to).then(setClasses).catch(() => showToast("Errore nel caricamento del calendario."));
  }, [days, supabase]);

  useEffect(() => {
    const from = dateKey(new Date());
    const future = new Date();
    future.setDate(future.getDate() + 180);
    const to = dateKey(future);
    db.fetchPublicEvents(supabase, from, to).then(setEvents).catch(() => {});
  }, [supabase]);

  async function refreshMine() {
    const [bookings, eventBookings, packages, ledger] = await Promise.all([
      db.fetchMyBookings(supabase),
      db.fetchMyEventBookings(supabase),
      db.fetchMyPackages(supabase),
      db.fetchMyLedger(supabase),
    ]);
    setMyBookings(bookings);
    setMyEventBookings(eventBookings);
    setMyPackages(packages);
    setMyLedger(ledger);
  }

  async function handleCancelEvent(eventId: string) {
    setPending(true);
    try {
      await db.cancelMyEventBooking(supabase, eventId);
      setMyEventBookings((cur) => cur.filter((b) => b.eventId !== eventId));
      showToast("Prenotazione evento cancellata.");
    } catch {
      showToast("Errore nella cancellazione.");
    } finally {
      setPending(false);
    }
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
      showToast("Prenotazione cancellata. Il tuo tappetino ti aspetta quando vuoi tornare.", "rose");
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

  const value: AreaContextValue = {
    classTypes,
    levels,
    typeById,
    levelById,
    classes,
    events,
    bookingsOpen,
    viewDate,
    setViewDate,
    days,
    goToNextClass,
    setSelected,
    myBookings,
    myEventBookings,
    myPackages,
    myLedger,
    pending,
    handleBook,
    handleCancel,
    handleCancelEvent,
  };

  return (
    <AreaContext.Provider value={value}>
      <div style={{ fontFamily: "var(--font-body)", background: COLORS.bg, color: COLORS.ink, minHeight: "100vh" }}>
        <div className="p-5" style={{ maxWidth: 860, margin: "0 auto" }}>
          <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
            <div className="flex items-center gap-2">
              {!isHome && (
                <Link
                  href="/area"
                  className="md:hidden flex items-center justify-center rounded-lg"
                  style={{ width: 32, height: 32, border: `1px solid ${COLORS.border}`, color: COLORS.ink, flexShrink: 0 }}
                  title="Home"
                >
                  <ArrowLeft size={16} />
                </Link>
              )}
              <Logo kicker={`Ciao ${fullName.split(" ")[0]}`} />
            </div>
            <div className="flex items-center gap-2">
              <div className="hidden md:flex rounded-lg overflow-hidden" style={{ border: `1px solid ${COLORS.border}` }}>
                <Link
                  href="/area/calendario"
                  className="px-3 py-2 text-sm font-medium"
                  style={{ background: !isMine ? COLORS.primary : "transparent", color: !isMine ? "#fff" : COLORS.ink }}
                >
                  Calendario
                </Link>
                <Link
                  href="/area/prenotazioni"
                  className="px-3 py-2 text-sm font-medium"
                  style={{ background: isMine ? COLORS.primary : "transparent", color: isMine ? "#fff" : COLORS.ink }}
                >
                  Le mie prenotazioni
                </Link>
              </div>
              <div className="hidden md:block">
                <ThemeToggle />
              </div>
              <div className="relative">
                <button
                  onClick={toggleNotifications}
                  className="flex items-center justify-center rounded-lg relative"
                  style={{ width: 36, height: 36, border: `1px solid ${COLORS.border}`, color: COLORS.ink }}
                  title="Notifiche"
                >
                  <Bell size={16} />
                  {unreadNoticeCount > 0 && (
                    <span
                      className="absolute flex items-center justify-center rounded-full"
                      style={{
                        top: -4,
                        right: -4,
                        minWidth: 16,
                        height: 16,
                        padding: "0 3px",
                        fontSize: 10,
                        fontWeight: 700,
                        lineHeight: 1,
                        color: "#fff",
                        background: COLORS.danger,
                      }}
                    >
                      {unreadNoticeCount}
                    </span>
                  )}
                </button>
                {notificationsOpen && (
                  <>
                    <div className="fixed inset-0" style={{ zIndex: 40 }} onClick={() => setNotificationsOpen(false)} />
                    <div
                      className="absolute right-0 mt-2 rounded-xl overflow-hidden"
                      style={{
                        zIndex: 41,
                        width: 320,
                        maxWidth: "88vw",
                        background: COLORS.card,
                        border: `1px solid ${COLORS.border}`,
                        boxShadow: "0 8px 24px rgba(74,58,115,0.14)",
                      }}
                    >
                      <div
                        className="px-3 py-2.5"
                        style={{ fontSize: 12.5, fontWeight: 700, color: COLORS.heading, borderBottom: `1px solid ${COLORS.border}` }}
                      >
                        Notifiche
                      </div>
                      <div style={{ maxHeight: 340, overflowY: "auto" }}>
                        {myNotices.length === 0 ? (
                          <div className="px-3 py-5 text-center" style={{ fontSize: 12.5, color: COLORS.inkSoft }}>
                            Nessuna notifica.
                          </div>
                        ) : (
                          myNotices.map((n) => {
                            const icon =
                              n.kind === "survey_published" ? (
                                <ClipboardList size={14} color={COLORS.primary} style={{ flexShrink: 0, marginTop: 1, opacity: n.read ? 0.6 : 1 }} />
                              ) : n.kind === "package_assigned" ? (
                                <PackagePlus size={14} color={COLORS.gold} style={{ flexShrink: 0, marginTop: 1, opacity: n.read ? 0.6 : 1 }} />
                              ) : n.kind === "welcome" ? (
                                <Sparkles size={14} color={COLORS.gold} style={{ flexShrink: 0, marginTop: 1, opacity: n.read ? 0.6 : 1 }} />
                              ) : n.kind === "waitlist_promoted" ? (
                                <UserCheck size={14} color={COLORS.success} style={{ flexShrink: 0, marginTop: 1, opacity: n.read ? 0.6 : 1 }} />
                              ) : (
                                <Bell size={14} color={COLORS.primary} style={{ flexShrink: 0, marginTop: 1, opacity: n.read ? 0.6 : 1 }} />
                              );
                            const rowStyle: CSSProperties = {
                              borderBottom: `1px solid ${COLORS.border}`,
                              background: n.read ? "transparent" : withAlpha(COLORS.primary, 7),
                            };
                            const content = (
                              <>
                                {icon}
                                <div className="flex-1 min-w-0">
                                  <div style={{ fontSize: 13, color: n.read ? COLORS.inkSoft : COLORS.ink, fontWeight: n.read ? 400 : 600 }}>{n.message}</div>
                                  <div style={{ fontSize: 11, color: COLORS.inkSoft }} className="mt-0.5">
                                    {formatNoticeDate(n.createdAt)}
                                  </div>
                                </div>
                                <button
                                  onClick={(e) => {
                                    e.preventDefault();
                                    deleteNotice(n.id);
                                  }}
                                  title="Elimina"
                                  style={{ color: COLORS.inkSoft, flexShrink: 0 }}
                                >
                                  <Trash2 size={13} />
                                </button>
                              </>
                            );
                            return n.linkPath ? (
                              <Link
                                key={n.id}
                                href={n.linkPath}
                                onClick={() => setNotificationsOpen(false)}
                                className="flex items-start gap-2 px-3 py-2.5"
                                style={rowStyle}
                              >
                                {content}
                              </Link>
                            ) : (
                              <div key={n.id} className="flex items-start gap-2 px-3 py-2.5" style={rowStyle}>
                                {content}
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>
              <div className="relative">
                <button
                  onClick={() => {
                    setNotificationsOpen(false);
                    setProfileMenuOpen((v) => !v);
                  }}
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
                      <button
                        onClick={() => {
                          setProfileMenuOpen(false);
                          setDeleteConfirmWord("");
                          setDeleteAccountOpen(true);
                        }}
                        className="w-full text-left py-1.5 text-sm font-medium"
                        style={{ color: COLORS.danger }}
                      >
                        Elimina account
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

          {visibleAnnouncements.length > 0 && (
            <div className="flex flex-col gap-2 mb-4">
              {visibleAnnouncements.map((a) => (
                <div
                  key={a.id}
                  className="flex items-start gap-2 text-sm rounded-lg px-3 py-2.5"
                  style={{ background: withAlpha(COLORS.gold, 14), color: COLORS.primaryDark, border: `1px solid ${withAlpha(COLORS.gold, 33)}` }}
                >
                  <Megaphone size={15} color={COLORS.gold} style={{ flexShrink: 0, marginTop: 1 }} />
                  <span className="flex-1 rich-content" dangerouslySetInnerHTML={{ __html: a.message }} />
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

          {children}

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
                    🤍
                  </div>
                  <div style={{ fontSize: 13, color: COLORS.inkSoft }}>Prenotazione cancellata. Ti aspetto alla prossima lezione.</div>
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
                ) : isPastClass(selected.date, selected.time) ? (
                  <div style={{ fontSize: 12.5, color: COLORS.inkSoft, fontStyle: "italic" }} className="text-center">
                    Questa lezione è già passata.
                  </div>
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
                Anche i guru possono sbagliare. Raccontaci cosa non ha funzionato.
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

        {deleteAccountOpen && (
          <div
            className="fixed inset-0 flex items-center justify-center p-4"
            style={{ background: "rgba(74,58,115,0.35)", zIndex: 50 }}
            onMouseDown={(e) => e.target === e.currentTarget && !deleteAccountPending && setDeleteAccountOpen(false)}
          >
            <div className="w-full p-5" style={{ maxWidth: 380, background: COLORS.card, borderRadius: 18, boxShadow: "0 16px 44px rgba(74,58,115,0.16)" }}>
              <div className="flex items-center justify-between mb-2">
                <div style={{ fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 600, color: COLORS.heading }}>Elimina account</div>
                {!deleteAccountPending && (
                  <button onClick={() => setDeleteAccountOpen(false)}>
                    <X size={18} />
                  </button>
                )}
              </div>
              <div style={{ fontSize: 12.5, color: COLORS.inkSoft, lineHeight: 1.5 }} className="mb-3">
                Non potrai più accedere e le tue eventuali prenotazioni future verranno cancellate. Lo storico delle lezioni svolte resta archiviato. L&apos;operazione non è reversibile.
              </div>
              <form action={deleteAccountFormAction} className="flex flex-col gap-3">
                <label className="block">
                  <div style={{ fontSize: 11.5, fontWeight: 600, color: COLORS.inkSoft, marginBottom: 4 }}>
                    Scrivi <strong>UTTHITA HASTA PADANGUSTHASANA</strong> (in maiuscolo) per confermare
                  </div>
                  <input
                    type="text"
                    name="confirm"
                    value={deleteConfirmWord}
                    onChange={(e) => setDeleteConfirmWord(e.target.value)}
                    autoComplete="off"
                    style={{ width: "100%", border: `1px solid ${COLORS.border}`, borderRadius: 9, padding: "8px 10px", fontSize: 13, background: COLORS.bg, color: COLORS.ink, outline: "none" }}
                  />
                </label>
                {deleteAccountState.error && (
                  <div className="text-sm rounded-lg px-3 py-2" style={{ background: "#F6E7E2", color: COLORS.danger }}>
                    {deleteAccountState.error}
                  </div>
                )}
                <button
                  type="submit"
                  disabled={deleteAccountPending || deleteConfirmWord.trim() !== "UTTHITA HASTA PADANGUSTHASANA"}
                  className="py-2.5 rounded-lg text-sm font-semibold text-white disabled:opacity-60"
                  style={{ background: COLORS.danger }}
                >
                  {deleteAccountPending ? "Eliminazione…" : "Elimina account"}
                </button>
              </form>
            </div>
          </div>
        )}

        <button
          onClick={() => setReportOpen(true)}
          className="fixed flex items-center justify-center rounded-full"
          style={{ bottom: 16, right: 16, width: 34, height: 34, background: COLORS.card, border: `1px solid ${COLORS.border}`, color: COLORS.inkSoft, opacity: 0.7, zIndex: 20 }}
          title="Segnala un problema"
        >
          <Bug size={14} />
        </button>
      </div>
    </AreaContext.Provider>
  );
}
