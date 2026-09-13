"use client";

import { useEffect, useMemo, useState } from "react";
import { Bookmark, Check, Copy, Download, Repeat, Share2 } from "lucide-react";
import { COLORS, withAlpha } from "@/app/admin/colors";
import { Badge } from "@/app/admin/ui";
import { PrintSheet, SheetItemRow, buildSheetText, printSequenceSheet, sheetSectionsFromSequence } from "@/app/admin/sequenceSheet";
import type { PoseCatalogItem, Sequence } from "@/app/admin/types";
import type { ClassType } from "./types";

// Vista di sola lettura per l'allievo: stesso motore di formattazione della
// scheda admin (sheetSectionsFromSequence/buildSheetText/PrintSheet), ma un
// layout pensato per essere letto comodamente a schermo (righe più ariose,
// niente controlli di modifica) invece della scheda in formato "foglio A4".
export function SequenceReadView({
  sequence,
  type,
  poseCatalog,
  isAssigned,
  isFavorite,
  onToggleFavorite,
}: {
  sequence: Sequence;
  type: ClassType | undefined;
  poseCatalog: PoseCatalogItem[];
  isAssigned: boolean;
  isFavorite: boolean;
  onToggleFavorite: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const [canShare, setCanShare] = useState(false);

  useEffect(() => {
    // Rilevamento della Web Share API: deve avvenire dopo il mount (non nel
    // render) perché `navigator` non esiste durante il render lato server.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCanShare(typeof navigator !== "undefined" && typeof navigator.share === "function");
  }, []);

  const poseById = useMemo(() => Object.fromEntries(poseCatalog.map((p) => [p.id, p])), [poseCatalog]);
  const sheetSections = useMemo(() => sheetSectionsFromSequence(sequence, poseById), [sequence, poseById]);
  const title = sequence.name || "Sequenza senza nome";
  const totalActive = sheetSections.reduce((sum, s) => sum + s.rows.reduce((rSum, r) => rSum + (r.kind === "item" ? 1 : r.items.length), 0), 0);

  function handleCopy() {
    navigator.clipboard
      .writeText(buildSheetText(sheetSections, title))
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1400);
      })
      .catch(() => {});
  }
  function handleShare() {
    navigator.share({ title, text: buildSheetText(sheetSections, title) }).catch(() => {});
  }
  function handlePrint() {
    printSequenceSheet(title);
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-2 flex-wrap mb-1">
        <div className="flex items-center gap-2 flex-wrap">
          <div style={{ fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 600, color: COLORS.heading }}>{title}</div>
          <Badge color={type?.color ?? COLORS.inkSoft}>{type?.name ?? "Altro"}</Badge>
          {isAssigned ? <Badge color={COLORS.gold}>Assegnata</Badge> : isFavorite ? <Badge color={COLORS.primary}>Salvata</Badge> : null}
        </div>
        {!isAssigned && (
          <button
            type="button"
            onClick={onToggleFavorite}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium flex-shrink-0"
            style={{ border: `1px solid ${COLORS.border}`, color: isFavorite ? COLORS.primary : COLORS.inkSoft }}
          >
            <Bookmark size={13} fill={isFavorite ? COLORS.primary : "none"} /> {isFavorite ? "Salvata" : "Salva"}
          </button>
        )}
      </div>
      <div className="mb-4">
        <div style={{ fontSize: 12.5, color: COLORS.inkSoft }}>{totalActive} posizioni</div>
        {sequence.description && (
          <div className="mt-1" style={{ fontSize: 13, color: COLORS.ink, lineHeight: 1.5 }}>
            {sequence.description}
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 mb-5 flex-wrap">
        <button onClick={handleCopy} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium" style={{ border: `1px solid ${COLORS.border}` }}>
          {copied ? <Check size={14} /> : <Copy size={14} />} {copied ? "Copiato" : "Copia testo"}
        </button>
        {canShare && (
          <button onClick={handleShare} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium" style={{ border: `1px solid ${COLORS.border}` }}>
            <Share2 size={14} /> Condividi
          </button>
        )}
        <button onClick={handlePrint} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold text-white" style={{ background: COLORS.primary }}>
          <Download size={14} /> Esporta PDF
        </button>
      </div>

      {totalActive === 0 ? (
        <div style={{ fontSize: 13, color: COLORS.inkSoft }}>Questa sequenza non ha ancora posizioni attive.</div>
      ) : (
        sheetSections.map((s, idx) => {
          const hasContent = s.rows.some((r) => (r.kind === "item" ? true : r.items.length > 0));
          if (!hasContent) return null;
          return (
            <div key={idx} className="mb-5">
              <div style={{ fontSize: 12, fontWeight: 700, color: COLORS.primaryDark, textTransform: "uppercase", letterSpacing: 0.3 }} className="mb-2">
                {s.label}
              </div>
              <div className="flex flex-col gap-2">
                {s.rows.map((r, rIdx) =>
                  r.kind === "item" ? (
                    <SheetItemRow key={rIdx} item={r.item} />
                  ) : r.items.length === 0 ? null : (
                    <div key={rIdx} className="pl-2.5" style={{ borderLeft: `2px solid ${withAlpha(COLORS.gold, 50)}` }}>
                      <div style={{ fontSize: 11.5, fontWeight: 700, color: COLORS.primaryDark }} className="mb-1.5 flex items-center gap-1">
                        <Repeat size={12} /> Ripeti ×{r.reps ?? "?"}
                      </div>
                      <div className="flex flex-col gap-2">
                        {r.items.map((it, i2) => (
                          <SheetItemRow key={i2} item={it} />
                        ))}
                      </div>
                    </div>
                  )
                )}
              </div>
            </div>
          );
        })
      )}

      <PrintSheet title={title} sheetSections={sheetSections} />
    </div>
  );
}
