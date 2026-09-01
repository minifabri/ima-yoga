// Icone line-art celestiali per le carte — stesso linguaggio grafico del logo
// ufficiale (tratto sottile, oro/viola), disegnate a mano per restare coerenti
// con la simbologia di ogni sezione (vedi brief) invece di riusare asset raster.

function IconFrame({ size = 40, children }: { size?: number; children: React.ReactNode }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" aria-hidden="true">
      {children}
    </svg>
  );
}

// Arrotondato a 2 decimali: il calcolo trigonometrico inline puo' altrimenti
// serializzare l'ultimo bit in modo diverso tra render server e client
// (stesso valore matematico, stringa diversa) e far scattare un mismatch di idratazione.
const r2 = (n: number) => Math.round(n * 100) / 100;

export function ChiSonoIcon({ size }: { size?: number }) {
  return (
    <IconFrame size={size}>
      <path
        d="M24 14c-6 3-9 9-9 15 0 9 7 17 15 19-8-1-16-9-16-19 0-8 4-14 10-17z"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
      <path d="M24 14a13 13 0 1 0 6 24" stroke="currentColor" strokeWidth="1.2" fill="none" />
      <circle cx="26" cy="21" r="1.4" fill="currentColor" />
      <path d="M32 8v4M32 44v4M12 26h-4M52 26h-4" stroke="currentColor" strokeWidth="1" strokeLinecap="round" opacity="0.6" />
      <circle cx="32" cy="26" r="18" stroke="currentColor" strokeWidth="0.6" opacity="0.35" strokeDasharray="1 4" />
    </IconFrame>
  );
}

export function LezioniIcon({ size }: { size?: number }) {
  return (
    <IconFrame size={size}>
      <circle cx="32" cy="32" r="7" fill="currentColor" opacity="0.9" />
      {Array.from({ length: 12 }).map((_, i) => {
        const angle = (i * 30 * Math.PI) / 180;
        const inner = 13;
        const outer = i % 3 === 0 ? 27 : 20;
        const x1 = r2(32 + Math.cos(angle) * inner);
        const y1 = r2(32 + Math.sin(angle) * inner);
        const x2 = r2(32 + Math.cos(angle) * outer);
        const y2 = r2(32 + Math.sin(angle) * outer);
        return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="currentColor" strokeWidth="1" strokeLinecap="round" />;
      })}
    </IconFrame>
  );
}

export function MeditazioneIcon({ size }: { size?: number }) {
  return (
    <IconFrame size={size}>
      <path d="M6 32c8-10 18-15 26-15s18 5 26 15c-8 10-18 15-26 15S14 42 6 32z" stroke="currentColor" strokeWidth="1.1" strokeLinejoin="round" />
      <circle cx="32" cy="32" r="7" stroke="currentColor" strokeWidth="1.1" />
      <circle cx="32" cy="32" r="2.6" fill="currentColor" />
      <path d="M32 6v6M32 52v6M9 15l4 4M51 15l-4 4M9 49l4-4M51 49l-4-4" stroke="currentColor" strokeWidth="0.9" strokeLinecap="round" opacity="0.55" />
    </IconFrame>
  );
}

export function RitiriIcon({ size }: { size?: number }) {
  return (
    <IconFrame size={size}>
      <path d="M40 12a10 10 0 1 0 8 16 10 10 0 0 1-8-16z" stroke="currentColor" strokeWidth="1.1" strokeLinejoin="round" />
      <path d="M4 46l13-16 8 9 5-6 16 13z" stroke="currentColor" strokeWidth="1.1" strokeLinejoin="round" strokeLinecap="round" fill="none" />
      <path d="M4 50h56" stroke="currentColor" strokeWidth="1" strokeLinecap="round" opacity="0.6" />
    </IconFrame>
  );
}

export function CalendarioIcon({ size }: { size?: number }) {
  return (
    <IconFrame size={size}>
      <circle cx="32" cy="32" r="20" stroke="currentColor" strokeWidth="0.8" opacity="0.5" />
      <circle cx="32" cy="32" r="13" stroke="currentColor" strokeWidth="0.8" opacity="0.7" strokeDasharray="1 4" />
      <path d="M32 15a9 9 0 1 0 6.5 15.2A9 9 0 0 1 32 15z" fill="currentColor" opacity="0.9" />
      {[0, 60, 120, 180, 240, 300].map((deg) => (
        <circle
          key={deg}
          cx={r2(32 + Math.cos((deg * Math.PI) / 180) * 20)}
          cy={r2(32 + Math.sin((deg * Math.PI) / 180) * 20)}
          r="1.2"
          fill="currentColor"
        />
      ))}
    </IconFrame>
  );
}

export function ContattiIcon({ size }: { size?: number }) {
  return (
    <IconFrame size={size}>
      <path
        d="M14 46c0-9 4-14 8-18-1 5 0 8 2 10 1-6 4-10 9-13-1 6 1 10 4 12 2-6 6-9 9-10-2 5-1 10 2 13 2 2 3 4 3 6"
        stroke="currentColor"
        strokeWidth="1.1"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <path d="M8 50c6-3 12-3 18 0s12 3 18 0 12-3 12-3" stroke="currentColor" strokeWidth="1" strokeLinecap="round" opacity="0.6" />
      <path d="M42 12l1.6 4L48 17.6 44 19l-1.6 4-1.6-4L37 17.6 41 16z" fill="currentColor" opacity="0.85" />
    </IconFrame>
  );
}
