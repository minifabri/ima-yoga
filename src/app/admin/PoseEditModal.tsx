"use client";

import { useRef, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { COLORS } from "./colors";
import { Field, Modal, inputStyle } from "./ui";
import { savePose, deletePoseThumbnail } from "./data";
import { PoseThumbnailGenerator, type PoseThumbnailGeneratorHandle } from "./PoseThumbnailGenerator";
import { slugify } from "./utils";
import type { PoseCatalogItem, PoseCategory } from "./types";

// Stesso form di modifica di PoseCatalogView.tsx, estratto in un componente
// autonomo per poterlo aprire anche dall'editor sequenza (doppio click su
// una posizione collegata al catalogo): qui si modifica sempre una posizione
// già esistente, mai una nuova, e non c'è azione di eliminazione — cancellare
// una posizione usata altrove mentre si lavora su una sequenza è un compito
// che resta al Catalogo.
export function PoseEditModal({
  supabase,
  pose,
  poseCatalog,
  categories,
  onSaved,
  onClose,
}: {
  supabase: SupabaseClient;
  pose: PoseCatalogItem;
  poseCatalog: PoseCatalogItem[];
  categories: PoseCategory[];
  onSaved: (saved: PoseCatalogItem) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState<Omit<PoseCatalogItem, "id">>({
    macro: pose.macro,
    name: pose.name,
    nameIt: pose.nameIt,
    nameEn: pose.nameEn,
    description: pose.description,
    categoryId: pose.categoryId,
    tags: pose.tags,
    imageUrl: pose.imageUrl,
    parentPoseId: pose.parentPoseId,
    variantLabel: pose.variantLabel,
  });
  const [tagsInput, setTagsInput] = useState(pose.tags.join(", "));
  const [showManualImageUrl, setShowManualImageUrl] = useState(false);
  const [error, setError] = useState("");
  const thumbnailGeneratorRef = useRef<PoseThumbnailGeneratorHandle>(null);

  const poseById = Object.fromEntries(poseCatalog.map((p) => [p.id, p]));
  const isVariant = Boolean(draft.parentPoseId);
  const parentPose = draft.parentPoseId ? poseById[draft.parentPoseId] : undefined;
  const hasChildren = poseCatalog.some((p) => p.parentPoseId === pose.id);
  const categoriesForMacro = categories.filter((c) => c.macro === draft.macro);
  const parentCandidates = poseCatalog.filter((p) => p.macro === draft.macro && !p.parentPoseId && p.id !== pose.id).sort((a, b) => a.name.localeCompare(b.name));
  const previewName = isVariant ? draft.name || [parentPose?.name, draft.variantLabel].filter(Boolean).join(" ") || "—" : null;

  async function handleRemoveOwnImage() {
    const url = draft.imageUrl;
    if (!url) return;
    setDraft((d) => ({ ...d, imageUrl: null }));
    try {
      await deletePoseThumbnail(supabase, url);
    } catch {
      // la rimozione dal form ha già avuto effetto; un file eventualmente
      // non cancellato dallo storage non blocca il resto del lavoro.
    }
  }

  async function handleSave() {
    setError("");
    const name = draft.name.trim();
    if (!isVariant && !name) {
      setError("Il nome della posizione è obbligatorio.");
      return;
    }
    if (isVariant && !name && !draft.variantLabel.trim() && !draft.nameIt.trim()) {
      setError("Indica almeno un suffisso o un nome per la variante.");
      return;
    }
    const tags = tagsInput
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    try {
      const saved = await savePose(supabase, { id: pose.id, ...draft, name, variantLabel: draft.variantLabel.trim(), tags });
      onSaved(saved);
    } catch {
      setError("Errore nel salvataggio della posizione.");
    }
  }

  return (
    <Modal onClose={onClose} width={560}>
      <div className="p-4 overflow-y-auto" style={{ flex: 1 }}>
        <div className="mb-3" style={{ fontFamily: "var(--font-display)", fontSize: 17, fontWeight: 600, color: COLORS.heading }}>
          Modifica posizione
        </div>

        <div className="mb-3">
          <Field label="Variante di (facoltativo)">
            <select
              value={draft.parentPoseId ?? ""}
              onChange={(e) => setDraft((d) => ({ ...d, parentPoseId: e.target.value || null }))}
              disabled={hasChildren}
              style={inputStyle}
            >
              <option value="">Nessuna, è una posizione base</option>
              {parentCandidates.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </Field>
          {hasChildren && (
            <div style={{ fontSize: 11, color: COLORS.inkSoft }} className="mt-1">
              Questa posizione ha già delle varianti collegate: non può a sua volta essere una variante.
            </div>
          )}
        </div>

        {isVariant && (
          <>
            <Field label="Suffisso (es. «preparazione», «gamba su»)">
              <input value={draft.variantLabel} onChange={(e) => setDraft((d) => ({ ...d, variantLabel: e.target.value }))} placeholder="preparazione" style={inputStyle} />
            </Field>
            <div className="mb-3" style={{ fontSize: 11.5, color: COLORS.inkSoft }}>
              Nome mostrato: <strong style={{ color: COLORS.ink }}>{previewName}</strong> — ereditato dal padre, salvo che tu non lo sovrascriva qui sotto.
            </div>
          </>
        )}

        <div className="grid sm:grid-cols-2 gap-3 mb-3">
          <Field label={isVariant ? "Nome sanscrito (sovrascrive quello ereditato)" : "Nome (sanscrito)"}>
            <input
              value={draft.name}
              onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
              placeholder={isVariant ? "lascia vuoto per ereditare" : "Es. Adho Mukha Svanasana"}
              style={inputStyle}
            />
          </Field>
          <Field label="Categoria">
            <select value={draft.categoryId ?? ""} onChange={(e) => setDraft((d) => ({ ...d, categoryId: e.target.value || null }))} style={inputStyle}>
              <option value="">Nessuna categoria</option>
              {categoriesForMacro.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <div className="grid sm:grid-cols-2 gap-3 mb-3">
          <Field label={isVariant ? "Nome italiano (sovrascrive quello ereditato)" : "Nome italiano (facoltativo, per la ricerca)"}>
            <input
              value={draft.nameIt}
              onChange={(e) => setDraft((d) => ({ ...d, nameIt: e.target.value }))}
              placeholder={isVariant ? "lascia vuoto per ereditare" : "Es. Cane a testa in giù"}
              style={inputStyle}
            />
          </Field>
          <Field label={isVariant ? "Nome inglese (sovrascrive quello ereditato)" : "Nome inglese (facoltativo, per la ricerca)"}>
            <input
              value={draft.nameEn}
              onChange={(e) => setDraft((d) => ({ ...d, nameEn: e.target.value }))}
              placeholder={isVariant ? "lascia vuoto per ereditare" : "Es. Downward Facing Dog"}
              style={inputStyle}
            />
          </Field>
        </div>
        <div className="mb-3">
          <Field label="Tag (separati da virgola)">
            <input value={tagsInput} onChange={(e) => setTagsInput(e.target.value)} placeholder="es. principianti, spalle, apertura anche" style={inputStyle} />
          </Field>
        </div>

        {draft.imageUrl ? (
          <div className="flex items-center gap-2 mb-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={draft.imageUrl} alt="" width={40} height={40} style={{ borderRadius: 8, objectFit: "cover", background: COLORS.subtle, flexShrink: 0 }} />
            <button onClick={() => thumbnailGeneratorRef.current?.loadExisting()} className="text-xs font-medium" style={{ color: COLORS.primaryDark }}>
              Modifica
            </button>
            <button onClick={handleRemoveOwnImage} className="text-xs font-medium" style={{ color: COLORS.danger }}>
              Rimuovi immagine
            </button>
          </div>
        ) : (
          isVariant &&
          parentPose?.imageUrl && (
            <div className="mb-3" style={{ fontSize: 11, color: COLORS.inkSoft }}>
              Senza immagine propria, eredita quella della posizione principale.
            </div>
          )
        )}
        <div className="mb-3">
          <PoseThumbnailGenerator
            ref={thumbnailGeneratorRef}
            supabase={supabase}
            poseSlug={slugify(draft.name || previewName || "posa")}
            existingImageUrl={draft.imageUrl}
            onGenerated={(url) => setDraft((d) => ({ ...d, imageUrl: url }))}
          />
        </div>

        <button type="button" onClick={() => setShowManualImageUrl((v) => !v)} className="mb-3" style={{ fontSize: 11, color: COLORS.inkSoft }}>
          {showManualImageUrl ? "Nascondi" : "Opzioni avanzate: inserisci un URL immagine a mano"}
        </button>
        {showManualImageUrl && (
          <div className="mb-3">
            <Field label="Immagine (percorso o URL)">
              <input value={draft.imageUrl ?? ""} onChange={(e) => setDraft((d) => ({ ...d, imageUrl: e.target.value || null }))} placeholder="/asanas/mia-posa.png" style={inputStyle} />
            </Field>
          </div>
        )}
        <div className="grid sm:grid-cols-2 gap-3 mb-3">
          <Field label="Descrizione (facoltativa)">
            <input value={draft.description} onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))} style={inputStyle} />
          </Field>
        </div>

        {error && (
          <div className="mb-3" style={{ fontSize: 12, color: COLORS.danger }}>
            {error}
          </div>
        )}

        <div className="flex items-center gap-2">
          <button onClick={handleSave} className="px-3 py-2 rounded-lg text-sm font-semibold text-white" style={{ background: COLORS.primary }}>
            Salva posizione
          </button>
          <button onClick={onClose} className="px-3 py-2 rounded-lg text-sm font-medium" style={{ border: `1px solid ${COLORS.border}` }}>
            Annulla
          </button>
        </div>
      </div>
    </Modal>
  );
}
