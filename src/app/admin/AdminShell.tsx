"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import { Calendar as CalendarIcon, Users, Wallet, PiggyBank, Bell, History, BarChart3, Settings as SettingsIcon, Check, AlertCircle, Ticket, Calculator, Route, BookOpen, ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { logout } from "@/app/actions";
import { COLORS } from "./colors";
import { Logo } from "./Logo";
import { dateKey, classEffectivePrice } from "./utils";
import { ThemeToggle } from "./ThemeToggle";
import { NotificationsPanel } from "./NotificationsPanel";
import { MoreMenu, type MoreMenuItem } from "./MoreMenu";
import * as db from "./data";
import { adminResetClientPassword, adminGetClientAuthStatus, adminResendActivationEmail, adminResendPasswordReset } from "./actions";
import { notifyClassFull } from "@/lib/notifications";
import { ADMIN_ROUTE_BY_KEY } from "./routes";
import type {
  AdminData,
  Announcement,
  ClassItem,
  ClassType,
  ClientItem,
  ClientNotice,
  Expense,
  LedgerEntry,
  Level,
  NotificationItem,
  PackageItem,
  PackageWithUsage,
  Settings,
} from "./types";

const moreMenuItems: MoreMenuItem[] = [
  { key: "events", label: "Eventi", icon: Ticket },
  { key: "earnings", label: "Guadagni", icon: PiggyBank },
  { key: "tools", label: "Strumenti", icon: Calculator },
  { key: "sequences", label: "Sequenze", icon: Route },
  { key: "pose-catalog", label: "Catalogo", icon: BookOpen },
  { key: "notices", label: "Avvisi e comunicazioni", icon: Bell },
  { key: "worklog", label: "Registro", icon: History },
  { key: "stats", label: "Statistiche", icon: BarChart3 },
  { key: "settings", label: "Impostazioni", icon: SettingsIcon },
];

type AdminContextValue = {
  supabase: SupabaseClient;
  classTypes: ClassType[];
  levels: Level[];
  settings: Settings;
  bookingsOpen: boolean;
  bookingsTogglePending: boolean;
  classes: ClassItem[];
  clients: ClientItem[];
  packages: PackageItem[];
  packagesWithUsage: PackageWithUsage[];
  ledger: LedgerEntry[];
  expenses: Expense[];
  announcements: Announcement[];
  clientNotices: ClientNotice[];
  notifications: NotificationItem[];
  typeById: Record<string, ClassType>;
  levelById: Record<string, Level>;
  classesByDay: Record<string, ClassItem[]>;
  recentClientIds: string[];
  showToast: (msg: string) => void;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  saveClassItem: (item: ClassItem) => void;
  deleteClassItem: (id: string) => void;
  moveClass: (id: string, targetDate: string) => void;
  markClassPaymentPaid: (classId: string, clientId: string) => void;
  upsertClient: (client: ClientItem) => void;
  deleteClientItem: (id: string) => void;
  setClientDisabled: (id: string, disabled: boolean, cancelFuture: boolean) => void;
  mergeClients: (removeId: string, keepId: string) => Promise<void>;
  resetClientPassword: (id: string) => Promise<string>;
  getClientAuthStatus: (id: string) => Promise<{ email: string; emailConfirmed: boolean } | null>;
  resendClientActivation: (id: string) => Promise<boolean>;
  resendClientPasswordReset: (id: string) => Promise<boolean>;
  refreshClientsAndClasses: () => Promise<void>;
  addClassType: (name: string, color: string) => Promise<void>;
  updateClassType: (id: string, patch: Partial<Pick<ClassType, "name" | "color" | "packageEligible" | "defaultCapacity" | "description">>) => Promise<void>;
  removeType: (id: string) => Promise<void>;
  addLevel: (name: string) => Promise<void>;
  removeLevel: (id: string) => Promise<void>;
  updateLevel: (id: string, name: string) => Promise<void>;
  saveDefaults: (next: Settings) => Promise<void>;
  toggleBookingsOpen: () => Promise<void>;
  sellPackage: (args: { clientId: string; paidAmount: number; linkClassIds: string[] }) => Promise<void>;
  recordPackagePayment: (packageId: string, amount: number) => void;
  updatePackageDetails: (id: string, patch: Partial<{ date: string; manualAdjustment: number; paidAmount: number }>) => void;
  deletePackageItem: (id: string) => void;
  addLedgerEntry: (args: { clientId: string; kind: "debt" | "credit"; amount: number; note: string }) => Promise<void>;
  deleteLedgerEntry: (id: string) => void;
  addExpense: (args: { amount: number; note: string; date: string }) => Promise<void>;
  deleteExpense: (id: string) => void;
  addAnnouncement: (message: string) => Promise<void>;
  updateAnnouncement: (id: string, patch: Partial<Pick<Announcement, "message" | "active">>) => void;
  deleteAnnouncement: (id: string) => void;
  sendPersonalNotices: (clientIds: string[], message: string) => Promise<void>;
  deleteClientNotice: (id: string) => void;
};

const AdminContext = createContext<AdminContextValue | null>(null);

export function useAdmin() {
  const ctx = useContext(AdminContext);
  if (!ctx) throw new Error("useAdmin must be used within <AdminShell>");
  return ctx;
}

export function AdminShell({ initial, children }: { initial: AdminData; children: ReactNode }) {
  const supabase = useMemo(() => createClient(), []);
  const pathname = usePathname();
  const router = useRouter();
  const isHome = pathname === "/admin";

  const [classTypes, setClassTypes] = useState<ClassType[]>(initial.classTypes);
  const [levels, setLevels] = useState<Level[]>(initial.levels);
  const [settings, setSettings] = useState<Settings>(initial.settings);
  const [bookingsOpen, setBookingsOpenState] = useState(initial.bookingsOpen);
  const [bookingsTogglePending, setBookingsTogglePending] = useState(false);
  const [classes, setClasses] = useState<ClassItem[]>(initial.classes);
  const [clients, setClients] = useState<ClientItem[]>(initial.clients);
  const [packages, setPackages] = useState<PackageItem[]>(initial.packages);
  const [ledger, setLedger] = useState<LedgerEntry[]>(initial.ledger);
  const [expenses, setExpenses] = useState<Expense[]>(initial.expenses);
  const [announcements, setAnnouncements] = useState<Announcement[]>(initial.announcements);
  const [clientNotices, setClientNotices] = useState<ClientNotice[]>(initial.clientNotices);
  const [notifications, setNotifications] = useState<NotificationItem[]>(initial.notifications);
  const [toast, setToast] = useState("");

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(""), 2600);
  }

  async function refreshClientsAndClasses() {
    const next = await db.fetchAdminData(supabase);
    setClients(next.clients);
    setClasses(next.classes);
  }

  // ---- notifiche admin ----
  useEffect(() => {
    const channel = supabase
      .channel("admin-notifications-feed")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications" },
        (payload) => {
          const n = db.mapNotification(payload.new as Parameters<typeof db.mapNotification>[0]);
          setNotifications((cur) => [n, ...cur]);
          showToast(`${n.title}: ${n.message}`);
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase]);

  function markNotificationRead(id: string) {
    setNotifications((cur) => cur.map((n) => (n.id === id ? { ...n, read: true } : n)));
    db.markNotificationRead(supabase, id).catch(() => {});
  }
  function markAllNotificationsRead() {
    setNotifications((cur) => cur.map((n) => ({ ...n, read: true })));
    db.markAllNotificationsRead(supabase).catch(() => {});
  }

  // ---- derived ----
  const typeById = useMemo(() => Object.fromEntries(classTypes.map((t) => [t.id, t])), [classTypes]);
  const levelById = useMemo(() => Object.fromEntries(levels.map((l) => [l.id, l])), [levels]);
  const classesByDay = useMemo(() => {
    const map: Record<string, ClassItem[]> = {};
    for (const c of classes) (map[c.date] = map[c.date] || []).push(c);
    Object.values(map).forEach((list) => list.sort((a, b) => (a.time || "").localeCompare(b.time || "")));
    return map;
  }, [classes]);
  const recentClientIds = useMemo(() => {
    const sorted = [...classes].sort((a, b) => (b.date + (b.time || "")).localeCompare(a.date + (a.time || "")));
    const seen: string[] = [];
    for (const c of sorted) {
      for (const cid of c.clientIds || []) {
        if (!seen.includes(cid)) seen.push(cid);
      }
      if (seen.length >= 8) break;
    }
    return seen.slice(0, 8);
  }, [classes]);
  const packagesWithUsage = useMemo<PackageWithUsage[]>(() => {
    const todayKey = dateKey(new Date());
    const usageByPkg: Record<string, { reserved: number; used: number }> = {};
    classes.forEach((c) => {
      Object.entries(c.payments || {}).forEach(([, pay]) => {
        if (pay.status === "package" && pay.packageId) {
          const u = (usageByPkg[pay.packageId] = usageByPkg[pay.packageId] || { reserved: 0, used: 0 });
          u.reserved += 1;
          if (c.date <= todayKey) u.used += 1;
        }
      });
    });
    return packages.map((p) => {
      const u = usageByPkg[p.id] || { reserved: 0, used: 0 };
      const adj = p.manualAdjustment || 0;
      const autoUsed = u.used;
      const usedCount = Math.min(p.size, Math.max(0, u.used + adj));
      const reservedTotal = Math.min(p.size, Math.max(0, u.reserved + adj));
      const remaining = Math.max(0, p.size - reservedTotal);
      return { ...p, autoUsed, usedCount, reservedTotal, remaining };
    });
  }, [classes, packages]);

  // ---- classes & bookings ----
  function saveClassItem(item: ClassItem) {
    const prev = classes.find((c) => c.id === item.id);
    const wasFull = !!prev && prev.capacity > 0 && prev.clientIds.length >= prev.capacity;
    const isFull = item.capacity > 0 && item.clientIds.length >= item.capacity;
    setClasses((cur) => {
      const exists = cur.some((c) => c.id === item.id);
      return exists ? cur.map((c) => (c.id === item.id ? item : c)) : [...cur, item];
    });
    db.saveClass(supabase, item).catch(() => showToast("Il salvataggio della classe non è riuscito."));
    if (isFull && !wasFull) {
      notifyClassFull({
        className: typeById[item.typeId]?.name || "Classe",
        date: item.date,
        time: item.time,
        capacity: item.capacity,
      }).catch(() => {});
    }
  }
  function deleteClassItem(id: string) {
    setClasses((cur) => cur.filter((c) => c.id !== id));
    db.deleteClass(supabase, id).catch(() => showToast("L'eliminazione non è riuscita."));
  }
  function moveClass(id: string, targetDate: string) {
    const item = classes.find((c) => c.id === id);
    if (!item || item.date === targetDate) return;
    setClasses((cur) => cur.map((c) => (c.id === id ? { ...c, date: targetDate } : c)));
    db.moveClass(supabase, id, targetDate).catch(() => showToast("Lo spostamento non è riuscito."));
  }
  function markClassPaymentPaid(classId: string, clientId: string) {
    const c = classes.find((x) => x.id === classId);
    if (!c) return;
    const price = c.payments[clientId]?.price ?? classEffectivePrice(c, settings.singleClassPrice);
    setClasses((cur) =>
      cur.map((x) =>
        x.id === classId
          ? { ...x, payments: { ...x.payments, [clientId]: { ...(x.payments[clientId] || { status: "unpaid", amount: 0, price }), status: "paid", amount: price } } }
          : x
      )
    );
    db.markBookingPaid(supabase, classId, clientId, price).catch(() => showToast("Errore nel registrare il pagamento."));
  }

  // ---- clients ----
  function upsertClient(client: ClientItem) {
    setClients((cur) => {
      const exists = cur.some((c) => c.id === client.id);
      return exists ? cur.map((c) => (c.id === client.id ? client : c)) : [...cur, client];
    });
    db.upsertClient(supabase, client).catch(() => showToast("Il salvataggio del cliente non è riuscito."));
  }
  function deleteClientItem(id: string) {
    setClients((cur) => cur.filter((c) => c.id !== id));
    setPackages((cur) => cur.filter((p) => p.clientId !== id));
    setLedger((cur) => cur.filter((e) => e.clientId !== id));
    setClasses((cur) =>
      cur.map((c) => {
        const payments = { ...c.payments };
        delete payments[id];
        return { ...c, clientIds: c.clientIds.filter((cid) => cid !== id), waitlistIds: c.waitlistIds.filter((cid) => cid !== id), payments };
      })
    );
    db.deleteClient(supabase, id).catch(() => showToast("L'eliminazione non è riuscita."));
  }
  function setClientDisabled(id: string, disabled: boolean, cancelFuture: boolean) {
    setClients((cur) => cur.map((c) => (c.id === id ? { ...c, disabled } : c)));
    db.setClientDisabled(supabase, id, disabled, cancelFuture)
      .then(() => {
        if (disabled && cancelFuture) db.fetchAdminData(supabase).then((next) => setClasses(next.classes));
      })
      .catch(() => showToast("Non è stato possibile aggiornare lo stato del cliente."));
  }
  async function mergeClients(removeId: string, keepId: string) {
    try {
      const result = await db.mergeClients(supabase, keepId, removeId);
      const next = await db.fetchAdminData(supabase);
      setClasses(next.classes);
      setClients(next.clients);
      setPackages(next.packages);
      setLedger(next.ledger);
      setClientNotices(next.clientNotices);
      const parts = [`${result.bookingsMoved} prenotazioni spostate`];
      if (result.packagesMoved) parts.push(`${result.packagesMoved} pacchetti`);
      if (result.ledgerMoved) parts.push(`${result.ledgerMoved} saldi`);
      if (result.bookingsSkipped) parts.push(`${result.bookingsSkipped} prenotazioni scartate per doppione`);
      showToast(`Clienti fusi: ${parts.join(", ")}.`);
    } catch (e) {
      showToast(e instanceof Error ? e.message : "La fusione dei clienti non è riuscita.");
    }
  }
  async function resetClientPassword(id: string): Promise<string> {
    const res = await adminResetClientPassword(id);
    if (!res.ok || !res.password) {
      showToast(res.error || "Non è stato possibile resettare la password.");
      throw new Error(res.error || "reset failed");
    }
    return res.password;
  }
  async function getClientAuthStatus(id: string): Promise<{ email: string; emailConfirmed: boolean } | null> {
    const res = await adminGetClientAuthStatus(id);
    if (!res.ok || res.email === undefined || res.emailConfirmed === undefined) {
      showToast(res.error || "Non è stato possibile leggere lo stato dell'account.");
      return null;
    }
    return { email: res.email, emailConfirmed: res.emailConfirmed };
  }
  async function resendClientActivation(id: string) {
    const res = await adminResendActivationEmail(id);
    showToast(res.ok ? "Email di attivazione reinviata." : res.error || "Invio non riuscito.");
    return res.ok;
  }
  async function resendClientPasswordReset(id: string) {
    const res = await adminResendPasswordReset(id);
    showToast(res.ok ? "Email di reset password reinviata." : res.error || "Invio non riuscito.");
    return res.ok;
  }

  // ---- class types, levels, settings ----
  async function addClassType(name: string, color: string) {
    try {
      const t = await db.addClassType(supabase, name, color);
      setClassTypes((cur) => [...cur, t]);
    } catch {
      showToast("Errore nella creazione della tipologia.");
    }
  }
  async function updateClassType(id: string, patch: Partial<Pick<ClassType, "name" | "color" | "packageEligible" | "defaultCapacity" | "description">>) {
    setClassTypes((cur) => cur.map((t) => (t.id === id ? { ...t, ...patch } : t)));
    try {
      await db.updateClassType(supabase, id, patch);
    } catch {
      showToast("Errore nel salvataggio della tipologia.");
    }
  }
  async function removeType(id: string) {
    setClassTypes((cur) => cur.filter((t) => t.id !== id));
    try {
      await db.deleteClassType(supabase, id);
    } catch {
      showToast("Errore nell'eliminazione della tipologia.");
    }
  }
  async function addLevel(name: string) {
    try {
      const l = await db.addLevel(supabase, name);
      setLevels((cur) => [...cur, l]);
    } catch {
      showToast("Errore nella creazione del livello.");
    }
  }
  async function removeLevel(id: string) {
    setLevels((cur) => cur.filter((l) => l.id !== id));
    try {
      await db.deleteLevel(supabase, id);
    } catch {
      showToast("Errore nell'eliminazione del livello.");
    }
  }
  async function updateLevel(id: string, name: string) {
    setLevels((cur) => cur.map((l) => (l.id === id ? { ...l, name } : l)));
    try {
      await db.updateLevel(supabase, id, name);
    } catch {
      showToast("Errore nel salvataggio del livello.");
    }
  }
  async function saveDefaults(next: Settings) {
    setSettings(next);
    try {
      await db.saveSettings(supabase, next);
    } catch {
      showToast("Errore nel salvataggio delle impostazioni.");
    }
  }

  async function toggleBookingsOpen() {
    const next = !bookingsOpen;
    setBookingsTogglePending(true);
    setBookingsOpenState(next);
    try {
      await db.setBookingsOpen(supabase, next);
      showToast(next ? "Iscrizioni aperte." : "Iscrizioni chiuse.");
    } catch {
      setBookingsOpenState(!next);
      showToast("Errore nel cambiare lo stato delle iscrizioni.");
    } finally {
      setBookingsTogglePending(false);
    }
  }

  // ---- packages & ledger ----
  async function sellPackage({ clientId, paidAmount, linkClassIds }: { clientId: string; paidAmount: number; linkClassIds: string[] }) {
    try {
      const pkg = await db.sellPackage(supabase, {
        clientId,
        size: settings.packageSize,
        price: settings.packagePrice,
        paidAmount,
        date: dateKey(new Date()),
        linkClassIds,
      });
      setPackages((cur) => [...cur, pkg]);
      db.fetchClientNotices(supabase).then(setClientNotices).catch(() => {});
      if (linkClassIds.length > 0) {
        setClasses((cur) =>
          cur.map((c) => {
            if (!linkClassIds.includes(c.id)) return c;
            const curPay = c.payments[clientId];
            if (!curPay) return c;
            return { ...c, payments: { ...c.payments, [clientId]: { ...curPay, status: "package", packageId: pkg.id, amount: curPay.price } } };
          })
        );
      }
      showToast("Pacchetto registrato.");
    } catch {
      showToast("Errore nel salvataggio del pacchetto.");
    }
  }
  function recordPackagePayment(packageId: string, amount: number) {
    const pkg = packages.find((p) => p.id === packageId);
    if (!pkg) return;
    const newPaid = Math.min(pkg.price, pkg.paidAmount + (Number(amount) || 0));
    setPackages((cur) => cur.map((p) => (p.id === packageId ? { ...p, paidAmount: newPaid } : p)));
    db.updatePackage(supabase, packageId, { paidAmount: newPaid }).catch(() => showToast("Errore nel registrare il pagamento."));
  }
  function updatePackageDetails(id: string, patch: Partial<{ date: string; manualAdjustment: number; paidAmount: number }>) {
    setPackages((cur) => cur.map((p) => (p.id === id ? { ...p, ...patch } : p)));
    db.updatePackage(supabase, id, patch).catch(() => showToast("Errore nel salvataggio del pacchetto."));
  }
  function deletePackageItem(id: string) {
    setPackages((cur) => cur.filter((p) => p.id !== id));
    db.deletePackage(supabase, id).catch(() => showToast("Errore nell'eliminazione del pacchetto."));
  }
  async function addLedgerEntry(args: { clientId: string; kind: "debt" | "credit"; amount: number; note: string }) {
    try {
      const entry = await db.addLedgerEntry(supabase, { ...args, date: dateKey(new Date()) });
      setLedger((cur) => [...cur, entry]);
    } catch {
      showToast("Errore nel salvataggio.");
    }
  }
  function deleteLedgerEntry(id: string) {
    setLedger((cur) => cur.filter((e) => e.id !== id));
    db.deleteLedgerEntry(supabase, id).catch(() => showToast("Errore nell'eliminazione."));
  }

  // ---- expenses ----
  async function addExpense(args: { amount: number; note: string; date: string }) {
    try {
      const e = await db.addExpense(supabase, args);
      setExpenses((cur) => [...cur, e]);
    } catch {
      showToast("Errore nel salvataggio della spesa.");
    }
  }
  function deleteExpense(id: string) {
    setExpenses((cur) => cur.filter((e) => e.id !== id));
    db.deleteExpense(supabase, id).catch(() => showToast("Errore nell'eliminazione."));
  }

  // ---- avvisi per i clienti ----
  async function addAnnouncement(message: string) {
    try {
      const a = await db.addAnnouncement(supabase, message);
      setAnnouncements((cur) => [a, ...cur]);
    } catch {
      showToast("Errore nel salvataggio dell'avviso.");
    }
  }
  function updateAnnouncement(id: string, patch: Partial<Pick<Announcement, "message" | "active">>) {
    setAnnouncements((cur) => cur.map((a) => (a.id === id ? { ...a, ...patch } : a)));
    db.updateAnnouncement(supabase, id, patch).catch(() => showToast("Errore nel salvataggio dell'avviso."));
  }
  function deleteAnnouncement(id: string) {
    setAnnouncements((cur) => cur.filter((a) => a.id !== id));
    db.deleteAnnouncement(supabase, id).catch(() => showToast("Errore nell'eliminazione."));
  }

  // ---- avvisi personali ai clienti ----
  async function sendPersonalNotices(clientIds: string[], message: string) {
    try {
      const created = await db.addPersonalNotices(supabase, clientIds, message);
      setClientNotices((cur) => [...created, ...cur]);
      showToast(`Avviso inviato a ${clientIds.length} ${clientIds.length === 1 ? "cliente" : "clienti"}.`);
    } catch {
      showToast("Errore nell'invio dell'avviso.");
    }
  }
  function deleteClientNotice(id: string) {
    setClientNotices((cur) => cur.filter((n) => n.id !== id));
    db.deleteClientNotice(supabase, id).catch(() => showToast("Errore nell'eliminazione."));
  }

  const currentMoreKey = Object.entries(ADMIN_ROUTE_BY_KEY).find(([, path]) => path === pathname)?.[0];

  const value: AdminContextValue = {
    supabase,
    classTypes,
    levels,
    settings,
    bookingsOpen,
    bookingsTogglePending,
    classes,
    clients,
    packages,
    packagesWithUsage,
    ledger,
    expenses,
    announcements,
    clientNotices,
    notifications,
    typeById,
    levelById,
    classesByDay,
    recentClientIds,
    showToast,
    markNotificationRead,
    markAllNotificationsRead,
    saveClassItem,
    deleteClassItem,
    moveClass,
    markClassPaymentPaid,
    upsertClient,
    deleteClientItem,
    setClientDisabled,
    mergeClients,
    resetClientPassword,
    getClientAuthStatus,
    resendClientActivation,
    resendClientPasswordReset,
    refreshClientsAndClasses,
    addClassType,
    updateClassType,
    removeType,
    addLevel,
    removeLevel,
    updateLevel,
    saveDefaults,
    toggleBookingsOpen,
    sellPackage,
    recordPackagePayment,
    updatePackageDetails,
    deletePackageItem,
    addLedgerEntry,
    deleteLedgerEntry,
    addExpense,
    deleteExpense,
    addAnnouncement,
    updateAnnouncement,
    deleteAnnouncement,
    sendPersonalNotices,
    deleteClientNotice,
  };

  return (
    <AdminContext.Provider value={value}>
      <div style={{ fontFamily: "var(--font-body)", background: COLORS.bg, color: COLORS.ink, minHeight: "100vh" }}>
        <div className="p-5" style={{ maxWidth: 980, margin: "0 auto" }}>
          <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
            <Logo kicker="Gestionale" />

            <div className="flex items-center gap-1.5 flex-wrap justify-end">
              <div className="hidden md:flex rounded-lg overflow-hidden" style={{ border: `1px solid ${COLORS.border}` }}>
                <Link
                  href="/admin/calendario"
                  className="px-2.5 py-2 text-sm font-medium flex items-center gap-1.5"
                  style={{ background: pathname === "/admin/calendario" ? COLORS.primary : "transparent", color: pathname === "/admin/calendario" ? "#fff" : COLORS.ink }}
                >
                  <CalendarIcon size={15} /> <span className="hidden sm:inline">Calendario</span>
                </Link>
                <Link
                  href="/admin/clienti"
                  className="px-2.5 py-2 text-sm font-medium flex items-center gap-1.5"
                  style={{ background: pathname === "/admin/clienti" ? COLORS.primary : "transparent", color: pathname === "/admin/clienti" ? "#fff" : COLORS.ink }}
                >
                  <Users size={15} /> <span className="hidden sm:inline">Clienti</span>
                </Link>
                <Link
                  href="/admin/pagamenti"
                  className="px-2.5 py-2 text-sm font-medium flex items-center gap-1.5"
                  style={{ background: pathname === "/admin/pagamenti" ? COLORS.primary : "transparent", color: pathname === "/admin/pagamenti" ? "#fff" : COLORS.ink }}
                >
                  <Wallet size={15} /> <span className="hidden sm:inline">Pagamenti</span>
                </Link>
              </div>
              <div className="hidden md:block">
                <MoreMenu items={moreMenuItems} activeKey={currentMoreKey ?? ""} onSelect={(key) => router.push(ADMIN_ROUTE_BY_KEY[key])} />
              </div>
              {!isHome && (
                <Link
                  href="/admin"
                  className="md:hidden flex items-center gap-1.5 px-2.5 py-2 rounded-lg text-sm font-medium"
                  style={{ border: `1px solid ${COLORS.border}`, color: COLORS.ink }}
                >
                  <ArrowLeft size={15} /> Home
                </Link>
              )}
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <div className="hidden md:block">
                  <NotificationsPanel notifications={notifications} onMarkRead={markNotificationRead} onMarkAllRead={markAllNotificationsRead} />
                </div>
                <ThemeToggle />
                <form action={logout}>
                  <button type="submit" className="text-sm font-medium px-1.5" style={{ color: COLORS.inkSoft }}>
                    Esci
                  </button>
                </form>
              </div>
            </div>
          </div>

          {toast && (
            <div className="mb-4 flex items-center gap-2 text-sm rounded-lg px-3 py-2" style={{ background: COLORS.subtle, color: COLORS.primaryDark }}>
              {toast.startsWith("Errore") || toast.includes("non è riuscit") || toast.includes("già una classe") ? (
                <AlertCircle size={15} color={COLORS.danger} />
              ) : (
                <Check size={15} />
              )}
              {toast}
            </div>
          )}

          {children}
        </div>
      </div>
    </AdminContext.Provider>
  );
}
