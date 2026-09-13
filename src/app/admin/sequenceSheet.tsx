"use client";

import { createPortal } from "react-dom";
import { COLORS } from "./colors";
import { DrishtiEyeIcon, DRISHTI_PRINT_PALETTE } from "./DrishtiEyeIcon";
import { poseDisplayName, poseDisplayImage, poseDisplayDrishti, DRISHTI_LABELS } from "./poseDisplay";
import type { Drishti, HoldUnit, PoseCatalogItem, Sequence } from "./types";

// Blocco condiviso tra l'editor admin (SequenceEditor) e la vista di sola
// lettura lato allievo (area/SequenceReadView): entrambi devono produrre lo
// stesso testo copiabile/condivisibile e la stessa scheda stampabile/PDF, a
// partire però da due forme di dato diverse — lo stato "live" dell'editor
// (EditItem, con uid per il drag&drop) da un lato, la sequenza già salvata
// (SequenceItem) dall'altro. Le funzioni qui sotto lavorano su un tipo
// strutturale minimo comune ai due, così la formattazione non va duplicata.

type SheetSourceItem = {
  poseId: string | null;
  customLabel: string;
  note: string;
  reps: number | null;
  holdValue: number | null;
  holdUnit: HoldUnit | null;
  onInhale: string | null;
  onExhale: string | null;
  drishtiOverride: Drishti | null;
};

export type SheetItem = { text: string; meta: string; note: string; breath: string; imageUrl: string | null; drishti: Drishti | null };
export type SheetRow = { kind: "item"; item: SheetItem } | { kind: "block"; reps: number | null; items: SheetItem[] };
export type SheetSection = { label: string; rows: SheetRow[] };

export function formatItemMeta(reps: number | null, holdValue: number | null, holdUnit: HoldUnit | null): string {
  const parts: string[] = [];
  if (reps) parts.push(`×${reps}`);
  if (holdValue) {
    const unitLabel = holdUnit === "minutes" ? (holdValue === 1 ? "minuto" : "minuti") : holdUnit === "breaths" ? (holdValue === 1 ? "respiro" : "respiri") : holdValue === 1 ? "secondo" : "secondi";
    parts.push(`${holdValue} ${unitLabel}`);
  }
  return parts.join(" · ");
}

export function formatBreathText(onInhale: string | null, onExhale: string | null): string {
  const parts: string[] = [];
  if (onInhale !== null) parts.push(onInhale ? `inspiro: ${onInhale}` : "inspiro");
  if (onExhale !== null) parts.push(onExhale ? `espiro: ${onExhale}` : "espiro");
  return parts.join(" · ");
}

export function toSheetItem(it: SheetSourceItem, poseById: Record<string, PoseCatalogItem>): SheetItem {
  const pose = it.poseId ? poseById[it.poseId] : undefined;
  const parent = pose?.parentPoseId ? poseById[pose.parentPoseId] : undefined;
  return {
    text: pose ? poseDisplayName(pose, parent) : it.customLabel,
    note: it.note,
    meta: formatItemMeta(it.reps, it.holdValue, it.holdUnit),
    breath: formatBreathText(it.onInhale, it.onExhale),
    imageUrl: pose ? poseDisplayImage(pose, parent) : null,
    drishti: it.drishtiOverride ?? (pose ? poseDisplayDrishti(pose, parent) : null),
  };
}

// Ricostruisce le righe della scheda direttamente dalla sequenza già salvata
// (sezioni/item/blocchi con id stabili), senza passare dallo stato "live" di
// editing — serve alla vista di sola lettura, che non apre mai l'editor.
export function sheetSectionsFromSequence(sequence: Sequence, poseById: Record<string, PoseCatalogItem>): SheetSection[] {
  return sequence.sections
    .filter((s) => s.enabled)
    .map((s) => {
      const blockById = new Map<string, { reps: number | null; items: SheetItem[] }>();
      s.blocks.forEach((b) => blockById.set(b.id, { reps: b.reps, items: [] }));

      const positional: { position: number; row: SheetRow }[] = [];
      s.blocks.forEach((b) => {
        const block = blockById.get(b.id)!;
        positional.push({ position: b.position, row: { kind: "block", reps: block.reps, items: block.items } });
      });
      s.items.forEach((it) => {
        const sheetItem = toSheetItem(it, poseById);
        if (it.blockId && blockById.has(it.blockId)) {
          blockById.get(it.blockId)!.items.push(sheetItem);
        } else {
          positional.push({ position: it.position, row: { kind: "item", item: sheetItem } });
        }
      });
      positional.sort((a, b) => a.position - b.position);

      return { label: s.label, rows: positional.map((p) => p.row) };
    });
}

// `title` è già la stringa finale da mostrare (es. "Sequenza per Maria" in
// admin, o direttamente il nome della sequenza nella vista di sola lettura
// lato allievo, dove "per <il mio stesso nome>" non avrebbe senso).
export function buildSheetText(sections: SheetSection[], title: string) {
  const lines = [title];
  sections.forEach((s) => {
    const hasContent = s.rows.some((r) => (r.kind === "item" ? true : r.items.length > 0));
    if (!hasContent) return;
    lines.push("");
    lines.push(s.label.toUpperCase());
    s.rows.forEach((r) => {
      if (r.kind === "item") {
        const meta = r.item.meta ? ` [${r.item.meta}]` : "";
        const drishti = r.item.drishti ? ` (sguardo: ${DRISHTI_LABELS[r.item.drishti].detail})` : "";
        const breath = r.item.breath ? `  {${r.item.breath}}` : "";
        const note = r.item.note ? `  (${r.item.note})` : "";
        lines.push(`- ${r.item.text}${meta}${drishti}${breath}${note}`);
      } else if (r.items.length > 0) {
        lines.push(`  Ripeti ×${r.reps ?? "?"}:`);
        r.items.forEach((it) => {
          const meta = it.meta ? ` [${it.meta}]` : "";
          const drishti = it.drishti ? ` (sguardo: ${DRISHTI_LABELS[it.drishti].detail})` : "";
          const breath = it.breath ? `  {${it.breath}}` : "";
          const note = it.note ? `  (${it.note})` : "";
          lines.push(`  - ${it.text}${meta}${drishti}${breath}${note}`);
        });
      }
    });
  });
  return lines.join("\n");
}

// Filigrana ripetuta e discreta sulla scheda stampata/PDF: le foto delle
// posizioni sono materiale proprietario dello studio, quindi la scheda che
// esce verso gli allievi porta un richiamo al marchio invece di restare
// "pulita" e facilmente ricondivisibile senza contesto. Il tassello si ripete
// ogni 200px e passa SOPRA a testo e foto, così anche ritagliando solo una
// porzione della pagina (es. sopra/sotto) resta visibile un frammento del
// marchio. La rotazione è sulla `pattern` stessa (patternTransform) e non su
// un <g> annidato dentro: in stampa/PDF Chromium a volte appiattisce i
// transform sui figli di un pattern, mentre patternTransform è l'attributo
// SVG pensato apposta per ruotare un intero tassello ripetuto ed è molto più
// affidabile in quel percorso. Per lo stesso motivo l'elemento è "position:
// absolute" (alto quanto tutta la scheda) invece di "fixed": fixed in stampa
// attiva un meccanismo di ripetizione per-pagina che ha lo stesso problema.
//
// SVG inline nel DOM (non un'immagine di sfondo in data URI): un'immagine
// esterna gira in un contesto isolato che non vede i web font della pagina,
// quindi il wordmark "ima yoga" veniva reso con il font di sistema invece del
// Cormorant Garamond del logo vero (var(--font-display), vedi Logo.tsx).
// Da inline invece eredita i font della pagina come qualunque altro testo.
const WATERMARK_TILE_ID = "sequence-watermark-tile";
export function PrintWatermark() {
  return (
    <svg className="p-watermark" aria-hidden="true">
      <defs>
        <pattern id={WATERMARK_TILE_ID} width="200" height="200" patternUnits="userSpaceOnUse" patternTransform="rotate(-28)">
          <text x="100" y="104" textAnchor="middle" fontSize={18} fontWeight={500} fill="#8E72C7" fillOpacity={0.25} style={{ fontFamily: "var(--font-display)" }}>
            ima yoga
          </text>
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${WATERMARK_TILE_ID})`} />
    </svg>
  );
}

export function SheetItemRow({ item }: { item: SheetItem }) {
  return (
    <div className="flex items-center gap-2.5" style={{ fontSize: 13, borderBottom: `1px dashed ${COLORS.border}`, paddingBottom: 6 }}>
      {item.imageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={item.imageUrl} alt="" width={32} height={32} style={{ borderRadius: 6, objectFit: "cover", background: COLORS.subtle, flexShrink: 0 }} />
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <span style={{ fontFamily: "var(--font-display)" }}>
            {item.text}
            {item.meta && <span style={{ fontFamily: "inherit", fontWeight: 600, color: COLORS.primaryDark, fontSize: 11.5 }}> · {item.meta}</span>}
            {item.drishti && (
              <span className="inline-flex items-center gap-1" style={{ fontFamily: "inherit", fontWeight: 600, color: COLORS.primaryDark, fontSize: 11.5, marginLeft: 6 }}>
                <DrishtiEyeIcon size={10} /> {DRISHTI_LABELS[item.drishti].detail}
              </span>
            )}
          </span>
          {item.note && <span style={{ color: COLORS.inkSoft, fontSize: 12, textAlign: "right" }}>{item.note}</span>}
        </div>
        {item.breath && <div style={{ color: COLORS.primaryDark, fontSize: 11.5, marginTop: 2 }}>{item.breath}</div>}
      </div>
    </div>
  );
}

function SheetItemPrintRow({ item }: { item: SheetItem }) {
  return (
    <div className="p-row">
      {item.imageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img className="p-thumb" src={item.imageUrl} alt="" />
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="p-text">
          <span>
            {item.text} {item.meta && <span className="p-meta">· {item.meta}</span>}
            {item.drishti && (
              <span className="p-drishti">
                <DrishtiEyeIcon size={10} palette={DRISHTI_PRINT_PALETTE} /> {DRISHTI_LABELS[item.drishti].detail}
              </span>
            )}
          </span>
          {item.note && <span className="p-note">{item.note}</span>}
        </div>
        {item.breath && <div className="p-breath">{item.breath}</div>}
      </div>
    </div>
  );
}

// Scheda stampabile/PDF vera e propria: invisibile a schermo (@media screen),
// mostrata solo da window.print(). È un portal su document.body indipendente
// da dove viene montata, quindi sia l'editor admin (dentro la modale "Genera
// scheda") sia la vista di sola lettura lato allievo (sempre montata in
// pagina) possono usarla identica.
export function PrintSheet({ title, sheetSections }: { title: string; sheetSections: SheetSection[] }) {
  if (typeof document === "undefined") return null;
  return createPortal(
    <div id="sequence-print-sheet">
      <style>{`
        @media screen { #sequence-print-sheet { display: none; } }
        @media print {
          body > *:not(#sequence-print-sheet) { display: none !important; }
          #sequence-print-sheet { display: block !important; position: relative; padding: 24px; max-width: 680px; margin: 0 auto; font-family: 'IBM Plex Sans', sans-serif; color: #2A2440; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          #sequence-print-sheet .p-watermark { display: block; position: absolute; inset: 0; width: 100%; height: 100%; z-index: 5; pointer-events: none; }
          #sequence-print-sheet > *:not(.p-watermark) { position: relative; z-index: 1; }
          #sequence-print-sheet h1 { font-family: 'Fraunces', serif; font-size: 1.4rem; margin: 0 0 18px; }
          #sequence-print-sheet .p-footer { display: flex; justify-content: space-between; align-items: baseline; margin-top: 28px; padding-top: 10px; border-top: 1px solid #E4C77A; font-size: 0.7rem; letter-spacing: 0.3px; color: #8E72C7; }
          #sequence-print-sheet .p-section-title { font-size: 0.78rem; font-weight: 600; color: #9C4FA0; margin: 20px 0 6px; text-transform: uppercase; }
          #sequence-print-sheet .p-block { padding-left: 10px; border-left: 2px solid #E4C77A; margin: 6px 0; }
          #sequence-print-sheet .p-block-title { font-size: 0.72rem; font-weight: 700; color: #9C4FA0; margin-bottom: 4px; }
          #sequence-print-sheet .p-row { display: flex; align-items: center; gap: 12px; padding: 5px 0; border-bottom: 1px dashed #DCD3EC; break-inside: avoid; }
          #sequence-print-sheet .p-thumb { width: 36px; height: 36px; border-radius: 6px; object-fit: cover; background: #DFD5EE; flex-shrink: 0; }
          #sequence-print-sheet .p-text { display: flex; justify-content: space-between; gap: 14px; flex: 1; }
          #sequence-print-sheet .p-meta { color: #9C4FA0; font-weight: 600; font-size: 0.78rem; }
          #sequence-print-sheet .p-drishti { display: inline-flex; align-items: center; gap: 3px; color: #9C4FA0; font-weight: 600; font-size: 0.78rem; margin-left: 6px; }
          #sequence-print-sheet .p-note { color: #5C5470; font-size: 0.85rem; text-align: right; }
          #sequence-print-sheet .p-breath { color: #9C4FA0; font-size: 0.78rem; margin-top: 2px; }
        }
      `}</style>
      {/* Contenuto proprietario (foto delle posizioni) che esce dallo studio: una
          filigrana ripetuta e discreta, sopra testo e foto, lo scoraggia dal girare
          fuori contesto anche se qualcuno ritaglia la pagina. */}
      <PrintWatermark />
      <h1>{title}</h1>
      {sheetSections.map((s, idx) => {
        const hasContent = s.rows.some((r) => (r.kind === "item" ? true : r.items.length > 0));
        if (!hasContent) return null;
        return (
          <div key={idx}>
            <div className="p-section-title">{s.label}</div>
            {s.rows.map((r, rIdx) =>
              r.kind === "item" ? (
                <SheetItemPrintRow key={rIdx} item={r.item} />
              ) : r.items.length === 0 ? null : (
                <div key={rIdx} className="p-block">
                  <div className="p-block-title">Ripeti ×{r.reps ?? "?"}</div>
                  {r.items.map((it, i2) => (
                    <SheetItemPrintRow key={i2} item={it} />
                  ))}
                </div>
              )
            )}
          </div>
        );
      })}
      <div className="p-footer">
        <span>imayoga.app</span>
        <span>@ima.yo.ga</span>
      </div>
    </div>,
    document.body
  );
}
