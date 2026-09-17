import { useId } from "react";
import { COLORS } from "./colors";

type DrishtiPalette = { card: string; stroke: string; gold: string; primary: string; primaryDark: string; pupil: string };

const THEME_PALETTE: DrishtiPalette = {
  card: COLORS.card,
  stroke: COLORS.inkSoft,
  gold: COLORS.gold,
  primary: COLORS.primary,
  primaryDark: COLORS.primaryDark,
  pupil: COLORS.heading,
};

// Tavolozza fissa su carta bianca per la scheda stampata/PDF: quella scheda
// non segue il tema chiaro/scuro dell'app (vedi i colori hex fissi nel CSS
// di stampa in SequenceEditor.tsx), quindi l'occhio non può usare le CSS
// custom properties di COLORS.* — userebbero il tema del momento invece
// della tavolozza pensata per la carta.
export const DRISHTI_PRINT_PALETTE: DrishtiPalette = {
  card: "#fff",
  stroke: "#9C4FA0",
  gold: "#E4C77A",
  primary: "#9C4FA0",
  primaryDark: "#2A2440",
  pupil: "#2A2440",
};

// Occhio a mandorla statico, stesso linguaggio visivo di PeekEyesIcon.tsx
// (iride a sfumatura dorato-viola) ma singolo e senza animazione: pensato
// per comparire tante volte in un elenco (badge drishti nel catalogo e
// nell'editor sequenze) senza diventare rumoroso.
export function DrishtiEyeIcon({ size = 14, palette = THEME_PALETTE }: { size?: number; palette?: DrishtiPalette }) {
  const irisId = `drishti-iris-${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <defs>
        <radialGradient id={irisId} cx="35%" cy="32%" r="70%">
          <stop offset="0%" stopColor={palette.gold} />
          <stop offset="45%" stopColor={palette.primary} />
          <stop offset="100%" stopColor={palette.primaryDark} />
        </radialGradient>
      </defs>
      <path
        d="M2 8C2 8 5 3.5 8 3.5C11 3.5 14 8 14 8C14 8 11 11.5 8 11.5C5 11.5 2 8 2 8Z"
        fill={palette.card}
        stroke={palette.stroke}
        strokeWidth={1.1}
        strokeLinejoin="round"
      />
      <circle cx={8} cy={8} r={2.4} fill={`url(#${irisId})`} />
      <circle cx={8} cy={8} r={0.85} fill={palette.pupil} />
    </svg>
  );
}
