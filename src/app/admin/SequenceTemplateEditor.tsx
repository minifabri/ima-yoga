"use client";

import { useEffect, useMemo, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { AlertCircle, GripVertical, Plus, Trash2 } from "lucide-react";
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { COLORS } from "./colors";
import { Switch, inputStyle } from "./ui";
import { fetchSequenceTemplate, saveSequenceTemplateSections } from "./data";
import { STANDARD_SECTION_KINDS } from "./sequenceTypes";
import type { ClassType, SectionKind } from "./types";

type DraftSection = { uid: string; kind: SectionKind; label: string; enabled: boolean };

function uid(): string {
  return typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `id-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function SequenceTemplateEditor({ supabase, classType, onClose }: { supabase: SupabaseClient; classType: ClassType; onClose: () => void }) {
  const [templateId, setTemplateId] = useState<string | null>(null);
  const [sections, setSections] = useState<DraftSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    fetchSequenceTemplate(supabase, classType.id)
      .then((t) => {
        if (cancelled) return;
        setTemplateId(t?.id ?? null);
        setSections((t?.sections ?? []).map((s) => ({ uid: uid(), kind: s.kind, label: s.label, enabled: s.enabled })));
      })
      .catch(() => {
        if (!cancelled) setError("Errore nel caricamento del template.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [supabase, classType.id]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  function handleDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    setSections((cur) => {
      const from = cur.findIndex((s) => s.uid === active.id);
      const to = cur.findIndex((s) => s.uid === over.id);
      return from < 0 || to < 0 ? cur : arrayMove(cur, from, to);
    });
  }

  function toggle(sectionUid: string, enabled: boolean) {
    setSections((cur) => cur.map((s) => (s.uid === sectionUid ? { ...s, enabled } : s)));
  }
  function rename(sectionUid: string, label: string) {
    setSections((cur) => cur.map((s) => (s.uid === sectionUid ? { ...s, label } : s)));
  }
  function remove(sectionUid: string) {
    setSections((cur) => cur.filter((s) => s.uid !== sectionUid));
  }
  function addCustom() {
    setSections((cur) => [...cur, { uid: uid(), kind: "custom", label: "Nuova sezione", enabled: true }]);
  }

  async function handleSave() {
    if (!templateId) return;
    setSaving(true);
    setError("");
    try {
      await saveSequenceTemplateSections(
        supabase,
        templateId,
        sections.map((s, idx) => ({ kind: s.kind, label: s.label, position: idx, enabled: s.enabled }))
      );
      onClose();
    } catch {
      setError("Errore nel salvataggio del template.");
    } finally {
      setSaving(false);
    }
  }

  const missingStandardKinds = useMemo(
    () => STANDARD_SECTION_KINDS.map((s) => s.kind).filter((k) => !sections.some((s) => s.kind === k)),
    [sections]
  );

  return (
    <div className="p-5 overflow-y-auto">
      <div style={{ fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 600, color: COLORS.heading }} className="mb-1">
        Template sezioni — {classType.name}
      </div>
      <div className="mb-4" style={{ fontSize: 12, color: COLORS.inkSoft }}>
        Ordine e sezioni abilitate di default per ogni nuova sequenza di questo tipo. Le modifiche non toccano le sequenze già create.
      </div>

      {loading ? (
        <div style={{ fontSize: 13, color: COLORS.inkSoft }}>Caricamento…</div>
      ) : (
        <>
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={sections.map((s) => s.uid)} strategy={verticalListSortingStrategy}>
              <div className="flex flex-col gap-1.5 mb-3">
                {sections.map((s) => (
                  <TemplateSectionRow key={s.uid} section={s} onToggle={(v) => toggle(s.uid, v)} onRename={(v) => rename(s.uid, v)} onRemove={() => remove(s.uid)} />
                ))}
              </div>
            </SortableContext>
          </DndContext>

          <button onClick={addCustom} className="flex items-center gap-1.5 text-xs font-semibold mb-4" style={{ color: COLORS.primaryDark }}>
            <Plus size={13} /> Aggiungi sezione personalizzata
          </button>

          {missingStandardKinds.length > 0 && (
            <div className="mb-4" style={{ fontSize: 11, color: COLORS.inkSoft }}>
              Sezioni standard non presenti: {missingStandardKinds.map((k) => STANDARD_SECTION_KINDS.find((s) => s.kind === k)?.label).join(", ")}.
            </div>
          )}

          {error && (
            <div className="mb-3 flex items-center gap-1.5" style={{ fontSize: 12, color: COLORS.danger }}>
              <AlertCircle size={13} /> {error}
            </div>
          )}

          <div className="flex items-center justify-end gap-2">
            <button onClick={onClose} className="px-3 py-2 rounded-lg text-sm font-medium" style={{ border: `1px solid ${COLORS.border}` }}>
              Chiudi
            </button>
            <button onClick={handleSave} disabled={saving} className="px-3 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-60" style={{ background: COLORS.primary }}>
              {saving ? "Salvataggio…" : "Salva template"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function TemplateSectionRow({ section, onToggle, onRename, onRemove }: { section: DraftSection; onToggle: (v: boolean) => void; onRename: (v: string) => void; onRemove: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: section.uid });
  return (
    <div
      ref={setNodeRef}
      className="flex items-center gap-2 p-2.5 rounded-xl"
      style={{ background: section.enabled ? COLORS.card : COLORS.subtle, border: `1px solid ${COLORS.border}`, opacity: isDragging ? 0.6 : 1, transform: CSS.Transform.toString(transform), transition }}
    >
      <button {...attributes} {...listeners} className="cursor-grab flex items-center" style={{ color: COLORS.inkSoft, touchAction: "none" }} title="Trascina per riordinare">
        <GripVertical size={15} />
      </button>
      <input
        value={section.label}
        onChange={(e) => onRename(e.target.value)}
        style={{ ...inputStyle, flex: 1, fontSize: 13, fontWeight: 600, border: "none", background: "transparent", padding: "2px 0" }}
      />
      <Switch checked={section.enabled} onChange={onToggle} label="" onText="Attiva" offText="Off" />
      <button onClick={onRemove} title="Rimuovi sezione" style={{ color: COLORS.danger }}>
        <Trash2 size={14} />
      </button>
    </div>
  );
}
