"use client";

import { useState } from "react";
import { X, Trash2, Eye, EyeOff } from "lucide-react";
import { Modal, Field, inputStyle } from "./ui";
import { COLORS, withAlpha } from "./colors";
import { genId, dateKey } from "./utils";
import type { IndividualClassSlot } from "./types";

type ModalData = { mode: "new" } | { mode: "edit"; slot: IndividualClassSlot };

// Form minimale per uno slot proposto: solo data, ora, nota admin-only e
// bozza/pubblica — niente tipologia/livello/cliente, che entrano in gioco
// solo quando una richiesta viene accettata (PersonalClassFormModal).
export function IndividualSlotFormModal({
  data,
  onClose,
  onSave,
  onDelete,
}: {
  data: ModalData;
  onClose: () => void;
  onSave: (slot: IndividualClassSlot) => void;
  onDelete: (id: string) => void;
}) {
  const editing = data.mode === "edit";
  const base = editing ? data.slot : null;

  const [date, setDate] = useState(editing ? base!.date : dateKey(new Date()));
  const [time, setTime] = useState(editing ? base!.time : "09:00");
  const [notes, setNotes] = useState(editing ? base!.notes : "");
  const [published, setPublished] = useState(editing ? base!.published : false);

  function handleSave() {
    if (!date || !time) return;
    onSave({
      id: editing ? base!.id : genId(),
      date,
      time,
      notes: notes.trim(),
      published,
      bookedClassId: editing ? base!.bookedClassId : null,
      createdAt: editing ? base!.createdAt : new Date().toISOString(),
    });
  }

  return (
    <Modal onClose={onClose} width={380}>
      <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: `1px solid ${COLORS.border}` }}>
        <div style={{ fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 600, color: COLORS.heading }}>
          {editing ? "Modifica slot" : "Nuovo slot disponibile"}
        </div>
        <button onClick={onClose} className="flex items-center justify-center" style={{ width: 36, height: 36 }}>
          <X size={18} />
        </button>
      </div>

      <div className="p-5 overflow-y-auto" style={{ flex: 1 }}>
        <button
          type="button"
          onClick={() => setPublished((v) => !v)}
          className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium mb-4"
          style={{
            border: `1px solid ${withAlpha(published ? COLORS.success : COLORS.gold, 33)}`,
            color: published ? COLORS.success : COLORS.gold,
            background: withAlpha(published ? COLORS.success : COLORS.gold, 8),
          }}
        >
          {published ? <Eye size={15} /> : <EyeOff size={15} />}
          <span className="flex-1 text-left">{published ? "Pubblicato — proponibile ai clienti" : "Bozza — visibile solo a te"}</span>
          <span style={{ fontSize: 11, fontWeight: 700, opacity: 0.8 }}>{published ? "Rendi bozza" : "Pubblica"}</span>
        </button>

        <div className="grid grid-cols-2 gap-3 mb-3">
          <Field label="Data">
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={inputStyle} />
          </Field>
          <Field label="Orario">
            <input type="time" value={time} onChange={(e) => setTime(e.target.value)} style={inputStyle} />
          </Field>
        </div>

        <Field label="Nota">
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            placeholder="Facoltativa, solo per te"
            style={{ ...inputStyle, resize: "vertical" }}
          />
        </Field>
      </div>

      <div className="flex items-center justify-between px-5 py-4" style={{ borderTop: `1px solid ${COLORS.border}` }}>
        {editing ? (
          <button onClick={() => onDelete(base!.id)} className="flex items-center gap-1.5 text-sm font-medium" style={{ color: COLORS.danger }}>
            <Trash2 size={14} /> <span className="hidden sm:inline">Elimina</span>
          </button>
        ) : (
          <span />
        )}
        <div className="flex gap-2">
          <button onClick={onClose} className="px-3.5 py-2 rounded-lg text-sm font-medium" style={{ border: `1px solid ${COLORS.border}` }}>
            Annulla
          </button>
          <button onClick={handleSave} className="px-3.5 py-2 rounded-lg text-sm font-semibold text-white" style={{ background: COLORS.primary }}>
            Salva
          </button>
        </div>
      </div>
    </Modal>
  );
}
