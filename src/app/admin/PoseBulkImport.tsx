"use client";

import { useMemo, useRef, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { AlertCircle, Upload } from "lucide-react";
import { COLORS, withAlpha } from "./colors";
import { Modal, inputStyle } from "./ui";
import { savePoseCategory, bulkInsertPoses } from "./data";
import type { PoseCatalogItem, PoseCategory, PoseMacro } from "./types";

// Parser CSV minimale: gestisce virgole tra campi, campi tra virgolette
// (incluse virgolette "escaped" raddoppiate) e newline dentro i campi.
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      field = "";
      if (row.some((f) => f.trim() !== "")) rows.push(row);
      row = [];
    } else {
      field += c;
    }
  }
  if (field !== "" || row.length > 0) {
    row.push(field);
    if (row.some((f) => f.trim() !== "")) rows.push(row);
  }
  return rows;
}

const HEADER_ALIASES: Record<string, string> = {
  nome: "name",
  name: "name",
  sanscrito: "name",
  sanskrit: "name",
  categoria: "category",
  category: "category",
  tag: "tags",
  tags: "tags",
  immagine: "image",
  image: "image",
  nome_it: "nameIt",
  nomeit: "nameIt",
  italiano: "nameIt",
  name_it: "nameIt",
  nameit: "nameIt",
  nome_en: "nameEn",
  nomeen: "nameEn",
  inglese: "nameEn",
  english: "nameEn",
  name_en: "nameEn",
  nameen: "nameEn",
  descrizione: "description",
  description: "description",
  macro: "macro",
};

type ParsedRow = {
  name: string;
  categoryName: string;
  tags: string[];
  imageUrl: string;
  nameIt: string;
  nameEn: string;
  description: string;
  macro: PoseMacro;
  error: string;
};

function parseRows(csvText: string, defaultMacro: PoseMacro): ParsedRow[] {
  const rows = parseCsv(csvText.trim());
  if (rows.length === 0) return [];
  const header = rows[0].map((h) => HEADER_ALIASES[h.trim().toLowerCase()] ?? h.trim().toLowerCase());
  const idx = (key: string) => header.indexOf(key);
  const nameIdx = idx("name");
  const catIdx = idx("category");
  const tagsIdx = idx("tags");
  const imageIdx = idx("image");
  const nameItIdx = idx("nameIt");
  const nameEnIdx = idx("nameEn");
  const descIdx = idx("description");
  const macroIdx = idx("macro");

  return rows.slice(1).map((r) => {
    const name = (nameIdx >= 0 ? r[nameIdx] : "").trim();
    const macroRaw = (macroIdx >= 0 ? r[macroIdx] : "").trim().toLowerCase();
    return {
      name,
      categoryName: (catIdx >= 0 ? r[catIdx] : "").trim(),
      tags: (tagsIdx >= 0 ? r[tagsIdx] : "")
        .split(";")
        .map((t) => t.trim())
        .filter(Boolean),
      imageUrl: (imageIdx >= 0 ? r[imageIdx] : "").trim(),
      nameIt: (nameItIdx >= 0 ? r[nameItIdx] : "").trim(),
      nameEn: (nameEnIdx >= 0 ? r[nameEnIdx] : "").trim(),
      description: (descIdx >= 0 ? r[descIdx] : "").trim(),
      macro: macroRaw === "pranayama" ? "pranayama" : macroRaw === "asana" ? "asana" : defaultMacro,
      error: name ? "" : "Nome mancante",
    };
  });
}

export function PoseBulkImportModal({
  supabase,
  defaultMacro,
  categories,
  onClose,
  onImported,
}: {
  supabase: SupabaseClient;
  defaultMacro: PoseMacro;
  categories: PoseCategory[];
  onClose: () => void;
  onImported: (poses: PoseCatalogItem[], newCategories: PoseCategory[]) => void;
}) {
  const [csvText, setCsvText] = useState("");
  const [parsed, setParsed] = useState<ParsedRow[] | null>(null);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validRows = useMemo(() => (parsed ?? []).filter((r) => !r.error), [parsed]);
  const newCategoryNames = useMemo(() => {
    const existing = new Set(categories.map((c) => `${c.macro}:${c.name.toLowerCase()}`));
    const seen = new Set<string>();
    return validRows
      .filter((r) => r.categoryName && !existing.has(`${r.macro}:${r.categoryName.toLowerCase()}`))
      .map((r) => ({ macro: r.macro, name: r.categoryName }))
      .filter((c) => {
        const key = `${c.macro}:${c.name.toLowerCase()}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
  }, [validRows, categories]);

  function handleFile(file: File) {
    file.text().then((text) => setCsvText(text));
  }

  function handleAnalyze() {
    setError("");
    setParsed(parseRows(csvText, defaultMacro));
  }

  async function handleConfirm() {
    if (!parsed) return;
    setImporting(true);
    setError("");
    try {
      const createdCategories: PoseCategory[] = [];
      const categoryIdByKey = new Map<string, string>();
      categories.forEach((c) => categoryIdByKey.set(`${c.macro}:${c.name.toLowerCase()}`, c.id));

      for (const nc of newCategoryNames) {
        const created = await savePoseCategory(supabase, { macro: nc.macro, name: nc.name, position: 999 });
        createdCategories.push(created);
        categoryIdByKey.set(`${created.macro}:${created.name.toLowerCase()}`, created.id);
      }

      const toInsert = validRows.map((r) => ({
        macro: r.macro,
        name: r.name,
        nameIt: r.nameIt,
        nameEn: r.nameEn,
        description: r.description,
        categoryId: r.categoryName ? categoryIdByKey.get(`${r.macro}:${r.categoryName.toLowerCase()}`) ?? null : null,
        tags: r.tags,
        imageUrl: r.imageUrl || null,
        parentPoseId: null,
        variantLabel: "",
      }));

      const inserted = await bulkInsertPoses(supabase, toInsert);
      onImported(inserted, createdCategories);
    } catch {
      setError("Errore durante l'importazione. Controlla il formato del CSV e riprova.");
    } finally {
      setImporting(false);
    }
  }

  return (
    <Modal onClose={onClose} width={640}>
      <div className="p-5 overflow-y-auto">
        <div style={{ fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 600, color: COLORS.heading }} className="mb-1">
          Importa posizioni da CSV
        </div>
        <div className="mb-3" style={{ fontSize: 12, color: COLORS.inkSoft }}>
          Colonne riconosciute: <strong>nome</strong> (obbligatoria, nome sanscrito), categoria, tag (separati da “;”), immagine (percorso o URL), nome_it (per la ricerca), nome_en (per la ricerca), descrizione, macro (asana/pranayama — default {defaultMacro === "asana" ? "asana" : "pranayama"}). Prima riga = intestazioni.
        </div>

        <div className="flex items-center gap-2 mb-2">
          <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium" style={{ border: `1px solid ${COLORS.border}` }}>
            <Upload size={14} /> Carica file .csv
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
              e.target.value = "";
            }}
          />
          <span style={{ fontSize: 11.5, color: COLORS.inkSoft }}>oppure incolla il contenuto qui sotto</span>
        </div>

        <textarea
          value={csvText}
          onChange={(e) => {
            setCsvText(e.target.value);
            setParsed(null);
          }}
          rows={6}
          placeholder={
            "nome,categoria,tag,immagine,nome_it,nome_en\nAdho Mukha Svanasana,In piedi,principianti;spalle,/asanas/mia-posa.png,Cane a testa in giù,Downward Facing Dog"
          }
          style={{ ...inputStyle, fontFamily: "monospace", fontSize: 12, resize: "vertical" }}
        />

        <div className="flex items-center gap-2 mt-2 mb-3">
          <button onClick={handleAnalyze} disabled={!csvText.trim()} className="px-3 py-2 rounded-lg text-sm font-medium disabled:opacity-50" style={{ border: `1px solid ${COLORS.border}` }}>
            Analizza
          </button>
          {parsed && (
            <span style={{ fontSize: 12, color: COLORS.inkSoft }}>
              {validRows.length} posizioni valide su {parsed.length}
              {newCategoryNames.length > 0 && ` · ${newCategoryNames.length} nuove categorie da creare`}
            </span>
          )}
        </div>

        {parsed && parsed.length > 0 && (
          <div className="mb-3 overflow-x-auto rounded-lg" style={{ border: `1px solid ${COLORS.border}`, maxHeight: 260, overflowY: "auto" }}>
            <table style={{ width: "100%", fontSize: 12, borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: COLORS.subtle, textAlign: "left" }}>
                  <th className="px-2 py-1.5">Nome</th>
                  <th className="px-2 py-1.5">Categoria</th>
                  <th className="px-2 py-1.5">Tag</th>
                  <th className="px-2 py-1.5">Macro</th>
                </tr>
              </thead>
              <tbody>
                {parsed.map((r, i) => (
                  <tr key={i} style={{ borderTop: `1px solid ${COLORS.border}`, background: r.error ? withAlpha(COLORS.danger, 8) : "transparent" }}>
                    <td className="px-2 py-1.5">{r.error ? <span style={{ color: COLORS.danger }}>{r.error}</span> : r.name}</td>
                    <td className="px-2 py-1.5">
                      {r.categoryName || <span style={{ color: COLORS.inkSoft }}>—</span>}
                      {r.categoryName && newCategoryNames.some((c) => c.macro === r.macro && c.name.toLowerCase() === r.categoryName.toLowerCase()) && (
                        <span style={{ color: COLORS.primaryDark, fontWeight: 600 }}> (nuova)</span>
                      )}
                    </td>
                    <td className="px-2 py-1.5">{r.tags.join(", ") || <span style={{ color: COLORS.inkSoft }}>—</span>}</td>
                    <td className="px-2 py-1.5">{r.macro}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {error && (
          <div className="mb-3 flex items-center gap-1.5" style={{ fontSize: 12, color: COLORS.danger }}>
            <AlertCircle size={13} /> {error}
          </div>
        )}

        <div className="flex items-center justify-end gap-2">
          <button onClick={onClose} className="px-3 py-2 rounded-lg text-sm font-medium" style={{ border: `1px solid ${COLORS.border}` }}>
            Annulla
          </button>
          <button
            onClick={handleConfirm}
            disabled={!parsed || validRows.length === 0 || importing}
            className="px-3 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-60"
            style={{ background: COLORS.primary }}
          >
            {importing ? "Importazione…" : `Importa ${validRows.length || ""} posizioni`}
          </button>
        </div>
      </div>
    </Modal>
  );
}
