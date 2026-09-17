"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { COLORS, withAlpha } from "./colors";
import { DrishtiEyeIcon } from "./DrishtiEyeIcon";
import { DRISHTI_LABELS, DRISHTI_ORDER } from "./poseDisplay";
import type { Drishti } from "./types";

// Sostituisce la <select> nativa (troppo ingombrante e non stilizzabile: le
// opzioni sono lunghe — nome sanscrito + dettaglio italiano, entrambi
// necessari) con un pill compatto che apre un pannello elenco, stesso
// pattern di MoreMenu.tsx (click fuori/Esc per chiudere). `inherited` è il
// valore che si applicherebbe senza una scelta esplicita qui (la posa del
// padre per una variante, la posa collegata per una voce di sequenza): se
// presente, il trigger lo mostra quando `value` è null invece di un
// placeholder vuoto, e la prima riga del pannello permette di tornarci.
// `overrideLabel`, se passato, marca in oro un valore esplicito qui quando
// esiste anche un `inherited` diverso — usato solo nell'editor sequenze.
// `explicitNone`/`onSelectNone` (opzionali, sempre passati insieme) coprono
// il caso in cui esiste un `inherited` ma si vuole comunque nessuna drishti
// per questa istanza: senza di essi l'unica scelta possibile quando c'è un
// `inherited` è tornare a quel valore, mai eliminarlo davvero.
export function DrishtiPicker({
  value,
  inherited = null,
  overrideLabel,
  onChange,
  size = "md",
  explicitNone = false,
  onSelectNone,
}: {
  value: Drishti | null;
  inherited?: Drishti | null;
  overrideLabel?: string;
  onChange: (value: Drishti | null) => void;
  size?: "sm" | "md";
  explicitNone?: boolean;
  onSelectNone?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const isSmall = size === "sm";

  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const effective = explicitNone ? null : (value ?? inherited);
  const showOverrideMark = Boolean(overrideLabel) && value !== null && inherited !== null;
  const clearLabel = inherited ? `Eredita dal catalogo: ${DRISHTI_LABELS[inherited].name}` : "Nessuna";
  const canSelectNone = inherited !== null && Boolean(onSelectNone);

  function choose(next: Drishti | null) {
    onChange(next);
    setOpen(false);
  }

  return (
    <div ref={rootRef} style={{ position: "relative", display: "inline-block" }}>
      {effective ? (
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="inline-flex items-center gap-1.5 rounded-full"
          style={{
            padding: isSmall ? "3px 9px" : "5px 11px",
            fontSize: isSmall ? 11 : 12.5,
            fontWeight: 600,
            border: `1px solid ${withAlpha(COLORS.primary, 35)}`,
            background: withAlpha(COLORS.primary, 8),
            color: COLORS.primaryDark,
          }}
        >
          <DrishtiEyeIcon size={isSmall ? 11 : 13} />
          <span>
            {DRISHTI_LABELS[effective].name}
            <span style={{ fontWeight: 400, opacity: 0.7 }}> · {DRISHTI_LABELS[effective].detail}</span>
          </span>
          {showOverrideMark && (
            <span style={{ fontWeight: 700, color: COLORS.gold, fontSize: isSmall ? 9.5 : 10.5 }}>({overrideLabel})</span>
          )}
          <ChevronDown size={isSmall ? 10 : 11} style={{ opacity: 0.6, transform: open ? "rotate(180deg)" : "none", transition: "transform .15s" }} />
        </button>
      ) : explicitNone ? (
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="inline-flex items-center gap-1"
          style={{ fontSize: isSmall ? 11 : 12.5, fontWeight: 500, color: COLORS.inkSoft, opacity: 0.75 }}
        >
          <DrishtiEyeIcon size={isSmall ? 11 : 13} /> nessuna drishti
          <ChevronDown size={isSmall ? 10 : 11} style={{ opacity: 0.6, transform: open ? "rotate(180deg)" : "none", transition: "transform .15s" }} />
        </button>
      ) : (
        <button type="button" onClick={() => setOpen((o) => !o)} className="inline-flex items-center gap-1" style={{ fontSize: isSmall ? 11 : 12.5, fontWeight: 600, color: COLORS.primaryDark }}>
          <DrishtiEyeIcon size={isSmall ? 11 : 13} /> + drishti
        </button>
      )}

      {open && (
        <div
          className="absolute overflow-y-auto flex flex-col"
          style={{
            top: "calc(100% + 6px)",
            left: 0,
            minWidth: 230,
            maxHeight: 300,
            background: COLORS.card,
            border: `1px solid ${COLORS.border}`,
            borderRadius: 12,
            boxShadow: "0 16px 44px rgba(74,58,115,0.20)",
            zIndex: 40,
            padding: 4,
          }}
        >
          <button
            onClick={() => choose(null)}
            className="text-left rounded-lg"
            style={{ padding: "7px 10px", fontSize: 12, fontWeight: 500, color: COLORS.inkSoft, background: value === null && !explicitNone ? withAlpha(COLORS.primary, 10) : "transparent" }}
          >
            {clearLabel}
          </button>
          {canSelectNone && (
            <button
              onClick={() => {
                onSelectNone?.();
                setOpen(false);
              }}
              className="text-left rounded-lg"
              style={{ padding: "7px 10px", fontSize: 12, fontWeight: 500, color: COLORS.inkSoft, background: explicitNone ? withAlpha(COLORS.primary, 10) : "transparent" }}
            >
              Nessuna (solo qui)
            </button>
          )}
          <div style={{ height: 1, background: COLORS.border, margin: "4px 2px" }} />
          {DRISHTI_ORDER.map((d) => (
            <button
              key={d}
              onClick={() => choose(d)}
              className="flex items-center gap-2 text-left rounded-lg"
              style={{ padding: "6px 10px", background: value === d ? withAlpha(COLORS.primary, 12) : "transparent" }}
            >
              <DrishtiEyeIcon size={13} />
              <div>
                <div style={{ fontSize: 12.5, fontWeight: 600, color: value === d ? COLORS.primaryDark : COLORS.ink }}>{DRISHTI_LABELS[d].name}</div>
                <div style={{ fontSize: 10.5, color: COLORS.inkSoft }}>{DRISHTI_LABELS[d].detail}</div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
