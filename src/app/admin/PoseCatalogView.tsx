"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { AlertCircle, Plus, Search, Tag, Trash2, Upload } from "lucide-react";
import { COLORS, withAlpha } from "./colors";
import { Field, IconButton, inputStyle } from "./ui";
import { fetchPoseCatalog, savePose, deletePose, fetchPoseCategories, savePoseCategory, deletePoseCategory } from "./data";
import { PoseBulkImportModal } from "./PoseBulkImport";
import { PoseThumbnailGenerator } from "./PoseThumbnailGenerator";
import type { PoseCatalogItem, PoseCategory, PoseMacro } from "./types";

function emptyDraft(macro: PoseMacro): Omit<PoseCatalogItem, "id"> {
  return { macro, name: "", nameIt: "", nameEn: "", description: "", categoryId: null, tags: [], imageUrl: null };
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
  const [editingId, setEditingId] = useState<string | "new" | null>(null);
  const [draft, setDraft] = useState<Omit<PoseCatalogItem, "id">>(emptyDraft("asana"));
  const [tagsInput, setTagsInput] = useState("");
  const [newCategoryName, setNewCategoryName] = useState("");
  const [error, setError] = useState("");
  const [showImport, setShowImport] = useState(false);

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

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return poses
      .filter((p) => p.macro === macro)
      .filter((p) => categoryFilter === "all" || p.categoryId === categoryFilter)
      .filter(
        (p) =>
          !q ||
          p.name.toLowerCase().includes(q) ||
          p.nameIt.toLowerCase().includes(q) ||
          p.nameEn.toLowerCase().includes(q) ||
          p.tags.some((t) => t.toLowerCase().includes(q))
      )
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [poses, macro, categoryFilter, query]);

  const editFormRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (editingId) editFormRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [editingId]);

  function startNew() {
    setDraft(emptyDraft(macro));
    setTagsInput("");
    setEditingId("new");
  }
  function startEdit(p: PoseCatalogItem) {
    setDraft({ macro: p.macro, name: p.name, nameIt: p.nameIt, nameEn: p.nameEn, description: p.description, categoryId: p.categoryId, tags: p.tags, imageUrl: p.imageUrl });
    setTagsInput(p.tags.join(", "));
    setEditingId(p.id);
  }

  function renderEditForm() {
    return (
      <div ref={editFormRef} className="mt-1.5 mb-1.5 p-3.5 rounded-xl" style={{ background: COLORS.card, border: `1px solid ${COLORS.border}` }}>
        <div className="grid sm:grid-cols-2 gap-3 mb-3">
          <Field label="Nome (sanscrito)">
            <input value={draft.name} onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))} placeholder="Es. Adho Mukha Svanasana" style={inputStyle} />
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
          <Field label="Nome italiano (facoltativo, per la ricerca)">
            <input value={draft.nameIt} onChange={(e) => setDraft((d) => ({ ...d, nameIt: e.target.value }))} placeholder="Es. Cane a testa in giù" style={inputStyle} />
          </Field>
          <Field label="Nome inglese (facoltativo, per la ricerca)">
            <input value={draft.nameEn} onChange={(e) => setDraft((d) => ({ ...d, nameEn: e.target.value }))} placeholder="Es. Downward Facing Dog" style={inputStyle} />
          </Field>
        </div>
        <div className="grid sm:grid-cols-2 gap-3 mb-3">
          <Field label="Tag (separati da virgola)">
            <input value={tagsInput} onChange={(e) => setTagsInput(e.target.value)} placeholder="es. principianti, spalle, apertura anche" style={inputStyle} />
          </Field>
          <Field label="Immagine (percorso o URL, facoltativo)">
            <input value={draft.imageUrl ?? ""} onChange={(e) => setDraft((d) => ({ ...d, imageUrl: e.target.value || null }))} placeholder="/asanas/mia-posa.png" style={inputStyle} />
          </Field>
        </div>
        <div className="mb-3">
          <PoseThumbnailGenerator
            supabase={supabase}
            poseSlug={slugify(draft.name || "posa")}
            onGenerated={(url) => setDraft((d) => ({ ...d, imageUrl: url }))}
          />
        </div>
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

  async function handleSaveDraft() {
    setError("");
    const name = draft.name.trim();
    if (!name) {
      setError("Il nome della posizione è obbligatorio.");
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
      <div style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 600, color: COLORS.heading }} className="mb-4">
        Catalogo posizioni
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

      <div className="mb-4">
        <div style={{ fontSize: 12, fontWeight: 600, color: COLORS.inkSoft }} className="mb-1.5">
          Categorie {macro === "asana" ? "asana" : "pranayama"}
        </div>
        <div className="flex items-center gap-1.5 flex-wrap mb-2">
          <button onClick={() => setCategoryFilter("all")} className="px-2.5 py-1 rounded-lg text-xs font-medium" style={{ background: categoryFilter === "all" ? COLORS.primary : COLORS.subtle, color: categoryFilter === "all" ? "#fff" : COLORS.ink }}>
            Tutte
          </button>
          {categoriesForMacro.map((c) => {
            const used = poses.some((p) => p.categoryId === c.id);
            return (
              <span key={c.id} className="inline-flex items-center gap-1">
                <button onClick={() => setCategoryFilter(c.id)} className="px-2.5 py-1 rounded-lg text-xs font-medium" style={{ background: categoryFilter === c.id ? COLORS.primary : COLORS.subtle, color: categoryFilter === c.id ? "#fff" : COLORS.ink }}>
                  {c.name}
                </button>
                <button onClick={() => handleDeleteCategory(c.id)} disabled={used} title={used ? "In uso" : "Elimina categoria"} style={{ color: used ? COLORS.border : COLORS.danger }}>
                  <Trash2 size={11} />
                </button>
              </span>
            );
          })}
        </div>
        <div className="flex items-center gap-2">
          <input value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)} placeholder="Nuova categoria" style={{ ...inputStyle, maxWidth: 220, fontSize: 12 }} onKeyDown={(e) => e.key === "Enter" && handleAddCategory()} />
          <IconButton onClick={handleAddCategory} style={{ background: COLORS.subtle }}>
            <Plus size={14} />
          </IconButton>
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
        <button onClick={startNew} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold text-white" style={{ background: COLORS.primary }}>
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

      {editingId === "new" && renderEditForm()}

      {loading ? (
        <div style={{ fontSize: 13, color: COLORS.inkSoft }}>Caricamento…</div>
      ) : filtered.length === 0 ? (
        <div style={{ fontSize: 13, color: COLORS.inkSoft }} className="py-8 text-center">
          Nessuna posizione trovata.
        </div>
      ) : (
        <div className="flex flex-col gap-1.5">
          {filtered.map((p) => (
            <div key={p.id}>
              <div className="flex items-center gap-3 p-2.5 rounded-xl" style={{ background: COLORS.card, border: `1px solid ${COLORS.border}` }}>
                {p.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.imageUrl} alt={p.name} width={36} height={36} style={{ borderRadius: 8, objectFit: "cover", background: COLORS.subtle, flexShrink: 0 }} />
                ) : (
                  <div style={{ width: 36, height: 36, borderRadius: 8, background: COLORS.subtle, flexShrink: 0 }} />
                )}
                <button onClick={() => (editingId === p.id ? setEditingId(null) : startEdit(p))} className="flex-1 text-left min-w-0">
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{p.name}</div>
                  <div className="flex items-center gap-1.5 flex-wrap" style={{ fontSize: 11, color: COLORS.inkSoft }}>
                    {p.categoryId && <span>{categoryById[p.categoryId]?.name}</span>}
                    {p.tags.length > 0 && (
                      <span className="flex items-center gap-1">
                        <Tag size={10} /> {p.tags.join(", ")}
                      </span>
                    )}
                  </div>
                </button>
                <button onClick={() => handleDeletePose(p.id)} title="Elimina posizione" style={{ color: COLORS.inkSoft }}>
                  <Trash2 size={14} />
                </button>
              </div>
              {editingId === p.id && renderEditForm()}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
