"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";
import type { SupabaseClient } from "@supabase/supabase-js";
import { AlertCircle, Check, ChevronDown, ChevronUp, GripVertical, Plus, Printer, Repeat, Search, Share2, Sparkles, Trash2, X } from "lucide-react";
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
import { poseDisplayName, poseDisplayNameIt, poseDisplayImage } from "./poseDisplay";

function parentOfPose(poseById: Record<string, PoseCatalogItem>, pose: PoseCatalogItem | undefined): PoseCatalogItem | undefined {
  return pose?.parentPoseId ? poseById[pose.parentPoseId] : undefined;
}
import type { ClassType, ClientItem, HoldUnit, PoseCatalogItem, PoseCategory, PoseMacro, Sequence, SectionKind } from "./types";

// Filigrana ripetuta e discreta sulla scheda stampata/PDF: le foto delle
// posizioni sono materiale proprietario dello studio, quindi la scheda che
// esce verso gli allievi porta un richiamo al marchio invece di restare
// "pulita" e facilmente ricondivisibile senza contesto.
const PRINT_WATERMARK_URL = `data:image/svg+xml,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="260" height="260">
    <text x="0" y="150" font-family="IBM Plex Sans, sans-serif" font-size="22" fill="#9C4FA0" fill-opacity="0.14" transform="rotate(-28 130 130)">ima yoga</text>
  </svg>`
)}`;

type EditItem = {
  uid: string;
  poseId: string | null;
  customLabel: string;
  note: string;
  reps: number | null;
  holdValue: number | null;
  holdUnit: HoldUnit | null;
  onInhale: string | null;
  onExhale: string | null;
};
type EditBlock = { uid: string; reps: number | null; items: EditItem[] };
type EditRow = { uid: string; kind: "item"; item: EditItem } | { uid: string; kind: "block"; block: EditBlock };
type EditSection = { uid: string; kind: SectionKind; label: string; enabled: boolean; rows: EditRow[] };

function uid(): string {
  return typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `id-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

type CSSVarStyle = CSSProperties & Record<`--${string}`, string>;

const PALETTE_WIDTH_STORAGE_KEY = "ima-yoga:sequence-editor:palette-width";
const DEFAULT_PALETTE_WIDTH = 260;
const MIN_PALETTE_WIDTH = 220;
const MAX_PALETTE_WIDTH = 480;

function editItemFrom(it: {
  poseId: string | null;
  customLabel: string;
  note: string;
  reps: number | null;
  holdValue: number | null;
  holdUnit: HoldUnit | null;
  onInhale: string | null;
  onExhale: string | null;
}): EditItem {
  return {
    uid: uid(),
    poseId: it.poseId,
    customLabel: it.customLabel,
    note: it.note,
    reps: it.reps,
    holdValue: it.holdValue,
    holdUnit: it.holdUnit,
    onInhale: it.onInhale,
    onExhale: it.onExhale,
  };
}

function sectionsFromSequence(sequence: Sequence): EditSection[] {
  return sequence.sections.map((s) => {
    const blocksByDbId = new Map<string, EditBlock>();
    s.blocks.forEach((b) => blocksByDbId.set(b.id, { uid: uid(), reps: b.reps, items: [] }));

    const positional: { position: number; row: EditRow }[] = [];
    s.blocks.forEach((b) => {
      const block = blocksByDbId.get(b.id)!;
      positional.push({ position: b.position, row: { uid: block.uid, kind: "block", block } });
    });
    s.items.forEach((it) => {
      const editItem = editItemFrom(it);
      if (it.blockId && blocksByDbId.has(it.blockId)) {
        blocksByDbId.get(it.blockId)!.items.push(editItem);
      } else {
        positional.push({ position: it.position, row: { uid: editItem.uid, kind: "item", item: editItem } });
      }
    });
    positional.sort((a, b) => a.position - b.position);

    return { uid: uid(), kind: s.kind, label: s.label, enabled: s.enabled, rows: positional.map((p) => p.row) };
  });
}

function sectionsFromTemplate(template: { sections: { kind: SectionKind; label: string; enabled: boolean }[] } | null): EditSection[] {
  if (!template) return [];
  return template.sections.map((s) => ({ uid: uid(), kind: s.kind, label: s.label, enabled: s.enabled, rows: [] }));
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

function formatBreathText(onInhale: string | null, onExhale: string | null): string {
  const parts: string[] = [];
  if (onInhale !== null) parts.push(onInhale ? `inspiro: ${onInhale}` : "inspiro");
  if (onExhale !== null) parts.push(onExhale ? `espiro: ${onExhale}` : "espiro");
  return parts.join(" · ");
}

type SheetItem = { text: string; meta: string; note: string; breath: string; imageUrl: string | null };
type SheetRow = { kind: "item"; item: SheetItem } | { kind: "block"; reps: number | null; items: SheetItem[] };

function toSheetItem(it: EditItem, poseById: Record<string, PoseCatalogItem>): SheetItem {
  const pose = it.poseId ? poseById[it.poseId] : undefined;
  const parent = pose?.parentPoseId ? poseById[pose.parentPoseId] : undefined;
  return {
    text: pose ? poseDisplayName(pose, parent) : it.customLabel,
    note: it.note,
    meta: formatItemMeta(it.reps, it.holdValue, it.holdUnit),
    breath: formatBreathText(it.onInhale, it.onExhale),
    imageUrl: pose ? poseDisplayImage(pose, parent) : null,
  };
}

function buildSheetText(sections: { label: string; rows: SheetRow[] }[], personLabel: string) {
  const lines = [personLabel ? `Sequenza per ${personLabel}` : "Sequenza"];
  sections.forEach((s) => {
    const hasContent = s.rows.some((r) => (r.kind === "item" ? true : r.items.length > 0));
    if (!hasContent) return;
    lines.push("");
    lines.push(s.label.toUpperCase());
    s.rows.forEach((r) => {
      if (r.kind === "item") {
        const meta = r.item.meta ? ` [${r.item.meta}]` : "";
        const breath = r.item.breath ? `  {${r.item.breath}}` : "";
        const note = r.item.note ? `  (${r.item.note})` : "";
        lines.push(`- ${r.item.text}${meta}${breath}${note}`);
      } else if (r.items.length > 0) {
        lines.push(`  Ripeti ×${r.reps ?? "?"}:`);
        r.items.forEach((it) => {
          const meta = it.meta ? ` [${it.meta}]` : "";
          const breath = it.breath ? `  {${it.breath}}` : "";
          const note = it.note ? `  (${it.note})` : "";
          lines.push(`  - ${it.text}${meta}${breath}${note}`);
        });
      }
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
  const [clientIds, setClientIds] = useState<string[]>(sequence?.clientIds ?? []);
  const [guestName, setGuestName] = useState(sequence?.guestName ?? "");
  const [clientQuery, setClientQuery] = useState("");
  const [clientPickerOpen, setClientPickerOpen] = useState(false);
  const clientPickerRef = useRef<HTMLDivElement>(null);
  const [sections, setSections] = useState<EditSection[]>(sequence ? sectionsFromSequence(sequence) : []);
  const [loadingTemplate, setLoadingTemplate] = useState(!sequence);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [showSheet, setShowSheet] = useState(false);
  const [copied, setCopied] = useState(false);
  const [canShare, setCanShare] = useState(false);
  const [activeDragPose, setActiveDragPose] = useState<PoseCatalogItem | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [pickerTarget, setPickerTarget] = useState<{ sectionUid: string; blockUid: string | null } | null>(null);
  const [paletteWidth, setPaletteWidth] = useState<number>(DEFAULT_PALETTE_WIDTH);

  const poseById = useMemo(() => Object.fromEntries(poseCatalog.map((p) => [p.id, p])), [poseCatalog]);

  useEffect(() => {
    // Rilevamento della Web Share API: deve avvenire dopo il mount (non nel
    // render) perché `navigator` non esiste durante il render lato server.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCanShare(typeof navigator !== "undefined" && typeof navigator.share === "function");
  }, []);

  useEffect(() => {
    let stored: string | null = null;
    try {
      stored = window.localStorage.getItem(PALETTE_WIDTH_STORAGE_KEY);
    } catch {
      stored = null;
    }
    const parsed = stored ? Number(stored) : NaN;
    if (Number.isFinite(parsed)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPaletteWidth(Math.min(MAX_PALETTE_WIDTH, Math.max(MIN_PALETTE_WIDTH, parsed)));
    }
  }, []);

  useEffect(() => {
    // Sotto la stessa soglia "lg" usata per il layout a due colonne: sotto,
    // niente drag-and-drop (inaffidabile su touch), si passa a tocco+frecce.
    const mq = window.matchMedia("(max-width: 1023px)");
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (!clientPickerOpen) return;
    function onDocClick(e: MouseEvent) {
      if (clientPickerRef.current && !clientPickerRef.current.contains(e.target as Node)) setClientPickerOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [clientPickerOpen]);

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

  const selectedClients = clientIds.map((id) => clients.find((c) => c.id === id)).filter((c): c is ClientItem => !!c);
  const personLabel = selectedClients.length > 0 ? selectedClients.map((c) => c.name).join(", ") : guestName.trim();
  const clientSuggestions = clientQuery.trim()
    ? clients.filter((c) => c.name.toLowerCase().includes(clientQuery.trim().toLowerCase()) && !clientIds.includes(c.id)).slice(0, 8)
    : clients.filter((c) => !clientIds.includes(c.id)).slice(0, 8);

  function toggleClient(id: string) {
    setClientIds((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));
  }
  function removeClient(id: string) {
    setClientIds((cur) => cur.filter((x) => x !== id));
  }

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  function handleOuterDragStart(e: DragStartEvent) {
    const data = e.active.data.current as { type?: string; pose?: PoseCatalogItem } | undefined;
    setActiveDragPose(data?.type === "palette" ? (data.pose ?? null) : null);
  }

  function handleOuterDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    setActiveDragPose(null);
    if (!over) return;
    const activeData = active.data.current as { type?: string; pose?: PoseCatalogItem } | undefined;
    if (activeData?.type === "palette" && activeData.pose) {
      const overId = String(over.id);
      if (overId.startsWith("block-drop:")) {
        const [, sUid, bUid] = overId.split(":");
        addPoseItem(sUid, bUid, activeData.pose);
      } else if (overId.startsWith("section-drop:")) {
        addPoseItem(overId.slice("section-drop:".length), null, activeData.pose);
      }
      return;
    }
    if (active.id === over.id) return;
    setSections((cur) => {
      const from = cur.findIndex((s) => s.uid === active.id);
      const to = cur.findIndex((s) => s.uid === over.id);
      return from < 0 || to < 0 ? cur : arrayMove(cur, from, to);
    });
  }

  function handlePaletteResizeStart(e: ReactPointerEvent<HTMLDivElement>) {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = paletteWidth;
    function handleMove(ev: PointerEvent) {
      const next = Math.min(MAX_PALETTE_WIDTH, Math.max(MIN_PALETTE_WIDTH, startWidth - (ev.clientX - startX)));
      setPaletteWidth(next);
    }
    function handleUp() {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
      setPaletteWidth((current) => {
        try {
          window.localStorage.setItem(PALETTE_WIDTH_STORAGE_KEY, String(current));
        } catch {
          // ignora: localStorage non disponibile (es. modalità privata)
        }
        return current;
      });
    }
    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
  }

  function moveRow(sectionUid: string, activeUid: string, overUid: string) {
    setSections((cur) =>
      cur.map((s) => {
        if (s.uid !== sectionUid) return s;
        const from = s.rows.findIndex((r) => r.uid === activeUid);
        const to = s.rows.findIndex((r) => r.uid === overUid);
        return from < 0 || to < 0 ? s : { ...s, rows: arrayMove(s.rows, from, to) };
      })
    );
  }
  function moveRowByIndex(sectionUid: string, idx: number, delta: number) {
    setSections((cur) =>
      cur.map((s) => {
        if (s.uid !== sectionUid) return s;
        const to = idx + delta;
        return to < 0 || to >= s.rows.length ? s : { ...s, rows: arrayMove(s.rows, idx, to) };
      })
    );
  }
  function moveItemInBlockByIndex(sectionUid: string, blockUid: string, idx: number, delta: number) {
    setSections((cur) =>
      cur.map((s) => {
        if (s.uid !== sectionUid) return s;
        return {
          ...s,
          rows: s.rows.map((r) => {
            if (r.kind !== "block" || r.block.uid !== blockUid) return r;
            const to = idx + delta;
            if (to < 0 || to >= r.block.items.length) return r;
            return { ...r, block: { ...r.block, items: arrayMove(r.block.items, idx, to) } };
          }),
        };
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
    setSections((cur) => [...cur, { uid: uid(), kind: "custom", label: "Nuova sezione", enabled: true, rows: [] }]);
  }
  function moveSectionByIndex(idx: number, delta: number) {
    setSections((cur) => {
      const to = idx + delta;
      return to < 0 || to >= cur.length ? cur : arrayMove(cur, idx, to);
    });
  }

  function addPoseItem(sectionUid: string, blockUid: string | null, pose: PoseCatalogItem) {
    const newItem = editItemFrom({ poseId: pose.id, customLabel: "", note: "", reps: null, holdValue: null, holdUnit: null, onInhale: null, onExhale: null });
    setSections((cur) =>
      cur.map((s) => {
        if (s.uid !== sectionUid) return s;
        if (blockUid === null) return { ...s, rows: [...s.rows, { uid: newItem.uid, kind: "item", item: newItem }] };
        return { ...s, rows: s.rows.map((r) => (r.kind === "block" && r.block.uid === blockUid ? { ...r, block: { ...r.block, items: [...r.block.items, newItem] } } : r)) };
      })
    );
  }
  function addCustomItem(sectionUid: string, blockUid: string | null, label: string) {
    if (!label.trim()) return;
    const newItem = editItemFrom({ poseId: null, customLabel: label.trim(), note: "", reps: null, holdValue: null, holdUnit: null, onInhale: null, onExhale: null });
    setSections((cur) =>
      cur.map((s) => {
        if (s.uid !== sectionUid) return s;
        if (blockUid === null) return { ...s, rows: [...s.rows, { uid: newItem.uid, kind: "item", item: newItem }] };
        return { ...s, rows: s.rows.map((r) => (r.kind === "block" && r.block.uid === blockUid ? { ...r, block: { ...r.block, items: [...r.block.items, newItem] } } : r)) };
      })
    );
  }
  function updateItem(sectionUid: string, blockUid: string | null, itemUid: string, patch: Partial<EditItem>) {
    setSections((cur) =>
      cur.map((s) => {
        if (s.uid !== sectionUid) return s;
        if (blockUid === null) return { ...s, rows: s.rows.map((r) => (r.kind === "item" && r.item.uid === itemUid ? { ...r, item: { ...r.item, ...patch } } : r)) };
        return {
          ...s,
          rows: s.rows.map((r) =>
            r.kind === "block" && r.block.uid === blockUid
              ? { ...r, block: { ...r.block, items: r.block.items.map((it) => (it.uid === itemUid ? { ...it, ...patch } : it)) } }
              : r
          ),
        };
      })
    );
  }
  function removeItem(sectionUid: string, blockUid: string | null, itemUid: string) {
    setSections((cur) =>
      cur.map((s) => {
        if (s.uid !== sectionUid) return s;
        if (blockUid === null) return { ...s, rows: s.rows.filter((r) => !(r.kind === "item" && r.item.uid === itemUid)) };
        return {
          ...s,
          rows: s.rows.map((r) => (r.kind === "block" && r.block.uid === blockUid ? { ...r, block: { ...r.block, items: r.block.items.filter((it) => it.uid !== itemUid) } } : r)),
        };
      })
    );
  }

  function addBlock(sectionUid: string) {
    const blockUid = uid();
    setSections((cur) => cur.map((s) => (s.uid === sectionUid ? { ...s, rows: [...s.rows, { uid: blockUid, kind: "block", block: { uid: blockUid, reps: 3, items: [] } }] } : s)));
  }
  function removeBlock(sectionUid: string, blockUid: string) {
    setSections((cur) => cur.map((s) => (s.uid === sectionUid ? { ...s, rows: s.rows.filter((r) => r.uid !== blockUid) } : s)));
  }
  function updateBlockReps(sectionUid: string, blockUid: string, reps: number | null) {
    setSections((cur) =>
      cur.map((s) => (s.uid === sectionUid ? { ...s, rows: s.rows.map((r) => (r.kind === "block" && r.block.uid === blockUid ? { ...r, block: { ...r.block, reps } } : r)) } : s))
    );
  }

  const totalActive = sections.reduce((sum, s) => {
    if (!s.enabled) return sum;
    return sum + s.rows.reduce((rSum, r) => rSum + (r.kind === "item" ? 1 : r.block.items.length), 0);
  }, 0);

  const sheetSections = useMemo(
    () =>
      sections
        .filter((s) => s.enabled)
        .map((s) => ({
          label: s.label,
          rows: s.rows.map(
            (r): SheetRow =>
              r.kind === "item"
                ? { kind: "item", item: toSheetItem(r.item, poseById) }
                : { kind: "block", reps: r.block.reps, items: r.block.items.map((it) => toSheetItem(it, poseById)) }
          ),
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
        clientIds,
        guestName: clientIds.length > 0 ? "" : guestName.trim(),
        name: name.trim() || "Sequenza senza nome",
        sections: sections.map((s, sIdx) => {
          const blocks: { tempId: string; reps: number | null; position: number }[] = [];
          const items: {
            blockTempId: string | null;
            poseId: string | null;
            customLabel: string;
            note: string;
            position: number;
            reps: number | null;
            holdValue: number | null;
            holdUnit: HoldUnit | null;
            onInhale: string | null;
            onExhale: string | null;
          }[] = [];
          s.rows.forEach((row, rowIdx) => {
            if (row.kind === "item") {
              items.push({
                blockTempId: null,
                poseId: row.item.poseId,
                customLabel: row.item.customLabel,
                note: row.item.note,
                position: rowIdx,
                reps: row.item.reps,
                holdValue: row.item.holdValue,
                holdUnit: row.item.holdUnit,
                onInhale: row.item.onInhale,
                onExhale: row.item.onExhale,
              });
            } else {
              blocks.push({ tempId: row.block.uid, reps: row.block.reps, position: rowIdx });
              row.block.items.forEach((it, itemIdx) => {
                items.push({
                  blockTempId: row.block.uid,
                  poseId: it.poseId,
                  customLabel: it.customLabel,
                  note: it.note,
                  position: itemIdx,
                  reps: it.reps,
                  holdValue: it.holdValue,
                  holdUnit: it.holdUnit,
                  onInhale: it.onInhale,
                  onExhale: it.onExhale,
                });
              });
            }
          });
          return { kind: s.kind, label: s.label, enabled: s.enabled, position: sIdx, blocks, items };
        }),
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
        <Field label="Allievi collegati">
          <div ref={clientPickerRef} className="relative">
            <div
              className="flex items-center gap-1.5 flex-wrap"
              style={{ ...inputStyle, minHeight: 38, cursor: "text" }}
              onClick={() => setClientPickerOpen(true)}
            >
              {selectedClients.map((c) => (
                <span
                  key={c.id}
                  className="inline-flex items-center gap-1 rounded-full"
                  style={{ background: withAlpha(COLORS.primary, 12), color: COLORS.primaryDark, fontSize: 12, padding: "2px 6px 2px 9px" }}
                >
                  {c.name}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeClient(c.id);
                    }}
                    style={{ color: COLORS.primaryDark }}
                  >
                    <X size={11} />
                  </button>
                </span>
              ))}
              <input
                value={clientQuery}
                onChange={(e) => {
                  setClientQuery(e.target.value);
                  setClientPickerOpen(true);
                }}
                onFocus={() => setClientPickerOpen(true)}
                placeholder={selectedClients.length === 0 ? "Cerca uno o più allievi…" : "Aggiungi un altro allievo…"}
                style={{ border: "none", outline: "none", fontSize: 13, flex: 1, minWidth: 90, background: "transparent" }}
              />
            </div>
            {clientPickerOpen && clientSuggestions.length > 0 && (
              <div
                className="absolute left-0 right-0 mt-1 overflow-y-auto"
                style={{ maxHeight: 220, background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 10, boxShadow: "0 8px 24px rgba(74,58,115,0.14)", zIndex: 10 }}
              >
                {clientSuggestions.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => {
                      toggleClient(c.id);
                      setClientQuery("");
                    }}
                    className="w-full text-left px-3 py-2"
                    style={{ fontSize: 13 }}
                  >
                    {c.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        </Field>
        {clientIds.length === 0 && (
          <Field label="Nome allievo (facoltativo)">
            <input value={guestName} onChange={(e) => setGuestName(e.target.value)} placeholder="nome allievo, o lascia vuoto per una bozza" style={inputStyle} />
          </Field>
        )}
      </div>

      {loadingTemplate ? (
        <div style={{ fontSize: 13, color: COLORS.inkSoft }} className="py-6 text-center">
          Caricamento template…
        </div>
      ) : isMobile ? (
        <div className="flex flex-col gap-2.5 mb-3">
          {sections.map((section, idx) => (
            <MobileSectionCard
              key={section.uid}
              section={section}
              poseById={poseById}
              isFirst={idx === 0}
              isLast={idx === sections.length - 1}
              onMoveUp={() => moveSectionByIndex(idx, -1)}
              onMoveDown={() => moveSectionByIndex(idx, 1)}
              onToggle={(v) => toggleSection(section.uid, v)}
              onRename={(v) => renameSection(section.uid, v)}
              onRemove={() => removeSection(section.uid)}
              onAddCustomItem={(blockUid, label) => addCustomItem(section.uid, blockUid, label)}
              onUpdateItem={(blockUid, itemUid, patch) => updateItem(section.uid, blockUid, itemUid, patch)}
              onRemoveItem={(blockUid, itemUid) => removeItem(section.uid, blockUid, itemUid)}
              onMoveRow={(rowIdx, delta) => moveRowByIndex(section.uid, rowIdx, delta)}
              onMoveItemInBlock={(blockUid, itemIdx, delta) => moveItemInBlockByIndex(section.uid, blockUid, itemIdx, delta)}
              onAddBlock={() => addBlock(section.uid)}
              onRemoveBlock={(blockUid) => removeBlock(section.uid, blockUid)}
              onUpdateBlockReps={(blockUid, reps) => updateBlockReps(section.uid, blockUid, reps)}
              onOpenPicker={(blockUid) => setPickerTarget({ sectionUid: section.uid, blockUid })}
            />
          ))}
          <button onClick={addCustomSection} className="flex items-center gap-1.5 text-xs font-semibold" style={{ color: COLORS.primaryDark }}>
            <Plus size={13} /> Aggiungi sezione personalizzata
          </button>
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleOuterDragStart} onDragEnd={handleOuterDragEnd}>
          <div
            className="grid grid-cols-1 lg:[grid-template-columns:minmax(0,1fr)_16px_var(--palette-w)] gap-y-4 mb-3"
            style={{ "--palette-w": `${paletteWidth}px` } as CSSVarStyle}
          >
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
                      onAddCustomItem={(blockUid, label) => addCustomItem(section.uid, blockUid, label)}
                      onUpdateItem={(blockUid, itemUid, patch) => updateItem(section.uid, blockUid, itemUid, patch)}
                      onRemoveItem={(blockUid, itemUid) => removeItem(section.uid, blockUid, itemUid)}
                      onMoveRow={(activeUid, overUid) => moveRow(section.uid, activeUid, overUid)}
                      onMoveItemInBlock={(blockUid, itemIdx, delta) => moveItemInBlockByIndex(section.uid, blockUid, itemIdx, delta)}
                      onAddBlock={() => addBlock(section.uid)}
                      onRemoveBlock={(blockUid) => removeBlock(section.uid, blockUid)}
                      onUpdateBlockReps={(blockUid, reps) => updateBlockReps(section.uid, blockUid, reps)}
                      onOpenPicker={(blockUid) => setPickerTarget({ sectionUid: section.uid, blockUid })}
                    />
                  ))}
                </div>
              </SortableContext>
              <button onClick={addCustomSection} className="flex items-center gap-1.5 text-xs font-semibold mt-2.5" style={{ color: COLORS.primaryDark }}>
                <Plus size={13} /> Aggiungi sezione personalizzata
              </button>
            </div>

            <div
              onPointerDown={handlePaletteResizeStart}
              onDoubleClick={() => setPaletteWidth(DEFAULT_PALETTE_WIDTH)}
              role="separator"
              aria-orientation="vertical"
              aria-label="Ridimensiona il pannello del catalogo posizioni"
              title="Trascina per ridimensionare · doppio clic per ripristinare"
              className="hidden lg:flex items-center justify-center cursor-col-resize select-none"
              style={{ touchAction: "none" }}
            >
              <div style={{ width: 3, height: 44, borderRadius: 999, background: COLORS.border }} />
            </div>

            <PosePalette poseCatalog={poseCatalog} poseCategories={poseCategories} />
          </div>

          <DragOverlay>
            {activeDragPose &&
              (() => {
                const dragParent = activeDragPose.parentPoseId ? poseById[activeDragPose.parentPoseId] : undefined;
                const dragImage = poseDisplayImage(activeDragPose, dragParent);
                return (
                  <div className="flex items-center gap-2 p-1.5 rounded-lg" style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, boxShadow: "0 8px 20px rgba(0,0,0,0.18)" }}>
                    {dragImage && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={dragImage} alt="" width={30} height={30} style={{ borderRadius: 6, objectFit: "cover" }} />
                    )}
                    <span style={{ fontSize: 12, fontWeight: 600 }}>{poseDisplayName(activeDragPose, dragParent)}</span>
                  </div>
                );
              })()}
          </DragOverlay>
        </DndContext>
      )}

      {pickerTarget && (
        <PosePickerSheet
          poseCatalog={poseCatalog}
          poseCategories={poseCategories}
          onClose={() => setPickerTarget(null)}
          onPick={(pose) => {
            addPoseItem(pickerTarget.sectionUid, pickerTarget.blockUid, pose);
            setPickerTarget(null);
          }}
        />
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
              sheetSections.map((s, idx) => {
                const hasContent = s.rows.some((r) => (r.kind === "item" ? true : r.items.length > 0));
                if (!hasContent) return null;
                return (
                  <div key={idx} className="mb-4">
                    <div style={{ fontSize: 11.5, fontWeight: 700, color: COLORS.primaryDark, textTransform: "uppercase", letterSpacing: 0.3 }} className="mb-1.5">
                      {s.label}
                    </div>
                    <div className="flex flex-col gap-1.5">
                      {s.rows.map((r, rIdx) =>
                        r.kind === "item" ? (
                          <SheetItemRow key={rIdx} item={r.item} />
                        ) : r.items.length === 0 ? null : (
                          <div key={rIdx} className="pl-2.5" style={{ borderLeft: `2px solid ${withAlpha(COLORS.gold, 50)}` }}>
                            <div style={{ fontSize: 11, fontWeight: 700, color: COLORS.primaryDark }} className="mb-1.5 flex items-center gap-1">
                              <Repeat size={11} /> Ripeti ×{r.reps ?? "?"}
                            </div>
                            <div className="flex flex-col gap-1.5">
                              {r.items.map((it, i2) => (
                                <SheetItemRow key={i2} item={it} />
                              ))}
                            </div>
                          </div>
                        )
                      )}
                    </div>
                  </div>
                );
              })
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
                    #sequence-print-sheet { display: block !important; position: relative; padding: 24px; max-width: 680px; margin: 0 auto; font-family: 'IBM Plex Sans', sans-serif; color: #2A2440; }
                    #sequence-print-sheet .p-watermark { display: block; position: fixed; inset: 0; z-index: 0; pointer-events: none; background-repeat: repeat; }
                    #sequence-print-sheet > *:not(.p-watermark) { position: relative; z-index: 1; }
                    #sequence-print-sheet h1 { font-family: 'Fraunces', serif; font-size: 1.4rem; margin: 0 0 4px; }
                    #sequence-print-sheet .p-sub { color: #5C5470; font-size: 0.85rem; margin: 0 0 18px; }
                    #sequence-print-sheet .p-section-title { font-size: 0.78rem; font-weight: 600; color: #9C4FA0; margin: 20px 0 6px; text-transform: uppercase; }
                    #sequence-print-sheet .p-block { padding-left: 10px; border-left: 2px solid #E4C77A; margin: 6px 0; }
                    #sequence-print-sheet .p-block-title { font-size: 0.72rem; font-weight: 700; color: #9C4FA0; margin-bottom: 4px; }
                    #sequence-print-sheet .p-row { display: flex; align-items: center; gap: 12px; padding: 5px 0; border-bottom: 1px dashed #DCD3EC; break-inside: avoid; }
                    #sequence-print-sheet .p-thumb { width: 36px; height: 36px; border-radius: 6px; object-fit: cover; background: #DFD5EE; flex-shrink: 0; }
                    #sequence-print-sheet .p-text { display: flex; justify-content: space-between; gap: 14px; flex: 1; }
                    #sequence-print-sheet .p-meta { color: #9C4FA0; font-weight: 600; font-size: 0.78rem; }
                    #sequence-print-sheet .p-note { color: #5C5470; font-size: 0.85rem; text-align: right; }
                    #sequence-print-sheet .p-breath { color: #9C4FA0; font-size: 0.78rem; margin-top: 2px; }
                  }
                `}</style>
                {/* Contenuto proprietario (foto delle posizioni) che esce dallo studio: un
                    filigrana ripetuta e discreta lo scoraggia dal girare fuori contesto. */}
                <div className="p-watermark" style={{ backgroundImage: `url("${PRINT_WATERMARK_URL}")` }} />
                <h1>{personLabel ? `Sequenza per ${personLabel}` : "Sequenza"}</h1>
                <p className="p-sub">{new Date().toLocaleDateString("it-IT")}</p>
                {sheetSections.map((s, idx) => {
                  const hasContent = s.rows.some((r) => (r.kind === "item" ? true : r.items.length > 0));
                  if (!hasContent) return null;
                  return (
                    <div key={idx}>
                      <div className="p-section-title">{s.label}</div>
                      {s.rows.map((r, rIdx) =>
                        r.kind === "item" ? (
                          <SheetItemPrintRow key={rIdx} item={r.item} />
                        ) : r.items.length === 0 ? null : (
                          <div key={rIdx} className="p-block">
                            <div className="p-block-title">Ripeti ×{r.reps ?? "?"}</div>
                            {r.items.map((it, i2) => (
                              <SheetItemPrintRow key={i2} item={it} />
                            ))}
                          </div>
                        )
                      )}
                    </div>
                  );
                })}
              </div>,
              document.body
            )}
        </Modal>
      )}
    </div>
  );
}

function SheetItemRow({ item }: { item: SheetItem }) {
  return (
    <div className="flex items-center gap-2.5" style={{ fontSize: 13, borderBottom: `1px dashed ${COLORS.border}`, paddingBottom: 6 }}>
      {item.imageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={item.imageUrl} alt="" width={32} height={32} style={{ borderRadius: 6, objectFit: "cover", background: COLORS.subtle, flexShrink: 0 }} />
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <span style={{ fontFamily: "var(--font-display)" }}>
            {item.text}
            {item.meta && <span style={{ fontFamily: "inherit", fontWeight: 600, color: COLORS.primaryDark, fontSize: 11.5 }}> · {item.meta}</span>}
          </span>
          {item.note && <span style={{ color: COLORS.inkSoft, fontSize: 12, textAlign: "right" }}>{item.note}</span>}
        </div>
        {item.breath && <div style={{ color: COLORS.primaryDark, fontSize: 11.5, marginTop: 2 }}>{item.breath}</div>}
      </div>
    </div>
  );
}

function SheetItemPrintRow({ item }: { item: SheetItem }) {
  return (
    <div className="p-row">
      {item.imageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img className="p-thumb" src={item.imageUrl} alt="" />
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="p-text">
          <span>
            {item.text} {item.meta && <span className="p-meta">· {item.meta}</span>}
          </span>
          {item.note && <span className="p-note">{item.note}</span>}
        </div>
        {item.breath && <div className="p-breath">{item.breath}</div>}
      </div>
    </div>
  );
}

function ItemMetaInputs({ item, onUpdate }: { item: EditItem; onUpdate: (patch: Partial<EditItem>) => void }) {
  return (
    <div className="flex items-center gap-2.5 flex-wrap">
      <label className="flex items-center gap-1" style={{ fontSize: 11, color: COLORS.inkSoft }}>
        ripetizioni ×
        <input
          type="number"
          min={0}
          value={item.reps ?? ""}
          onChange={(e) => onUpdate({ reps: e.target.value === "" ? null : Number(e.target.value) })}
          style={{ ...inputStyle, width: 52, padding: "3px 6px", fontSize: 11.5 }}
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
  );
}

// Ripetizioni e durata sono nascoste finché non servono: evita di riempire
// ogni riga con due campi vuoti quando la maggior parte delle posizioni non
// li usa.
function ItemMetaSection({ item, onUpdate }: { item: EditItem; onUpdate: (patch: Partial<EditItem>) => void }) {
  const [show, setShow] = useState(item.reps != null || item.holdValue != null);
  return (
    <div className="mt-1.5" style={{ paddingLeft: 22 }}>
      {show ? (
        <div className="flex items-center gap-1.5">
          <ItemMetaInputs item={item} onUpdate={onUpdate} />
          <button
            onClick={() => {
              onUpdate({ reps: null, holdValue: null, holdUnit: null });
              setShow(false);
            }}
            title="Nascondi ripetizioni/durata"
            style={{ color: COLORS.inkSoft }}
          >
            <X size={12} />
          </button>
        </div>
      ) : (
        <button onClick={() => setShow(true)} className="flex items-center gap-1 text-xs font-medium" style={{ color: COLORS.primaryDark }}>
          <Plus size={11} /> ripetizioni o durata
        </button>
      )}
    </div>
  );
}

// Due pillole sempre visibili ma discrete: un tap tagga la posizione su
// quel respiro senza dover scrivere nulla. Il campo di testo (facoltativo)
// compare solo per un respiro già taggato, per i casi in cui serve
// descrivere l'azione specifica (es. bicicletta: inspiro = gamba distesa,
// espiro = ginocchio alla fronte). null = non taggato, "" = taggato senza
// dettaglio, stringa piena = taggato con dettaglio.
function BreathToggle({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      onClick={onClick}
      className="px-2.5 py-1 rounded-full font-semibold transition"
      style={{ fontSize: 11, background: active ? COLORS.primaryDark : COLORS.subtle, color: active ? "#fff" : COLORS.inkSoft }}
    >
      {children}
    </button>
  );
}

function ItemBreathSection({ item, onUpdate }: { item: EditItem; onUpdate: (patch: Partial<EditItem>) => void }) {
  const inhaleOn = item.onInhale !== null;
  const exhaleOn = item.onExhale !== null;
  return (
    <div className="mt-1.5" style={{ paddingLeft: 22 }}>
      <div className="flex items-center gap-1.5">
        <BreathToggle active={inhaleOn} onClick={() => onUpdate({ onInhale: inhaleOn ? null : "" })}>
          IN
        </BreathToggle>
        <BreathToggle active={exhaleOn} onClick={() => onUpdate({ onExhale: exhaleOn ? null : "" })}>
          EX
        </BreathToggle>
      </div>
      {(inhaleOn || exhaleOn) && (
        <div className="flex flex-col gap-1 mt-1">
          {inhaleOn && (
            <input
              value={item.onInhale ?? ""}
              onChange={(e) => onUpdate({ onInhale: e.target.value })}
              placeholder="cosa fai durante l'inspiro (facoltativo)"
              style={{ ...inputStyle, padding: "3px 6px", fontSize: 11.5 }}
            />
          )}
          {exhaleOn && (
            <input
              value={item.onExhale ?? ""}
              onChange={(e) => onUpdate({ onExhale: e.target.value })}
              placeholder="cosa fai durante l'espiro (facoltativo)"
              style={{ ...inputStyle, padding: "3px 6px", fontSize: 11.5 }}
            />
          )}
        </div>
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
  onAddCustomItem,
  onUpdateItem,
  onRemoveItem,
  onMoveRow,
  onMoveItemInBlock,
  onAddBlock,
  onRemoveBlock,
  onUpdateBlockReps,
  onOpenPicker,
}: {
  section: EditSection;
  poseById: Record<string, PoseCatalogItem>;
  onToggle: (v: boolean) => void;
  onRename: (v: string) => void;
  onRemove: () => void;
  onAddCustomItem: (blockUid: string | null, label: string) => void;
  onUpdateItem: (blockUid: string | null, itemUid: string, patch: Partial<EditItem>) => void;
  onRemoveItem: (blockUid: string | null, itemUid: string) => void;
  onMoveRow: (activeUid: string, overUid: string) => void;
  onMoveItemInBlock: (blockUid: string, idx: number, delta: number) => void;
  onAddBlock: () => void;
  onRemoveBlock: (blockUid: string) => void;
  onUpdateBlockReps: (blockUid: string, reps: number | null) => void;
  onOpenPicker: (blockUid: string | null) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: section.uid });
  const [expanded, setExpanded] = useState(true);
  const [addingCustom, setAddingCustom] = useState(false);
  const [customText, setCustomText] = useState("");
  const { setNodeRef: setDropRef, isOver } = useDroppable({ id: `section-drop:${section.uid}` });
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  function handleRowDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (over && active.id !== over.id) onMoveRow(String(active.id), String(over.id));
  }
  function submitCustom() {
    if (!customText.trim()) return;
    onAddCustomItem(null, customText);
    setCustomText("");
    setAddingCustom(false);
  }

  const itemCount = section.rows.reduce((sum, r) => sum + (r.kind === "item" ? 1 : r.block.items.length), 0);

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
          <span style={{ fontSize: 11, color: COLORS.inkSoft }}>{itemCount} posizioni</span>
        </button>
        <Switch checked={section.enabled} onChange={onToggle} label="" onText="Attiva" offText="Off" />
        <button onClick={onRemove} title="Rimuovi sezione" style={{ color: COLORS.danger }}>
          <Trash2 size={14} />
        </button>
      </div>

      {expanded && section.enabled && (
        <div ref={setDropRef} className="px-2.5 pb-2.5 rounded-b-xl" style={{ background: isOver ? withAlpha(COLORS.primary, 10) : "transparent" }}>
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleRowDragEnd}>
            <SortableContext items={section.rows.map((r) => r.uid)} strategy={verticalListSortingStrategy}>
              <div className="flex flex-col gap-1.5 mb-2">
                {section.rows.map((row) =>
                  row.kind === "item" ? (
                    <ItemRow
                      key={row.uid}
                      item={row.item}
                      pose={row.item.poseId ? poseById[row.item.poseId] : undefined}
                      parentPose={parentOfPose(poseById, row.item.poseId ? poseById[row.item.poseId] : undefined)}
                      onUpdate={(patch) => onUpdateItem(null, row.item.uid, patch)}
                      onRemove={() => onRemoveItem(null, row.item.uid)}
                    />
                  ) : (
                    <BlockCard
                      key={row.uid}
                      sectionUid={section.uid}
                      block={row.block}
                      poseById={poseById}
                      onUpdateReps={(reps) => onUpdateBlockReps(row.block.uid, reps)}
                      onRemoveBlock={() => onRemoveBlock(row.block.uid)}
                      onUpdateItem={(itemUid, patch) => onUpdateItem(row.block.uid, itemUid, patch)}
                      onRemoveItem={(itemUid) => onRemoveItem(row.block.uid, itemUid)}
                      onMoveItemUp={(idx) => onMoveItemInBlock(row.block.uid, idx, -1)}
                      onMoveItemDown={(idx) => onMoveItemInBlock(row.block.uid, idx, 1)}
                      onOpenPicker={() => onOpenPicker(row.block.uid)}
                      onAddCustom={(label) => onAddCustomItem(row.block.uid, label)}
                    />
                  )
                )}
              </div>
            </SortableContext>
          </DndContext>

          {section.rows.length === 0 && (
            <div style={{ fontSize: 11.5, color: COLORS.inkSoft, textAlign: "center", padding: "14px 8px", border: `1px dashed ${COLORS.border}`, borderRadius: 10 }} className="mb-2">
              Trascina qui una posizione dal catalogo a destra
            </div>
          )}

          <div className="flex items-center gap-3 flex-wrap">
            {addingCustom ? (
              <div className="flex items-center gap-1.5 flex-1" style={{ minWidth: 160 }}>
                <input
                  value={customText}
                  onChange={(e) => setCustomText(e.target.value)}
                  placeholder="Nome voce libera"
                  style={{ ...inputStyle, fontSize: 12.5, flex: 1 }}
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
                <Plus size={12} /> Voce libera
              </button>
            )}
            <button onClick={onAddBlock} className="flex items-center gap-1 text-xs font-medium" style={{ color: COLORS.primaryDark }}>
              <Repeat size={12} /> Blocco ripetuto
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function ItemRow({
  item,
  pose,
  parentPose,
  onUpdate,
  onRemove,
}: {
  item: EditItem;
  pose?: PoseCatalogItem;
  parentPose?: PoseCatalogItem;
  onUpdate: (patch: Partial<EditItem>) => void;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.uid });
  const label = pose ? poseDisplayName(pose, parentPose) : item.customLabel || "Voce senza nome";
  const image = pose ? poseDisplayImage(pose, parentPose) : null;
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
        {image && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={image} alt={label} width={36} height={36} style={{ borderRadius: 8, objectFit: "cover", background: COLORS.subtle, flexShrink: 0 }} />
        )}
        <div className="flex-1 min-w-0">
          <div style={{ fontSize: 13, fontWeight: 600 }}>{label}</div>
          <input value={item.note} onChange={(e) => onUpdate({ note: e.target.value })} placeholder="nota (facoltativa)" style={{ ...inputStyle, padding: "4px 8px", fontSize: 12, marginTop: 2 }} />
        </div>
        <button onClick={onRemove} title="Rimuovi" style={{ color: COLORS.inkSoft }}>
          <X size={14} />
        </button>
      </div>
      <ItemMetaSection item={item} onUpdate={onUpdate} />
      <ItemBreathSection item={item} onUpdate={onUpdate} />
    </div>
  );
}

// Interazione a frecce (nessun drag): usata per gli item dentro un blocco
// (in ogni piattaforma) e per le righe di primo livello su mobile, dove il
// drag-and-drop è poco affidabile.
function ArrowItemRow({
  item,
  pose,
  parentPose,
  isFirst,
  isLast,
  onUpdate,
  onRemove,
  onMoveUp,
  onMoveDown,
}: {
  item: EditItem;
  pose?: PoseCatalogItem;
  parentPose?: PoseCatalogItem;
  isFirst: boolean;
  isLast: boolean;
  onUpdate: (patch: Partial<EditItem>) => void;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}) {
  const label = pose ? poseDisplayName(pose, parentPose) : item.customLabel || "Voce senza nome";
  const image = pose ? poseDisplayImage(pose, parentPose) : null;
  return (
    <div className="p-2 rounded-xl" style={{ background: COLORS.bg, border: `1px solid ${COLORS.border}` }}>
      <div className="flex items-center gap-2">
        <div className="flex flex-col">
          <button onClick={onMoveUp} disabled={isFirst} style={{ color: isFirst ? COLORS.border : COLORS.inkSoft, lineHeight: 0 }} title="Sposta su">
            <ChevronUp size={12} />
          </button>
          <button onClick={onMoveDown} disabled={isLast} style={{ color: isLast ? COLORS.border : COLORS.inkSoft, lineHeight: 0 }} title="Sposta giù">
            <ChevronDown size={12} />
          </button>
        </div>
        {image && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={image} alt={label} width={36} height={36} style={{ borderRadius: 8, objectFit: "cover", background: COLORS.subtle, flexShrink: 0 }} />
        )}
        <div className="flex-1 min-w-0">
          <div style={{ fontSize: 13, fontWeight: 600 }}>{label}</div>
          <input value={item.note} onChange={(e) => onUpdate({ note: e.target.value })} placeholder="nota (facoltativa)" style={{ ...inputStyle, padding: "4px 8px", fontSize: 12, marginTop: 2 }} />
        </div>
        <button onClick={onRemove} title="Rimuovi" style={{ color: COLORS.inkSoft }}>
          <X size={14} />
        </button>
      </div>
      <ItemMetaSection item={item} onUpdate={onUpdate} />
      <ItemBreathSection item={item} onUpdate={onUpdate} />
    </div>
  );
}

// Contenuto condiviso di un blocco (intestazione ripetizioni + items al suo
// interno, sempre riordinabili a frecce, mai a drag — anche su desktop:
// un blocco è pensato per restare piccolo, le frecce bastano).
function BlockBody({
  block,
  poseById,
  onUpdateReps,
  onRemoveBlock,
  onUpdateItem,
  onRemoveItem,
  onMoveItemUp,
  onMoveItemDown,
  onOpenPicker,
  onAddCustom,
  dropRef,
  isOver,
}: {
  block: EditBlock;
  poseById: Record<string, PoseCatalogItem>;
  onUpdateReps: (reps: number | null) => void;
  onRemoveBlock: () => void;
  onUpdateItem: (itemUid: string, patch: Partial<EditItem>) => void;
  onRemoveItem: (itemUid: string) => void;
  onMoveItemUp: (idx: number) => void;
  onMoveItemDown: (idx: number) => void;
  onOpenPicker: () => void;
  onAddCustom: (label: string) => void;
  dropRef?: (node: HTMLElement | null) => void;
  isOver?: boolean;
}) {
  const [addingCustom, setAddingCustom] = useState(false);
  const [customText, setCustomText] = useState("");

  function submitCustom() {
    if (!customText.trim()) return;
    onAddCustom(customText);
    setCustomText("");
    setAddingCustom(false);
  }

  return (
    <div ref={dropRef} className="p-2.5 rounded-xl" style={{ background: isOver ? withAlpha(COLORS.primary, 10) : withAlpha(COLORS.gold, 8), border: `1.5px dashed ${withAlpha(COLORS.gold, 45)}` }}>
      <div className="flex items-center gap-2 mb-2 flex-wrap">
        <Repeat size={13} style={{ color: COLORS.primaryDark, flexShrink: 0 }} />
        <span style={{ fontSize: 12, fontWeight: 600, color: COLORS.ink }}>Ripeti il blocco ×</span>
        <input
          type="number"
          min={1}
          value={block.reps ?? ""}
          onChange={(e) => onUpdateReps(e.target.value === "" ? null : Number(e.target.value))}
          style={{ ...inputStyle, width: 52, padding: "3px 6px", fontSize: 12 }}
        />
        <div className="flex-1" />
        <button onClick={onRemoveBlock} title="Rimuovi blocco" style={{ color: COLORS.danger }}>
          <Trash2 size={14} />
        </button>
      </div>

      <div className="flex flex-col gap-1.5 mb-2">
        {block.items.map((item, idx) => (
          <ArrowItemRow
            key={item.uid}
            item={item}
            pose={item.poseId ? poseById[item.poseId] : undefined}
            parentPose={parentOfPose(poseById, item.poseId ? poseById[item.poseId] : undefined)}
            isFirst={idx === 0}
            isLast={idx === block.items.length - 1}
            onUpdate={(patch) => onUpdateItem(item.uid, patch)}
            onRemove={() => onRemoveItem(item.uid)}
            onMoveUp={() => onMoveItemUp(idx)}
            onMoveDown={() => onMoveItemDown(idx)}
          />
        ))}
      </div>

      {block.items.length === 0 && (
        <div style={{ fontSize: 11, color: COLORS.inkSoft, textAlign: "center", padding: "10px 8px", border: `1px dashed ${COLORS.border}`, borderRadius: 8 }} className="mb-2">
          Nessuna posizione nel blocco
        </div>
      )}

      <div className="flex items-center gap-2 flex-wrap">
        <button onClick={onOpenPicker} className="flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-lg text-white" style={{ background: COLORS.primary }}>
          <Plus size={11} /> Aggiungi al blocco
        </button>
        {addingCustom ? (
          <div className="flex items-center gap-1.5 flex-1" style={{ minWidth: 140 }}>
            <input
              value={customText}
              onChange={(e) => setCustomText(e.target.value)}
              placeholder="Nome voce libera"
              style={{ ...inputStyle, fontSize: 12, flex: 1 }}
              onKeyDown={(e) => e.key === "Enter" && submitCustom()}
              autoFocus
            />
            <button onClick={submitCustom} className="text-xs font-semibold px-2 py-1 rounded-lg" style={{ border: `1px solid ${COLORS.border}` }}>
              OK
            </button>
          </div>
        ) : (
          <button onClick={() => setAddingCustom(true)} className="text-xs font-medium" style={{ color: COLORS.primaryDark }}>
            + voce libera
          </button>
        )}
      </div>
    </div>
  );
}

// Blocco su desktop: l'intero blocco è trascinabile come riga unica tra le
// altre righe della sezione, e accetta anche il drop diretto di una posa
// dal pannello catalogo.
function BlockCard({
  sectionUid,
  block,
  poseById,
  onUpdateReps,
  onRemoveBlock,
  onUpdateItem,
  onRemoveItem,
  onMoveItemUp,
  onMoveItemDown,
  onOpenPicker,
  onAddCustom,
}: {
  sectionUid: string;
  block: EditBlock;
  poseById: Record<string, PoseCatalogItem>;
  onUpdateReps: (reps: number | null) => void;
  onRemoveBlock: () => void;
  onUpdateItem: (itemUid: string, patch: Partial<EditItem>) => void;
  onRemoveItem: (itemUid: string) => void;
  onMoveItemUp: (idx: number) => void;
  onMoveItemDown: (idx: number) => void;
  onOpenPicker: () => void;
  onAddCustom: (label: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: block.uid });
  const { setNodeRef: setDropRef, isOver } = useDroppable({ id: `block-drop:${sectionUid}:${block.uid}` });

  return (
    <div ref={setNodeRef} className="flex items-start gap-2" style={{ opacity: isDragging ? 0.6 : 1, transform: CSS.Transform.toString(transform), transition }}>
      <button {...attributes} {...listeners} className="cursor-grab flex items-center mt-2.5" style={{ color: COLORS.inkSoft, touchAction: "none" }} title="Trascina per riordinare">
        <GripVertical size={14} />
      </button>
      <div className="flex-1 min-w-0">
        <BlockBody
          block={block}
          poseById={poseById}
          onUpdateReps={onUpdateReps}
          onRemoveBlock={onRemoveBlock}
          onUpdateItem={onUpdateItem}
          onRemoveItem={onRemoveItem}
          onMoveItemUp={onMoveItemUp}
          onMoveItemDown={onMoveItemDown}
          onOpenPicker={onOpenPicker}
          onAddCustom={onAddCustom}
          dropRef={setDropRef}
          isOver={isOver}
        />
      </div>
    </div>
  );
}

function MobileSectionCard({
  section,
  poseById,
  isFirst,
  isLast,
  onMoveUp,
  onMoveDown,
  onToggle,
  onRename,
  onRemove,
  onAddCustomItem,
  onUpdateItem,
  onRemoveItem,
  onMoveRow,
  onMoveItemInBlock,
  onAddBlock,
  onRemoveBlock,
  onUpdateBlockReps,
  onOpenPicker,
}: {
  section: EditSection;
  poseById: Record<string, PoseCatalogItem>;
  isFirst: boolean;
  isLast: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onToggle: (v: boolean) => void;
  onRename: (v: string) => void;
  onRemove: () => void;
  onAddCustomItem: (blockUid: string | null, label: string) => void;
  onUpdateItem: (blockUid: string | null, itemUid: string, patch: Partial<EditItem>) => void;
  onRemoveItem: (blockUid: string | null, itemUid: string) => void;
  onMoveRow: (idx: number, delta: number) => void;
  onMoveItemInBlock: (blockUid: string, idx: number, delta: number) => void;
  onAddBlock: () => void;
  onRemoveBlock: (blockUid: string) => void;
  onUpdateBlockReps: (blockUid: string, reps: number | null) => void;
  onOpenPicker: (blockUid: string | null) => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const [addingCustom, setAddingCustom] = useState(false);
  const [customText, setCustomText] = useState("");

  function submitCustom() {
    if (!customText.trim()) return;
    onAddCustomItem(null, customText);
    setCustomText("");
    setAddingCustom(false);
  }

  const itemCount = section.rows.reduce((sum, r) => sum + (r.kind === "item" ? 1 : r.block.items.length), 0);

  return (
    <div style={{ border: `1px solid ${COLORS.border}`, borderRadius: 12, background: section.enabled ? COLORS.card : COLORS.subtle }}>
      <div className="flex items-center gap-1.5 p-2.5">
        <div className="flex flex-col">
          <button onClick={onMoveUp} disabled={isFirst} style={{ color: isFirst ? COLORS.border : COLORS.inkSoft, lineHeight: 0 }} title="Sposta su">
            <ChevronUp size={14} />
          </button>
          <button onClick={onMoveDown} disabled={isLast} style={{ color: isLast ? COLORS.border : COLORS.inkSoft, lineHeight: 0 }} title="Sposta giù">
            <ChevronDown size={14} />
          </button>
        </div>
        <button onClick={() => setExpanded((v) => !v)} className="flex-1 text-left flex items-center gap-2 min-w-0">
          <input
            value={section.label}
            onChange={(e) => onRename(e.target.value)}
            onClick={(e) => e.stopPropagation()}
            style={{ fontSize: 13, fontWeight: 600, border: "none", outline: "none", background: "transparent", color: COLORS.ink, minWidth: 0 }}
          />
          <span style={{ fontSize: 11, color: COLORS.inkSoft, flexShrink: 0 }}>{itemCount}</span>
        </button>
        <Switch checked={section.enabled} onChange={onToggle} label="" onText="On" offText="Off" />
        <button onClick={onRemove} title="Rimuovi sezione" style={{ color: COLORS.danger }}>
          <Trash2 size={14} />
        </button>
      </div>

      {expanded && section.enabled && (
        <div className="px-2.5 pb-2.5">
          <div className="flex flex-col gap-1.5 mb-2">
            {section.rows.map((row, idx) =>
              row.kind === "item" ? (
                <ArrowItemRow
                  key={row.uid}
                  item={row.item}
                  pose={row.item.poseId ? poseById[row.item.poseId] : undefined}
                  parentPose={parentOfPose(poseById, row.item.poseId ? poseById[row.item.poseId] : undefined)}
                  isFirst={idx === 0}
                  isLast={idx === section.rows.length - 1}
                  onUpdate={(patch) => onUpdateItem(null, row.item.uid, patch)}
                  onRemove={() => onRemoveItem(null, row.item.uid)}
                  onMoveUp={() => onMoveRow(idx, -1)}
                  onMoveDown={() => onMoveRow(idx, 1)}
                />
              ) : (
                <div key={row.uid} className="flex items-start gap-1.5">
                  <div className="flex flex-col mt-2.5">
                    <button onClick={() => onMoveRow(idx, -1)} disabled={idx === 0} style={{ color: idx === 0 ? COLORS.border : COLORS.inkSoft, lineHeight: 0 }} title="Sposta su">
                      <ChevronUp size={12} />
                    </button>
                    <button
                      onClick={() => onMoveRow(idx, 1)}
                      disabled={idx === section.rows.length - 1}
                      style={{ color: idx === section.rows.length - 1 ? COLORS.border : COLORS.inkSoft, lineHeight: 0 }}
                      title="Sposta giù"
                    >
                      <ChevronDown size={12} />
                    </button>
                  </div>
                  <div className="flex-1 min-w-0">
                    <BlockBody
                      block={row.block}
                      poseById={poseById}
                      onUpdateReps={(reps) => onUpdateBlockReps(row.block.uid, reps)}
                      onRemoveBlock={() => onRemoveBlock(row.block.uid)}
                      onUpdateItem={(itemUid, patch) => onUpdateItem(row.block.uid, itemUid, patch)}
                      onRemoveItem={(itemUid) => onRemoveItem(row.block.uid, itemUid)}
                      onMoveItemUp={(itemIdx) => onMoveItemInBlock(row.block.uid, itemIdx, -1)}
                      onMoveItemDown={(itemIdx) => onMoveItemInBlock(row.block.uid, itemIdx, 1)}
                      onOpenPicker={() => onOpenPicker(row.block.uid)}
                      onAddCustom={(label) => onAddCustomItem(row.block.uid, label)}
                    />
                  </div>
                </div>
              )
            )}
          </div>

          {section.rows.length === 0 && (
            <div style={{ fontSize: 11.5, color: COLORS.inkSoft, textAlign: "center", padding: "14px 8px", border: `1px dashed ${COLORS.border}`, borderRadius: 10 }} className="mb-2">
              Nessuna posizione ancora
            </div>
          )}

          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={() => onOpenPicker(null)} className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-lg text-white" style={{ background: COLORS.primary }}>
              <Plus size={13} /> Aggiungi dal catalogo
            </button>
            <button onClick={onAddBlock} className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-lg" style={{ border: `1px solid ${COLORS.border}`, color: COLORS.primaryDark }}>
              <Repeat size={13} /> Blocco ripetuto
            </button>
            {addingCustom ? (
              <div className="flex items-center gap-1.5 flex-1" style={{ minWidth: 160 }}>
                <input
                  value={customText}
                  onChange={(e) => setCustomText(e.target.value)}
                  placeholder="Nome voce libera"
                  style={{ ...inputStyle, fontSize: 12.5, flex: 1 }}
                  onKeyDown={(e) => e.key === "Enter" && submitCustom()}
                  autoFocus
                />
                <button onClick={submitCustom} className="text-xs font-semibold px-2 py-1.5 rounded-lg" style={{ border: `1px solid ${COLORS.border}` }}>
                  OK
                </button>
              </div>
            ) : (
              <button onClick={() => setAddingCustom(true)} className="text-xs font-medium" style={{ color: COLORS.primaryDark }}>
                + voce libera
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function usePoseFilter(poseCatalog: PoseCatalogItem[], poseCategories: PoseCategory[]) {
  const [macro, setMacro] = useState<PoseMacro>("asana");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [query, setQuery] = useState("");

  const categoriesForMacro = useMemo(() => poseCategories.filter((c) => c.macro === macro), [poseCategories, macro]);
  const poseById = useMemo(() => Object.fromEntries(poseCatalog.map((p) => [p.id, p])), [poseCatalog]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return poseCatalog
      .filter((p) => p.macro === macro)
      .filter((p) => categoryFilter === "all" || p.categoryId === categoryFilter)
      .filter((p) => {
        if (!q) return true;
        const parent = parentOfPose(poseById, p);
        return (
          poseDisplayName(p, parent).toLowerCase().includes(q) ||
          poseDisplayNameIt(p, parent).toLowerCase().includes(q) ||
          p.nameEn.toLowerCase().includes(q) ||
          p.tags.some((t) => t.toLowerCase().includes(q))
        );
      })
      .sort((a, b) => poseDisplayName(a, undefined).localeCompare(poseDisplayName(b, undefined)));
  }, [poseCatalog, macro, categoryFilter, query, poseById]);

  return { macro, setMacro, categoryFilter, setCategoryFilter, query, setQuery, categoriesForMacro, filtered };
}

function MacroCategoryPicker({
  macro,
  setMacro,
  categoryFilter,
  setCategoryFilter,
  query,
  setQuery,
  categoriesForMacro,
}: Pick<ReturnType<typeof usePoseFilter>, "macro" | "setMacro" | "categoryFilter" | "setCategoryFilter" | "query" | "setQuery" | "categoriesForMacro">) {
  return (
    <>
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
    </>
  );
}

function PosePickerSheet({
  poseCatalog,
  poseCategories,
  onPick,
  onClose,
}: {
  poseCatalog: PoseCatalogItem[];
  poseCategories: PoseCategory[];
  onPick: (pose: PoseCatalogItem) => void;
  onClose: () => void;
}) {
  const { macro, setMacro, categoryFilter, setCategoryFilter, query, setQuery, categoriesForMacro, filtered } = usePoseFilter(poseCatalog, poseCategories);
  return (
    <Modal onClose={onClose} width={480}>
      <div className="p-4 flex flex-col" style={{ maxHeight: "82dvh" }}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-1.5">
            <Sparkles size={14} style={{ color: COLORS.primaryDark }} />
            <div style={{ fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 600, color: COLORS.heading }}>Aggiungi posizione</div>
          </div>
          <button onClick={onClose} style={{ color: COLORS.inkSoft }} title="Chiudi">
            <X size={18} />
          </button>
        </div>

        <MacroCategoryPicker macro={macro} setMacro={setMacro} categoryFilter={categoryFilter} setCategoryFilter={setCategoryFilter} query={query} setQuery={setQuery} categoriesForMacro={categoriesForMacro} />

        <div className="overflow-y-auto flex-1" style={{ minHeight: 0 }}>
          <div className="flex flex-col gap-1.5">
            {filtered.map((p) => {
              const parent = p.parentPoseId ? poseCatalog.find((x) => x.id === p.parentPoseId) : undefined;
              const displayName = poseDisplayName(p, parent);
              const displayImage = poseDisplayImage(p, parent);
              return (
                <button
                  key={p.id}
                  onClick={() => onPick(p)}
                  className="flex items-center gap-2.5 p-2 rounded-xl text-left"
                  style={{ background: COLORS.bg, border: `1px solid ${COLORS.border}` }}
                >
                  {displayImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={displayImage} alt="" width={34} height={34} style={{ borderRadius: 8, objectFit: "cover", background: COLORS.subtle, flexShrink: 0 }} />
                  ) : (
                    <div style={{ width: 34, height: 34, borderRadius: 8, background: COLORS.subtle, flexShrink: 0 }} />
                  )}
                  <div className="min-w-0">
                    <div style={{ fontSize: 13.5, color: COLORS.ink }}>{displayName}</div>
                    {parent && <div style={{ fontSize: 11, color: COLORS.inkSoft }}>Variante di {parent.name}</div>}
                  </div>
                </button>
              );
            })}
            {filtered.length === 0 && (
              <div style={{ fontSize: 12, color: COLORS.inkSoft }} className="text-center py-6">
                Nessuna posizione trovata.
              </div>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}

function PosePalette({ poseCatalog, poseCategories }: { poseCatalog: PoseCatalogItem[]; poseCategories: PoseCategory[] }) {
  const { macro, setMacro, categoryFilter, setCategoryFilter, query, setQuery, categoriesForMacro, filtered } = usePoseFilter(poseCatalog, poseCategories);

  return (
    <div
      className="p-3.5 rounded-2xl lg:sticky lg:top-3 lg:max-h-[calc(100dvh-160px)] flex flex-col"
      style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, boxShadow: `0 1px 2px ${withAlpha(COLORS.ink, 4)}` }}
    >
      <div className="flex items-center gap-1.5 mb-3">
        <Sparkles size={14} style={{ color: COLORS.primaryDark }} />
        <div style={{ fontSize: 13, fontWeight: 700, color: COLORS.heading }}>Catalogo</div>
      </div>

      <MacroCategoryPicker macro={macro} setMacro={setMacro} categoryFilter={categoryFilter} setCategoryFilter={setCategoryFilter} query={query} setQuery={setQuery} categoriesForMacro={categoriesForMacro} />

      <div className="overflow-y-auto overflow-x-hidden lg:flex-1" style={{ minHeight: 0, maxHeight: "min(60vh, 420px)" }}>
        <div className="flex flex-col gap-1 pr-0.5">
          {filtered.map((p) => (
            <PaletteThumb key={p.id} pose={p} parentPose={p.parentPoseId ? poseCatalog.find((x) => x.id === p.parentPoseId) : undefined} />
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

function PaletteThumb({ pose, parentPose }: { pose: PoseCatalogItem; parentPose?: PoseCatalogItem }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: `palette:${pose.id}`, data: { type: "palette", pose } });
  const displayName = poseDisplayName(pose, parentPose);
  const displayImage = poseDisplayImage(pose, parentPose);
  return (
    <button
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      title={parentPose ? `${displayName} — variante di ${parentPose.name}` : displayName}
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
      {displayImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={displayImage} alt="" width={32} height={32} style={{ borderRadius: 8, objectFit: "cover", background: COLORS.subtle, flexShrink: 0 }} />
      ) : (
        <div style={{ width: 32, height: 32, borderRadius: 8, background: COLORS.subtle, flexShrink: 0 }} />
      )}
      <div className="min-w-0">
        <div style={{ fontSize: 12, lineHeight: 1.3, color: COLORS.ink, overflowWrap: "anywhere" }}>{displayName}</div>
        {parentPose && <div style={{ fontSize: 10, lineHeight: 1.3, color: COLORS.inkSoft }}>Variante di {parentPose.name}</div>}
      </div>
    </button>
  );
}
