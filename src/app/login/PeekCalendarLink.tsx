"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { COLORS } from "@/app/admin/colors";

const MAX_OFFSET_X = 2.1;
const MAX_OFFSET_Y = 1.7;

// Un occhio a mandorla, leggermente all'insù agli angoli esterni, con l'iride
// a sfumatura dorato-viola: più "terzo occhio che sbircia" che emoji da cartone.
function Eye({ cx, offset }: { cx: number; offset: { x: number; y: number } }) {
  const cy = 10;
  return (
    <>
      <path
        d={`M${cx - 6} ${cy}C${cx - 6} ${cy} ${cx - 3} ${cy - 4.5} ${cx} ${cy - 4.5}C${cx + 3} ${cy - 4.5} ${cx + 6} ${cy} ${cx + 6} ${cy}C${cx + 6} ${cy} ${cx + 3} ${cy + 3.5} ${cx} ${cy + 3.5}C${cx - 3} ${cy + 3.5} ${cx - 6} ${cy} ${cx - 6} ${cy}Z`}
        fill={COLORS.card}
        stroke={COLORS.inkSoft}
        strokeWidth={1.1}
        strokeLinejoin="round"
      />
      <circle
        cx={cx}
        cy={cy}
        r={2.4}
        fill="url(#peek-iris)"
        style={{ transform: `translate(${offset.x}px, ${offset.y}px)`, transition: "transform 60ms linear" }}
      />
      <circle
        cx={cx}
        cy={cy}
        r={0.85}
        fill={COLORS.heading}
        style={{ transform: `translate(${offset.x}px, ${offset.y}px)`, transition: "transform 60ms linear" }}
      />
    </>
  );
}

export function PeekCalendarLink() {
  const ref = useRef<HTMLAnchorElement>(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  function handleMove(e: React.MouseEvent<HTMLAnchorElement>) {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    const dx = e.clientX - (rect.left + rect.width / 2);
    const dy = e.clientY - (rect.top + rect.height / 2);
    const dist = Math.hypot(dx, dy) || 1;
    setOffset({ x: (dx / dist) * MAX_OFFSET_X, y: (dy / dist) * MAX_OFFSET_Y });
  }

  return (
    <Link
      ref={ref}
      href="/calendario"
      onMouseMove={handleMove}
      onMouseLeave={() => setOffset({ x: 0, y: 0 })}
      className="inline-flex items-center gap-1.5"
      style={{ fontSize: 12, color: "var(--ink-soft)" }}
    >
      <svg width={30} height={16} viewBox="0 0 30 16" fill="none" aria-hidden="true">
        <style>{`
          @keyframes peek-spark-breathe { 0%,100%{ transform: scale(1); opacity:.55 } 50%{ transform: scale(1.35); opacity:1 } }
          @keyframes peek-twinkle { 0%,100%{ opacity:.15 } 50%{ opacity:.75 } }
          .peek-spark { animation: peek-spark-breathe 3s ease-in-out infinite; }
          .peek-twinkle-a { animation: peek-twinkle 2.4s ease-in-out infinite; }
          .peek-twinkle-b { animation: peek-twinkle 2.4s ease-in-out infinite .8s; }
        `}</style>
        <defs>
          <radialGradient id="peek-iris" cx="35%" cy="32%" r="70%">
            <stop offset="0%" stopColor={COLORS.gold} />
            <stop offset="45%" stopColor={COLORS.primary} />
            <stop offset="100%" stopColor={COLORS.primaryDark} />
          </radialGradient>
          <filter id="peek-glow" x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation="0.6" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <Eye cx={8} offset={offset} />
        <Eye cx={22} offset={offset} />
        {/* piccola luna crescente + scintilla sopra, come un terzo occhio: stesso linguaggio della luna del tema */}
        <g className="peek-spark" filter="url(#peek-glow)" style={{ transformOrigin: "15px 1.8px" }}>
          <path d="M14.5 0.3a1.5 1.5 0 1 0 0 3 1.15 1.15 0 0 1 0-3z" fill={COLORS.gold} />
          <path d="M17 1.5 L17.2 2.1 L17.8 2.3 L17.2 2.5 L17 3.1 L16.8 2.5 L16.2 2.3 L16.8 2.1 Z" fill={COLORS.gold} />
        </g>
        <circle className="peek-twinkle-a" cx={2} cy={5} r={0.5} fill={COLORS.gold} />
        <circle className="peek-twinkle-b" cx={28} cy={5} r={0.5} fill={COLORS.gold} />
      </svg>
      Sbircia il calendario senza accedere
    </Link>
  );
}
