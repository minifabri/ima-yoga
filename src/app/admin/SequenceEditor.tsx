"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import type { SupabaseClient } from "@supabase/supabase-js";
import { AlertCircle, Check, GripVertical, Plus, Printer, Share2, Trash2, X } from "lucide-react";
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { COLORS } from "./colors";
import { Field, Modal, Switch, inputStyle } from "./ui";
import { saveSequence, deleteSequence, fetchSequenceTemplate } from "./data";
import type { ClassType, ClientItem, PoseCatalogItem, PoseCategory, Sequence, SectionKind } from "./types";

type EditItem = { uid: string; poseId: string | null; customLabel: string; note: string };
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
    items: s.items.map((it) => ({ uid: uid(), poseId: it.poseId, customLabel: it.customLabel, note: it.note })),
  }));
}

function sectionsFromTemplate(template: { sections: { kind: SectionKind; label: string; enabled: boolean }[] } | null): EditSection[] {
  if (!template) return [];
  return template.sections.map((s) => ({ uid: uid(), kind: s.kind, label: s.label, enabled: s.enabled, items: [] }));
}

function buildSheetText(sections: { label: string; items: { text: string; note: string }[] }[], personLabel: string) {
  const lines = [personLabel ? `Sequenza per ${personLabel}` : "Sequenza"];
  sections.forEach((s) => {
    if (s.items.length === 0) return;
    lines.push("");
    lines.push(s.label.toUpperCase());
    s.items.forEach((it) => lines.push(`- ${it.text}${it.note ? `  (${it.note})` : ""}`));
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

  const poseById = useMemo(() => Object.fromEntries(poseCatalog.map((p) => [p.id, p])), [poseCatalog]);
  const categoryById = useMemo(() => Object.fromEntries(poseCategories.map((c) => [c.id, c])), [poseCategories]);

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

  function handleSectionDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
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
      cur.map((s) => (s.uid === sectionUid ? { ...s, items: [...s.items, { uid: uid(), poseId: pose.id, customLabel: "", note: "" }] } : s))
    );
  }
  function addCustomItem(sectionUid: string, label: string) {
    if (!label.trim()) return;
    setSections((cur) =>
      cur.map((s) => (s.uid === sectionUid ? { ...s, items: [...s.items, { uid: uid(), poseId: null, customLabel: label.trim(), note: "" }] } : s))
    );
  }
  function setItemNote(sectionUid: string, itemUid: string, note: string) {
    setSections((cur) =>
      cur.map((s) => (s.uid === sectionUid ? { ...s, items: s.items.map((it) => (it.uid === itemUid ? { ...it, note } : it)) } : s))
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
          items: s.items.map((it, iIdx) => ({ poseId: it.poseId, customLabel: it.customLabel, note: it.note, position: iIdx })),
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
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleSectionDragEnd}>
          <SortableContext items={sections.map((s) => s.uid)} strategy={verticalListSortingStrategy}>
            <div className="flex flex-col gap-2.5 mb-3">
              {sections.map((section) => (
                <SectionEditor
                  key={section.uid}
                  section={section}
                  poseCatalog={poseCatalog}
                  categoryById={categoryById}
                  poseById={poseById}
                  onToggle={(v) => toggleSection(section.uid, v)}
                  onRename={(v) => renameSection(section.uid, v)}
                  onRemove={() => removeSection(section.uid)}
                  onAddPose={(p) => addPoseItem(section.uid, p)}
                  onAddCustom={(label) => addCustomItem(section.uid, label)}
                  onSetNote={(itemUid, note) => setItemNote(section.uid, itemUid, note)}
                  onRemoveItem={(itemUid) => removeItem(section.uid, itemUid)}
                  onMoveItem={(activeUid, overUid) => moveItem(section.uid, activeUid, overUid)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      <button onClick={addCustomSection} className="flex items-center gap-1.5 text-xs font-semibold mb-4" style={{ color: COLORS.primaryDark }}>
        <Plus size={13} /> Aggiungi sezione personalizzata
      </button>

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
                          <div className="flex-1 flex items-center justify-between gap-2">
                            <span style={{ fontFamily: "var(--font-display)" }}>{it.text}</span>
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
                            <span>{it.text}</span>
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
  poseCatalog,
  categoryById,
  poseById,
  onToggle,
  onRename,
  onRemove,
  onAddPose,
  onAddCustom,
  onSetNote,
  onRemoveItem,
  onMoveItem,
}: {
  section: EditSection;
  poseCatalog: PoseCatalogItem[];
  categoryById: Record<string, PoseCategory>;
  poseById: Record<string, PoseCatalogItem>;
  onToggle: (v: boolean) => void;
  onRename: (v: string) => void;
  onRemove: () => void;
  onAddPose: (pose: PoseCatalogItem) => void;
  onAddCustom: (label: string) => void;
  onSetNote: (itemUid: string, note: string) => void;
  onRemoveItem: (itemUid: string) => void;
  onMoveItem: (activeUid: string, overUid: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: section.uid });
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState(true);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  const suggestions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    const macroFilter = section.kind === "pranayama" ? "pranayama" : "asana";
    return poseCatalog
      .filter((p) => p.macro === macroFilter)
      .filter((p) => {
        const category = p.categoryId ? categoryById[p.categoryId]?.name ?? "" : "";
        return p.name.toLowerCase().includes(q) || category.toLowerCase().includes(q) || p.tags.some((t) => t.toLowerCase().includes(q));
      })
      .slice(0, 8);
  }, [query, poseCatalog, categoryById, section.kind]);

  function handleItemDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (over && active.id !== over.id) onMoveItem(String(active.id), String(over.id));
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
        <div className="px-2.5 pb-2.5">
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleItemDragEnd}>
            <SortableContext items={section.items.map((it) => it.uid)} strategy={verticalListSortingStrategy}>
              <div className="flex flex-col gap-1.5 mb-2">
                {section.items.map((item) => (
                  <ItemRow key={item.uid} item={item} pose={item.poseId ? poseById[item.poseId] : undefined} onSetNote={(note) => onSetNote(item.uid, note)} onRemove={() => onRemoveItem(item.uid)} />
                ))}
              </div>
            </SortableContext>
          </DndContext>

          <div className="relative">
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Cerca posizione per nome, categoria o tag…" style={{ ...inputStyle, fontSize: 12.5 }} />
            {query.trim() && (
              <div className="absolute left-0 right-0 mt-1 rounded-lg overflow-hidden z-10" style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, boxShadow: "0 8px 20px rgba(0,0,0,0.12)" }}>
                {suggestions.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => {
                      onAddPose(p);
                      setQuery("");
                    }}
                    className="flex items-center gap-2 w-full text-left px-2.5 py-1.5"
                    style={{ fontSize: 12.5 }}
                  >
                    {p.imageUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.imageUrl} alt="" width={24} height={24} style={{ borderRadius: 5, objectFit: "cover", flexShrink: 0 }} />
                    )}
                    <span>{p.name}</span>
                    {p.categoryId && <span style={{ color: COLORS.inkSoft, fontSize: 11 }}>· {categoryById[p.categoryId]?.name}</span>}
                  </button>
                ))}
                <button
                  onClick={() => {
                    onAddCustom(query);
                    setQuery("");
                  }}
                  className="flex items-center gap-1.5 w-full text-left px-2.5 py-1.5"
                  style={{ fontSize: 12, color: COLORS.primaryDark, borderTop: suggestions.length ? `1px solid ${COLORS.border}` : "none" }}
                >
                  <Plus size={12} /> Aggiungi &quot;{query}&quot; come voce libera
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function ItemRow({ item, pose, onSetNote, onRemove }: { item: EditItem; pose?: PoseCatalogItem; onSetNote: (note: string) => void; onRemove: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.uid });
  const label = pose?.name || item.customLabel || "Voce senza nome";
  return (
    <div
      ref={setNodeRef}
      className="flex items-center gap-2.5 p-2 rounded-xl"
      style={{ background: COLORS.bg, border: `1px solid ${COLORS.border}`, opacity: isDragging ? 0.6 : 1, transform: CSS.Transform.toString(transform), transition }}
    >
      <button {...attributes} {...listeners} className="cursor-grab flex items-center" style={{ color: COLORS.inkSoft, touchAction: "none" }} title="Trascina per riordinare">
        <GripVertical size={14} />
      </button>
      {pose?.imageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={pose.imageUrl} alt={label} width={36} height={36} style={{ borderRadius: 8, objectFit: "cover", background: COLORS.subtle, flexShrink: 0 }} />
      )}
      <div className="flex-1 min-w-0">
        <div style={{ fontSize: 13, fontWeight: 600 }}>{label}</div>
        <input value={item.note} onChange={(e) => onSetNote(e.target.value)} placeholder="nota (facoltativa)" style={{ ...inputStyle, padding: "4px 8px", fontSize: 12, marginTop: 2 }} />
      </div>
      <button onClick={onRemove} title="Rimuovi" style={{ color: COLORS.inkSoft }}>
        <X size={14} />
      </button>
    </div>
  );
}
