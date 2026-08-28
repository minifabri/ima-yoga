"use client";

import { useMemo, useState } from "react";
import { Calendar as CalendarIcon, Users, Wallet, Settings as SettingsIcon, Check, AlertCircle, Lock, LockOpen } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { logout } from "@/app/actions";
import { COLORS } from "./colors";
import { dateKey, genId } from "./utils";
import { IconButton, Modal } from "./ui";
import { CalendarView } from "./CalendarView";
import { ClassFormModal } from "./ClassFormModal";
import { SettingsModal } from "./SettingsModal";
import { PaymentsView } from "./PaymentsView";
import { ClientsView } from "./ClientsView";
import * as db from "./data";
import type {
  AdminData,
  ClassItem,
  ClassType,
  ClientItem,
  LedgerEntry,
  Level,
  PackageItem,
  PackageWithUsage,
  Settings,
} from "./types";

type ClassClipboard = { typeId: string; levelId: string; time: string; capacity: number; notes: string; description: string; bookingsOpen: boolean };
type ClassModalState = { mode: "new"; date: Date } | { mode: "edit"; classItem: ClassItem } | null;
type ConfirmDeleteState = { type: "class" | "client"; id: string } | null;

export function AdminApp({ initial }: { initial: AdminData }) {
  const supabase = useMemo(() => createClient(), []);

  const [view, setView] = useState<"calendar" | "clients" | "payments">("calendar");
  const [viewDate, setViewDate] = useState(new Date());
  const [classTypes, setClassTypes] = useState<ClassType[]>(initial.classTypes);
  const [levels, setLevels] = useState<Level[]>(initial.levels);
  const [settings, setSettings] = useState<Settings>(initial.settings);
  const [bookingsOpen, setBookingsOpenState] = useState(initial.bookingsOpen);
  const [bookingsTogglePending, setBookingsTogglePending] = useState(false);
  const [classes, setClasses] = useState<ClassItem[]>(initial.classes);
  const [clients, setClients] = useState<ClientItem[]>(initial.clients);
  const [packages, setPackages] = useState<PackageItem[]>(initial.packages);
  const [ledger, setLedger] = useState<LedgerEntry[]>(initial.ledger);
  const [clipboard, setClipboard] = useState<ClassClipboard | null>(null);
  const [toast, setToast] = useState("");
  const [classModal, setClassModal] = useState<ClassModalState>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<ConfirmDeleteState>(null);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(""), 2600);
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
    setClasses((cur) => {
      const exists = cur.some((c) => c.id === item.id);
      return exists ? cur.map((c) => (c.id === item.id ? item : c)) : [...cur, item];
    });
    db.saveClass(supabase, item).catch(() => showToast("Il salvataggio della classe non è riuscito."));
  }
  function deleteClassItem(id: string) {
    setClasses((cur) => cur.filter((c) => c.id !== id));
    db.deleteClass(supabase, id).catch(() => showToast("L'eliminazione non è riuscita."));
  }
  function moveClass(id: string, targetDate: string) {
    const item = classes.find((c) => c.id === id);
    if (!item || item.date === targetDate) return;
    const occupied = classes.some((c) => c.date === targetDate && c.id !== id);
    if (occupied) {
      showToast("Quel giorno ha già una classe.");
      return;
    }
    setClasses((cur) => cur.map((c) => (c.id === id ? { ...c, date: targetDate } : c)));
    db.moveClass(supabase, id, targetDate).catch(() => showToast("Lo spostamento non è riuscito."));
  }
  function goToNextClass() {
    const todayStr = dateKey(new Date());
    const upcoming = [...classes].filter((c) => c.date >= todayStr).sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
    if (upcoming.length === 0) {
      showToast("Nessuna lezione futura in programma.");
      return;
    }
    const [y, m] = upcoming[0].date.split("-").map(Number);
    setViewDate(new Date(y, m - 1, 1));
  }
  function copyClass(item: ClassClipboard) {
    setClipboard(item);
    showToast("Classe copiata. Scegli un giorno vuoto e incolla.");
  }
  function pasteClass(dateStr: string) {
    if (!clipboard) return;
    if ((classesByDay[dateStr] || []).length > 0) return;
    const item: ClassItem = { id: genId(), date: dateStr, ...clipboard, clientIds: [], waitlistIds: [], payments: {} };
    saveClassItem(item);
    showToast("Classe incollata.");
  }
  function markClassPaymentPaid(classId: string, clientId: string) {
    const c = classes.find((x) => x.id === classId);
    if (!c) return;
    const price = c.payments[clientId]?.price ?? settings.singleClassPrice;
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

  // ---- class types, levels, settings ----
  async function addClassType(name: string, color: string) {
    try {
      const t = await db.addClassType(supabase, name, color);
      setClassTypes((cur) => [...cur, t]);
    } catch {
      showToast("Errore nella creazione della tipologia.");
    }
  }
  async function updateClassType(id: string, patch: Partial<Pick<ClassType, "color" | "packageEligible" | "defaultCapacity" | "description">>) {
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
  async function addLevelHandler(name: string) {
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
  async function addLedgerEntryHandler(args: { clientId: string; kind: "debt" | "credit"; amount: number; note: string }) {
    try {
      const entry = await db.addLedgerEntry(supabase, { ...args, date: dateKey(new Date()) });
      setLedger((cur) => [...cur, entry]);
    } catch {
      showToast("Errore nel salvataggio.");
    }
  }
  function deleteLedgerEntryItem(id: string) {
    setLedger((cur) => cur.filter((e) => e.id !== id));
    db.deleteLedgerEntry(supabase, id).catch(() => showToast("Errore nell'eliminazione."));
  }

  return (
    <div style={{ fontFamily: "var(--font-body)", background: COLORS.bg, color: COLORS.ink, minHeight: "100vh" }}>
      <style>{`
        @keyframes breathe { 0%,100%{ transform: scale(1); opacity:.55 } 50%{ transform: scale(1.35); opacity:1 } }
        .breath-dot { animation: breathe 4s ease-in-out infinite; }
      `}</style>

      <div className="p-5" style={{ maxWidth: 980, margin: "0 auto" }}>
        <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
              <path d="M23 9a10 10 0 1 0 0 20 7.8 7.8 0 0 1 0-20z" stroke={COLORS.heading} strokeWidth="1.3" strokeLinejoin="round" />
              <g className="breath-dot" style={{ transformOrigin: "28px 8px" }}>
                <path d="M28 4.5 L28.9 7.1 L31.5 8 L28.9 8.9 L28 11.5 L27.1 8.9 L24.5 8 L27.1 7.1 Z" fill={COLORS.gold} />
              </g>
            </svg>
            <div>
              <div style={{ fontWeight: 700, fontSize: 10, letterSpacing: 2.5, color: COLORS.gold, textTransform: "uppercase" }}>Gestionale</div>
              <div style={{ fontFamily: "var(--font-display)", fontWeight: 500, fontSize: 26, lineHeight: 1, color: COLORS.heading }}>ima yoga</div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap justify-end">
            <div className="flex rounded-lg overflow-hidden" style={{ border: `1px solid ${COLORS.border}` }}>
              <button
                onClick={() => setView("calendar")}
                className="px-2.5 py-2 text-sm font-medium flex items-center gap-1.5"
                style={{ background: view === "calendar" ? COLORS.primary : "transparent", color: view === "calendar" ? "#fff" : COLORS.ink }}
              >
                <CalendarIcon size={15} /> <span className="hidden sm:inline">Calendario</span>
              </button>
              <button
                onClick={() => setView("clients")}
                className="px-2.5 py-2 text-sm font-medium flex items-center gap-1.5"
                style={{ background: view === "clients" ? COLORS.primary : "transparent", color: view === "clients" ? "#fff" : COLORS.ink }}
              >
                <Users size={15} /> <span className="hidden sm:inline">Clienti</span>
              </button>
              <button
                onClick={() => setView("payments")}
                className="px-2.5 py-2 text-sm font-medium flex items-center gap-1.5"
                style={{ background: view === "payments" ? COLORS.primary : "transparent", color: view === "payments" ? "#fff" : COLORS.ink }}
              >
                <Wallet size={15} /> <span className="hidden sm:inline">Pagamenti</span>
              </button>
            </div>
            <button
              onClick={toggleBookingsOpen}
              disabled={bookingsTogglePending}
              title={bookingsOpen ? "Le clienti possono prenotare — clicca per chiudere le iscrizioni" : "Iscrizioni chiuse — clicca per riaprirle"}
              className="flex items-center justify-center gap-1.5 px-2 py-2 rounded-lg text-sm font-medium disabled:opacity-60"
              style={{
                border: `1px solid ${bookingsOpen ? COLORS.success : COLORS.danger}55`,
                color: bookingsOpen ? COLORS.success : COLORS.danger,
                background: bookingsOpen ? COLORS.success + "14" : COLORS.danger + "14",
              }}
            >
              {bookingsOpen ? <LockOpen size={15} /> : <Lock size={15} />}
              <span className="hidden sm:inline">{bookingsOpen ? "Iscrizioni aperte" : "Iscrizioni chiuse"}</span>
            </button>
            <IconButton title="Impostazioni classi" onClick={() => setSettingsOpen(true)} style={{ border: `1px solid ${COLORS.border}` }}>
              <SettingsIcon size={17} />
            </IconButton>
            <form action={logout}>
              <button type="submit" className="text-sm font-medium px-1.5" style={{ color: COLORS.inkSoft }}>
                Esci
              </button>
            </form>
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

        {view === "calendar" ? (
          <CalendarView
            viewDate={viewDate}
            setViewDate={setViewDate}
            classesByDay={classesByDay}
            typeById={typeById}
            levelById={levelById}
            clipboard={clipboard}
            onGoToNextClass={goToNextClass}
            onAddClass={(date) => setClassModal({ mode: "new", date })}
            onOpenClass={(classItem) => setClassModal({ mode: "edit", classItem })}
            onMoveClass={moveClass}
            onPasteClass={pasteClass}
          />
        ) : view === "clients" ? (
          <ClientsView clients={clients} classes={classes} typeById={typeById} onUpsert={upsertClient} onDelete={(id) => setConfirmDelete({ type: "client", id })} />
        ) : (
          <PaymentsView
            clients={clients}
            classes={classes}
            packages={packagesWithUsage}
            ledger={ledger}
            typeById={typeById}
            defaults={settings}
            onUpsertClient={upsertClient}
            onSellPackage={sellPackage}
            onRecordPackagePayment={recordPackagePayment}
            onUpdatePackageDetails={updatePackageDetails}
            onDeletePackage={deletePackageItem}
            onAddLedgerEntry={addLedgerEntryHandler}
            onDeleteLedgerEntry={deleteLedgerEntryItem}
            onMarkClassPaymentPaid={markClassPaymentPaid}
          />
        )}
      </div>

      {classModal && (
        <ClassFormModal
          data={classModal}
          classTypes={classTypes}
          levels={levels}
          clients={clients}
          packages={packagesWithUsage}
          recentClientIds={recentClientIds}
          defaultTime={settings.time}
          defaultCapacity={settings.capacity}
          singleClassPrice={settings.singleClassPrice}
          onClose={() => setClassModal(null)}
          onSave={(item) => {
            saveClassItem(item);
            setClassModal(null);
          }}
          onDelete={(id) => setConfirmDelete({ type: "class", id })}
          onAddClient={upsertClient}
          onOpenSettings={() => setSettingsOpen(true)}
          onCopy={copyClass}
        />
      )}

      {settingsOpen && (
        <SettingsModal
          classTypes={classTypes}
          levels={levels}
          classes={classes}
          defaults={settings}
          onClose={() => setSettingsOpen(false)}
          onAddType={addClassType}
          onUpdateType={updateClassType}
          onRemoveType={removeType}
          onAddLevel={addLevelHandler}
          onRemoveLevel={removeLevel}
          onSaveDefaults={saveDefaults}
        />
      )}

      {confirmDelete && (
        <Modal onClose={() => setConfirmDelete(null)} width={360}>
          <div className="p-5">
            <div className="font-semibold mb-1">{confirmDelete.type === "class" ? "Eliminare questa classe?" : "Eliminare questo cliente?"}</div>
            <div style={{ fontSize: 13, color: COLORS.inkSoft }} className="mb-4">
              {confirmDelete.type === "class"
                ? "L'azione non può essere annullata. Le prenotazioni associate andranno perse."
                : "Il cliente verrà rimosso anche da eventuali classi prenotate."}
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setConfirmDelete(null)} className="px-3 py-2 rounded-lg text-sm font-medium" style={{ border: `1px solid ${COLORS.border}` }}>
                Annulla
              </button>
              <button
                onClick={() => {
                  if (confirmDelete.type === "class") {
                    deleteClassItem(confirmDelete.id);
                    setClassModal(null);
                  } else {
                    deleteClientItem(confirmDelete.id);
                  }
                  setConfirmDelete(null);
                }}
                className="px-3 py-2 rounded-lg text-sm font-medium text-white"
                style={{ background: COLORS.danger }}
              >
                Elimina
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
