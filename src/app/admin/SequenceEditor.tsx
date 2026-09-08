"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import type { SupabaseClient } from "@supabase/supabase-js";
import { AlertCircle, Check, Printer, RotateCcw, Share2 } from "lucide-react";
import { COLORS } from "./colors";
import { Field, Modal, Switch, inputStyle } from "./ui";
import { saveAshtangaSequence, deleteAshtangaSequence } from "./data";
import { ASHTANGA_SECTIONS, POSE_ICON, type AshtangaSectionKey } from "./ashtangaData";
import type { AshtangaSequence, ClientItem } from "./types";

function buildSheetText(sections: { label: string; active: { name: string; note: string }[] }[], personLabel: string) {
  const lines = [personLabel ? `Sequenza per ${personLabel}` : "Sequenza"];
  sections.forEach((s) => {
    if (s.active.length === 0) return;
    lines.push("");
    lines.push(s.label.toUpperCase());
    s.active.forEach((p) => lines.push(`- ${p.name}${p.note ? `  (${p.note})` : ""}`));
  });
  return lines.join("\n");
}

export function SequenceEditor({
  supabase,
  sequence,
  clients,
  onSaved,
  onDeleted,
  onClose,
}: {
  supabase: SupabaseClient;
  sequence: AshtangaSequence | null;
  clients: ClientItem[];
  onSaved: (s: AshtangaSequence) => void;
  onDeleted?: (id: string) => void;
  onClose?: () => void;
}) {
  const [name, setName] = useState(sequence?.name ?? "");
  const [clientId, setClientId] = useState<string | null>(sequence?.clientId ?? null);
  const [guestName, setGuestName] = useState(sequence?.guestName ?? "");
  const [disabled, setDisabled] = useState<Set<string>>(new Set(sequence?.disabledPoses ?? []));
  const [notes, setNotes] = useState<Record<string, string>>(sequence?.notes ?? {});
  const [activeSection, setActiveSection] = useState<AshtangaSectionKey>(ASHTANGA_SECTIONS[0].key);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [showSheet, setShowSheet] = useState(false);
  const [copied, setCopied] = useState(false);
  const [canShare, setCanShare] = useState(false);

  useEffect(() => {
    // Rilevamento della Web Share API: deve avvenire dopo il mount (non nel
    // render) perché `navigator` non esiste durante il render lato server.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCanShare(typeof navigator !== "undefined" && typeof navigator.share === "function");
  }, []);

  const activeClient = clientId ? clients.find((c) => c.id === clientId) : null;
  const personLabel = activeClient?.name || guestName.trim();

  const sectionsWithState = useMemo(
    () =>
      ASHTANGA_SECTIONS.map((s) => ({
        ...s,
        active: s.poses.filter((p) => !disabled.has(p)).map((p) => ({ name: p, note: notes[p] || "" })),
      })),
    [disabled, notes]
  );
  const totalActive = sectionsWithState.reduce((sum, s) => sum + s.active.length, 0);

  function togglePose(poseName: string, enabled: boolean) {
    setDisabled((cur) => {
      const next = new Set(cur);
      if (enabled) next.delete(poseName);
      else next.add(poseName);
      return next;
    });
  }
  function setNote(poseName: string, text: string) {
    setNotes((cur) => ({ ...cur, [poseName]: text }));
  }
  function resetAll() {
    setDisabled(new Set());
    setNotes({});
  }

  async function handleSave() {
    setSaving(true);
    setError("");
    try {
      const saved = await saveAshtangaSequence(supabase, {
        id: sequence?.id,
        clientId,
        guestName: clientId ? "" : guestName.trim(),
        name: name.trim() || "Sequenza senza nome",
        disabledPoses: Array.from(disabled),
        notes,
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
      await deleteAshtangaSequence(supabase, sequence.id);
      onDeleted?.(sequence.id);
    } catch {
      setError("Errore nell'eliminazione.");
      setSaving(false);
    }
  }

  function handleCopy() {
    const text = buildSheetText(sectionsWithState, personLabel);
    navigator.clipboard
      .writeText(text)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1400);
      })
      .catch(() => {});
  }
  function handleShare() {
    const text = buildSheetText(sectionsWithState, personLabel);
    navigator.share({ title: personLabel ? `Sequenza per ${personLabel}` : "Sequenza Ashtanga", text }).catch(() => {});
  }
  function handlePrint() {
    window.print();
  }

  const currentSection = ASHTANGA_SECTIONS.find((s) => s.key === activeSection)!;

  return (
    <div>
      <div className="grid sm:grid-cols-2 gap-3 mb-4">
        <Field label="Nome sequenza">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Es. Sequenza base, Post-infortunio ginocchio" style={inputStyle} />
        </Field>
        <Field label="Allievo collegato">
          <select
            value={clientId ?? ""}
            onChange={(e) => setClientId(e.target.value || null)}
            style={inputStyle}
          >
            <option value="">Nessuno — nome libero</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </Field>
      </div>

      {!clientId && (
        <div className="mb-4">
          <Field label="Nome allievo (facoltativo)">
            <input value={guestName} onChange={(e) => setGuestName(e.target.value)} placeholder="nome allievo" style={inputStyle} />
          </Field>
        </div>
      )}

      <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
        <div className="flex flex-wrap gap-1.5">
          {ASHTANGA_SECTIONS.map((s) => {
            const count = s.poses.filter((p) => !disabled.has(p)).length;
            const isActive = s.key === activeSection;
            return (
              <button
                key={s.key}
                onClick={() => setActiveSection(s.key)}
                className="px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1"
                style={{ background: isActive ? COLORS.primary : COLORS.subtle, color: isActive ? "#fff" : COLORS.ink }}
              >
                {s.label} <span style={{ opacity: 0.75 }}>{count}/{s.poses.length}</span>
              </button>
            );
          })}
        </div>
        <button onClick={resetAll} className="flex items-center gap-1 text-xs font-medium" style={{ color: COLORS.inkSoft }}>
          <RotateCcw size={12} /> Reimposta tutto
        </button>
      </div>

      <div className="flex flex-col gap-1.5 mb-4">
        {currentSection.poses.map((poseName) => {
          const enabled = !disabled.has(poseName);
          return (
            <div
              key={poseName}
              className="flex items-center gap-3 p-2.5 rounded-xl"
              style={{ background: enabled ? COLORS.card : COLORS.subtle, border: `1px solid ${COLORS.border}`, opacity: enabled ? 1 : 0.6 }}
            >
              <Switch checked={enabled} onChange={(v) => togglePose(poseName, v)} label="" />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={POSE_ICON[poseName]} alt={poseName} width={40} height={40} style={{ borderRadius: 8, objectFit: "cover", background: COLORS.subtle, flexShrink: 0 }} />
              <div className="flex-1 min-w-0">
                <div style={{ fontSize: 13, fontWeight: 600 }}>{poseName}</div>
                <input
                  value={notes[poseName] || ""}
                  onChange={(e) => setNote(poseName, e.target.value)}
                  placeholder="nota (facoltativa)"
                  style={{ ...inputStyle, padding: "4px 8px", fontSize: 12, marginTop: 2 }}
                />
              </div>
            </div>
          );
        })}
      </div>

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
          <span style={{ fontSize: 12, color: COLORS.inkSoft }}>{totalActive} posizioni attive</span>
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
              <div style={{ fontSize: 13, color: COLORS.inkSoft }}>Nessuna posizione attiva: riattiva almeno un elemento della sequenza.</div>
            ) : (
              sectionsWithState.map((s) =>
                s.active.length === 0 ? null : (
                  <div key={s.key} className="mb-4">
                    <div style={{ fontSize: 11.5, fontWeight: 700, color: COLORS.primaryDark, textTransform: "uppercase", letterSpacing: 0.3 }} className="mb-1.5">
                      {s.label}
                    </div>
                    <div className="flex flex-col gap-1.5">
                      {s.active.map((p) => (
                        <div key={p.name} className="flex items-center gap-2.5" style={{ fontSize: 13, borderBottom: `1px dashed ${COLORS.border}`, paddingBottom: 6 }}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={POSE_ICON[p.name]} alt="" width={32} height={32} style={{ borderRadius: 6, objectFit: "cover", background: COLORS.subtle, flexShrink: 0 }} />
                          <div className="flex-1 flex items-center justify-between gap-2">
                            <span style={{ fontFamily: "var(--font-display)" }}>{p.name}</span>
                            {p.note && <span style={{ color: COLORS.inkSoft, fontSize: 12, textAlign: "right" }}>{p.note}</span>}
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
              <div id="ashtanga-print-sheet">
                <style>{`
                  @media screen { #ashtanga-print-sheet { display: none; } }
                  @media print {
                    body > *:not(#ashtanga-print-sheet) { display: none !important; }
                    #ashtanga-print-sheet { display: block !important; padding: 24px; max-width: 680px; margin: 0 auto; font-family: 'IBM Plex Sans', sans-serif; color: #2A2440; }
                    #ashtanga-print-sheet h1 { font-family: 'Fraunces', serif; font-size: 1.4rem; margin: 0 0 4px; }
                    #ashtanga-print-sheet .p-sub { color: #5C5470; font-size: 0.85rem; margin: 0 0 18px; }
                    #ashtanga-print-sheet .p-section-title { font-size: 0.78rem; font-weight: 600; color: #9C4FA0; margin: 20px 0 6px; text-transform: uppercase; }
                    #ashtanga-print-sheet .p-row { display: flex; align-items: center; gap: 12px; padding: 5px 0; border-bottom: 1px dashed #DCD3EC; break-inside: avoid; }
                    #ashtanga-print-sheet .p-thumb { width: 36px; height: 36px; border-radius: 6px; object-fit: cover; background: #DFD5EE; flex-shrink: 0; }
                    #ashtanga-print-sheet .p-text { display: flex; justify-content: space-between; gap: 14px; flex: 1; }
                    #ashtanga-print-sheet .p-note { color: #5C5470; font-size: 0.85rem; text-align: right; }
                  }
                `}</style>
                <h1>{personLabel ? `Sequenza per ${personLabel}` : "Sequenza Ashtanga"}</h1>
                <p className="p-sub">{new Date().toLocaleDateString("it-IT")}</p>
                {sectionsWithState.map((s) =>
                  s.active.length === 0 ? null : (
                    <div key={s.key}>
                      <div className="p-section-title">{s.label}</div>
                      {s.active.map((p) => (
                        <div key={p.name} className="p-row">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img className="p-thumb" src={POSE_ICON[p.name]} alt="" />
                          <div className="p-text">
                            <span>{p.name}</span>
                            {p.note && <span className="p-note">{p.note}</span>}
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
