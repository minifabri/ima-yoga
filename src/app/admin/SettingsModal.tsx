"use client";

import { useState } from "react";
import { X, Plus, Trash2 } from "lucide-react";
import { Modal, Field, IconButton, inputStyle } from "./ui";
import { COLORS } from "./colors";
import { PALETTE } from "./utils";
import type { ClassItem, ClassType, Level, Settings } from "./types";

export function SettingsModal({
  classTypes,
  levels,
  classes,
  defaults,
  onClose,
  onAddType,
  onUpdateType,
  onRemoveType,
  onAddLevel,
  onRemoveLevel,
  onSaveDefaults,
}: {
  classTypes: ClassType[];
  levels: Level[];
  classes: ClassItem[];
  defaults: Settings;
  onClose: () => void;
  onAddType: (name: string, color: string) => Promise<void>;
  onUpdateType: (id: string, patch: Partial<Pick<ClassType, "color" | "packageEligible" | "defaultCapacity">>) => Promise<void>;
  onRemoveType: (id: string) => Promise<void>;
  onAddLevel: (name: string) => Promise<void>;
  onRemoveLevel: (id: string) => Promise<void>;
  onSaveDefaults: (defaults: Settings) => Promise<void>;
}) {
  const [def, setDef] = useState<Settings>(defaults);
  const [newTypeName, setNewTypeName] = useState("");
  const [newTypeColor, setNewTypeColor] = useState(PALETTE[0].hex);
  const [newLevelName, setNewLevelName] = useState("");
  const [editingTypeId, setEditingTypeId] = useState<string | null>(null);

  function addType() {
    const name = newTypeName.trim();
    if (!name) return;
    onAddType(name, newTypeColor);
    setNewTypeName("");
  }
  function addLevel() {
    const name = newLevelName.trim();
    if (!name) return;
    onAddLevel(name);
    setNewLevelName("");
  }
  function saveDefaults() {
    onSaveDefaults({
      time: def.time,
      capacity: Number(def.capacity) || 0,
      singleClassPrice: Number(def.singleClassPrice) || 0,
      packageSize: Number(def.packageSize) || 0,
      packagePrice: Number(def.packagePrice) || 0,
    });
  }

  return (
    <Modal onClose={onClose} width={480}>
      <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: `1px solid ${COLORS.border}` }}>
        <div style={{ fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 600, color: COLORS.heading }}>Impostazioni</div>
        <IconButton onClick={onClose}>
          <X size={18} />
        </IconButton>
      </div>

      <div className="p-5 overflow-y-auto" style={{ flex: 1 }}>
        <div className="mb-6">
          <div style={{ fontSize: 13, fontWeight: 600 }} className="mb-2">
            Predefiniti per una nuova classe
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Orario predefinito">
              <input type="time" value={def.time} onChange={(e) => setDef((d) => ({ ...d, time: e.target.value }))} onBlur={saveDefaults} style={inputStyle} />
            </Field>
            <Field label="Massimo iscritti predefinito">
              <input
                type="number"
                min={0}
                value={def.capacity}
                onChange={(e) => setDef((d) => ({ ...d, capacity: Number(e.target.value) }))}
                onBlur={saveDefaults}
                style={inputStyle}
              />
            </Field>
          </div>
        </div>

        <div className="mb-6">
          <div style={{ fontSize: 13, fontWeight: 600 }} className="mb-2">
            Prezzi e pacchetti
          </div>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <Field label="Prezzo lezione singola (€)">
              <input
                type="number"
                min={0}
                value={def.singleClassPrice}
                onChange={(e) => setDef((d) => ({ ...d, singleClassPrice: Number(e.target.value) }))}
                onBlur={saveDefaults}
                style={inputStyle}
              />
            </Field>
            <Field label="Lezioni nel pacchetto">
              <input
                type="number"
                min={1}
                value={def.packageSize}
                onChange={(e) => setDef((d) => ({ ...d, packageSize: Number(e.target.value) }))}
                onBlur={saveDefaults}
                style={inputStyle}
              />
            </Field>
          </div>
          <Field label="Prezzo pacchetto (€)">
            <input
              type="number"
              min={0}
              value={def.packagePrice}
              onChange={(e) => setDef((d) => ({ ...d, packagePrice: Number(e.target.value) }))}
              onBlur={saveDefaults}
              style={{ ...inputStyle, maxWidth: 160 }}
            />
          </Field>
          <div style={{ fontSize: 11.5, color: COLORS.inkSoft }} className="mt-1.5">
            Il pacchetto vale solo per le tipologie segnate come &quot;idonee al pacchetto&quot; qui sotto.
          </div>
        </div>

        <div className="mb-6">
          <div style={{ fontSize: 13, fontWeight: 600 }} className="mb-2">
            Tipologie di classe
          </div>
          <div className="flex flex-col gap-1.5 mb-3">
            {classTypes.map((t) => {
              const used = classes.filter((c) => c.typeId === t.id).length;
              const isEditing = editingTypeId === t.id;
              return (
                <div key={t.id} className="rounded-lg" style={{ border: `1px solid ${COLORS.border}` }}>
                  <div className="flex items-center justify-between px-2.5 py-2">
                    <button onClick={() => setEditingTypeId(isEditing ? null : t.id)} className="flex items-center gap-2 flex-1 text-left">
                      <span
                        style={{
                          width: 16,
                          height: 16,
                          borderRadius: 999,
                          background: t.color,
                          border: isEditing ? `2px solid ${COLORS.ink}` : "2px solid transparent",
                          boxShadow: `0 0 0 1px ${COLORS.border}`,
                          flexShrink: 0,
                        }}
                      />
                      <span style={{ fontSize: 13 }}>{t.name}</span>
                      {!t.packageEligible && <span style={{ fontSize: 10, color: COLORS.inkSoft, fontWeight: 600 }}>· fuori pacchetto</span>}
                    </button>
                    <button
                      onClick={() => onRemoveType(t.id)}
                      disabled={used > 0}
                      title={used > 0 ? `Usata in ${used} classi` : "Elimina"}
                      style={{ color: used > 0 ? COLORS.border : COLORS.danger }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                  {isEditing && (
                    <div className="px-2.5 pb-2.5">
                      <div className="flex items-center gap-1.5 flex-wrap mb-2.5">
                        {PALETTE.map((p) => (
                          <button
                            key={p.hex}
                            onClick={() => onUpdateType(t.id, { color: p.hex })}
                            title={p.name}
                            style={{
                              width: 18,
                              height: 18,
                              borderRadius: 999,
                              background: p.hex,
                              border: t.color === p.hex ? `2px solid ${COLORS.ink}` : "2px solid transparent",
                              boxShadow: `0 0 0 1px ${COLORS.border}`,
                            }}
                          />
                        ))}
                        <label
                          title="Scegli un colore personalizzato"
                          style={{ width: 18, height: 18, borderRadius: 999, overflow: "hidden", border: `1px dashed ${COLORS.inkSoft}`, position: "relative", cursor: "pointer" }}
                        >
                          <input
                            type="color"
                            value={t.color}
                            onChange={(e) => onUpdateType(t.id, { color: e.target.value })}
                            style={{ position: "absolute", inset: -4, width: 26, height: 26, border: "none", padding: 0, cursor: "pointer" }}
                          />
                        </label>
                      </div>
                      <div className="grid grid-cols-2 gap-2 items-end">
                        <Field label="Capienza predefinita">
                          <input
                            type="number"
                            min={0}
                            placeholder="usa quella generale"
                            value={t.defaultCapacity ?? ""}
                            onChange={(e) => onUpdateType(t.id, { defaultCapacity: e.target.value === "" ? null : Number(e.target.value) })}
                            style={{ ...inputStyle, fontSize: 12 }}
                          />
                        </Field>
                        <label className="flex items-center gap-1.5 mb-1" style={{ fontSize: 11.5, color: COLORS.inkSoft }}>
                          <input type="checkbox" checked={!!t.packageEligible} onChange={(e) => onUpdateType(t.id, { packageEligible: e.target.checked })} />
                          Idonea al pacchetto
                        </label>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
            {classTypes.length === 0 && <div style={{ fontSize: 12, color: COLORS.inkSoft }}>Nessuna tipologia ancora.</div>}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <input
              value={newTypeName}
              onChange={(e) => setNewTypeName(e.target.value)}
              placeholder="Es. Vinyasa"
              style={{ ...inputStyle, flex: 1, minWidth: 120 }}
              onKeyDown={(e) => e.key === "Enter" && addType()}
            />
            <div className="flex gap-1 flex-wrap items-center">
              {PALETTE.map((p) => (
                <button
                  key={p.hex}
                  onClick={() => setNewTypeColor(p.hex)}
                  title={p.name}
                  style={{
                    width: 18,
                    height: 18,
                    borderRadius: 999,
                    background: p.hex,
                    border: newTypeColor === p.hex ? `2px solid ${COLORS.ink}` : "2px solid transparent",
                    boxShadow: `0 0 0 1px ${COLORS.border}`,
                  }}
                />
              ))}
              <label
                title="Colore personalizzato"
                style={{ width: 18, height: 18, borderRadius: 999, overflow: "hidden", border: `1px dashed ${COLORS.inkSoft}`, position: "relative", cursor: "pointer" }}
              >
                <input
                  type="color"
                  value={newTypeColor}
                  onChange={(e) => setNewTypeColor(e.target.value)}
                  style={{ position: "absolute", inset: -4, width: 26, height: 26, border: "none", padding: 0, cursor: "pointer" }}
                />
              </label>
            </div>
            <IconButton onClick={addType} style={{ background: COLORS.primary, color: "#fff" }}>
              <Plus size={16} />
            </IconButton>
          </div>
        </div>

        <div>
          <div style={{ fontSize: 13, fontWeight: 600 }} className="mb-2">
            Livelli (a chi è indicata la classe)
          </div>
          <div className="flex flex-col gap-1.5 mb-3">
            {levels.map((l) => {
              const used = classes.filter((c) => c.levelId === l.id).length;
              return (
                <div key={l.id} className="flex items-center justify-between px-2.5 py-2 rounded-lg" style={{ border: `1px solid ${COLORS.border}` }}>
                  <span style={{ fontSize: 13 }}>{l.name}</span>
                  <button
                    onClick={() => onRemoveLevel(l.id)}
                    disabled={used > 0}
                    title={used > 0 ? `Usato in ${used} classi` : "Elimina"}
                    style={{ color: used > 0 ? COLORS.border : COLORS.danger }}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              );
            })}
            {levels.length === 0 && <div style={{ fontSize: 12, color: COLORS.inkSoft }}>Nessun livello ancora.</div>}
          </div>
          <div className="flex items-center gap-2">
            <input value={newLevelName} onChange={(e) => setNewLevelName(e.target.value)} placeholder="Es. Open level" style={{ ...inputStyle, flex: 1 }} onKeyDown={(e) => e.key === "Enter" && addLevel()} />
            <IconButton onClick={addLevel} style={{ background: COLORS.primary, color: "#fff" }}>
              <Plus size={16} />
            </IconButton>
          </div>
        </div>
      </div>
    </Modal>
  );
}
