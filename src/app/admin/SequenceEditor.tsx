"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  AlertCircle,
  Bell,
  BookOpen,
  BookPlus,
  Check,
  ChevronDown,
  ChevronUp,
  Copy,
  Download,
  Eye,
  Flag,
  GripVertical,
  Mail,
  Plus,
  Replace,
  Repeat,
  Repeat2,
  Search,
  Share2,
  Sparkles,
  Trash2,
  Undo2,
  UserCheck,
  X,
} from "lucide-react";
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
import { swapSides } from "./utils";
import { saveSequence, deleteSequence, fetchSequenceTemplate } from "./data";
import { notifySequenceAssigned } from "./actions";
import { PoseEditModal } from "./PoseEditModal";
import { DrishtiPicker } from "./DrishtiPicker";
import { EmailPreviewModal } from "./EmailPreviewModal";
import { sequenceAssignedEmailHtml } from "@/lib/emailTemplates";
import { poseDisplayName, poseDisplayNameIt, poseDisplayImage, poseDisplayDrishti } from "./poseDisplay";
import { PrintSheet, SheetItemRow, buildSheetText, printSequenceSheet, expandSheetItem, expandBlockSheetRows, type SheetRow } from "./sequenceSheet";

function parentOfPose(poseById: Record<string, PoseCatalogItem>, pose: PoseCatalogItem | undefined): PoseCatalogItem | undefined {
  return pose?.parentPoseId ? poseById[pose.parentPoseId] : undefined;
}
import type { ClassType, ClientItem, Drishti, HoldUnit, PoseCatalogItem, PoseCategory, PoseMacro, Sequence, SectionKind } from "./types";

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
  needsReview: boolean;
  drishtiOverride: Drishti | "none" | null;
  repeatOtherSide: boolean;
};
type EditBlock = { uid: string; reps: number | null; items: EditItem[]; repeatOtherSide: boolean };
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
const MAX_UNDO_STEPS = 20;

function editItemFrom(it: {
  poseId: string | null;
  customLabel: string;
  note: string;
  reps: number | null;
  holdValue: number | null;
  holdUnit: HoldUnit | null;
  onInhale: string | null;
  onExhale: string | null;
  needsReview?: boolean;
  drishtiOverride?: Drishti | "none" | null;
  repeatOtherSide?: boolean;
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
    needsReview: it.needsReview ?? false,
    drishtiOverride: it.drishtiOverride ?? null,
    repeatOtherSide: it.repeatOtherSide ?? false,
  };
}

// Clona un item assegnandogli un nuovo uid; se `transform` è passato (caso
// "duplica specchiando dx/sx"), lo applica alle etichette/note testuali —
// mai al poseId, dato che le posizioni del catalogo non sono "lateralizzate".
function cloneEditItem(item: EditItem, transform?: (text: string) => string): EditItem {
  const t = transform ?? ((s: string) => s);
  return {
    ...item,
    uid: uid(),
    customLabel: t(item.customLabel),
    note: t(item.note),
    onInhale: item.onInhale != null ? t(item.onInhale) : item.onInhale,
    onExhale: item.onExhale != null ? t(item.onExhale) : item.onExhale,
  };
}

// Duplica un'intera sezione (tutte le righe, item nei blocchi inclusi) con id
// nuovi. Usata sia per "Duplica" semplice (tappe progressive: si parte da una
// copia della tappa precedente e si aggiunge il delta) sia per "Duplica
// specchiando dx/sx" (mirror = true): resta una copia indipendente, non un
// collegamento vivo alla sorgente — vedi il piano per il perché.
function cloneSection(section: EditSection, opts: { mirror: boolean }): EditSection {
  const transform = opts.mirror ? swapSides : undefined;
  const label = (transform ? transform(section.label) : section.label) + (opts.mirror ? " (specchio)" : " (copia)");
  return {
    uid: uid(),
    kind: section.kind,
    label,
    enabled: section.enabled,
    rows: section.rows.map((row): EditRow => {
      if (row.kind === "item") {
        const clone = cloneEditItem(row.item, transform);
        return { uid: clone.uid, kind: "item", item: clone };
      }
      const blockUid = uid();
      return {
        uid: blockUid,
        kind: "block",
        block: { uid: blockUid, reps: row.block.reps, repeatOtherSide: row.block.repeatOtherSide, items: row.block.items.map((it) => cloneEditItem(it, transform)) },
      };
    }),
  };
}

function sectionsFromSequence(sequence: Sequence): EditSection[] {
  return sequence.sections.map((s) => {
    const blocksByDbId = new Map<string, EditBlock>();
    s.blocks.forEach((b) => blocksByDbId.set(b.id, { uid: uid(), reps: b.reps, repeatOtherSide: b.repeatOtherSide, items: [] }));

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

export function SequenceEditor({
  supabase,
  sequence,
  classTypes,
  clients,
  poseCatalog,
  poseCategories,
  onPoseCatalogUpdated,
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
  onPoseCatalogUpdated: (pose: PoseCatalogItem) => void;
  onSaved: (s: Sequence) => void;
  onDeleted?: (id: string) => void;
  onClose?: () => void;
}) {
  const [classTypeId, setClassTypeId] = useState<string>(sequence?.classTypeId ?? classTypes[0]?.id ?? "");
  const [name, setName] = useState(sequence?.name ?? "");
  const [description, setDescription] = useState(sequence?.description ?? "");
  const [clientIds, setClientIds] = useState<string[]>(sequence?.clientIds ?? []);
  const [guestName, setGuestName] = useState(sequence?.guestName ?? "");
  const [isPublic, setIsPublic] = useState(sequence?.isPublic ?? false);
  const [notifyEmail, setNotifyEmail] = useState(false);
  const [notifySiteNotice, setNotifySiteNotice] = useState(false);
  const [excludedNotifyIds, setExcludedNotifyIds] = useState<string[]>([]);
  const [showEmailPreview, setShowEmailPreview] = useState(false);
  const [clientQuery, setClientQuery] = useState("");
  const [clientPickerOpen, setClientPickerOpen] = useState(false);
  const clientPickerRef = useRef<HTMLDivElement>(null);
  const [sections, setSections] = useState<EditSection[]>(sequence ? sectionsFromSequence(sequence) : []);
  // Cronologia per "Annulla": stesso pattern dello stack snapshot del generatore
  // di thumbnail (PoseThumbnailGenerator) — salva lo stato precedente prima di
  // ogni modifica utente, LRU a MAX_UNDO_STEPS. I caricamenti automatici
  // (sectionsFromTemplate/reset) usano setSections diretto e azzerano lo stack.
  const [undoStack, setUndoStack] = useState<EditSection[][]>([]);
  function setSectionsWithHistory(updater: EditSection[] | ((cur: EditSection[]) => EditSection[])) {
    setUndoStack((stack) => [...stack, sections].slice(-MAX_UNDO_STEPS));
    setSections(updater);
  }
  function handleUndo() {
    if (undoStack.length === 0) return;
    const previous = undoStack[undoStack.length - 1];
    setUndoStack((stack) => stack.slice(0, -1));
    setSections(previous);
  }
  const [loadingTemplate, setLoadingTemplate] = useState(!sequence);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [showSheet, setShowSheet] = useState(false);
  const [copied, setCopied] = useState(false);
  const [canShare, setCanShare] = useState(false);
  const [activeDragPose, setActiveDragPose] = useState<PoseCatalogItem | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [pickerTarget, setPickerTarget] = useState<{ sectionUid: string; blockUid: string | null; itemUid?: string } | null>(null);
  const [editingPose, setEditingPose] = useState<PoseCatalogItem | null>(null);
  // Voce custom ("+ voce libera", tipicamente da un'ingestione da sequenza
  // cartacea) che l'insegnante ha scelto di "promuovere" a posizione vera del
  // catalogo — es. per poterle assegnare una foto. Resta testo libero finché
  // non viene promossa esplicitamente: niente promozione automatica, per non
  // sporcare il catalogo di varianti/refusi one-off.
  const [promotingItem, setPromotingItem] = useState<{ sectionUid: string; blockUid: string | null; itemUid: string; label: string } | null>(null);
  function promoteCustomItem(sectionUid: string, blockUid: string | null, itemUid: string, label: string) {
    setPromotingItem({ sectionUid, blockUid, itemUid, label });
  }
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
    // niente pannello catalogo affiancato (non c'è spazio), si passa a un
    // layout a colonna singola con "Aggiungi dal catalogo" al posto del
    // drag dalla palette — il riordino (drag-and-drop + frecce) resta
    // disponibile su entrambi i layout.
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
        if (!cancelled) {
          setSections(sectionsFromTemplate(t));
          setUndoStack([]);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setSections([]);
          setUndoStack([]);
        }
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
  // Il nome della sequenza ha sempre la priorità (coerente con la vista di
  // sola lettura lato allievo, che mostra sempre sequence.name): la persona
  // resta solo un ripiego prima che la sequenza (nuova, senza nome) sia stata
  // salvata la prima volta.
  const sheetTitle = name.trim() || (personLabel ? `Sequenza per ${personLabel}` : "Sequenza");

  // Solo i clienti appena aggiunti in questa modifica possono essere avvisati:
  // chi era già assegnato ha già ricevuto (o rifiutato) la notifica la volta
  // scorsa, riproporla ad ogni salvataggio sarebbe spam. Solo chi ha un
  // account riceve davvero email/avvisi (stesso motivo dei sondaggi).
  const previouslyAssignedIds = sequence?.clientIds ?? [];
  const newlyAssignedClients = selectedClients.filter((c) => !previouslyAssignedIds.includes(c.id) && c.hasAccount && !c.disabled);
  const notifyRecipients = newlyAssignedClients.filter((c) => !excludedNotifyIds.includes(c.id));

  function toggleNotifyRecipient(id: string) {
    setExcludedNotifyIds((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));
  }
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

  function reorderSectionsByUid(activeUid: string, overUid: string) {
    setSectionsWithHistory((cur) => {
      const from = cur.findIndex((s) => s.uid === activeUid);
      const to = cur.findIndex((s) => s.uid === overUid);
      return from < 0 || to < 0 ? cur : arrayMove(cur, from, to);
    });
  }

  // Sezioni, blocchi e item condividono ormai un unico DndContext (vedi sotto):
  // solo così un item può essere trascinato fuori dal suo blocco/sezione di
  // partenza e sganciato in un altro. Ogni sortable porta un `data.type` per
  // sapere cosa si sta trascinando; queste due funzioni interpretano l'`over`
  // per capire dove deve atterrare.
  type DragMeta = { type?: "palette" | "section" | "block" | "item"; pose?: PoseCatalogItem; sectionUid?: string; blockUid?: string | null };

  function resolveItemDropTarget(overId: string, overData: DragMeta | undefined): { sectionUid: string; blockUid: string | null; overUid: string | null } | null {
    if (overId.startsWith("block-drop:")) {
      const [, sUid, bUid] = overId.split(":");
      return { sectionUid: sUid, blockUid: bUid, overUid: null };
    }
    if (overId.startsWith("section-drop:")) {
      return { sectionUid: overId.slice("section-drop:".length), blockUid: null, overUid: null };
    }
    if (overData?.type === "item" && overData.sectionUid) return { sectionUid: overData.sectionUid, blockUid: overData.blockUid ?? null, overUid: overId };
    if (overData?.type === "block" && overData.sectionUid) return { sectionUid: overData.sectionUid, blockUid: overId, overUid: null };
    if (overData?.type === "section") return { sectionUid: overId, blockUid: null, overUid: null };
    return null;
  }

  // Un blocco resta trascinabile solo tra le righe della propria sezione (come
  // prima): se il punto di rilascio ricade su un item interno a un altro
  // blocco, si usa il blocco che lo contiene come riferimento di riga.
  function resolveBlockDropRowUid(overId: string, overData: DragMeta | undefined, activeSectionUid: string): string | null {
    if (overId.startsWith("block-drop:")) {
      const [, sUid, bUid] = overId.split(":");
      return sUid === activeSectionUid ? bUid : null;
    }
    if (overData?.type === "block" && overData.sectionUid === activeSectionUid) return overId;
    if (overData?.type === "item" && overData.sectionUid === activeSectionUid) return overData.blockUid ?? overId;
    return null;
  }

  // Sposta un item ovunque: da/verso una riga libera di sezione o da/verso un
  // blocco, anche cambiando sezione. Un solo passaggio "rimuovi poi inserisci"
  // così non serve più distinguere riordino nello stesso contenitore da
  // spostamento tra contenitori diversi.
  function moveItem(activeUid: string, destSectionUid: string, destBlockUid: string | null, overUid: string | null) {
    setSectionsWithHistory((cur) => {
      let moved: EditItem | null = null;
      const withoutItem = cur.map((s) => ({
        ...s,
        rows: s.rows
          .map((r) => {
            if (r.kind === "item" && r.item.uid === activeUid) {
              moved = r.item;
              return null;
            }
            if (r.kind === "block") {
              const idx = r.block.items.findIndex((it) => it.uid === activeUid);
              if (idx >= 0) {
                moved = r.block.items[idx];
                return { ...r, block: { ...r.block, items: r.block.items.filter((it) => it.uid !== activeUid) } };
              }
            }
            return r;
          })
          .filter((r): r is EditRow => r !== null),
      }));
      if (!moved) return cur;
      const movedItem = moved as EditItem;

      return withoutItem.map((s) => {
        if (s.uid !== destSectionUid) return s;
        if (destBlockUid === null) {
          const overIdx = overUid ? s.rows.findIndex((r) => r.uid === overUid) : -1;
          const newRow: EditRow = { uid: movedItem.uid, kind: "item", item: movedItem };
          const rows = [...s.rows];
          if (overIdx >= 0) rows.splice(overIdx, 0, newRow);
          else rows.push(newRow);
          return { ...s, rows };
        }
        return {
          ...s,
          rows: s.rows.map((r) => {
            if (r.kind !== "block" || r.block.uid !== destBlockUid) return r;
            const items = [...r.block.items];
            const overIdx = overUid ? items.findIndex((it) => it.uid === overUid) : -1;
            if (overIdx >= 0) items.splice(overIdx, 0, movedItem);
            else items.push(movedItem);
            return { ...r, block: { ...r.block, items } };
          }),
        };
      });
    });
  }

  function handleOuterDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    setActiveDragPose(null);
    if (!over) return;
    const activeData = active.data.current as DragMeta | undefined;
    const overData = over.data.current as DragMeta | undefined;
    const overId = String(over.id);

    if (activeData?.type === "palette" && activeData.pose) {
      if (overId.startsWith("block-drop:")) {
        const [, sUid, bUid] = overId.split(":");
        addPoseItem(sUid, bUid, activeData.pose);
      } else if (overId.startsWith("section-drop:")) {
        addPoseItem(overId.slice("section-drop:".length), null, activeData.pose);
      } else {
        const target = resolveItemDropTarget(overId, overData);
        if (target) addPoseItem(target.sectionUid, target.blockUid, activeData.pose);
      }
      return;
    }

    if (active.id === over.id) return;

    if (activeData?.type === "section") {
      reorderSectionsByUid(String(active.id), overId);
      return;
    }
    if (activeData?.type === "block" && activeData.sectionUid) {
      const rowUid = resolveBlockDropRowUid(overId, overData, activeData.sectionUid);
      if (rowUid) moveRow(activeData.sectionUid, String(active.id), rowUid);
      return;
    }
    if (activeData?.type === "item") {
      const target = resolveItemDropTarget(overId, overData);
      if (target) moveItem(String(active.id), target.sectionUid, target.blockUid, target.overUid);
    }
  }

  function handleMobileDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const activeData = active.data.current as DragMeta | undefined;
    const overData = over.data.current as DragMeta | undefined;
    const overId = String(over.id);

    if (activeData?.type === "section") {
      reorderSectionsByUid(String(active.id), overId);
      return;
    }
    if (activeData?.type === "block" && activeData.sectionUid) {
      const rowUid = resolveBlockDropRowUid(overId, overData, activeData.sectionUid);
      if (rowUid) moveRow(activeData.sectionUid, String(active.id), rowUid);
      return;
    }
    if (activeData?.type === "item") {
      const target = resolveItemDropTarget(overId, overData);
      if (target) moveItem(String(active.id), target.sectionUid, target.blockUid, target.overUid);
    }
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
    setSectionsWithHistory((cur) =>
      cur.map((s) => {
        if (s.uid !== sectionUid) return s;
        const from = s.rows.findIndex((r) => r.uid === activeUid);
        const to = s.rows.findIndex((r) => r.uid === overUid);
        return from < 0 || to < 0 ? s : { ...s, rows: arrayMove(s.rows, from, to) };
      })
    );
  }
  function moveRowByIndex(sectionUid: string, idx: number, delta: number) {
    setSectionsWithHistory((cur) =>
      cur.map((s) => {
        if (s.uid !== sectionUid) return s;
        const to = idx + delta;
        return to < 0 || to >= s.rows.length ? s : { ...s, rows: arrayMove(s.rows, idx, to) };
      })
    );
  }
  function moveItemInBlockByIndex(sectionUid: string, blockUid: string, idx: number, delta: number) {
    setSectionsWithHistory((cur) =>
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
    setSectionsWithHistory((cur) => cur.map((s) => (s.uid === sectionUid ? { ...s, enabled } : s)));
  }
  function renameSection(sectionUid: string, label: string) {
    setSectionsWithHistory((cur) => cur.map((s) => (s.uid === sectionUid ? { ...s, label } : s)));
  }
  function removeSection(sectionUid: string) {
    setSectionsWithHistory((cur) => cur.filter((s) => s.uid !== sectionUid));
  }
  function addCustomSection() {
    setSectionsWithHistory((cur) => [...cur, { uid: uid(), kind: "custom", label: "Nuova sezione", enabled: true, rows: [] }]);
  }
  function duplicateSection(sectionUid: string, mirror: boolean) {
    setSectionsWithHistory((cur) => {
      const idx = cur.findIndex((s) => s.uid === sectionUid);
      if (idx < 0) return cur;
      const clone = cloneSection(cur[idx], { mirror });
      const next = [...cur];
      next.splice(idx + 1, 0, clone);
      return next;
    });
  }
  function moveSectionByIndex(idx: number, delta: number) {
    setSectionsWithHistory((cur) => {
      const to = idx + delta;
      return to < 0 || to >= cur.length ? cur : arrayMove(cur, idx, to);
    });
  }

  function addPoseItem(sectionUid: string, blockUid: string | null, pose: PoseCatalogItem) {
    const newItem = editItemFrom({ poseId: pose.id, customLabel: "", note: "", reps: null, holdValue: null, holdUnit: null, onInhale: null, onExhale: null });
    setSectionsWithHistory((cur) =>
      cur.map((s) => {
        if (s.uid !== sectionUid) return s;
        if (blockUid === null) return { ...s, rows: [...s.rows, { uid: newItem.uid, kind: "item", item: newItem }] };
        return { ...s, rows: s.rows.map((r) => (r.kind === "block" && r.block.uid === blockUid ? { ...r, block: { ...r.block, items: [...r.block.items, newItem] } } : r)) };
      })
    );
  }
  // Sostituisce la posa di una voce già esistente mantenendo note, ripetizioni,
  // durata e tag respiro: a differenza di "rimuovi e riaggiungi" non fa
  // perdere il resto dei dati già inseriti sulla riga.
  function replaceItemPose(sectionUid: string, blockUid: string | null, itemUid: string, pose: PoseCatalogItem) {
    setSectionsWithHistory((cur) =>
      cur.map((s) => {
        if (s.uid !== sectionUid) return s;
        if (blockUid === null) {
          return { ...s, rows: s.rows.map((r) => (r.kind === "item" && r.item.uid === itemUid ? { ...r, item: { ...r.item, poseId: pose.id, customLabel: "" } } : r)) };
        }
        return {
          ...s,
          rows: s.rows.map((r) =>
            r.kind === "block" && r.block.uid === blockUid
              ? { ...r, block: { ...r.block, items: r.block.items.map((it) => (it.uid === itemUid ? { ...it, poseId: pose.id, customLabel: "" } : it)) } }
              : r
          ),
        };
      })
    );
  }
  function addCustomItem(sectionUid: string, blockUid: string | null, label: string) {
    if (!label.trim()) return;
    const newItem = editItemFrom({ poseId: null, customLabel: label.trim(), note: "", reps: null, holdValue: null, holdUnit: null, onInhale: null, onExhale: null });
    setSectionsWithHistory((cur) =>
      cur.map((s) => {
        if (s.uid !== sectionUid) return s;
        if (blockUid === null) return { ...s, rows: [...s.rows, { uid: newItem.uid, kind: "item", item: newItem }] };
        return { ...s, rows: s.rows.map((r) => (r.kind === "block" && r.block.uid === blockUid ? { ...r, block: { ...r.block, items: [...r.block.items, newItem] } } : r)) };
      })
    );
  }
  function updateItem(sectionUid: string, blockUid: string | null, itemUid: string, patch: Partial<EditItem>) {
    setSectionsWithHistory((cur) =>
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
    setSectionsWithHistory((cur) =>
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

  // Duplica una singola posizione (non l'intera sezione/blocco): copia
  // l'item con un nuovo uid, invariato (nessuno swap dx/sx, a differenza del
  // "duplica specchiando" di sezione), inserita subito dopo l'originale
  // nello stesso contenitore — sia esso le righe libere della sezione o un
  // blocco ripetuto.
  function duplicateItem(sectionUid: string, blockUid: string | null, itemUid: string) {
    setSectionsWithHistory((cur) =>
      cur.map((s) => {
        if (s.uid !== sectionUid) return s;
        if (blockUid === null) {
          const idx = s.rows.findIndex((r) => r.kind === "item" && r.item.uid === itemUid);
          if (idx < 0) return s;
          const original = (s.rows[idx] as { kind: "item"; item: EditItem }).item;
          const clone = cloneEditItem(original);
          const rows = [...s.rows];
          rows.splice(idx + 1, 0, { uid: clone.uid, kind: "item", item: clone });
          return { ...s, rows };
        }
        return {
          ...s,
          rows: s.rows.map((r) => {
            if (r.kind !== "block" || r.block.uid !== blockUid) return r;
            const idx = r.block.items.findIndex((it) => it.uid === itemUid);
            if (idx < 0) return r;
            const clone = cloneEditItem(r.block.items[idx]);
            const items = [...r.block.items];
            items.splice(idx + 1, 0, clone);
            return { ...r, block: { ...r.block, items } };
          }),
        };
      })
    );
  }

  function addBlock(sectionUid: string) {
    const blockUid = uid();
    setSectionsWithHistory((cur) =>
      cur.map((s) => (s.uid === sectionUid ? { ...s, rows: [...s.rows, { uid: blockUid, kind: "block", block: { uid: blockUid, reps: 3, repeatOtherSide: false, items: [] } }] } : s))
    );
  }
  function toggleBlockRepeatOtherSide(sectionUid: string, blockUid: string) {
    setSectionsWithHistory((cur) =>
      cur.map((s) =>
        s.uid === sectionUid
          ? { ...s, rows: s.rows.map((r) => (r.kind === "block" && r.block.uid === blockUid ? { ...r, block: { ...r.block, repeatOtherSide: !r.block.repeatOtherSide } } : r)) }
          : s
      )
    );
  }
  function removeBlock(sectionUid: string, blockUid: string) {
    setSectionsWithHistory((cur) => cur.map((s) => (s.uid === sectionUid ? { ...s, rows: s.rows.filter((r) => r.uid !== blockUid) } : s)));
  }
  function updateBlockReps(sectionUid: string, blockUid: string, reps: number | null) {
    setSectionsWithHistory((cur) =>
      cur.map((s) => (s.uid === sectionUid ? { ...s, rows: s.rows.map((r) => (r.kind === "block" && r.block.uid === blockUid ? { ...r, block: { ...r.block, reps } } : r)) } : s))
    );
  }

  const totalActive = sections.reduce((sum, s) => {
    if (!s.enabled) return sum;
    return sum + s.rows.reduce((rSum, r) => rSum + (r.kind === "item" ? 1 : r.block.items.length), 0);
  }, 0);
  const totalNeedsReview = sections.reduce((sum, s) => {
    if (!s.enabled) return sum;
    return (
      sum +
      s.rows.reduce((rSum, r) => rSum + (r.kind === "item" ? (r.item.needsReview ? 1 : 0) : r.block.items.filter((it) => it.needsReview).length), 0)
    );
  }, 0);

  const sheetSections = useMemo(
    () =>
      sections
        .filter((s) => s.enabled)
        .map((s) => ({
          label: s.label,
          rows: s.rows.flatMap(
            (r): SheetRow[] =>
              r.kind === "item"
                ? expandSheetItem(r.item, poseById).map((item) => ({ kind: "item", item }))
                : expandBlockSheetRows(r.block.items, r.block.reps, r.block.repeatOtherSide, poseById)
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
        description: description.trim(),
        isPublic,
        sections: sections.map((s, sIdx) => {
          const blocks: { tempId: string; reps: number | null; position: number; repeatOtherSide: boolean }[] = [];
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
            needsReview: boolean;
            drishtiOverride: Drishti | "none" | null;
            repeatOtherSide: boolean;
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
                needsReview: row.item.needsReview,
                drishtiOverride: row.item.drishtiOverride,
                repeatOtherSide: row.item.repeatOtherSide,
              });
            } else {
              blocks.push({ tempId: row.block.uid, reps: row.block.reps, position: rowIdx, repeatOtherSide: row.block.repeatOtherSide });
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
                  needsReview: it.needsReview,
                  drishtiOverride: it.drishtiOverride,
                  repeatOtherSide: it.repeatOtherSide,
                });
              });
            }
          });
          return { kind: s.kind, label: s.label, enabled: s.enabled, position: sIdx, blocks, items };
        }),
      });

      // Invio in background, non bloccante: come per le altre email di questo
      // progetto, un problema nell'invio non deve mai impedire il salvataggio
      // né tenere l'admin in attesa (vedi notifyClassFull in lib/notifications.ts).
      if ((notifyEmail || notifySiteNotice) && notifyRecipients.length > 0) {
        notifySequenceAssigned(saved.id, saved.name, {
          sendEmail: notifyEmail,
          sendSiteNotice: notifySiteNotice,
          clientIds: notifyRecipients.map((c) => c.id),
        }).catch(() => {});
      }

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
    const text = buildSheetText(sheetSections, sheetTitle);
    navigator.clipboard
      .writeText(text)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1400);
      })
      .catch(() => {});
  }
  function handleShare() {
    const text = buildSheetText(sheetSections, sheetTitle);
    navigator.share({ title: sheetTitle, text }).catch(() => {});
  }
  function handlePrint() {
    printSequenceSheet(sheetTitle);
  }

  const selectedType = classTypes.find((t) => t.id === classTypeId);

  return (
    <div>
      <div className="grid sm:grid-cols-2 gap-3 mb-4">
        <Field label="Nome sequenza">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Es. Sequenza base, Post-infortunio ginocchio" style={inputStyle} />
        </Field>
        <Field label="Tipo di sequenza">
          <select value={classTypeId} onChange={(e) => setClassTypeId(e.target.value)} style={inputStyle}>
            {classTypes.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <div className="mb-4">
        <Field label="Descrizione (facoltativa)">
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Note sull'obiettivo o il contesto di questa sequenza, visibili anche all'allievo…"
            rows={2}
            style={{ ...inputStyle, resize: "vertical" }}
          />
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

      <div className="flex items-start gap-3 mb-4 p-3 rounded-lg" style={{ background: COLORS.subtle }}>
        <Switch checked={isPublic} onChange={setIsPublic} label="Visibile a tutti nel catalogo" onText="Pubblica" offText="Privata" />
        <div style={{ fontSize: 11.5, color: COLORS.inkSoft, lineHeight: 1.4 }}>
          Indipendente dall&apos;assegnazione: puoi tenerla privata, assegnarla a uno o più allievi, renderla pubblica nel catalogo, o entrambe le cose.
        </div>
      </div>

      {newlyAssignedClients.length > 0 && (
        <div className="mb-4 p-3 rounded-lg" style={{ background: withAlpha(COLORS.primary, 8), border: `1px solid ${withAlpha(COLORS.primary, 25)}` }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: COLORS.heading }} className="mb-2">
            Avvisare {newlyAssignedClients.length === 1 ? "l'allievo appena assegnato" : "gli allievi appena assegnati"}?
          </div>
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between gap-2">
              <label className="flex items-center gap-2" style={{ fontSize: 12.5, color: COLORS.ink }}>
                <input type="checkbox" checked={notifyEmail} onChange={(e) => setNotifyEmail(e.target.checked)} />
                <Mail size={13} /> Notifica via email
              </label>
              {notifyEmail && (
                <button
                  type="button"
                  onClick={() => setShowEmailPreview(true)}
                  className="flex items-center gap-1 text-xs font-semibold flex-shrink-0"
                  style={{ color: COLORS.primaryDark }}
                >
                  <Eye size={12} /> Anteprima email
                </button>
              )}
            </div>
            <label className="flex items-center gap-2" style={{ fontSize: 12.5, color: COLORS.ink }}>
              <input type="checkbox" checked={notifySiteNotice} onChange={(e) => setNotifySiteNotice(e.target.checked)} />
              <Bell size={13} /> Notifica via avviso sito
            </label>
          </div>

          {(notifyEmail || notifySiteNotice) && newlyAssignedClients.length > 1 && (
            <div className="mt-3 pt-3" style={{ borderTop: `1px solid ${withAlpha(COLORS.primary, 20)}` }}>
              <div className="flex items-center gap-1.5 mb-1.5" style={{ fontSize: 11.5, fontWeight: 600, color: COLORS.inkSoft }}>
                <UserCheck size={13} /> Destinatari
              </div>
              <div className="flex flex-col rounded-lg" style={{ border: `1px solid ${COLORS.border}`, background: COLORS.card }}>
                {newlyAssignedClients.map((c) => {
                  const included = !excludedNotifyIds.includes(c.id);
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => toggleNotifyRecipient(c.id)}
                      className="flex items-center gap-2 text-left px-2.5 py-1.5"
                      style={{ fontSize: 12.5, borderBottom: `1px solid ${COLORS.border}` }}
                    >
                      <input type="checkbox" checked={included} onChange={() => toggleNotifyRecipient(c.id)} onClick={(e) => e.stopPropagation()} />
                      <span style={{ color: included ? COLORS.ink : COLORS.inkSoft, textDecoration: included ? "none" : "line-through" }}>{c.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {showEmailPreview && (
        <EmailPreviewModal
          subject={`Nuova sequenza — ${name.trim() || "Titolo sequenza"}`}
          html={sequenceAssignedEmailHtml({
            fullName: "Nome Cognome",
            sequenceName: name.trim() || "Titolo sequenza",
            sequenceUrl: `https://imayoga.app/area/sequenze/…`,
          })}
          onClose={() => setShowEmailPreview(false)}
        />
      )}

      {loadingTemplate ? (
        <div style={{ fontSize: 13, color: COLORS.inkSoft }} className="py-6 text-center">
          Caricamento template…
        </div>
      ) : isMobile ? (
        <div className="mb-3">
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleMobileDragEnd}>
            <SortableContext items={sections.map((s) => s.uid)} strategy={verticalListSortingStrategy}>
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
                    onDuplicate={() => duplicateSection(section.uid, false)}
                    onDuplicateMirror={() => duplicateSection(section.uid, true)}
                    onEditPose={setEditingPose}
                    onPromoteToCatalog={promoteCustomItem}
                    onDuplicateItem={duplicateItem}
                    onAddCustomItem={(blockUid, label) => addCustomItem(section.uid, blockUid, label)}
                    onUpdateItem={(blockUid, itemUid, patch) => updateItem(section.uid, blockUid, itemUid, patch)}
                    onRemoveItem={(blockUid, itemUid) => removeItem(section.uid, blockUid, itemUid)}
                    onMoveRowByIndex={(rowIdx, delta) => moveRowByIndex(section.uid, rowIdx, delta)}
                    onMoveItemInBlock={(blockUid, itemIdx, delta) => moveItemInBlockByIndex(section.uid, blockUid, itemIdx, delta)}
                    onAddBlock={() => addBlock(section.uid)}
                    onRemoveBlock={(blockUid) => removeBlock(section.uid, blockUid)}
                    onUpdateBlockReps={(blockUid, reps) => updateBlockReps(section.uid, blockUid, reps)}
                    onToggleBlockRepeatOtherSide={(blockUid) => toggleBlockRepeatOtherSide(section.uid, blockUid)}
                    onOpenPicker={(blockUid, itemUid) => setPickerTarget({ sectionUid: section.uid, blockUid, itemUid })}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
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
                  {sections.map((section, idx) => (
                    <SectionEditor
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
                      onDuplicate={() => duplicateSection(section.uid, false)}
                      onDuplicateMirror={() => duplicateSection(section.uid, true)}
                      onEditPose={setEditingPose}
                      onPromoteToCatalog={promoteCustomItem}
                      onDuplicateItem={duplicateItem}
                      onAddCustomItem={(blockUid, label) => addCustomItem(section.uid, blockUid, label)}
                      onUpdateItem={(blockUid, itemUid, patch) => updateItem(section.uid, blockUid, itemUid, patch)}
                      onRemoveItem={(blockUid, itemUid) => removeItem(section.uid, blockUid, itemUid)}
                      onMoveRowByIndex={(rowIdx, delta) => moveRowByIndex(section.uid, rowIdx, delta)}
                      onMoveItemInBlock={(blockUid, itemIdx, delta) => moveItemInBlockByIndex(section.uid, blockUid, itemIdx, delta)}
                      onAddBlock={() => addBlock(section.uid)}
                      onRemoveBlock={(blockUid) => removeBlock(section.uid, blockUid)}
                      onUpdateBlockReps={(blockUid, reps) => updateBlockReps(section.uid, blockUid, reps)}
                    onToggleBlockRepeatOtherSide={(blockUid) => toggleBlockRepeatOtherSide(section.uid, blockUid)}
                      onOpenPicker={(blockUid, itemUid) => setPickerTarget({ sectionUid: section.uid, blockUid, itemUid })}
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

            <PosePalette supabase={supabase} poseCatalog={poseCatalog} poseCategories={poseCategories} onPoseCatalogUpdated={onPoseCatalogUpdated} />
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
          supabase={supabase}
          poseCatalog={poseCatalog}
          poseCategories={poseCategories}
          mode={pickerTarget.itemUid ? "replace" : "add"}
          onPoseCatalogUpdated={onPoseCatalogUpdated}
          onClose={() => setPickerTarget(null)}
          onPick={(pose) => {
            if (pickerTarget.itemUid) {
              replaceItemPose(pickerTarget.sectionUid, pickerTarget.blockUid, pickerTarget.itemUid, pose);
            } else {
              addPoseItem(pickerTarget.sectionUid, pickerTarget.blockUid, pose);
            }
            setPickerTarget(null);
          }}
        />
      )}

      {editingPose && (
        <PoseEditModal
          supabase={supabase}
          pose={editingPose}
          poseCatalog={poseCatalog}
          categories={poseCategories}
          onSaved={(saved) => {
            onPoseCatalogUpdated(saved);
            setEditingPose(null);
          }}
          onClose={() => setEditingPose(null)}
        />
      )}

      {promotingItem && (
        <PoseEditModal
          supabase={supabase}
          pose={null}
          initialName={promotingItem.label}
          poseCatalog={poseCatalog}
          categories={poseCategories}
          onSaved={(saved) => {
            onPoseCatalogUpdated(saved);
            replaceItemPose(promotingItem.sectionUid, promotingItem.blockUid, promotingItem.itemUid, saved);
            setPromotingItem(null);
          }}
          onClose={() => setPromotingItem(null)}
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
            {totalNeedsReview > 0 && <span style={{ color: COLORS.gold, fontWeight: 600 }}> · {totalNeedsReview} da verificare</span>}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleUndo}
            disabled={undoStack.length === 0}
            title="Annulla ultima modifica"
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium disabled:opacity-40"
            style={{ border: `1px solid ${COLORS.border}` }}
          >
            <Undo2 size={14} /> Annulla
          </button>
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
            <div style={{ fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 600, color: COLORS.heading }}>{sheetTitle}</div>
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
                <Download size={14} /> Esporta PDF
              </button>
            </div>
          </div>

          <PrintSheet title={sheetTitle} sheetSections={sheetSections} />
        </Modal>
      )}
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

// Drishti effettiva di una voce: l'eventuale sovrascrittura sulla singola
// istanza vince su quella della posa collegata (a sua volta ereditata dal
// padre per le varianti, vedi poseDisplayDrishti). Il picker mostra sempre
// il valore effettivo; scegliere "Eredita dal catalogo" nel pannello annulla
// la sovrascrittura tornando al valore del catalogo.
function ItemDrishtiSection({
  item,
  pose,
  parentPose,
  onUpdate,
}: {
  item: EditItem;
  pose?: PoseCatalogItem;
  parentPose?: PoseCatalogItem;
  onUpdate: (patch: Partial<EditItem>) => void;
}) {
  const catalogDrishti = pose ? poseDisplayDrishti(pose, parentPose) : null;
  const explicitNone = item.drishtiOverride === "none";
  return (
    <div className="mt-1.5" style={{ paddingLeft: 22 }}>
      <DrishtiPicker
        value={item.drishtiOverride === "none" ? null : item.drishtiOverride}
        inherited={catalogDrishti}
        overrideLabel="solo qui"
        onChange={(v) => onUpdate({ drishtiOverride: v })}
        explicitNone={explicitNone}
        onSelectNone={() => onUpdate({ drishtiOverride: "none" })}
        size="sm"
      />
    </div>
  );
}

function SectionEditor({
  section,
  poseById,
  isFirst,
  isLast,
  onMoveUp,
  onMoveDown,
  onToggle,
  onRename,
  onRemove,
  onDuplicate,
  onDuplicateMirror,
  onEditPose,
  onPromoteToCatalog,
  onDuplicateItem,
  onAddCustomItem,
  onUpdateItem,
  onRemoveItem,
  onMoveRowByIndex,
  onMoveItemInBlock,
  onAddBlock,
  onRemoveBlock,
  onUpdateBlockReps,
  onToggleBlockRepeatOtherSide,
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
  onDuplicate: () => void;
  onDuplicateMirror: () => void;
  onEditPose: (pose: PoseCatalogItem) => void;
  onPromoteToCatalog: (sectionUid: string, blockUid: string | null, itemUid: string, label: string) => void;
  onDuplicateItem: (sectionUid: string, blockUid: string | null, itemUid: string) => void;
  onAddCustomItem: (blockUid: string | null, label: string) => void;
  onUpdateItem: (blockUid: string | null, itemUid: string, patch: Partial<EditItem>) => void;
  onRemoveItem: (blockUid: string | null, itemUid: string) => void;
  onMoveRowByIndex: (idx: number, delta: number) => void;
  onMoveItemInBlock: (blockUid: string, idx: number, delta: number) => void;
  onAddBlock: () => void;
  onRemoveBlock: (blockUid: string) => void;
  onUpdateBlockReps: (blockUid: string, reps: number | null) => void;
  onToggleBlockRepeatOtherSide: (blockUid: string) => void;
  onOpenPicker: (blockUid: string | null, itemUid?: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: section.uid,
    data: { type: "section" },
  });
  const [expanded, setExpanded] = useState(true);
  const [addingCustom, setAddingCustom] = useState(false);
  const [customText, setCustomText] = useState("");
  const { setNodeRef: setDropRef, isOver } = useDroppable({ id: `section-drop:${section.uid}` });

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
        <div className="flex flex-col">
          <button onClick={onMoveUp} disabled={isFirst} style={{ color: isFirst ? COLORS.border : COLORS.inkSoft, lineHeight: 0 }} title="Sposta su">
            <ChevronUp size={12} />
          </button>
          <button onClick={onMoveDown} disabled={isLast} style={{ color: isLast ? COLORS.border : COLORS.inkSoft, lineHeight: 0 }} title="Sposta giù">
            <ChevronDown size={12} />
          </button>
        </div>
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
        <button onClick={onDuplicate} title="Duplica sezione" style={{ color: COLORS.inkSoft }}>
          <Copy size={14} />
        </button>
        <button onClick={onRemove} title="Rimuovi sezione" style={{ color: COLORS.danger }}>
          <Trash2 size={14} />
        </button>
      </div>

      {expanded && section.enabled && (
        <div ref={setDropRef} className="px-2.5 pb-2.5 rounded-b-xl" style={{ background: isOver ? withAlpha(COLORS.primary, 10) : "transparent" }}>
          <SortableContext items={section.rows.map((r) => r.uid)} strategy={verticalListSortingStrategy}>
            <div className="flex flex-col gap-1.5 mb-2">
              {section.rows.map((row, idx) =>
                row.kind === "item" ? (
                  <ItemRow
                    key={row.uid}
                    item={row.item}
                    sectionUid={section.uid}
                    blockUid={null}
                    pose={row.item.poseId ? poseById[row.item.poseId] : undefined}
                    parentPose={parentOfPose(poseById, row.item.poseId ? poseById[row.item.poseId] : undefined)}
                    isFirst={idx === 0}
                    isLast={idx === section.rows.length - 1}
                    onUpdate={(patch) => onUpdateItem(null, row.item.uid, patch)}
                    onRemove={() => onRemoveItem(null, row.item.uid)}
                    onMoveUp={() => onMoveRowByIndex(idx, -1)}
                    onMoveDown={() => onMoveRowByIndex(idx, 1)}
                    onReplace={() => onOpenPicker(null, row.item.uid)}
                    onEditPose={onEditPose}
                    onPromoteToCatalog={onPromoteToCatalog}
                    onDuplicateItem={onDuplicateItem}
                  />
                ) : (
                  <BlockCard
                    key={row.uid}
                    sectionUid={section.uid}
                    block={row.block}
                    poseById={poseById}
                    isFirst={idx === 0}
                    isLast={idx === section.rows.length - 1}
                    onMoveUp={() => onMoveRowByIndex(idx, -1)}
                    onMoveDown={() => onMoveRowByIndex(idx, 1)}
                    onUpdateReps={(reps) => onUpdateBlockReps(row.block.uid, reps)}
                    onToggleRepeatOtherSide={() => onToggleBlockRepeatOtherSide(row.block.uid)}
                    onRemoveBlock={() => onRemoveBlock(row.block.uid)}
                    onUpdateItem={(itemUid, patch) => onUpdateItem(row.block.uid, itemUid, patch)}
                    onRemoveItem={(itemUid) => onRemoveItem(row.block.uid, itemUid)}
                    onMoveItemUp={(itemIdx) => onMoveItemInBlock(row.block.uid, itemIdx, -1)}
                    onMoveItemDown={(itemIdx) => onMoveItemInBlock(row.block.uid, itemIdx, 1)}
                    onOpenPicker={(itemUid) => onOpenPicker(row.block.uid, itemUid)}
                    onAddCustom={(label) => onAddCustomItem(row.block.uid, label)}
                    onEditPose={onEditPose}
                    onPromoteToCatalog={onPromoteToCatalog}
                    onDuplicateItem={onDuplicateItem}
                  />
                )
              )}
            </div>
          </SortableContext>

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
            <button onClick={onDuplicateMirror} className="flex items-center gap-1 text-xs font-medium" style={{ color: COLORS.primaryDark }}>
              <Copy size={12} /> Duplica specchiando dx/sx
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Voce di sequenza (posa singola): trascinabile con la maniglia E riordinabile
// a frecce, così lo spostamento funziona sia con il drag-and-drop sia con un
// tocco preciso — utile soprattutto su schermi piccoli o quando il drag non
// è comodo (tante voci, scroll lungo). "Sostituisci" apre lo stesso catalogo
// usato per aggiungere, ma sostituisce la posa mantenendo note/ripetizioni/
// durata/respiro già inseriti sulla riga.
function ItemRow({
  item,
  sectionUid,
  blockUid,
  pose,
  parentPose,
  isFirst,
  isLast,
  onUpdate,
  onRemove,
  onMoveUp,
  onMoveDown,
  onReplace,
  onEditPose,
  onPromoteToCatalog,
  onDuplicateItem,
}: {
  item: EditItem;
  // Identificano il contenitore corrente della voce (sezione + eventuale
  // blocco): servono solo come "data" del drag sortable, per capire da dove
  // arriva un item quando lo si trascina in un altro blocco/sezione — vedi
  // moveItem/resolveItemDropTarget nel componente padre. La stessa coppia
  // serve anche a "Promuovi al catalogo" per sapere quale voce aggiornare.
  sectionUid: string;
  blockUid: string | null;
  pose?: PoseCatalogItem;
  parentPose?: PoseCatalogItem;
  isFirst: boolean;
  isLast: boolean;
  onUpdate: (patch: Partial<EditItem>) => void;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onReplace: () => void;
  onEditPose: (pose: PoseCatalogItem) => void;
  onPromoteToCatalog: (sectionUid: string, blockUid: string | null, itemUid: string, label: string) => void;
  onDuplicateItem: (sectionUid: string, blockUid: string | null, itemUid: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.uid,
    data: { type: "item", sectionUid, blockUid },
  });
  const label = pose ? poseDisplayName(pose, parentPose) : item.customLabel;
  const image = pose ? poseDisplayImage(pose, parentPose) : null;
  return (
    <div
      ref={setNodeRef}
      className="p-2 rounded-xl"
      style={{
        background: item.needsReview ? withAlpha(COLORS.gold, 8) : COLORS.bg,
        border: `1px solid ${item.needsReview ? withAlpha(COLORS.gold, 45) : COLORS.border}`,
        opacity: isDragging ? 0.6 : 1,
        transform: CSS.Transform.toString(transform),
        transition,
      }}
    >
      <div className="flex items-center gap-2">
        <button {...attributes} {...listeners} className="cursor-grab flex items-center" style={{ color: COLORS.inkSoft, touchAction: "none" }} title="Trascina per riordinare">
          <GripVertical size={14} />
        </button>
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
          <img
            src={image}
            alt={label}
            width={36}
            height={36}
            onDoubleClick={() => pose && onEditPose(pose)}
            style={{ borderRadius: 8, objectFit: "cover", background: COLORS.subtle, flexShrink: 0, cursor: pose ? "pointer" : undefined }}
            title={pose ? "Doppio click per modificare nel catalogo" : undefined}
          />
        )}
        <div className="flex-1 min-w-0">
          {pose ? (
            <div
              onDoubleClick={() => onEditPose(pose)}
              className="flex items-center gap-1"
              style={{ fontSize: 13, fontWeight: 600, cursor: "pointer", width: "fit-content" }}
              title="Doppio click per modificare nel catalogo"
            >
              {label}
              <BookOpen size={10} style={{ color: COLORS.inkSoft, flexShrink: 0 }} />
            </div>
          ) : (
            <input
              value={item.customLabel}
              onChange={(e) => onUpdate({ customLabel: e.target.value })}
              placeholder="Voce senza nome"
              style={{ ...inputStyle, border: "none", background: "transparent", padding: 0, fontSize: 13, fontWeight: 600, color: COLORS.ink }}
            />
          )}
          <input value={item.note} onChange={(e) => onUpdate({ note: e.target.value })} placeholder="nota (facoltativa)" style={{ ...inputStyle, padding: "4px 8px", fontSize: 12, marginTop: 2 }} />
        </div>
        <button onClick={onReplace} title="Sostituisci posizione" style={{ color: COLORS.inkSoft }}>
          <Replace size={13} />
        </button>
        <button onClick={() => onDuplicateItem(sectionUid, blockUid, item.uid)} title="Duplica posizione" style={{ color: COLORS.inkSoft }}>
          <Copy size={13} />
        </button>
        {!pose && item.customLabel.trim() && (
          <button
            onClick={() => onPromoteToCatalog(sectionUid, blockUid, item.uid, item.customLabel)}
            title="Promuovi al catalogo (per poterle assegnare una foto e riusarla)"
            style={{ color: COLORS.primaryDark }}
          >
            <BookPlus size={14} />
          </button>
        )}
        <button
          onClick={() => onUpdate({ repeatOtherSide: !item.repeatOtherSide })}
          title={item.repeatOtherSide ? "Ripete anche dall'altro lato (in scheda)" : "Ripeti anche dall'altro lato"}
          style={{ color: item.repeatOtherSide ? COLORS.primaryDark : COLORS.inkSoft }}
        >
          <Repeat2 size={14} />
        </button>
        <button
          onClick={() => onUpdate({ needsReview: !item.needsReview })}
          title={item.needsReview ? "Segnato da verificare" : "Segna da verificare"}
          style={{ color: item.needsReview ? COLORS.gold : COLORS.inkSoft }}
        >
          <Flag size={14} fill={item.needsReview ? COLORS.gold : "none"} />
        </button>
        <button onClick={onRemove} title="Rimuovi" style={{ color: COLORS.inkSoft }}>
          <X size={14} />
        </button>
      </div>
      <ItemMetaSection item={item} onUpdate={onUpdate} />
      <ItemBreathSection item={item} onUpdate={onUpdate} />
      <ItemDrishtiSection item={item} pose={pose} parentPose={parentPose} onUpdate={onUpdate} />
    </div>
  );
}

// Contenuto condiviso di un blocco (intestazione ripetizioni + items al suo
// interno): gli item hanno una loro mini area di drag-and-drop indipendente
// da quella delle righe della sezione, più le frecce come alternativa — un
// blocco resta piccolo, ma niente impedisce di trascinare anche lì.
function BlockBody({
  sectionUid,
  block,
  poseById,
  onUpdateReps,
  onToggleRepeatOtherSide,
  onRemoveBlock,
  onUpdateItem,
  onRemoveItem,
  onMoveItemUp,
  onMoveItemDown,
  onOpenPicker,
  onAddCustom,
  onEditPose,
  onPromoteToCatalog,
  onDuplicateItem,
  dropRef,
  isOver,
}: {
  sectionUid: string;
  block: EditBlock;
  poseById: Record<string, PoseCatalogItem>;
  onUpdateReps: (reps: number | null) => void;
  onToggleRepeatOtherSide: () => void;
  onRemoveBlock: () => void;
  onUpdateItem: (itemUid: string, patch: Partial<EditItem>) => void;
  onRemoveItem: (itemUid: string) => void;
  onMoveItemUp: (idx: number) => void;
  onMoveItemDown: (idx: number) => void;
  onOpenPicker: (itemUid?: string) => void;
  onAddCustom: (label: string) => void;
  onEditPose: (pose: PoseCatalogItem) => void;
  onPromoteToCatalog: (sectionUid: string, blockUid: string | null, itemUid: string, label: string) => void;
  onDuplicateItem: (sectionUid: string, blockUid: string | null, itemUid: string) => void;
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
        <button
          onClick={onToggleRepeatOtherSide}
          title={block.repeatOtherSide ? "Ripete l'intero blocco anche dall'altro lato (in scheda)" : "Ripeti l'intero blocco anche dall'altro lato"}
          style={{ color: block.repeatOtherSide ? COLORS.primaryDark : COLORS.inkSoft }}
        >
          <Repeat2 size={14} />
        </button>
        <button onClick={onRemoveBlock} title="Rimuovi blocco" style={{ color: COLORS.danger }}>
          <Trash2 size={14} />
        </button>
      </div>

      <SortableContext items={block.items.map((it) => it.uid)} strategy={verticalListSortingStrategy}>
        <div className="flex flex-col gap-1.5 mb-2">
          {block.items.map((item, idx) => (
            <ItemRow
              key={item.uid}
              item={item}
              sectionUid={sectionUid}
              blockUid={block.uid}
              pose={item.poseId ? poseById[item.poseId] : undefined}
              parentPose={parentOfPose(poseById, item.poseId ? poseById[item.poseId] : undefined)}
              isFirst={idx === 0}
              isLast={idx === block.items.length - 1}
              onUpdate={(patch) => onUpdateItem(item.uid, patch)}
              onRemove={() => onRemoveItem(item.uid)}
              onMoveUp={() => onMoveItemUp(idx)}
              onMoveDown={() => onMoveItemDown(idx)}
              onReplace={() => onOpenPicker(item.uid)}
              onEditPose={onEditPose}
              onPromoteToCatalog={onPromoteToCatalog}
              onDuplicateItem={onDuplicateItem}
            />
          ))}
        </div>
      </SortableContext>

      {block.items.length === 0 && (
        <div style={{ fontSize: 11, color: COLORS.inkSoft, textAlign: "center", padding: "10px 8px", border: `1px dashed ${COLORS.border}`, borderRadius: 8 }} className="mb-2">
          Nessuna posizione nel blocco
        </div>
      )}

      <div className="flex items-center gap-2 flex-wrap">
        <button onClick={() => onOpenPicker()} className="flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-lg text-white" style={{ background: COLORS.primary }}>
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
// dal pannello catalogo (sia su desktop che su mobile, dove la sezione ha la
// sua area di drag-and-drop indipendente).
function BlockCard({
  sectionUid,
  block,
  poseById,
  isFirst,
  isLast,
  onMoveUp,
  onMoveDown,
  onUpdateReps,
  onToggleRepeatOtherSide,
  onRemoveBlock,
  onUpdateItem,
  onRemoveItem,
  onMoveItemUp,
  onMoveItemDown,
  onOpenPicker,
  onAddCustom,
  onEditPose,
  onPromoteToCatalog,
  onDuplicateItem,
}: {
  sectionUid: string;
  block: EditBlock;
  poseById: Record<string, PoseCatalogItem>;
  isFirst: boolean;
  isLast: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onUpdateReps: (reps: number | null) => void;
  onToggleRepeatOtherSide: () => void;
  onRemoveBlock: () => void;
  onUpdateItem: (itemUid: string, patch: Partial<EditItem>) => void;
  onRemoveItem: (itemUid: string) => void;
  onMoveItemUp: (idx: number) => void;
  onMoveItemDown: (idx: number) => void;
  onOpenPicker: (itemUid?: string) => void;
  onAddCustom: (label: string) => void;
  onEditPose: (pose: PoseCatalogItem) => void;
  onPromoteToCatalog: (sectionUid: string, blockUid: string | null, itemUid: string, label: string) => void;
  onDuplicateItem: (sectionUid: string, blockUid: string | null, itemUid: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: block.uid,
    data: { type: "block", sectionUid },
  });
  const { setNodeRef: setDropRef, isOver } = useDroppable({ id: `block-drop:${sectionUid}:${block.uid}` });

  return (
    <div ref={setNodeRef} className="flex items-start gap-2" style={{ opacity: isDragging ? 0.6 : 1, transform: CSS.Transform.toString(transform), transition }}>
      <div className="flex items-center gap-1 mt-2.5">
        <button {...attributes} {...listeners} className="cursor-grab flex items-center" style={{ color: COLORS.inkSoft, touchAction: "none" }} title="Trascina per riordinare">
          <GripVertical size={14} />
        </button>
        <div className="flex flex-col">
          <button onClick={onMoveUp} disabled={isFirst} style={{ color: isFirst ? COLORS.border : COLORS.inkSoft, lineHeight: 0 }} title="Sposta su">
            <ChevronUp size={12} />
          </button>
          <button onClick={onMoveDown} disabled={isLast} style={{ color: isLast ? COLORS.border : COLORS.inkSoft, lineHeight: 0 }} title="Sposta giù">
            <ChevronDown size={12} />
          </button>
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <BlockBody
          sectionUid={sectionUid}
          block={block}
          poseById={poseById}
          onUpdateReps={onUpdateReps}
          onToggleRepeatOtherSide={onToggleRepeatOtherSide}
          onRemoveBlock={onRemoveBlock}
          onUpdateItem={onUpdateItem}
          onRemoveItem={onRemoveItem}
          onMoveItemUp={onMoveItemUp}
          onMoveItemDown={onMoveItemDown}
          onOpenPicker={onOpenPicker}
          onAddCustom={onAddCustom}
          onEditPose={onEditPose}
          onPromoteToCatalog={onPromoteToCatalog}
          onDuplicateItem={onDuplicateItem}
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
  onDuplicate,
  onDuplicateMirror,
  onEditPose,
  onPromoteToCatalog,
  onDuplicateItem,
  onAddCustomItem,
  onUpdateItem,
  onRemoveItem,
  onMoveRowByIndex,
  onMoveItemInBlock,
  onAddBlock,
  onRemoveBlock,
  onUpdateBlockReps,
  onToggleBlockRepeatOtherSide,
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
  onDuplicate: () => void;
  onDuplicateMirror: () => void;
  onEditPose: (pose: PoseCatalogItem) => void;
  onPromoteToCatalog: (sectionUid: string, blockUid: string | null, itemUid: string, label: string) => void;
  onDuplicateItem: (sectionUid: string, blockUid: string | null, itemUid: string) => void;
  onAddCustomItem: (blockUid: string | null, label: string) => void;
  onUpdateItem: (blockUid: string | null, itemUid: string, patch: Partial<EditItem>) => void;
  onRemoveItem: (blockUid: string | null, itemUid: string) => void;
  onMoveRowByIndex: (idx: number, delta: number) => void;
  onMoveItemInBlock: (blockUid: string, idx: number, delta: number) => void;
  onAddBlock: () => void;
  onRemoveBlock: (blockUid: string) => void;
  onUpdateBlockReps: (blockUid: string, reps: number | null) => void;
  onToggleBlockRepeatOtherSide: (blockUid: string) => void;
  onOpenPicker: (blockUid: string | null, itemUid?: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: section.uid,
    data: { type: "section" },
  });
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
      <div className="flex items-center gap-1.5 p-2.5">
        <button {...attributes} {...listeners} className="cursor-grab flex items-center" style={{ color: COLORS.inkSoft, touchAction: "none" }} title="Trascina per riordinare">
          <GripVertical size={15} />
        </button>
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
        <button onClick={onDuplicate} title="Duplica sezione" style={{ color: COLORS.inkSoft }}>
          <Copy size={14} />
        </button>
        <button onClick={onRemove} title="Rimuovi sezione" style={{ color: COLORS.danger }}>
          <Trash2 size={14} />
        </button>
      </div>

      {expanded && section.enabled && (
        <div className="px-2.5 pb-2.5">
          <SortableContext items={section.rows.map((r) => r.uid)} strategy={verticalListSortingStrategy}>
            <div className="flex flex-col gap-1.5 mb-2">
              {section.rows.map((row, idx) =>
                row.kind === "item" ? (
                  <ItemRow
                    key={row.uid}
                    item={row.item}
                    sectionUid={section.uid}
                    blockUid={null}
                    pose={row.item.poseId ? poseById[row.item.poseId] : undefined}
                    parentPose={parentOfPose(poseById, row.item.poseId ? poseById[row.item.poseId] : undefined)}
                    isFirst={idx === 0}
                    isLast={idx === section.rows.length - 1}
                    onUpdate={(patch) => onUpdateItem(null, row.item.uid, patch)}
                    onRemove={() => onRemoveItem(null, row.item.uid)}
                    onMoveUp={() => onMoveRowByIndex(idx, -1)}
                    onMoveDown={() => onMoveRowByIndex(idx, 1)}
                    onReplace={() => onOpenPicker(null, row.item.uid)}
                    onEditPose={onEditPose}
                    onPromoteToCatalog={onPromoteToCatalog}
                    onDuplicateItem={onDuplicateItem}
                  />
                ) : (
                  <BlockCard
                    key={row.uid}
                    sectionUid={section.uid}
                    block={row.block}
                    poseById={poseById}
                    isFirst={idx === 0}
                    isLast={idx === section.rows.length - 1}
                    onMoveUp={() => onMoveRowByIndex(idx, -1)}
                    onMoveDown={() => onMoveRowByIndex(idx, 1)}
                    onUpdateReps={(reps) => onUpdateBlockReps(row.block.uid, reps)}
                    onToggleRepeatOtherSide={() => onToggleBlockRepeatOtherSide(row.block.uid)}
                    onRemoveBlock={() => onRemoveBlock(row.block.uid)}
                    onUpdateItem={(itemUid, patch) => onUpdateItem(row.block.uid, itemUid, patch)}
                    onRemoveItem={(itemUid) => onRemoveItem(row.block.uid, itemUid)}
                    onMoveItemUp={(itemIdx) => onMoveItemInBlock(row.block.uid, itemIdx, -1)}
                    onMoveItemDown={(itemIdx) => onMoveItemInBlock(row.block.uid, itemIdx, 1)}
                    onOpenPicker={(itemUid) => onOpenPicker(row.block.uid, itemUid)}
                    onAddCustom={(label) => onAddCustomItem(row.block.uid, label)}
                    onEditPose={onEditPose}
                    onPromoteToCatalog={onPromoteToCatalog}
                    onDuplicateItem={onDuplicateItem}
                  />
                )
              )}
            </div>
          </SortableContext>

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
            <button onClick={onDuplicateMirror} className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-lg" style={{ border: `1px solid ${COLORS.border}`, color: COLORS.primaryDark }}>
              <Copy size={13} /> Duplica specchiando dx/sx
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
  supabase,
  poseCatalog,
  poseCategories,
  mode = "add",
  onPoseCatalogUpdated,
  onPick,
  onClose,
}: {
  supabase: SupabaseClient;
  poseCatalog: PoseCatalogItem[];
  poseCategories: PoseCategory[];
  mode?: "add" | "replace";
  onPoseCatalogUpdated: (pose: PoseCatalogItem) => void;
  onPick: (pose: PoseCatalogItem) => void;
  onClose: () => void;
}) {
  const { macro, setMacro, categoryFilter, setCategoryFilter, query, setQuery, categoriesForMacro, filtered } = usePoseFilter(poseCatalog, poseCategories);
  const [creatingPose, setCreatingPose] = useState(false);
  return (
    <>
      <Modal onClose={onClose} width={480}>
        <div className="p-4 flex flex-col" style={{ maxHeight: "82dvh" }}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-1.5">
              <Sparkles size={14} style={{ color: COLORS.primaryDark }} />
              <div style={{ fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 600, color: COLORS.heading }}>
                {mode === "replace" ? "Sostituisci posizione" : "Aggiungi posizione"}
              </div>
            </div>
            <button onClick={onClose} style={{ color: COLORS.inkSoft }} title="Chiudi">
              <X size={18} />
            </button>
          </div>

          <MacroCategoryPicker macro={macro} setMacro={setMacro} categoryFilter={categoryFilter} setCategoryFilter={setCategoryFilter} query={query} setQuery={setQuery} categoriesForMacro={categoriesForMacro} />

          {/* Sempre visibile, non solo quando la ricerca non trova nulla: in fase
              di ingestion da sequenze cartacee capita spesso che la posa non sia
              ancora a catalogo, ed è più comodo crearla al volo che interrompere
              il lavoro per andare nel Catalogo. */}
          <button onClick={() => setCreatingPose(true)} className="flex items-center gap-1.5 text-xs font-semibold mb-3" style={{ color: COLORS.primaryDark }}>
            <Plus size={13} /> Nuova posizione nel catalogo
          </button>

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

      {creatingPose && (
        <PoseEditModal
          supabase={supabase}
          pose={null}
          initialMacro={macro}
          initialName={query.trim()}
          poseCatalog={poseCatalog}
          categories={poseCategories}
          onSaved={(saved) => {
            onPoseCatalogUpdated(saved);
            onPick(saved);
            setCreatingPose(false);
          }}
          onClose={() => setCreatingPose(false)}
        />
      )}
    </>
  );
}

function PosePalette({
  supabase,
  poseCatalog,
  poseCategories,
  onPoseCatalogUpdated,
}: {
  supabase: SupabaseClient;
  poseCatalog: PoseCatalogItem[];
  poseCategories: PoseCategory[];
  onPoseCatalogUpdated: (pose: PoseCatalogItem) => void;
}) {
  const { macro, setMacro, categoryFilter, setCategoryFilter, query, setQuery, categoriesForMacro, filtered } = usePoseFilter(poseCatalog, poseCategories);
  const [creatingPose, setCreatingPose] = useState(false);

  return (
    <>
      <div
        className="p-3.5 rounded-2xl lg:sticky lg:top-3 lg:max-h-[calc(100dvh-160px)] flex flex-col"
        style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, boxShadow: `0 1px 2px ${withAlpha(COLORS.ink, 4)}` }}
      >
        <div className="flex items-center gap-1.5 mb-3">
          <Sparkles size={14} style={{ color: COLORS.primaryDark }} />
          <div style={{ fontSize: 13, fontWeight: 700, color: COLORS.heading }}>Catalogo</div>
        </div>

        <MacroCategoryPicker macro={macro} setMacro={setMacro} categoryFilter={categoryFilter} setCategoryFilter={setCategoryFilter} query={query} setQuery={setQuery} categoriesForMacro={categoriesForMacro} />

        <button onClick={() => setCreatingPose(true)} className="flex items-center gap-1.5 text-xs font-semibold mb-2.5" style={{ color: COLORS.primaryDark }}>
          <Plus size={13} /> Nuova posizione
        </button>

        <div className="overflow-y-auto overflow-x-hidden max-h-[60vh] lg:max-h-none lg:flex-1" style={{ minHeight: 0 }}>
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

      {creatingPose && (
        <PoseEditModal
          supabase={supabase}
          pose={null}
          initialMacro={macro}
          initialName={query.trim()}
          poseCatalog={poseCatalog}
          categories={poseCategories}
          onSaved={(saved) => {
            onPoseCatalogUpdated(saved);
            setCreatingPose(false);
          }}
          onClose={() => setCreatingPose(false)}
        />
      )}
    </>
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
