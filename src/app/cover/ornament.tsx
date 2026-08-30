// Motivo decorativo del "dorso" carta: cornice ornata + mandala centrale (luna e
// scintilla, lo stesso motivo del logo in ThemeToggle.tsx) + piccoli fregi d'angolo.
// Puramente decorativo — sempre lo stesso su ogni carta, come il dorso di un mazzo.
function corner(cx: number, cy: number, r: number) {
  const p = (dx: number, dy: number) => `${cx + dx},${cy + dy}`;
  return [
    "M",
    p(0, -r),
    "L",
    p(r * 0.32, -r * 0.32),
    "L",
    p(r, 0),
    "L",
    p(r * 0.32, r * 0.32),
    "L",
    p(0, r),
    "L",
    p(-r * 0.32, r * 0.32),
    "L",
    p(-r, 0),
    "L",
    p(-r * 0.32, -r * 0.32),
    "Z",
  ].join(" ");
}

export function CardBackOrnament() {
  return (
    <svg
      viewBox="0 0 200 288"
      width="100%"
      height="100%"
      aria-hidden="true"
      style={{ position: "absolute", inset: 0 }}
    >
      <rect x="9" y="9" width="182" height="270" rx="12" fill="none" stroke="var(--border)" strokeWidth="1.2" />
      <rect
        x="15"
        y="15"
        width="170"
        height="258"
        rx="8"
        fill="none"
        stroke="var(--gold)"
        strokeWidth="1"
        opacity="0.55"
      />

      <g stroke="var(--border)" fill="none" opacity="0.55">
        <circle cx="100" cy="140" r="54" strokeDasharray="1.5 5" />
        <circle cx="100" cy="140" r="40" strokeDasharray="1 6" />
      </g>

      <g fill="var(--gold)" opacity="0.6">
        <path d={corner(24, 27, 7)} />
        <path d={corner(176, 27, 7)} />
        <path d={corner(24, 253, 7)} />
        <path d={corner(176, 253, 7)} />
      </g>

      {/* luna + scintilla, come il logo — in alto, come un piccolo stemma */}
      <g transform="translate(64 28) scale(2.4)" opacity="0.85">
        <path d="M12.6 5a5.4 5.4 0 1 0 0 10 4.3 4.3 0 0 1 0-10z" stroke="var(--gold)" strokeWidth="1" fill="none" />
        <path
          d="M15.5 2.3 L16 3.7 L17.4 4.3 L16 4.9 L15.5 6.3 L15 4.9 L13.6 4.3 L15 3.7 Z"
          fill="var(--gold)"
        />
      </g>
    </svg>
  );
}
