import { COLORS } from "./colors";

// Simbolo: mezzaluna + scintilla dorata che "respira". Placeholder disegnato
// in SVG in attesa del logo definitivo — sostituendo questo componente si
// aggiorna ovunque compaia (header gestionale e area cliente).
function LogoMark({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 36 36" fill="none" aria-hidden="true">
      <style>{`
        @keyframes logo-mark-breathe { 0%,100%{ transform: scale(1); opacity:.55 } 50%{ transform: scale(1.35); opacity:1 } }
        .logo-mark-spark { animation: logo-mark-breathe 4s ease-in-out infinite; }
      `}</style>
      <path d="M23 9a10 10 0 1 0 0 20 7.8 7.8 0 0 1 0-20z" stroke={COLORS.heading} strokeWidth="1.3" strokeLinejoin="round" />
      <g className="logo-mark-spark" style={{ transformOrigin: "28px 8px" }}>
        <path d="M28 4.5 L28.9 7.1 L31.5 8 L28.9 8.9 L28 11.5 L27.1 8.9 L24.5 8 L27.1 7.1 Z" fill={COLORS.gold} />
      </g>
    </svg>
  );
}

// Blocco logo condiviso da header gestionale e area cliente: simbolo +
// etichetta contestuale (es. "Gestionale" o "Ciao Fabrizia") + wordmark
// "ima yoga". `kicker` distingue il contesto senza duplicare lo stile.
export function Logo({ kicker, size = 36 }: { kicker: string; size?: number }) {
  return (
    <div className="flex items-center gap-3">
      <LogoMark size={size} />
      <div>
        <div style={{ fontWeight: 700, fontSize: 10, letterSpacing: 2.5, color: COLORS.gold, textTransform: "uppercase" }}>{kicker}</div>
        <div style={{ fontFamily: "var(--font-display)", fontWeight: 500, fontSize: 26, lineHeight: 1, color: COLORS.heading }}>ima yoga</div>
      </div>
    </div>
  );
}
