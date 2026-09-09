"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import type { SupabaseClient } from "@supabase/supabase-js";
import { AlertCircle, Check, GripVertical, Plus, Printer, Search, Share2, Sparkles, Trash2, X } from "lucide-react";
import {
  DndContext,
  DragOverlay,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { COLORS, withAlpha } from "./colors";
import { Field, Modal, Switch, inputStyle } from "./ui";
import { saveSequence, deleteSequence, fetchSequenceTemplate } from "./data";
import type { ClassType, ClientItem, HoldUnit, PoseCatalogItem, PoseCategory, PoseMacro, Sequence, SectionKind } from "./types";

type EditItem = {
  uid: string;
  poseId: string | null;
  customLabel: string;
  note: string;
  reps: number | null;
  holdValue: number | null;
  holdUnit: HoldUnit | null;
};
type EditSection = { uid: string; kind: SectionKind; label: string; enabled: boolean; items: EditItem[] };

function uid(): string {
  return typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `id-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function sectionsFromSequence(sequence: Sequence): EditSection[] {
  return sequence.sections.map((s) => ({
    uid: uid(),
    kind: s.kind,
    label: s.label,
    enabled: s.enabled,
    items: s.items.map((it) => ({
      uid: uid(),
      poseId: it.poseId,
      customLabel: it.customLabel,
      note: it.note,
      reps: it.reps,
      holdValue: it.holdValue,
      holdUnit: it.holdUnit,
    })),
  }));
}

function sectionsFromTemplate(template: { sections: { kind: SectionKind; label: string; enabled: boolean }[] } | null): EditSection[] {
  if (!template) return [];
  return template.sections.map((s) => ({ uid: uid(), kind: s.kind, label: s.label, enabled: s.enabled, items: [] }));
}

function formatItemMeta(reps: number | null, holdValue: number | null, holdUnit: HoldUnit | null): string {
  const parts: string[] = [];
  if (reps) parts.push(`×${reps}`);
  if (holdValue) {
    const unitLabel = holdUnit === "minutes" ? (holdValue === 1 ? "minuto" : "minuti") : holdUnit === "breaths" ? (holdValue === 1 ? "respiro" : "respiri") : holdValue === 1 ? "secondo" : "secondi";
    parts.push(`${holdValue} ${unitLabel}`);
  }
  return parts.join(" · ");
}

function buildSheetText(sections: { label: string; items: { text: string; meta: string; note: string }[] }[], personLabel: string) {
  const lines = [personLabel ? `Sequenza per ${personLabel}` : "Sequenza"];
  sections.forEach((s) => {
    if (s.items.length === 0) return;
    lines.push("");
    lines.push(s.label.toUpperCase());
    s.items.forEach((it) => {
      const meta = it.meta ? ` [${it.meta}]` : "";
      const note = it.note ? `  (${it.note})` : "";
      lines.push(`- ${it.text}${meta}${note}`);
    });
  });
  return lines.join("\n");
}

export function SequenceEditor({
  supabase,
  sequence,
  classTypes,
  clients,
  poseCatalog,
  poseCategories,
  onSaved,
  onDeleted,
  onClose,
}: {
  supabase: SupabaseClient;
  sequence: Sequence | null;
  classTypes: ClassType[];
  clients: ClientItem[];
  poseCatalog: PoseCatalogItem[];
  poseCategories: PoseCategory[];
  onSaved: (s: Sequence) => void;
  onDeleted?: (id: string) => void;
  onClose?: () => void;
}) {
  const [classTypeId, setClassTypeId] = useState<string>(sequence?.classTypeId ?? classTypes[0]?.id ?? "");
  const [name, setName] = useState(sequence?.name ?? "");
  const [clientId, setClientId] = useState<string | null>(sequence?.clientId ?? null);
  const [guestName, setGuestName] = useState(sequence?.guestName ?? "");
  const [sections, setSections] = useState<EditSection[]>(sequence ? sectionsFromSequence(sequence) : []);
  const [loadingTemplate, setLoadingTemplate] = useState(!sequence);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [showSheet, setShowSheet] = useState(false);
  const [copied, setCopied] = useState(false);
  const [canShare, setCanShare] = useState(false);
  const [activeDragPose, setActiveDragPose] = useState<PoseCatalogItem | null>(null);

  const poseById = useMemo(() => Object.fromEntries(poseCatalog.map((p) => [p.id, p])), [poseCatalog]);

  useEffect(() => {
    // Rilevamento della Web Share API: deve avvenire dopo il mount (non nel
    // render) perché `navigator` non esiste durante il render lato server.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCanShare(typeof navigator !== "undefined" && typeof navigator.share === "function");
  }, []);

  useEffect(() => {
    if (sequence) return; // sequenza esistente: sezioni già caricate dal suo stato salvato
    if (!classTypeId) return;
    let cancelled = false;
    setLoadingTemplate(true);
    fetchSequenceTemplate(supabase, classTypeId)
      .then((t) => {
        if (!cancelled) setSections(sectionsFromTemplate(t));
      })
      .catch(() => {
        if (!cancelled) setSections([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingTemplate(false);
      });
    return () => {
      cancelled = true;
    };
  }, [classTypeId, sequence, supabase]);

  const activeClient = clientId ? clients.find((c) => c.id === clientId) : null;
  const personLabel = activeClient?.name || guestName.trim();

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  function handleOuterDragStart(e: DragStartEvent) {
    const data = e.active.data.current as { type?: string; pose?: PoseCatalogItem } | undefined;
    setActiveDragPose(data?.type === "palette" ? data.pose ?? null : null);
  }

  function handleOuterDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    setActiveDragPose(null);
    if (!over) return;
    const activeData = active.data.current as { type?: string; pose?: PoseCatalogItem } | undefined;
    if (activeData?.type === "palette" && activeData.pose) {
      const overId = String(over.id);
      if (overId.startsWith("section-drop:")) addPoseItem(overId.slice("section-drop:".length), activeData.pose);
      return;
    }
    if (active.id === over.id) return;
    setSections((cur) => {
      const from = cur.findIndex((s) => s.uid === active.id);
      const to = cur.findIndex((s) => s.uid === over.id);
      return from < 0 || to < 0 ? cur : arrayMove(cur, from, to);
    });
  }

  function moveItem(sectionUid: string, activeUid: string, overUid: string) {
    setSections((cur) =>
      cur.map((s) => {
        if (s.uid !== sectionUid) return s;
        const from = s.items.findIndex((it) => it.uid === activeUid);
        const to = s.items.findIndex((it) => it.uid === overUid);
        return from < 0 || to < 0 ? s : { ...s, items: arrayMove(s.items, from, to) };
      })
    );
  }

  function toggleSection(sectionUid: string, enabled: boolean) {
    setSections((cur) => cur.map((s) => (s.uid === sectionUid ? { ...s, enabled } : s)));
  }
  function renameSection(sectionUid: string, label: string) {
    setSections((cur) => cur.map((s) => (s.uid === sectionUid ? { ...s, label } : s)));
  }
  function removeSection(sectionUid: string) {
    setSections((cur) => cur.filter((s) => s.uid !== sectionUid));
  }
  function addCustomSection() {
    setSections((cur) => [...cur, { uid: uid(), kind: "custom", label: "Nuova sezione", enabled: true, items: [] }]);
  }

  function addPoseItem(sectionUid: string, pose: PoseCatalogItem) {
    setSections((cur) =>
      cur.map((s) =>
        s.uid === sectionUid
          ? { ...s, items: [...s.items, { uid: uid(), poseId: pose.id, customLabel: "", note: "", reps: null, holdValue: null, holdUnit: null }] }
          : s
      )
    );
  }
  function addCustomItem(sectionUid: string, label: string) {
    if (!label.trim()) return;
    setSections((cur) =>
      cur.map((s) =>
        s.uid === sectionUid
          ? { ...s, items: [...s.items, { uid: uid(), poseId: null, customLabel: label.trim(), note: "", reps: null, holdValue: null, holdUnit: null }] }
          : s
      )
    );
  }
  function updateItem(sectionUid: string, itemUid: string, patch: Partial<EditItem>) {
    setSections((cur) =>
      cur.map((s) => (s.uid === sectionUid ? { ...s, items: s.items.map((it) => (it.uid === itemUid ? { ...it, ...patch } : it)) } : s))
    );
  }
  function removeItem(sectionUid: string, itemUid: string) {
    setSections((cur) => cur.map((s) => (s.uid === sectionUid ? { ...s, items: s.items.filter((it) => it.uid !== itemUid) } : s)));
  }

  const totalActive = sections.reduce((sum, s) => (s.enabled ? sum + s.items.length : sum), 0);

  const sheetSections = useMemo(
    () =>
      sections
        .filter((s) => s.enabled)
        .map((s) => ({
          label: s.label,
          items: s.items.map((it) => ({
            text: it.poseId ? poseById[it.poseId]?.name ?? "?" : it.customLabel,
            note: it.note,
            meta: formatItemMeta(it.reps, it.holdValue, it.holdUnit),
            imageUrl: it.poseId ? poseById[it.poseId]?.imageUrl ?? null : null,
          })),
        })),
    [sections, poseById]
  );

  async function handleSave() {
    setSaving(true);
    setError("");
    try {
      const saved = await saveSequence(supabase, {
        id: sequence?.id,
        classTypeId,
        clientId,
        guestName: clientId ? "" : guestName.trim(),
        name: name.trim() || "Sequenza senza nome",
        sections: sections.map((s, sIdx) => ({
          kind: s.kind,
          label: s.label,
          enabled: s.enabled,
          position: sIdx,
          items: s.items.map((it, iIdx) => ({
            poseId: it.poseId,
            customLabel: it.customLabel,
            note: it.note,
            position: iIdx,
            reps: it.reps,
            holdValue: it.holdValue,
            holdUnit: it.holdUnit,
          })),
        })),
      });
      onSaved(saved);
    } catch {
      setError("Errore nel salvataggio della sequenza.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!sequence) return;
    setSaving(true);
    setError("");
    try {
      await deleteSequence(supabase, sequence.id);
      onDeleted?.(sequence.id);
    } catch {
      setError("Errore nell'eliminazione.");
      setSaving(false);
    }
  }

  function handleCopy() {
    const text = buildSheetText(sheetSections, personLabel);
    navigator.clipboard
      .writeText(text)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1400);
      })
      .catch(() => {});
  }
  function handleShare() {
    const text = buildSheetText(sheetSections, personLabel);
    navigator.share({ title: personLabel ? `Sequenza per ${personLabel}` : "Sequenza", text }).catch(() => {});
  }
  function handlePrint() {
    window.print();
  }

  const selectedType = classTypes.find((t) => t.id === classTypeId);

  return (
    <div>
      <div className="grid sm:grid-cols-2 gap-3 mb-4">
        <Field label="Nome sequenza">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Es. Sequenza base, Post-infortunio ginocchio" style={inputStyle} />
        </Field>
        <Field label="Tipo di sequenza">
          <select value={classTypeId} onChange={(e) => setClassTypeId(e.target.value)} disabled={!!sequence} style={inputStyle}>
            {classTypes.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <div className="grid sm:grid-cols-2 gap-3 mb-4">
        <Field label="Allievo collegato">
          <select value={clientId ?? ""} onChange={(e) => setClientId(e.target.value || null)} style={inputStyle}>
            <option value="">Nessuno — nome libero o bozza</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </Field>
        {!clientId && (
          <Field label="Nome allievo (facoltativo)">
            <input value={guestName} onChange={(e) => setGuestName(e.target.value)} placeholder="nome allievo, o lascia vuoto per una bozza" style={inputStyle} />
          </Field>
        )}
      </div>

      {loadingTemplate ? (
        <div style={{ fontSize: 13, color: COLORS.inkSoft }} className="py-6 text-center">
          Caricamento template…
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleOuterDragStart} onDragEnd={handleOuterDragEnd}>
          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_260px] gap-4 mb-3">
            <div>
              <SortableContext items={sections.map((s) => s.uid)} strategy={verticalListSortingStrategy}>
                <div className="flex flex-col gap-2.5">
                  {sections.map((section) => (
                    <SectionEditor
                      key={section.uid}
                      section={section}
                      poseById={poseById}
                      onToggle={(v) => toggleSection(section.uid, v)}
                      onRename={(v) => renameSection(section.uid, v)}
                      onRemove={() => removeSection(section.uid)}
                      onAddCustom={(label) => addCustomItem(section.uid, label)}
                      onUpdateItem={(itemUid, patch) => updateItem(section.uid, itemUid, patch)}
                      onRemoveItem={(itemUid) => removeItem(section.uid, itemUid)}
                      onMoveItem={(activeUid, overUid) => moveItem(section.uid, activeUid, overUid)}
                    />
                  ))}
                </div>
              </SortableContext>
              <button onClick={addCustomSection} className="flex items-center gap-1.5 text-xs font-semibold mt-2.5" style={{ color: COLORS.primaryDark }}>
                <Plus size={13} /> Aggiungi sezione personalizzata
              </button>
            </div>

            <PosePalette poseCatalog={poseCatalog} poseCategories={poseCategories} />
          </div>

          <DragOverlay>
            {activeDragPose && (
              <div className="flex items-center gap-2 p-1.5 rounded-lg" style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, boxShadow: "0 8px 20px rgba(0,0,0,0.18)" }}>
                {activeDragPose.imageUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={activeDragPose.imageUrl} alt="" width={30} height={30} style={{ borderRadius: 6, objectFit: "cover" }} />
                )}
                <span style={{ fontSize: 12, fontWeight: 600 }}>{activeDragPose.name}</span>
              </div>
            )}
          </DragOverlay>
        </DndContext>
      )}

      {error && (
        <div className="mb-3 flex items-center gap-1.5" style={{ fontSize: 12, color: COLORS.danger }}>
          <AlertCircle size={13} /> {error}
        </div>
      )}

      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          {sequence && (
            <button onClick={handleDelete} disabled={saving} className="text-sm font-medium px-1" style={{ color: COLORS.danger }}>
              Elimina sequenza
            </button>
          )}
          <span style={{ fontSize: 12, color: COLORS.inkSoft }}>
            {totalActive} posizioni attive{selectedType ? ` · ${selectedType.name}` : ""}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowSheet(true)} className="px-3 py-2 rounded-lg text-sm font-medium" style={{ border: `1px solid ${COLORS.border}` }}>
            Genera scheda
          </button>
          {onClose && (
            <button onClick={onClose} className="px-3 py-2 rounded-lg text-sm font-medium" style={{ border: `1px solid ${COLORS.border}` }}>
              Chiudi
            </button>
          )}
          <button onClick={handleSave} disabled={saving} className="px-3 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-60" style={{ background: COLORS.primary }}>
            {saving ? "Salvataggio…" : "Salva sequenza"}
          </button>
        </div>
      </div>

      {showSheet && (
        <Modal onClose={() => setShowSheet(false)} width={520}>
          <div className="p-5 overflow-y-auto">
            <div style={{ fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 600, color: COLORS.heading }}>
              {personLabel ? `Sequenza per ${personLabel}` : "Sequenza"}
            </div>
            <div className="mb-4" style={{ fontSize: 12, color: COLORS.inkSoft }}>
              {new Date().toLocaleDateString("it-IT")}
            </div>

            {totalActive === 0 ? (
              <div style={{ fontSize: 13, color: COLORS.inkSoft }}>Nessuna posizione attiva: aggiungi almeno un elemento alla sequenza.</div>
            ) : (
              sheetSections.map((s, idx) =>
                s.items.length === 0 ? null : (
                  <div key={idx} className="mb-4">
                    <div style={{ fontSize: 11.5, fontWeight: 700, color: COLORS.primaryDark, textTransform: "uppercase", letterSpacing: 0.3 }} className="mb-1.5">
                      {s.label}
                    </div>
                    <div className="flex flex-col gap-1.5">
                      {s.items.map((it, i2) => (
                        <div key={i2} className="flex items-center gap-2.5" style={{ fontSize: 13, borderBottom: `1px dashed ${COLORS.border}`, paddingBottom: 6 }}>
                          {it.imageUrl && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={it.imageUrl} alt="" width={32} height={32} style={{ borderRadius: 6, objectFit: "cover", background: COLORS.subtle, flexShrink: 0 }} />
                          )}
                          <div className="flex-1 flex items-center justify-between gap-2 flex-wrap">
                            <span style={{ fontFamily: "var(--font-display)" }}>
                              {it.text}
                              {it.meta && (
                                <span style={{ fontFamily: "inherit", fontWeight: 600, color: COLORS.primaryDark, fontSize: 11.5 }}> · {it.meta}</span>
                              )}
                            </span>
                            {it.note && <span style={{ color: COLORS.inkSoft, fontSize: 12, textAlign: "right" }}>{it.note}</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              )
            )}

            <div className="flex items-center gap-2 mt-4 flex-wrap">
              <button onClick={handleCopy} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium" style={{ border: `1px solid ${COLORS.border}` }}>
                {copied ? <Check size={14} /> : null} {copied ? "Copiato" : "Copia testo"}
              </button>
              {canShare && (
                <button onClick={handleShare} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium" style={{ border: `1px solid ${COLORS.border}` }}>
                  <Share2 size={14} /> Condividi
                </button>
              )}
              <button onClick={handlePrint} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold text-white" style={{ background: COLORS.primary }}>
                <Printer size={14} /> Stampa
              </button>
            </div>
          </div>

          {typeof document !== "undefined" &&
            createPortal(
              <div id="sequence-print-sheet">
                <style>{`
                  @media screen { #sequence-print-sheet { display: none; } }
                  @media print {
                    body > *:not(#sequence-print-sheet) { display: none !important; }
                    #sequence-print-sheet { display: block !important; padding: 24px; max-width: 680px; margin: 0 auto; font-family: 'IBM Plex Sans', sans-serif; color: #2A2440; }
                    #sequence-print-sheet h1 { font-family: 'Fraunces', serif; font-size: 1.4rem; margin: 0 0 4px; }
                    #sequence-print-sheet .p-sub { color: #5C5470; font-size: 0.85rem; margin: 0 0 18px; }
                    #sequence-print-sheet .p-section-title { font-size: 0.78rem; font-weight: 600; color: #9C4FA0; margin: 20px 0 6px; text-transform: uppercase; }
                    #sequence-print-sheet .p-row { display: flex; align-items: center; gap: 12px; padding: 5px 0; border-bottom: 1px dashed #DCD3EC; break-inside: avoid; }
                    #sequence-print-sheet .p-thumb { width: 36px; height: 36px; border-radius: 6px; object-fit: cover; background: #DFD5EE; flex-shrink: 0; }
                    #sequence-print-sheet .p-text { display: flex; justify-content: space-between; gap: 14px; flex: 1; }
                    #sequence-print-sheet .p-meta { color: #9C4FA0; font-weight: 600; font-size: 0.78rem; }
                    #sequence-print-sheet .p-note { color: #5C5470; font-size: 0.85rem; text-align: right; }
                  }
                `}</style>
                <h1>{personLabel ? `Sequenza per ${personLabel}` : "Sequenza"}</h1>
                <p className="p-sub">{new Date().toLocaleDateString("it-IT")}</p>
                {sheetSections.map((s, idx) =>
                  s.items.length === 0 ? null : (
                    <div key={idx}>
                      <div className="p-section-title">{s.label}</div>
                      {s.items.map((it, i2) => (
                        <div key={i2} className="p-row">
                          {it.imageUrl && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img className="p-thumb" src={it.imageUrl} alt="" />
                          )}
                          <div className="p-text">
                            <span>
                              {it.text} {it.meta && <span className="p-meta">· {it.meta}</span>}
                            </span>
                            {it.note && <span className="p-note">{it.note}</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )
                )}
              </div>,
              document.body
            )}
        </Modal>
      )}
    </div>
  );
}

function SectionEditor({
  section,
  poseById,
  onToggle,
  onRename,
  onRemove,
  onAddCustom,
  onUpdateItem,
  onRemoveItem,
  onMoveItem,
}: {
  section: EditSection;
  poseById: Record<string, PoseCatalogItem>;
  onToggle: (v: boolean) => void;
  onRename: (v: string) => void;
  onRemove: () => void;
  onAddCustom: (label: string) => void;
  onUpdateItem: (itemUid: string, patch: Partial<EditItem>) => void;
  onRemoveItem: (itemUid: string) => void;
  onMoveItem: (activeUid: string, overUid: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: section.uid });
  const [expanded, setExpanded] = useState(true);
  const [addingCustom, setAddingCustom] = useState(false);
  const [customText, setCustomText] = useState("");
  const { setNodeRef: setDropRef, isOver } = useDroppable({ id: `section-drop:${section.uid}` });
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  function handleItemDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (over && active.id !== over.id) onMoveItem(String(active.id), String(over.id));
  }
  function submitCustom() {
    if (!customText.trim()) return;
    onAddCustom(customText);
    setCustomText("");
    setAddingCustom(false);
  }

  return (
    <div
      ref={setNodeRef}
      style={{
        border: `1px solid ${COLORS.border}`,
        borderRadius: 12,
        background: section.enabled ? COLORS.card : COLORS.subtle,
        opacity: isDragging ? 0.6 : 1,
        transform: CSS.Transform.toString(transform),
        transition,
      }}
    >
      <div className="flex items-center gap-2 p-2.5">
        <button {...attributes} {...listeners} className="cursor-grab flex items-center" style={{ color: COLORS.inkSoft, touchAction: "none" }} title="Trascina per riordinare">
          <GripVertical size={15} />
        </button>
        <button onClick={() => setExpanded((v) => !v)} className="flex-1 text-left flex items-center gap-2">
          <input
            value={section.label}
            onChange={(e) => onRename(e.target.value)}
            onClick={(e) => e.stopPropagation()}
            style={{ fontSize: 13, fontWeight: 600, border: "none", outline: "none", background: "transparent", color: COLORS.ink, minWidth: 0 }}
          />
          <span style={{ fontSize: 11, color: COLORS.inkSoft }}>{section.items.length} posizioni</span>
        </button>
        <Switch checked={section.enabled} onChange={onToggle} label="" onText="Attiva" offText="Off" />
        <button onClick={onRemove} title="Rimuovi sezione" style={{ color: COLORS.danger }}>
          <Trash2 size={14} />
        </button>
      </div>

      {expanded && section.enabled && (
        <div ref={setDropRef} className="px-2.5 pb-2.5 rounded-b-xl" style={{ background: isOver ? withAlpha(COLORS.primary, 10) : "transparent" }}>
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleItemDragEnd}>
            <SortableContext items={section.items.map((it) => it.uid)} strategy={verticalListSortingStrategy}>
              <div className="flex flex-col gap-1.5 mb-2">
                {section.items.map((item) => (
                  <ItemRow
                    key={item.uid}
                    item={item}
                    pose={item.poseId ? poseById[item.poseId] : undefined}
                    onUpdate={(patch) => onUpdateItem(item.uid, patch)}
                    onRemove={() => onRemoveItem(item.uid)}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>

          {section.items.length === 0 && (
            <div style={{ fontSize: 11.5, color: COLORS.inkSoft, textAlign: "center", padding: "14px 8px", border: `1px dashed ${COLORS.border}`, borderRadius: 10 }} className="mb-2">
              Trascina qui una posizione dal catalogo a destra
            </div>
          )}

          {addingCustom ? (
            <div className="flex items-center gap-1.5 flex-wrap">
              <input
                value={customText}
                onChange={(e) => setCustomText(e.target.value)}
                placeholder="Nome voce libera"
                style={{ ...inputStyle, fontSize: 12.5, flex: 1, minWidth: 120 }}
                onKeyDown={(e) => e.key === "Enter" && submitCustom()}
                autoFocus
              />
              <button onClick={submitCustom} className="text-xs font-semibold px-2.5 py-1.5 rounded-lg text-white" style={{ background: COLORS.primary }}>
                Aggiungi
              </button>
              <button onClick={() => setAddingCustom(false)} className="text-xs px-1" style={{ color: COLORS.inkSoft }}>
                Annulla
              </button>
            </div>
          ) : (
            <button onClick={() => setAddingCustom(true)} className="flex items-center gap-1 text-xs font-medium" style={{ color: COLORS.primaryDark }}>
              <Plus size={12} /> Voce libera (non a catalogo)
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function ItemRow({ item, pose, onUpdate, onRemove }: { item: EditItem; pose?: PoseCatalogItem; onUpdate: (patch: Partial<EditItem>) => void; onRemove: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.uid });
  const label = pose?.name || item.customLabel || "Voce senza nome";
  return (
    <div
      ref={setNodeRef}
      className="p-2 rounded-xl"
      style={{ background: COLORS.bg, border: `1px solid ${COLORS.border}`, opacity: isDragging ? 0.6 : 1, transform: CSS.Transform.toString(transform), transition }}
    >
      <div className="flex items-center gap-2.5">
        <button {...attributes} {...listeners} className="cursor-grab flex items-center" style={{ color: COLORS.inkSoft, touchAction: "none" }} title="Trascina per riordinare">
          <GripVertical size={14} />
        </button>
        {pose?.imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={pose.imageUrl} alt={label} width={36} height={36} style={{ borderRadius: 8, objectFit: "cover", background: COLORS.subtle, flexShrink: 0 }} />
        )}
        <div className="flex-1 min-w-0">
          <div style={{ fontSize: 13, fontWeight: 600 }}>{label}</div>
          <input value={item.note} onChange={(e) => onUpdate({ note: e.target.value })} placeholder="nota (facoltativa)" style={{ ...inputStyle, padding: "4px 8px", fontSize: 12, marginTop: 2 }} />
        </div>
        <button onClick={onRemove} title="Rimuovi" style={{ color: COLORS.inkSoft }}>
          <X size={14} />
        </button>
      </div>
      <div className="flex items-center gap-2.5 mt-1.5 flex-wrap" style={{ paddingLeft: 22 }}>
        <label className="flex items-center gap-1" style={{ fontSize: 11, color: COLORS.inkSoft }}>
          ×
          <input
            type="number"
            min={0}
            value={item.reps ?? ""}
            onChange={(e) => onUpdate({ reps: e.target.value === "" ? null : Number(e.target.value) })}
            placeholder="ripetizioni"
            style={{ ...inputStyle, width: 60, padding: "3px 6px", fontSize: 11.5 }}
          />
        </label>
        <label className="flex items-center gap-1" style={{ fontSize: 11, color: COLORS.inkSoft }}>
          per
          <input
            type="number"
            min={0}
            value={item.holdValue ?? ""}
            onChange={(e) => onUpdate({ holdValue: e.target.value === "" ? null : Number(e.target.value) })}
            placeholder="durata"
            style={{ ...inputStyle, width: 60, padding: "3px 6px", fontSize: 11.5 }}
          />
          <select value={item.holdUnit ?? "seconds"} onChange={(e) => onUpdate({ holdUnit: e.target.value as HoldUnit })} style={{ ...inputStyle, padding: "3px 6px", fontSize: 11.5, width: "auto" }}>
            <option value="seconds">secondi</option>
            <option value="minutes">minuti</option>
            <option value="breaths">respiri</option>
          </select>
        </label>
      </div>
    </div>
  );
}

function PosePalette({ poseCatalog, poseCategories }: { poseCatalog: PoseCatalogItem[]; poseCategories: PoseCategory[] }) {
  const [macro, setMacro] = useState<PoseMacro>("asana");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [query, setQuery] = useState("");

  const categoriesForMacro = useMemo(() => poseCategories.filter((c) => c.macro === macro), [poseCategories, macro]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return poseCatalog
      .filter((p) => p.macro === macro)
      .filter((p) => categoryFilter === "all" || p.categoryId === categoryFilter)
      .filter((p) => !q || p.name.toLowerCase().includes(q) || p.tags.some((t) => t.toLowerCase().includes(q)))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [poseCatalog, macro, categoryFilter, query]);

  return (
    <div
      className="p-3.5 rounded-2xl lg:sticky lg:top-3 lg:max-h-[calc(100dvh-160px)] flex flex-col"
      style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, boxShadow: `0 1px 2px ${withAlpha(COLORS.ink, 4)}` }}
    >
      <div className="flex items-center gap-1.5 mb-3">
        <Sparkles size={14} style={{ color: COLORS.primaryDark }} />
        <div style={{ fontSize: 13, fontWeight: 700, color: COLORS.heading }}>Catalogo posizioni</div>
      </div>

      <div className="flex items-center gap-1 p-1 rounded-xl mb-2.5" style={{ background: COLORS.subtle }}>
        <button
          onClick={() => {
            setMacro("asana");
            setCategoryFilter("all");
          }}
          className="flex-1 px-2 py-1.5 rounded-lg text-xs font-semibold transition"
          style={{ background: macro === "asana" ? COLORS.primary : "transparent", color: macro === "asana" ? "#fff" : COLORS.inkSoft }}
        >
          Asana
        </button>
        <button
          onClick={() => {
            setMacro("pranayama");
            setCategoryFilter("all");
          }}
          className="flex-1 px-2 py-1.5 rounded-lg text-xs font-semibold transition"
          style={{ background: macro === "pranayama" ? COLORS.primary : "transparent", color: macro === "pranayama" ? "#fff" : COLORS.inkSoft }}
        >
          Pranayama
        </button>
      </div>

      <div className="relative mb-2.5">
        <Search size={13} style={{ position: "absolute", left: 9, top: "50%", transform: "translateY(-50%)", color: COLORS.inkSoft }} />
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Cerca per nome o tag…" style={{ ...inputStyle, fontSize: 12.5, paddingLeft: 28 }} />
      </div>

      <div className="flex items-center gap-1 flex-wrap mb-3">
        <button
          onClick={() => setCategoryFilter("all")}
          className="px-2.5 py-1 rounded-full font-medium transition"
          style={{ fontSize: 11, background: categoryFilter === "all" ? COLORS.primaryDark : COLORS.subtle, color: categoryFilter === "all" ? "#fff" : COLORS.inkSoft }}
        >
          Tutte
        </button>
        {categoriesForMacro.map((c) => (
          <button
            key={c.id}
            onClick={() => setCategoryFilter(c.id)}
            className="px-2.5 py-1 rounded-full font-medium transition"
            style={{ fontSize: 11, background: categoryFilter === c.id ? COLORS.primaryDark : COLORS.subtle, color: categoryFilter === c.id ? "#fff" : COLORS.inkSoft }}
          >
            {c.name}
          </button>
        ))}
      </div>

      <div className="overflow-y-auto overflow-x-hidden lg:flex-1" style={{ minHeight: 0, maxHeight: "min(60vh, 420px)" }}>
        <div className="flex flex-col gap-1 pr-0.5">
          {filtered.map((p) => (
            <PaletteThumb key={p.id} pose={p} />
          ))}
        </div>
        {filtered.length === 0 && (
          <div style={{ fontSize: 11.5, color: COLORS.inkSoft }} className="text-center py-6">
            Nessuna posizione trovata.
          </div>
        )}
      </div>
    </div>
  );
}

function PaletteThumb({ pose }: { pose: PoseCatalogItem }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: `palette:${pose.id}`, data: { type: "palette", pose } });
  return (
    <button
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      title={pose.name}
      className="flex items-center gap-2.5 p-1.5 rounded-xl cursor-grab text-left transition min-w-0"
      style={{
        background: isDragging ? withAlpha(COLORS.primary, 10) : COLORS.bg,
        border: `1px solid ${isDragging ? COLORS.primary : COLORS.border}`,
        opacity: isDragging ? 0.5 : 1,
        touchAction: "none",
      }}
      onMouseEnter={(e) => {
        if (!isDragging) e.currentTarget.style.background = withAlpha(COLORS.primary, 7);
      }}
      onMouseLeave={(e) => {
        if (!isDragging) e.currentTarget.style.background = COLORS.bg;
      }}
    >
      {pose.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={pose.imageUrl} alt="" width={32} height={32} style={{ borderRadius: 8, objectFit: "cover", background: COLORS.subtle, flexShrink: 0 }} />
      ) : (
        <div style={{ width: 32, height: 32, borderRadius: 8, background: COLORS.subtle, flexShrink: 0 }} />
      )}
      <span style={{ fontSize: 12, lineHeight: 1.3, color: COLORS.ink, overflowWrap: "anywhere", minWidth: 0 }}>{pose.name}</span>
    </button>
  );
}
