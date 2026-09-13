"use client";

import { useEffect, useMemo, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { Plus, ArrowLeft, AlertCircle, Settings2, Trash2, User, Route } from "lucide-react";
import { COLORS, withAlpha } from "./colors";
import { Badge, Modal } from "./ui";
import { SequenceEditor } from "./SequenceEditor";
import { SequenceTemplateEditor } from "./SequenceTemplateEditor";
import { fetchSequences, deleteSequence, fetchPoseCatalog, fetchPoseCategories } from "./data";
import type { ClassType, ClientItem, PoseCatalogItem, PoseCategory, Sequence } from "./types";

export function SequencesView({ supabase, clients, classTypes }: { supabase: SupabaseClient; clients: ClientItem[]; classTypes: ClassType[] }) {
  const [sequences, setSequences] = useState<Sequence[]>([]);
  const [poseCatalog, setPoseCatalog] = useState<PoseCatalogItem[]>([]);
  const [poseCategories, setPoseCategories] = useState<PoseCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [editing, setEditing] = useState<Sequence | "new" | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [rowError, setRowError] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [managingTemplateFor, setManagingTemplateFor] = useState<ClassType | null>(null);

  useEffect(() => {
    Promise.all([fetchSequences(supabase), fetchPoseCatalog(supabase), fetchPoseCategories(supabase)])
      .then(([seqs, poses, cats]) => {
        setSequences(seqs);
        setPoseCatalog(poses);
        setPoseCategories(cats);
      })
      .catch(() => setLoadError(true))
      .finally(() => setLoading(false));
  }, [supabase]);

  const clientById = useMemo(() => Object.fromEntries(clients.map((c) => [c.id, c])), [clients]);
  const typeById = useMemo(() => Object.fromEntries(classTypes.map((t) => [t.id, t])), [classTypes]);

  function handleSaved(s: Sequence) {
    setSequences((cur) => (cur.some((x) => x.id === s.id) ? cur.map((x) => (x.id === s.id ? s : x)) : [s, ...cur]));
    setEditing(null);
  }
  function handleDeleted(id: string) {
    setSequences((cur) => cur.filter((s) => s.id !== id));
    setEditing(null);
  }
  function handleRowDelete(id: string) {
    setSequences((cur) => cur.filter((s) => s.id !== id));
    setConfirmDeleteId(null);
    deleteSequence(supabase, id).catch(() => setRowError("Errore nell'eliminazione della sequenza."));
  }

  const filtered = typeFilter === "all" ? sequences : sequences.filter((s) => s.classTypeId === typeFilter);
  const sorted = [...filtered].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

  if (editing) {
    return (
      <div>
        <button onClick={() => setEditing(null)} className="flex items-center gap-1.5 mb-4 text-sm font-medium" style={{ color: COLORS.inkSoft }}>
          <ArrowLeft size={15} /> Torna alle sequenze
        </button>
        <div style={{ fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 600, color: COLORS.heading }} className="mb-4">
          {editing === "new" ? "Nuova sequenza" : editing.name || "Sequenza"}
        </div>
        <SequenceEditor
          supabase={supabase}
          sequence={editing === "new" ? null : editing}
          classTypes={classTypes}
          clients={clients}
          poseCatalog={poseCatalog}
          poseCategories={poseCategories}
          onPoseCatalogUpdated={(saved) => setPoseCatalog((cur) => cur.map((p) => (p.id === saved.id ? saved : p)))}
          onSaved={handleSaved}
          onDeleted={handleDeleted}
          onClose={() => setEditing(null)}
        />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 600, color: COLORS.heading }}>Sequenze</div>
        <button
          onClick={() => setEditing("new")}
          disabled={classTypes.length === 0}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-60"
          style={{ background: COLORS.primary }}
        >
          <Plus size={15} /> Nuova sequenza
        </button>
      </div>

      <div className="mb-4" style={{ fontSize: 12.5, color: COLORS.inkSoft }}>
        Costruisci una sequenza personalizzata per un allievo (o una bozza senza allievo): scegli il tipo, attiva le sezioni, aggiungi posizioni dal catalogo e genera una scheda da condividere o stampare.
      </div>

      {classTypes.length > 0 && (
        <div className="flex items-center justify-between flex-wrap gap-2 mb-4">
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              onClick={() => setTypeFilter("all")}
              className="px-2.5 py-1.5 rounded-lg text-xs font-semibold"
              style={{ background: typeFilter === "all" ? COLORS.primary : COLORS.subtle, color: typeFilter === "all" ? "#fff" : COLORS.ink }}
            >
              Tutti i tipi
            </button>
            {classTypes.map((t) => (
              <button
                key={t.id}
                onClick={() => setTypeFilter(t.id)}
                className="px-2.5 py-1.5 rounded-lg text-xs font-semibold"
                style={{ background: typeFilter === t.id ? t.color : COLORS.subtle, color: typeFilter === t.id ? "#fff" : COLORS.ink }}
              >
                {t.name}
              </button>
            ))}
          </div>
          {typeFilter !== "all" && typeById[typeFilter] && (
            <button onClick={() => setManagingTemplateFor(typeById[typeFilter])} className="flex items-center gap-1.5 text-xs font-semibold" style={{ color: COLORS.primaryDark }}>
              <Settings2 size={13} /> Gestisci template sezioni
            </button>
          )}
        </div>
      )}

      {managingTemplateFor && (
        <Modal onClose={() => setManagingTemplateFor(null)} width={480}>
          <SequenceTemplateEditor supabase={supabase} classType={managingTemplateFor} onClose={() => setManagingTemplateFor(null)} />
        </Modal>
      )}

      {loadError && (
        <div className="mb-4 flex items-center gap-2 text-sm rounded-lg px-3 py-2" style={{ background: withAlpha(COLORS.danger, 10), color: COLORS.danger }}>
          <AlertCircle size={15} /> Errore nel caricamento delle sequenze salvate.
        </div>
      )}
      {rowError && (
        <div className="mb-4 flex items-center gap-2 text-sm rounded-lg px-3 py-2" style={{ background: withAlpha(COLORS.danger, 10), color: COLORS.danger }}>
          <AlertCircle size={15} /> {rowError}
        </div>
      )}

      {loading ? (
        <div style={{ fontSize: 13, color: COLORS.inkSoft }}>Caricamento…</div>
      ) : sorted.length === 0 ? (
        <div className="flex flex-col items-center justify-center text-center py-14" style={{ color: COLORS.inkSoft }}>
          <Route size={28} className="mb-2" />
          <div style={{ fontSize: 13.5 }}>Nessuna sequenza salvata finora.</div>
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {sorted.map((s) => {
            const activeCount = s.sections.filter((sec) => sec.enabled).reduce((sum, sec) => sum + sec.items.length, 0);
            const assignedClients = s.clientIds.map((id) => clientById[id]).filter((c): c is ClientItem => !!c);
            const personLabel = assignedClients.length > 0 ? assignedClients.map((c) => c.name).join(", ") : s.guestName || "Bozza senza allievo";
            const type = typeById[s.classTypeId];
            return (
              <div key={s.id} className="flex items-center gap-3 p-3.5 rounded-xl flex-wrap" style={{ background: COLORS.card, border: `1px solid ${COLORS.border}` }}>
                <button onClick={() => setEditing(s)} className="flex items-center gap-3 flex-1 text-left" style={{ minWidth: 160 }}>
                  <div style={{ flex: 1, minWidth: 160 }}>
                    <div className="flex items-center gap-1.5 flex-wrap mb-1">
                      <span style={{ fontSize: 14, fontWeight: 600 }}>{s.name || "Sequenza senza nome"}</span>
                      {type && <Badge color={type.color}>{type.name}</Badge>}
                    </div>
                    <div className="flex items-center gap-1" style={{ fontSize: 12, color: COLORS.inkSoft }}>
                      <User size={11} /> {personLabel} · {activeCount} posizioni attive
                    </div>
                  </div>
                </button>
                {confirmDeleteId === s.id ? (
                  <button onClick={() => handleRowDelete(s.id)} className="text-xs font-semibold px-2.5 py-1.5 rounded-lg text-white flex-shrink-0" style={{ background: COLORS.danger }}>
                    Conferma
                  </button>
                ) : (
                  <button onClick={() => setConfirmDeleteId(s.id)} title="Elimina sequenza" className="flex items-center justify-center rounded-lg flex-shrink-0" style={{ width: 30, height: 30, color: COLORS.inkSoft }}>
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
