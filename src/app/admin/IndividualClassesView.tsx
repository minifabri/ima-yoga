"use client";

import { useEffect, useMemo, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";
import { AlertCircle, Calendar, CalendarClock, Check, ChevronDown, Eye, EyeOff, Plus, Trash2, User, X } from "lucide-react";
import { COLORS, withAlpha } from "./colors";
import { Modal, inputStyle } from "./ui";
import { dateKey } from "./utils";
import { PersonalClassFormModal } from "./PersonalClassFormModal";
import { IndividualSlotFormModal } from "./IndividualSlotFormModal";
import * as db from "./data";
import { notifyIndividualClassAccepted, notifyIndividualClassRejected } from "./actions";
import type { ClassItem, ClassType, ClientItem, IndividualClassRequest, IndividualClassSlot, Level, PackageWithUsage, Settings } from "./types";

type SlotModalState = { mode: "new" } | { mode: "edit"; slot: IndividualClassSlot } | null;

function formatSlotLabel(slot: { date: string; time: string }): string {
  const label = new Date(`${slot.date}T00:00:00Z`).toLocaleDateString("it-IT", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });
  return `${label} · ${slot.time}`;
}

export function IndividualClassesView({
  supabase,
  classes,
  classTypes,
  levels,
  clients,
  packages,
  settings,
  saveClassItem,
  deleteClassItem,
  upsertClient,
}: {
  supabase: SupabaseClient;
  classes: ClassItem[];
  classTypes: ClassType[];
  levels: Level[];
  clients: ClientItem[];
  packages: PackageWithUsage[];
  settings: Settings;
  saveClassItem: (item: ClassItem) => Promise<void>;
  deleteClassItem: (id: string) => void;
  upsertClient: (client: ClientItem) => void;
}) {
  const router = useRouter();
  const [tab, setTab] = useState<"requests" | "scheduled" | "slots">("requests");
  const [slots, setSlots] = useState<IndividualClassSlot[]>([]);
  const [requests, setRequests] = useState<IndividualClassRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState("");

  const [slotModal, setSlotModal] = useState<SlotModalState>(null);
  const [confirmDeleteSlot, setConfirmDeleteSlot] = useState<string | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [usedSlotsOpen, setUsedSlotsOpen] = useState(false);
  const [pastClassesOpen, setPastClassesOpen] = useState(false);
  const [editClass, setEditClass] = useState<ClassItem | null>(null);
  const [confirmDeleteClass, setConfirmDeleteClass] = useState<string | null>(null);

  const [selectedSlotByRequest, setSelectedSlotByRequest] = useState<Record<string, string>>({});
  const [acceptModal, setAcceptModal] = useState<{ request: IndividualClassRequest; slotId: string } | null>(null);
  const [rejecting, setRejecting] = useState<IndividualClassRequest | null>(null);
  const [rejectNote, setRejectNote] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(""), 3200);
  }

  useEffect(() => {
    Promise.all([db.fetchIndividualClassSlots(supabase), db.fetchIndividualClassRequests(supabase)])
      .then(([s, r]) => {
        setSlots(s);
        setRequests(r);
      })
      .catch(() => showToast("Errore nel caricamento."))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const slotById = useMemo(() => Object.fromEntries(slots.map((s) => [s.id, s])), [slots]);
  const pendingRequests = useMemo(
    () => requests.filter((r) => r.status === "pending").sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
    [requests]
  );
  const decidedRequests = useMemo(
    () => requests.filter((r) => r.status !== "pending").sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [requests]
  );
  const activeSlots = useMemo(
    () => slots.filter((s) => s.bookedClassId == null).sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time)),
    [slots]
  );
  const usedSlots = useMemo(
    () => slots.filter((s) => s.bookedClassId != null).sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time)),
    [slots]
  );

  // Le lezioni individuali già in calendario (create da lì, da una richiesta
  // accettata o assegnate a mano): sono righe di `classes` con un cliente
  // riservato, non slot né richieste, quindi vanno lette da `classes`.
  const clientById = useMemo(() => Object.fromEntries(clients.map((c) => [c.id, c])), [clients]);
  const typeById = useMemo(() => Object.fromEntries(classTypes.map((t) => [t.id, t])), [classTypes]);
  const today = dateKey(new Date());
  const personalClasses = useMemo(() => classes.filter((c) => c.isIndividual), [classes]);
  const upcomingClasses = useMemo(
    () => personalClasses.filter((c) => c.date >= today).sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time)),
    [personalClasses, today]
  );
  const pastClasses = useMemo(
    () => personalClasses.filter((c) => c.date < today).sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time)),
    [personalClasses, today]
  );

  function selectedSlotFor(r: IndividualClassRequest): string | null {
    return selectedSlotByRequest[r.id] ?? (r.proposedSlotIds.length === 1 ? r.proposedSlotIds[0] : null);
  }

  // ---- slots ----
  async function handleSaveSlot(slot: IndividualClassSlot) {
    const isNew = !slots.some((s) => s.id === slot.id);
    try {
      await db.saveIndividualClassSlot(supabase, slot);
      setSlots((cur) => (isNew ? [...cur, slot] : cur.map((s) => (s.id === slot.id ? slot : s))));
      setSlotModal(null);
      showToast(isNew ? "Slot creato." : "Slot aggiornato.");
    } catch {
      showToast("Il salvataggio dello slot non è riuscito.");
    }
  }
  async function handleDeleteSlot(id: string) {
    try {
      await db.deleteIndividualClassSlot(supabase, id);
      setSlots((cur) => cur.filter((s) => s.id !== id));
      setSlotModal(null);
      setConfirmDeleteSlot(null);
      showToast("Slot eliminato.");
    } catch (err) {
      setConfirmDeleteSlot(null);
      showToast(err instanceof Error ? err.message : "Eliminazione non riuscita.");
    }
  }

  // ---- scheduled classes ----
  async function handleEditClassSave(item: ClassItem) {
    try {
      await saveClassItem(item);
      setEditClass(null);
      showToast("Lezione aggiornata.");
    } catch {
      showToast("Il salvataggio della lezione non è riuscito.");
    }
  }
  function handleDeleteClass(id: string) {
    deleteClassItem(id);
    setEditClass(null);
    setConfirmDeleteClass(null);
    showToast("Lezione eliminata.");
  }

  // ---- requests ----
  function openAccept(r: IndividualClassRequest) {
    const slotId = selectedSlotFor(r);
    if (!slotId || !slotById[slotId]) {
      showToast("Scegli prima una delle date proposte.");
      return;
    }
    setAcceptModal({ request: r, slotId });
  }

  async function handleAcceptSave(item: ClassItem) {
    if (!acceptModal) return;
    const { request, slotId } = acceptModal;
    setBusyId(request.id);
    try {
      await saveClassItem(item);
      await db.acceptIndividualClassRequest(supabase, { requestId: request.id, slotId, classId: item.id });
      setRequests((cur) =>
        cur.map((r) => (r.id === request.id ? { ...r, status: "accepted", chosenSlotId: slotId, resultingClassId: item.id } : r))
      );
      setSlots((cur) => cur.map((s) => (s.id === slotId ? { ...s, bookedClassId: item.id } : s)));
      setAcceptModal(null);
      showToast("Richiesta accettata: lezione individuale creata.");
      notifyIndividualClassAccepted(request.clientId, { date: item.date, time: item.time }).catch(() => {});
    } catch {
      showToast("Non è stato possibile completare l'accettazione. Riprova.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleReject() {
    if (!rejecting) return;
    const request = rejecting;
    const note = rejectNote;
    setBusyId(request.id);
    try {
      await db.rejectIndividualClassRequest(supabase, request.id, note);
      setRequests((cur) =>
        cur.map((r) =>
          r.id === request.id ? { ...r, status: "rejected", decisionNote: note.trim() || null, decidedAt: new Date().toISOString() } : r
        )
      );
      setRejecting(null);
      setRejectNote("");
      showToast("Richiesta rifiutata.");
      notifyIndividualClassRejected(request.clientId, note).catch(() => {});
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Non è stato possibile rifiutare la richiesta.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2.5">
        <div style={{ fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 600, color: COLORS.heading }}>Lezioni individuali</div>
        {tab === "slots" && (
          <button
            onClick={() => setSlotModal({ mode: "new" })}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold text-white"
            style={{ background: COLORS.primary }}
          >
            <Plus size={15} /> Nuovo slot
          </button>
        )}
      </div>

      <div className="flex rounded-lg overflow-hidden mb-4" style={{ border: `1px solid ${COLORS.border}`, width: "fit-content" }}>
        <button
          onClick={() => setTab("requests")}
          className="flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium"
          style={{ background: tab === "requests" ? COLORS.primary : "transparent", color: tab === "requests" ? "#fff" : COLORS.ink }}
        >
          Richieste
          {pendingRequests.length > 0 && (
            <span
              className="flex items-center justify-center rounded-full"
              style={{
                minWidth: 16,
                height: 16,
                padding: "0 3px",
                fontSize: 10,
                fontWeight: 700,
                background: tab === "requests" ? "rgba(255,255,255,0.3)" : COLORS.gold,
                color: tab === "requests" ? "#fff" : "#fff",
              }}
            >
              {pendingRequests.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setTab("scheduled")}
          className="px-3.5 py-2 text-sm font-medium"
          style={{ background: tab === "scheduled" ? COLORS.primary : "transparent", color: tab === "scheduled" ? "#fff" : COLORS.ink }}
        >
          Programmate
        </button>
        <button
          onClick={() => setTab("slots")}
          className="px-3.5 py-2 text-sm font-medium"
          style={{ background: tab === "slots" ? COLORS.primary : "transparent", color: tab === "slots" ? "#fff" : COLORS.ink }}
        >
          Slot disponibili
        </button>
      </div>

      {toast && (
        <div className="mb-4 flex items-center gap-2 text-sm rounded-lg px-3 py-2" style={{ background: COLORS.subtle, color: COLORS.primaryDark }}>
          {toast.includes("riuscit") || toast.includes("Errore") || toast.includes("non è stato") ? (
            <AlertCircle size={15} color={COLORS.danger} />
          ) : (
            <Check size={15} />
          )}
          {toast}
        </div>
      )}

      {loading ? (
        <div style={{ fontSize: 13, color: COLORS.inkSoft }}>Caricamento…</div>
      ) : tab === "requests" ? (
        <div>
          {pendingRequests.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-center py-14" style={{ color: COLORS.inkSoft }}>
              <CalendarClock size={28} className="mb-2" />
              <div style={{ fontSize: 13.5 }}>Nessuna richiesta in attesa.</div>
            </div>
          ) : (
            <div className="flex flex-col gap-2.5">
              {pendingRequests.map((r) => {
                const selected = selectedSlotFor(r);
                return (
                  <div key={r.id} className="p-3.5 rounded-xl" style={{ background: COLORS.card, border: `1px solid ${COLORS.border}` }}>
                    <div className="flex items-center gap-1.5 mb-1" style={{ fontSize: 14, fontWeight: 600 }}>
                      <User size={14} color={COLORS.primary} />
                      {r.clientName || "Cliente"}
                    </div>
                    {r.notes && (
                      <div style={{ fontSize: 12.5, color: COLORS.inkSoft }} className="mb-2">
                        «{r.notes}»
                      </div>
                    )}
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {r.proposedSlotIds.map((slotId) => {
                        const slot = slotById[slotId];
                        if (!slot) {
                          return (
                            <span
                              key={slotId}
                              className="inline-flex items-center rounded-lg"
                              style={{ fontSize: 12, padding: "5px 9px", color: COLORS.inkSoft, border: `1px solid ${COLORS.border}`, opacity: 0.6 }}
                            >
                              Data non più disponibile
                            </span>
                          );
                        }
                        const isSelected = selected === slotId;
                        return (
                          <button
                            key={slotId}
                            type="button"
                            onClick={() => setSelectedSlotByRequest((cur) => ({ ...cur, [r.id]: slotId }))}
                            className="inline-flex items-center gap-1 rounded-lg text-sm font-medium"
                            style={{
                              padding: "5px 10px",
                              border: `1px solid ${isSelected ? COLORS.primary : COLORS.border}`,
                              background: isSelected ? withAlpha(COLORS.primary, 14) : "transparent",
                              color: isSelected ? COLORS.primaryDark : COLORS.ink,
                            }}
                          >
                            <Calendar size={12} /> {formatSlotLabel(slot)}
                          </button>
                        );
                      })}
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        disabled={busyId === r.id}
                        onClick={() => openAccept(r)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold text-white disabled:opacity-60"
                        style={{ background: COLORS.primary }}
                      >
                        <Check size={13} /> Accetta
                      </button>
                      <button
                        disabled={busyId === r.id}
                        onClick={() => setRejecting(r)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium disabled:opacity-60"
                        style={{ color: COLORS.danger, border: `1px solid ${withAlpha(COLORS.danger, 33)}` }}
                      >
                        <X size={13} /> Rifiuta
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {decidedRequests.length > 0 && (
            <div className="mt-6">
              <button onClick={() => setHistoryOpen((v) => !v)} className="flex items-center gap-2" style={{ color: COLORS.heading }}>
                <span style={{ fontSize: 13.5, fontWeight: 600 }}>Storico richieste</span>
                <span style={{ fontSize: 12, color: COLORS.inkSoft }}>({decidedRequests.length})</span>
                <ChevronDown size={15} color={COLORS.inkSoft} style={{ transform: historyOpen ? "rotate(180deg)" : "none", transition: "transform .15s" }} />
              </button>
              {historyOpen && (
                <div className="flex flex-col gap-1.5 mt-2">
                  {decidedRequests.map((r) => (
                    <div key={r.id} className="p-2.5 rounded-lg flex items-center justify-between flex-wrap gap-1.5" style={{ background: COLORS.card, border: `1px solid ${COLORS.border}` }}>
                      <div style={{ fontSize: 12.5 }}>
                        <strong>{r.clientName}</strong>{" "}
                        {r.chosenSlotId && slotById[r.chosenSlotId] ? `— ${formatSlotLabel(slotById[r.chosenSlotId])}` : ""}
                      </div>
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          color: r.status === "accepted" ? COLORS.success : r.status === "rejected" ? COLORS.danger : COLORS.inkSoft,
                        }}
                      >
                        {r.status === "accepted" ? "Accettata" : r.status === "rejected" ? "Rifiutata" : "Annullata dal cliente"}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      ) : tab === "scheduled" ? (
        <div>
          {upcomingClasses.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-center py-14" style={{ color: COLORS.inkSoft }}>
              <User size={28} className="mb-2" />
              <div style={{ fontSize: 13.5 }}>Nessuna lezione individuale in programma.</div>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {upcomingClasses.map((c) => (
                <ScheduledClassRow key={c.id} item={c} client={c.personalClientId ? clientById[c.personalClientId] : undefined} typeName={typeById[c.typeId]?.name} onOpen={setEditClass} />
              ))}
            </div>
          )}

          {pastClasses.length > 0 && (
            <div className="mt-6">
              <button onClick={() => setPastClassesOpen((v) => !v)} className="flex items-center gap-2" style={{ color: COLORS.heading }}>
                <span style={{ fontSize: 13.5, fontWeight: 600 }}>Lezioni passate</span>
                <span style={{ fontSize: 12, color: COLORS.inkSoft }}>({pastClasses.length})</span>
                <ChevronDown size={15} color={COLORS.inkSoft} style={{ transform: pastClassesOpen ? "rotate(180deg)" : "none", transition: "transform .15s" }} />
              </button>
              {pastClassesOpen && (
                <div className="flex flex-col gap-1.5 mt-2">
                  {pastClasses.map((c) => (
                    <ScheduledClassRow key={c.id} item={c} client={c.personalClientId ? clientById[c.personalClientId] : undefined} typeName={typeById[c.typeId]?.name} onOpen={setEditClass} muted />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        <div>
          {activeSlots.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-center py-14" style={{ color: COLORS.inkSoft }}>
              <Calendar size={28} className="mb-2" />
              <div style={{ fontSize: 13.5 }}>Nessuno slot ancora — aggiungine uno per iniziare a ricevere richieste.</div>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {activeSlots.map((s) => (
                <div
                  key={s.id}
                  className="flex items-center gap-3 p-3 rounded-xl flex-wrap"
                  style={{ background: COLORS.card, border: `1px solid ${COLORS.border}` }}
                >
                  <div className="flex-1" style={{ minWidth: 140 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 600 }}>{formatSlotLabel(s)}</div>
                    {s.notes && <div style={{ fontSize: 11.5, color: COLORS.inkSoft }}>{s.notes}</div>}
                  </div>
                  <button
                    title={s.published ? "Pubblicato — clicca per mettere in bozza" : "Bozza — clicca per pubblicare"}
                    onClick={() => handleSaveSlot({ ...s, published: !s.published })}
                    className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg"
                    style={{ color: s.published ? COLORS.success : COLORS.gold, border: `1px solid ${withAlpha(s.published ? COLORS.success : COLORS.gold, 33)}` }}
                  >
                    {s.published ? <Eye size={12} /> : <EyeOff size={12} />} {s.published ? "Pubblicato" : "Bozza"}
                  </button>
                  <button
                    onClick={() => setSlotModal({ mode: "edit", slot: s })}
                    className="text-xs font-semibold px-2.5 py-1.5 rounded-lg"
                    style={{ color: COLORS.primaryDark, border: `1px solid ${COLORS.border}` }}
                  >
                    Modifica
                  </button>
                  <button
                    onClick={() => setConfirmDeleteSlot(s.id)}
                    className="flex items-center justify-center rounded-lg"
                    style={{ width: 32, height: 32, color: COLORS.danger }}
                    title="Elimina"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {usedSlots.length > 0 && (
            <div className="mt-6">
              <button onClick={() => setUsedSlotsOpen((v) => !v)} className="flex items-center gap-2" style={{ color: COLORS.heading }}>
                <span style={{ fontSize: 13.5, fontWeight: 600 }}>Slot già assegnati</span>
                <span style={{ fontSize: 12, color: COLORS.inkSoft }}>({usedSlots.length})</span>
                <ChevronDown size={15} color={COLORS.inkSoft} style={{ transform: usedSlotsOpen ? "rotate(180deg)" : "none", transition: "transform .15s" }} />
              </button>
              {usedSlotsOpen && (
                <div className="flex flex-col gap-1.5 mt-2">
                  {usedSlots.map((s) => (
                    <div key={s.id} className="p-2.5 rounded-lg" style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, opacity: 0.7 }}>
                      <div style={{ fontSize: 12.5 }}>{formatSlotLabel(s)}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {slotModal && (
        <IndividualSlotFormModal data={slotModal} onClose={() => setSlotModal(null)} onSave={handleSaveSlot} onDelete={(id) => setConfirmDeleteSlot(id)} />
      )}

      {confirmDeleteSlot && (
        <Modal onClose={() => setConfirmDeleteSlot(null)} width={360}>
          <div className="p-5">
            <div className="font-semibold mb-1">Eliminare questo slot?</div>
            <div style={{ fontSize: 13, color: COLORS.inkSoft }} className="mb-4">
              L&apos;azione non può essere annullata.
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setConfirmDeleteSlot(null)} className="px-3 py-2 rounded-lg text-sm font-medium" style={{ border: `1px solid ${COLORS.border}` }}>
                Annulla
              </button>
              <button onClick={() => handleDeleteSlot(confirmDeleteSlot)} className="px-3 py-2 rounded-lg text-sm font-medium text-white" style={{ background: COLORS.danger }}>
                Elimina
              </button>
            </div>
          </div>
        </Modal>
      )}

      {editClass && (
        <PersonalClassFormModal
          data={{ mode: "edit", classItem: editClass }}
          classTypes={classTypes}
          levels={levels}
          clients={clients}
          packages={packages}
          defaultTime={settings.time}
          singleClassPrice={settings.singleClassPrice}
          onClose={() => setEditClass(null)}
          onSave={handleEditClassSave}
          onDelete={(id) => setConfirmDeleteClass(id)}
          onAddClient={upsertClient}
          onOpenSettings={() => {
            setEditClass(null);
            router.push("/admin/impostazioni");
          }}
        />
      )}

      {confirmDeleteClass && (
        <Modal onClose={() => setConfirmDeleteClass(null)} width={360}>
          <div className="p-5">
            <div className="font-semibold mb-1">Eliminare questa lezione?</div>
            <div style={{ fontSize: 13, color: COLORS.inkSoft }} className="mb-4">
              L&apos;azione non può essere annullata. Le prenotazioni associate andranno perse.
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setConfirmDeleteClass(null)} className="px-3 py-2 rounded-lg text-sm font-medium" style={{ border: `1px solid ${COLORS.border}` }}>
                Annulla
              </button>
              <button onClick={() => handleDeleteClass(confirmDeleteClass)} className="px-3 py-2 rounded-lg text-sm font-medium text-white" style={{ background: COLORS.danger }}>
                Elimina
              </button>
            </div>
          </div>
        </Modal>
      )}

      {acceptModal &&
        (() => {
          const slot = slotById[acceptModal.slotId];
          if (!slot) return null;
          const [y, m, d] = slot.date.split("-").map(Number);
          return (
            <PersonalClassFormModal
              data={{ mode: "new", date: new Date(y, m - 1, d), prefill: { clientId: acceptModal.request.clientId, time: slot.time } }}
              classTypes={classTypes}
              levels={levels}
              clients={clients}
              packages={packages}
              defaultTime={settings.time}
              singleClassPrice={settings.singleClassPrice}
              onClose={() => setAcceptModal(null)}
              onSave={handleAcceptSave}
              onDelete={() => {}}
              onAddClient={upsertClient}
              onOpenSettings={() => {
                setAcceptModal(null);
                router.push("/admin/impostazioni");
              }}
            />
          );
        })()}

      {rejecting && (
        <Modal
          onClose={() => {
            setRejecting(null);
            setRejectNote("");
          }}
          width={380}
        >
          <div className="p-5">
            <div className="font-semibold mb-1">Rifiutare la richiesta di {rejecting.clientName}?</div>
            <div style={{ fontSize: 13, color: COLORS.inkSoft }} className="mb-3">
              Il cliente riceverà un avviso. Puoi aggiungere una nota facoltativa.
            </div>
            <textarea
              value={rejectNote}
              onChange={(e) => setRejectNote(e.target.value)}
              rows={3}
              placeholder="Nota facoltativa"
              style={{ ...inputStyle, resize: "vertical" }}
              className="mb-4"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setRejecting(null);
                  setRejectNote("");
                }}
                className="px-3 py-2 rounded-lg text-sm font-medium"
                style={{ border: `1px solid ${COLORS.border}` }}
              >
                Annulla
              </button>
              <button
                disabled={busyId === rejecting.id}
                onClick={handleReject}
                className="px-3 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-60"
                style={{ background: COLORS.danger }}
              >
                Rifiuta richiesta
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

function ScheduledClassRow({
  item,
  client,
  typeName,
  onOpen,
  muted,
}: {
  item: ClassItem;
  client: ClientItem | undefined;
  typeName: string | undefined;
  onOpen: (item: ClassItem) => void;
  muted?: boolean;
}) {
  const color = item.published ? COLORS.success : COLORS.gold;
  return (
    <button
      onClick={() => onOpen(item)}
      className="flex items-center gap-3 p-3 rounded-xl flex-wrap text-left w-full"
      style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, opacity: muted ? 0.7 : 1 }}
    >
      <div className="flex-1" style={{ minWidth: 140 }}>
        <div style={{ fontSize: 13.5, fontWeight: 600 }}>{formatSlotLabel({ date: item.date, time: item.time || "—" })}</div>
        <div style={{ fontSize: 11.5, color: item.personalClientId ? COLORS.inkSoft : COLORS.gold }}>
          {item.personalClientId ? client?.name || "Cliente" : "Cliente da assegnare"}
          {typeName ? ` · ${typeName}` : ""}
        </div>
      </div>
      <span
        className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg"
        style={{ color, border: `1px solid ${withAlpha(color, 33)}` }}
      >
        {item.published ? <Eye size={12} /> : <EyeOff size={12} />} {item.published ? "Pubblicata" : "Bozza"}
      </span>
    </button>
  );
}
