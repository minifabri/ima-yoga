"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { COLORS } from "@/app/admin/colors";

const MAX_OFFSET_X = 2.1;
const MAX_OFFSET_Y = 1.7;

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
      <svg width={19} height={11} viewBox="0 0 26 15" fill="none" aria-hidden="true">
        <ellipse cx={7} cy={7.5} rx={6} ry={6.5} fill={COLORS.card} stroke={COLORS.inkSoft} strokeWidth={1.2} />
        <ellipse cx={19} cy={7.5} rx={6} ry={6.5} fill={COLORS.card} stroke={COLORS.inkSoft} strokeWidth={1.2} />
        <circle
          cx={7}
          cy={7.5}
          r={2.6}
          fill={COLORS.primary}
          style={{ transform: `translate(${offset.x}px, ${offset.y}px)`, transition: "transform 60ms linear" }}
        />
        <circle
          cx={19}
          cy={7.5}
          r={2.6}
          fill={COLORS.primary}
          style={{ transform: `translate(${offset.x}px, ${offset.y}px)`, transition: "transform 60ms linear" }}
        />
      </svg>
      Sbircia il calendario senza accedere
    </Link>
  );
}
