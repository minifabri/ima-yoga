"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { AlertCircle, ChevronDown, ChevronRight, LayoutGrid, List, Pencil, Plus, Search, Tag, Trash2, Upload } from "lucide-react";
import { COLORS, withAlpha } from "./colors";
import { Field, IconButton, Modal, inputStyle } from "./ui";
import { fetchPoseCatalog, savePose, deletePose, deletePoseThumbnail, fetchPoseCategories, savePoseCategory, deletePoseCategory } from "./data";
import { PoseBulkImportModal } from "./PoseBulkImport";
import { PoseThumbnailGenerator } from "./PoseThumbnailGenerator";
import { poseDisplayName, poseDisplayNameIt, poseDisplayImage } from "./poseDisplay";
import type { PoseCatalogItem, PoseCategory, PoseMacro } from "./types";

function emptyDraft(macro: PoseMacro): Omit<PoseCatalogItem, "id"> {
  return { macro, name: "", nameIt: "", nameEn: "", description: "", categoryId: null, tags: [], imageUrl: null, parentPoseId: null, variantLabel: "" };
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function PoseCatalogView({ supabase }: { supabase: SupabaseClient }) {
  const [poses, setPoses] = useState<PoseCatalogItem[]>([]);
  const [categories, setCategories] = useState<PoseCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [macro, setMacro] = useState<PoseMacro>("asana");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [query, setQuery] = useState("");
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [editingId, setEditingId] = useState<string | "new" | null>(null);
  const [draft, setDraft] = useState<Omit<PoseCatalogItem, "id">>(emptyDraft("asana"));
  const [tagsInput, setTagsInput] = useState("");
  const [newCategoryName, setNewCategoryName] = useState("");
  const [error, setError] = useState("");
  const [showImport, setShowImport] = useState(false);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [showManualImageUrl, setShowManualImageUrl] = useState(false);
  const [tagFilter, setTagFilter] = useState<string[]>([]);
  const [showAllTags, setShowAllTags] = useState(false);
  const [showManageCategories, setShowManageCategories] = useState(false);

  function toggleTagFilter(tag: string) {
    setTagFilter((cur) => (cur.includes(tag) ? cur.filter((t) => t !== tag) : [...cur, tag]));
  }

  function toggleExpanded(id: string) {
    setExpandedIds((cur) => {
      const next = new Set(cur);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  useEffect(() => {
    Promise.all([fetchPoseCatalog(supabase), fetchPoseCategories(supabase)])
      .then(([p, c]) => {
        setPoses(p);
        setCategories(c);
      })
      .catch(() => setLoadError(true))
      .finally(() => setLoading(false));
  }, [supabase]);

  const categoriesForMacro = useMemo(() => categories.filter((c) => c.macro === macro), [categories, macro]);
  const categoryById = useMemo(() => Object.fromEntries(categories.map((c) => [c.id, c])), [categories]);
  const poseById = useMemo(() => Object.fromEntries(poses.map((p) => [p.id, p])), [poses]);

  const hasQuery = query.trim().length > 0;

  // Ordinati per uso (i più frequenti prima): sono i più rilevanti da mostrare
  // subito, il resto si vede solo espandendo.
  const allTags = useMemo(() => {
    const counts = new Map<string, number>();
    for (const p of poses) if (p.macro === macro) for (const t of p.tags) counts.set(t, (counts.get(t) ?? 0) + 1);
    return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([t]) => t);
  }, [poses, macro]);
  const TAG_PREVIEW_COUNT = 10;
  const visibleTags = showAllTags ? allTags : allTags.slice(0, TAG_PREVIEW_COUNT);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return poses
      .filter((p) => p.macro === macro)
      .filter((p) => categoryFilter === "all" || p.categoryId === categoryFilter)
      .filter((p) => tagFilter.length === 0 || p.tags.some((t) => tagFilter.includes(t)))
      .filter((p) => {
        if (!q) return true;
        const parent = p.parentPoseId ? poseById[p.parentPoseId] : undefined;
        const displayName = poseDisplayName(p, parent);
        const displayNameIt = poseDisplayNameIt(p, parent);
        return (
          displayName.toLowerCase().includes(q) ||
          displayNameIt.toLowerCase().includes(q) ||
          p.nameEn.toLowerCase().includes(q) ||
          p.tags.some((t) => t.toLowerCase().includes(q))
        );
      })
      .sort((a, b) => poseDisplayName(a, undefined).localeCompare(poseDisplayName(b, undefined)));
  }, [poses, macro, categoryFilter, tagFilter, query, poseById]);

  // Fuori dalla ricerca, le varianti si annidano sotto la loro posizione base
  // invece di comparire come righe indipendenti (indipendentemente dal filtro
  // categoria, che si applica solo alla posizione base mostrata).
  const topLevelFiltered = useMemo(() => (hasQuery ? filtered : filtered.filter((p) => !p.parentPoseId)), [filtered, hasQuery]);

  const variantsByParent = useMemo(() => {
    const map = new Map<string, PoseCatalogItem[]>();
    poses
      .filter((p) => p.macro === macro && p.parentPoseId)
      .forEach((p) => {
        const arr = map.get(p.parentPoseId as string) ?? [];
        arr.push(p);
        map.set(p.parentPoseId as string, arr);
      });
    map.forEach((arr) => arr.sort((a, b) => poseDisplayName(a, poseById[a.parentPoseId as string]).localeCompare(poseDisplayName(b, poseById[b.parentPoseId as string]))));
    return map;
  }, [poses, macro, poseById]);

  const editFormRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (editingId) editFormRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [editingId]);

  function startNew(parentPoseId: string | null = null) {
    setDraft({ ...emptyDraft(macro), parentPoseId });
    setTagsInput("");
    setShowManualImageUrl(false);
    setEditingId("new");
  }
  function startEdit(p: PoseCatalogItem) {
    setDraft({
      macro: p.macro,
      name: p.name,
      nameIt: p.nameIt,
      nameEn: p.nameEn,
      description: p.description,
      categoryId: p.categoryId,
      tags: p.tags,
      imageUrl: p.imageUrl,
      parentPoseId: p.parentPoseId,
      variantLabel: p.variantLabel,
    });
    setTagsInput(p.tags.join(", "));
    setShowManualImageUrl(false);
    setEditingId(p.id);
  }

  function renderEditForm() {
    const isVariant = Boolean(draft.parentPoseId);
    const parentPose = draft.parentPoseId ? poseById[draft.parentPoseId] : undefined;
    const hasChildren = editingId !== "new" && editingId !== null && poses.some((p) => p.parentPoseId === editingId);
    const parentCandidates = poses
      .filter((p) => p.macro === draft.macro && !p.parentPoseId && p.id !== editingId)
      .sort((a, b) => a.name.localeCompare(b.name));
    const previewName = isVariant ? draft.name || [parentPose?.name, draft.variantLabel].filter(Boolean).join(" ") || "—" : null;
    return (
      <div
        ref={editFormRef}
        className="mt-1.5 mb-1.5 p-3.5 rounded-xl"
        style={{ background: withAlpha(isVariant ? COLORS.gold : COLORS.primary, 6), border: `1.5px solid ${isVariant ? COLORS.gold : COLORS.primary}` }}
      >
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
            supabase={supabase}
            poseSlug={slugify(draft.name || previewName || "posa")}
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
        <div className="flex items-center gap-2">
          <button onClick={handleSaveDraft} className="px-3 py-2 rounded-lg text-sm font-semibold text-white" style={{ background: COLORS.primary }}>
            Salva posizione
          </button>
          <button onClick={() => setEditingId(null)} className="px-3 py-2 rounded-lg text-sm font-medium" style={{ border: `1px solid ${COLORS.border}` }}>
            Annulla
          </button>
        </div>
      </div>
    );
  }

  // Rimuove SOLO l'immagine propria della posizione in modifica: se sta
  // mostrando un'immagine ereditata dal padre (draft.imageUrl è vuoto), non
  // c'è niente da eliminare dallo storage — il file del padre resta intatto.
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

  async function handleSaveDraft() {
    setError("");
    const isVariant = Boolean(draft.parentPoseId);
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
      const saved = await savePose(supabase, {
        id: editingId === "new" ? undefined : (editingId ?? undefined),
        ...draft,
        name,
        variantLabel: draft.variantLabel.trim(),
        tags,
      });
      setPoses((cur) => (cur.some((p) => p.id === saved.id) ? cur.map((p) => (p.id === saved.id ? saved : p)) : [...cur, saved]));
      setEditingId(null);
    } catch {
      setError("Errore nel salvataggio della posizione.");
    }
  }

  async function handleDeletePose(id: string) {
    setPoses((cur) => cur.filter((p) => p.id !== id));
    try {
      await deletePose(supabase, id);
    } catch {
      setError("Errore nell'eliminazione della posizione.");
    }
  }

  async function handleAddCategory() {
    const name = newCategoryName.trim();
    if (!name) return;
    try {
      const created = await savePoseCategory(supabase, { macro, name, position: categoriesForMacro.length });
      setCategories((cur) => [...cur, created]);
      setNewCategoryName("");
    } catch {
      setError("Errore nella creazione della categoria.");
    }
  }
  async function handleDeleteCategory(id: string) {
    const used = poses.some((p) => p.categoryId === id);
    if (used) return;
    setCategories((cur) => cur.filter((c) => c.id !== id));
    try {
      await deletePoseCategory(supabase, id);
    } catch {
      setError("Errore nell'eliminazione della categoria.");
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 600, color: COLORS.heading }}>Catalogo</div>
        <div className="flex rounded-lg overflow-hidden" style={{ border: `1px solid ${COLORS.border}` }}>
          <button
            onClick={() => setViewMode("list")}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium"
            style={{ background: viewMode === "list" ? COLORS.primary : "transparent", color: viewMode === "list" ? "#fff" : COLORS.ink }}
          >
            <List size={13} /> Elenco
          </button>
          <button
            onClick={() => setViewMode("grid")}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium"
            style={{ background: viewMode === "grid" ? COLORS.primary : "transparent", color: viewMode === "grid" ? "#fff" : COLORS.ink }}
          >
            <LayoutGrid size={13} /> Griglia
          </button>
        </div>
      </div>
      <div className="mb-4" style={{ fontSize: 12.5, color: COLORS.inkSoft }}>
        Le posizioni (asana) e le tecniche (pranayama) usate nel costruttore di sequenze. Categorizzale e aggiungi tag per trovarle più facilmente durante la creazione di una sequenza.
      </div>

      <div className="flex items-center gap-1.5 mb-4">
        <button onClick={() => setMacro("asana")} className="px-3 py-1.5 rounded-lg text-xs font-semibold" style={{ background: macro === "asana" ? COLORS.primary : COLORS.subtle, color: macro === "asana" ? "#fff" : COLORS.ink }}>
          Asana
        </button>
        <button onClick={() => setMacro("pranayama")} className="px-3 py-1.5 rounded-lg text-xs font-semibold" style={{ background: macro === "pranayama" ? COLORS.primary : COLORS.subtle, color: macro === "pranayama" ? "#fff" : COLORS.ink }}>
          Pranayama
        </button>
      </div>

      {loadError && (
        <div className="mb-4 flex items-center gap-2 text-sm rounded-lg px-3 py-2" style={{ background: withAlpha(COLORS.danger, 10), color: COLORS.danger }}>
          <AlertCircle size={15} /> Errore nel caricamento del catalogo.
        </div>
      )}
      {error && (
        <div className="mb-4 flex items-center gap-2 text-sm rounded-lg px-3 py-2" style={{ background: withAlpha(COLORS.danger, 10), color: COLORS.danger }}>
          <AlertCircle size={15} /> {error}
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-5 mb-4">
        <div>
          <div className="flex items-center justify-between mb-2">
            <div style={{ fontSize: 12, fontWeight: 600, color: COLORS.inkSoft }}>Categorie {macro === "asana" ? "asana" : "pranayama"}</div>
            <button onClick={() => setShowManageCategories((v) => !v)} style={{ fontSize: 11, fontWeight: 600, color: COLORS.primaryDark }}>
              {showManageCategories ? "Fatto" : "Gestisci categorie"}
            </button>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setCategoryFilter("all")}
              className="rounded-lg font-semibold"
              style={{ fontSize: 13, padding: "7px 15px", background: categoryFilter === "all" ? COLORS.primary : COLORS.subtle, color: categoryFilter === "all" ? "#fff" : COLORS.ink }}
            >
              Tutte
            </button>
            {categoriesForMacro.map((c) => (
              <button
                key={c.id}
                onClick={() => setCategoryFilter(c.id)}
                className="rounded-lg font-semibold"
                style={{ fontSize: 13, padding: "7px 15px", background: categoryFilter === c.id ? COLORS.primary : COLORS.subtle, color: categoryFilter === c.id ? "#fff" : COLORS.ink }}
              >
                {c.name}
              </button>
            ))}
          </div>

          {showManageCategories && (
            <div className="mt-3 p-3 rounded-lg" style={{ background: COLORS.subtle }}>
              <div className="flex flex-col gap-1.5 mb-2">
                {categoriesForMacro.map((c) => {
                  const used = poses.some((p) => p.categoryId === c.id);
                  return (
                    <div key={c.id} className="flex items-center justify-between">
                      <span style={{ fontSize: 12.5, color: COLORS.ink }}>{c.name}</span>
                      <button onClick={() => handleDeleteCategory(c.id)} disabled={used} title={used ? "In uso" : "Elimina categoria"} style={{ color: used ? COLORS.border : COLORS.danger }}>
                        <Trash2 size={13} />
                      </button>
                    </div>
                  );
                })}
                {categoriesForMacro.length === 0 && <div style={{ fontSize: 12, color: COLORS.inkSoft }}>Nessuna categoria ancora.</div>}
              </div>
              <div className="flex items-center gap-2">
                <input
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder="Nuova categoria"
                  style={{ ...inputStyle, background: COLORS.card, fontSize: 12 }}
                  onKeyDown={(e) => e.key === "Enter" && handleAddCategory()}
                />
                <IconButton onClick={handleAddCategory} style={{ background: COLORS.card, flexShrink: 0 }}>
                  <Plus size={14} />
                </IconButton>
              </div>
            </div>
          )}
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <div style={{ fontSize: 12, fontWeight: 600, color: COLORS.inkSoft }}>Tag</div>
            {tagFilter.length > 0 && (
              <button onClick={() => setTagFilter([])} style={{ fontSize: 11, fontWeight: 600, color: COLORS.inkSoft }}>
                Azzera
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {allTags.length === 0 ? (
              <div style={{ fontSize: 12, color: COLORS.inkSoft }}>Nessun tag ancora.</div>
            ) : (
              visibleTags.map((t) => {
                const active = tagFilter.includes(t);
                return (
                  <button
                    key={t}
                    onClick={() => toggleTagFilter(t)}
                    className="rounded-full"
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      padding: "4px 11px",
                      border: `1px solid ${active ? COLORS.primary : COLORS.border}`,
                      background: active ? COLORS.primary : "transparent",
                      color: active ? "#fff" : COLORS.inkSoft,
                    }}
                  >
                    {t}
                  </button>
                );
              })
            )}
            {allTags.length > TAG_PREVIEW_COUNT && (
              <button
                onClick={() => setShowAllTags((v) => !v)}
                className="rounded-full"
                style={{ fontSize: 11, fontWeight: 600, padding: "4px 11px", color: COLORS.primaryDark }}
              >
                {showAllTags ? "Mostra meno" : `+${allTags.length - TAG_PREVIEW_COUNT} altri`}
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <div className="relative flex-1" style={{ minWidth: 200 }}>
          <Search size={14} style={{ position: "absolute", left: 10, top: 10, color: COLORS.inkSoft }} />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Cerca per nome o tag…" style={{ ...inputStyle, paddingLeft: 30 }} />
        </div>
        <button onClick={() => setShowImport(true)} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium" style={{ border: `1px solid ${COLORS.border}` }}>
          <Upload size={15} /> Importa CSV
        </button>
        <button onClick={() => startNew()} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold text-white" style={{ background: COLORS.primary }}>
          <Plus size={15} /> Nuova posizione
        </button>
      </div>

      {showImport && (
        <PoseBulkImportModal
          supabase={supabase}
          defaultMacro={macro}
          categories={categories}
          onClose={() => setShowImport(false)}
          onImported={(newPoses, newCategories) => {
            setPoses((cur) => [...cur, ...newPoses]);
            setCategories((cur) => [...cur, ...newCategories]);
            setShowImport(false);
          }}
        />
      )}

      {editingId === "new" && draft.parentPoseId === null && viewMode === "list" && renderEditForm()}

      {loading ? (
        <div style={{ fontSize: 13, color: COLORS.inkSoft }}>Caricamento…</div>
      ) : topLevelFiltered.length === 0 ? (
        <div style={{ fontSize: 13, color: COLORS.inkSoft }} className="py-8 text-center">
          Nessuna posizione trovata.
        </div>
      ) : viewMode === "list" ? (
        <div className="flex flex-col gap-1.5">
          {topLevelFiltered.map((p) => {
            const variants = hasQuery ? [] : variantsByParent.get(p.id) ?? [];
            const expanded = hasQuery || expandedIds.has(p.id);
            return (
              <div key={p.id}>
                {renderPoseRow(
                  p,
                  undefined,
                  () => {
                    setExpandedIds((cur) => new Set(cur).add(p.id));
                    startNew(p.id);
                  },
                  variants.length > 0 && !hasQuery ? { count: variants.length, expanded, onToggle: () => toggleExpanded(p.id) } : undefined
                )}
                {editingId === p.id && renderEditForm()}
                {expanded &&
                  variants.map((v) => (
                    <div key={v.id} className="ml-6 mt-1.5">
                      {renderPoseRow(v, p)}
                      {editingId === v.id && renderEditForm()}
                    </div>
                  ))}
                {editingId === "new" && draft.parentPoseId === p.id && <div className="ml-6 mt-1.5">{renderEditForm()}</div>}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(230px, 1fr))" }}>
          {topLevelFiltered.map((p) => renderPoseCard(p, hasQuery ? [] : variantsByParent.get(p.id) ?? []))}
        </div>
      )}

      {viewMode === "grid" && editingId !== null && (
        <Modal onClose={() => setEditingId(null)} width={560}>
          <div className="p-4 overflow-y-auto" style={{ flex: 1 }}>
            {renderEditForm()}
          </div>
        </Modal>
      )}
    </div>
  );

  function renderPoseRow(
    p: PoseCatalogItem,
    parent: PoseCatalogItem | undefined,
    onAddVariant?: () => void,
    variantInfo?: { count: number; expanded: boolean; onToggle: () => void }
  ) {
    const displayName = poseDisplayName(p, parent);
    const displayImage = poseDisplayImage(p, parent);
    const isEditing = editingId === p.id;
    return (
      <div
        className="flex items-center gap-3 p-2.5 rounded-xl"
        style={{ background: isEditing ? withAlpha(COLORS.primary, 6) : COLORS.card, border: `1.5px solid ${isEditing ? COLORS.primary : COLORS.border}` }}
      >
        {displayImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={displayImage} alt={displayName} width={36} height={36} style={{ borderRadius: 8, objectFit: "cover", background: COLORS.subtle, flexShrink: 0 }} />
        ) : (
          <div style={{ width: 36, height: 36, borderRadius: 8, background: COLORS.subtle, flexShrink: 0 }} />
        )}
        <button onClick={() => (editingId === p.id ? setEditingId(null) : startEdit(p))} className="flex-1 text-left min-w-0">
          <div style={{ fontSize: 13, fontWeight: 600 }}>{displayName}</div>
          <div className="flex items-center gap-1.5 flex-wrap" style={{ fontSize: 11, color: COLORS.inkSoft }}>
            {hasQuery && parent && <span>Variante di {parent.name}</span>}
            {p.categoryId && <span>{categoryById[p.categoryId]?.name}</span>}
            {p.tags.length > 0 && (
              <span className="flex items-center gap-1">
                <Tag size={10} /> {p.tags.join(", ")}
              </span>
            )}
          </div>
        </button>
        {variantInfo && (
          <button
            onClick={variantInfo.onToggle}
            className="flex items-center gap-1 rounded-full flex-shrink-0"
            style={{ fontSize: 11, fontWeight: 600, color: COLORS.primaryDark, background: withAlpha(COLORS.primary, 12), padding: "3px 8px" }}
          >
            {variantInfo.count} {variantInfo.count === 1 ? "variante" : "varianti"}
            {variantInfo.expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
          </button>
        )}
        {onAddVariant && (
          <button onClick={onAddVariant} title="Aggiungi variante" style={{ fontSize: 11, fontWeight: 600, color: COLORS.primaryDark }}>
            + Variante
          </button>
        )}
        <button onClick={() => handleDeletePose(p.id)} title="Elimina posizione" style={{ color: COLORS.inkSoft }}>
          <Trash2 size={14} />
        </button>
      </div>
    );
  }

  function renderPoseCard(p: PoseCatalogItem, variants: PoseCatalogItem[]) {
    const displayName = poseDisplayName(p, undefined);
    const displayImage = poseDisplayImage(p, undefined);
    const isEditingSelf = editingId === p.id;
    const isCardHighlighted = isEditingSelf || variants.some((v) => v.id === editingId);
    return (
      <div
        key={p.id}
        onClick={() => startEdit(p)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            startEdit(p);
          }
        }}
        role="button"
        tabIndex={0}
        className="rounded-xl overflow-hidden flex flex-col cursor-pointer text-left"
        style={{ background: COLORS.card, border: `1.5px solid ${isCardHighlighted ? COLORS.primary : COLORS.border}` }}
      >
        <div className="flex items-center justify-center relative" style={{ height: 110, background: COLORS.subtle }}>
          {displayImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={displayImage} alt={displayName} style={{ maxHeight: "100%", maxWidth: "100%", objectFit: "contain" }} />
          ) : (
            <div style={{ width: 36, height: 36, borderRadius: 8, background: COLORS.card }} />
          )}
          <div className="absolute flex items-center gap-1" style={{ top: 6, right: 6 }}>
            <IconButton
              onClick={(e) => {
                e.stopPropagation();
                startEdit(p);
              }}
              title="Modifica posizione"
              style={{ width: 28, height: 28, background: withAlpha(COLORS.card, 85), color: COLORS.ink }}
            >
              <Pencil size={13} />
            </IconButton>
            <IconButton
              onClick={(e) => {
                e.stopPropagation();
                handleDeletePose(p.id);
              }}
              title="Elimina posizione"
              style={{ width: 28, height: 28, background: withAlpha(COLORS.card, 85), color: COLORS.danger }}
            >
              <Trash2 size={13} />
            </IconButton>
          </div>
        </div>
        <div className="p-3 flex flex-col gap-1.5 flex-1" style={{ background: isEditingSelf ? withAlpha(COLORS.primary, 6) : "transparent" }}>
          <div style={{ fontSize: 13.5, fontWeight: 700, color: COLORS.ink }}>{displayName}</div>
          {p.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {p.tags.map((t) => (
                <span key={t} style={{ fontSize: 10.5, fontWeight: 600, color: COLORS.primary, background: withAlpha(COLORS.primary, 12), borderRadius: 999, padding: "1px 7px" }}>
                  {t}
                </span>
              ))}
            </div>
          )}

          {variants.length > 0 && (
            <div className="mt-1.5 pt-2 flex flex-col gap-2" style={{ borderTop: `1px dashed ${COLORS.border}` }}>
              {variants.map((v) => {
                const vName = poseDisplayName(v, p);
                const vImage = poseDisplayImage(v, p);
                const isEditingVariant = editingId === v.id;
                return (
                  <div
                    key={v.id}
                    className="flex items-center gap-2 rounded-lg"
                    style={{ background: isEditingVariant ? withAlpha(COLORS.primary, 10) : "transparent", padding: isEditingVariant ? "3px 4px" : 0 }}
                  >
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        startEdit(v);
                      }}
                      className="flex items-center gap-2 flex-1 text-left"
                      style={{ minWidth: 0 }}
                    >
                      <div className="flex items-center justify-center flex-shrink-0 rounded-md overflow-hidden" style={{ width: 28, height: 28, background: COLORS.subtle }}>
                        {vImage ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={vImage} alt={vName} style={{ maxHeight: "100%", maxWidth: "100%", objectFit: "contain" }} />
                        ) : (
                          <div style={{ width: 14, height: 14, borderRadius: 4, background: COLORS.card }} />
                        )}
                      </div>
                      <div className="flex-1" style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: COLORS.ink }}>{vName}</div>
                        {v.tags.length > 0 && <div style={{ fontSize: 10, color: COLORS.inkSoft }}>{v.tags.join(" · ")}</div>}
                      </div>
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeletePose(v.id);
                      }}
                      title="Elimina variante"
                      style={{ color: COLORS.inkSoft, flexShrink: 0 }}
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          <button
            onClick={(e) => {
              e.stopPropagation();
              startNew(p.id);
            }}
            className="self-start mt-1.5"
            style={{ fontSize: 11.5, fontWeight: 600, color: COLORS.primaryDark }}
          >
            + Variante
          </button>
        </div>
      </div>
    );
  }
}
