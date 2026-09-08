"use client";

import { useEffect, useMemo, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { Plus, ArrowLeft, AlertCircle, Trash2, User, Route } from "lucide-react";
import { COLORS, withAlpha } from "./colors";
import { SequenceEditor } from "./SequenceEditor";
import { fetchAshtangaSequences, deleteAshtangaSequence } from "./data";
import { ALL_ASHTANGA_POSES } from "./ashtangaData";
import type { AshtangaSequence, ClientItem } from "./types";

export function SequencesView({ supabase, clients }: { supabase: SupabaseClient; clients: ClientItem[] }) {
  const [sequences, setSequences] = useState<AshtangaSequence[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [editing, setEditing] = useState<AshtangaSequence | "new" | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [rowError, setRowError] = useState("");

  useEffect(() => {
    fetchAshtangaSequences(supabase)
      .then(setSequences)
      .catch(() => setLoadError(true))
      .finally(() => setLoading(false));
  }, [supabase]);

  const clientById = useMemo(() => Object.fromEntries(clients.map((c) => [c.id, c])), [clients]);

  function handleSaved(s: AshtangaSequence) {
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
    deleteAshtangaSequence(supabase, id).catch(() => setRowError("Errore nell'eliminazione della sequenza."));
  }

  const sorted = [...sequences].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

  if (editing) {
    return (
      <div>
        <button
          onClick={() => setEditing(null)}
          className="flex items-center gap-1.5 mb-4 text-sm font-medium"
          style={{ color: COLORS.inkSoft }}
        >
          <ArrowLeft size={15} /> Torna alle sequenze
        </button>
        <div style={{ fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 600, color: COLORS.heading }} className="mb-4">
          {editing === "new" ? "Nuova sequenza" : editing.name || "Sequenza"}
        </div>
        <SequenceEditor
          supabase={supabase}
          sequence={editing === "new" ? null : editing}
          clients={clients}
          onSaved={handleSaved}
          onDeleted={handleDeleted}
          onClose={() => setEditing(null)}
        />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 600, color: COLORS.heading }}>Sequenze</div>
        <button
          onClick={() => setEditing("new")}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold text-white"
          style={{ background: COLORS.primary }}
        >
          <Plus size={15} /> Nuova sequenza
        </button>
      </div>

      <div className="mb-4" style={{ fontSize: 12.5, color: COLORS.inkSoft }}>
        Costruisci una sequenza Ashtanga personalizzata per un allievo: attiva o disattiva le posizioni, aggiungi note e genera una scheda da condividere o stampare.
      </div>

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
            const activeCount = ALL_ASHTANGA_POSES.length - s.disabledPoses.filter((p) => ALL_ASHTANGA_POSES.includes(p)).length;
            const client = s.clientId ? clientById[s.clientId] : null;
            const personLabel = client?.name || s.guestName || "Nessun allievo collegato";
            return (
              <div
                key={s.id}
                className="flex items-center gap-3 p-3.5 rounded-xl flex-wrap"
                style={{ background: COLORS.card, border: `1px solid ${COLORS.border}` }}
              >
                <button onClick={() => setEditing(s)} className="flex items-center gap-3 flex-1 text-left" style={{ minWidth: 160 }}>
                  <div style={{ flex: 1, minWidth: 160 }}>
                    <div className="flex items-center gap-1.5 flex-wrap" style={{ fontSize: 14, fontWeight: 600 }}>
                      {s.name || "Sequenza senza nome"}
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
                  <button
                    onClick={() => setConfirmDeleteId(s.id)}
                    title="Elimina sequenza"
                    className="flex items-center justify-center rounded-lg flex-shrink-0"
                    style={{ width: 30, height: 30, color: COLORS.inkSoft }}
                  >
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
