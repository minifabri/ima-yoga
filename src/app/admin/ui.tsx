"use client";

import type { CSSProperties, ReactNode } from "react";
import { COLORS, withAlpha } from "./colors";

export const inputStyle: CSSProperties = {
  width: "100%",
  border: `1px solid ${COLORS.border}`,
  borderRadius: 9,
  padding: "8px 10px",
  fontSize: 13,
  background: COLORS.bg,
  color: COLORS.ink,
  outline: "none",
};

export function IconButton({
  onClick,
  title,
  children,
  style,
}: {
  onClick?: () => void;
  title?: string;
  children: ReactNode;
  style?: CSSProperties;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      type="button"
      className="flex items-center justify-center rounded-lg transition"
      style={{ width: 36, height: 36, color: COLORS.ink, ...style }}
      onMouseEnter={(e) => (e.currentTarget.style.background = COLORS.subtle)}
      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
    >
      {children}
    </button>
  );
}

export function Badge({ color, children }: { color: string; children: ReactNode }) {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full"
      style={{
        background: withAlpha(color, 12),
        color,
        fontSize: 11,
        fontWeight: 600,
        padding: "2px 8px",
        border: `1px solid ${withAlpha(color, 33)}`,
      }}
    >
      {children}
    </span>
  );
}

export function CapacityBar({
  booked,
  capacity,
  waiting = 0,
}: {
  booked: number;
  capacity: number;
  waiting?: number;
}) {
  const capNum = Number(capacity) || 0;
  const full = capNum > 0 && booked >= capNum;
  const ratio = capNum > 0 ? Math.min(1, booked / capNum) : 0;
  const barColor = full ? COLORS.danger : ratio >= 0.7 ? COLORS.gold : COLORS.success;
  // Con lista d'attesa, quella è l'informazione utile: "al completo" diventa ridondante.
  const showWaitlistLabel = full && waiting > 0;
  const label = showWaitlistLabel ? `${waiting} in lista d'attesa` : full ? "Al completo" : "Posti liberi";
  const labelColor = showWaitlistLabel ? COLORS.gold : barColor;

  return (
    <div>
      <div style={{ height: 6, borderRadius: 999, background: COLORS.subtle, overflow: "hidden" }}>
        <div
          style={{
            height: "100%",
            width: `${capNum > 0 ? ratio * 100 : 0}%`,
            background: barColor,
            borderRadius: 999,
            transition: "width .2s",
          }}
        />
      </div>
      <div className="flex items-center justify-between mt-1" style={{ fontSize: 10.5 }}>
        <span style={{ color: labelColor, fontWeight: 700 }}>{label}</span>
        <span style={{ color: COLORS.inkSoft }}>
          {booked}/{capNum || "—"}
          {waiting > 0 && !showWaitlistLabel && <span style={{ color: COLORS.gold, fontWeight: 700 }}> · {waiting} in attesa</span>}
        </span>
      </div>
    </div>
  );
}

export function Modal({
  onClose,
  children,
  width = 480,
}: {
  onClose: () => void;
  children: ReactNode;
  width?: number;
}) {
  return (
    <div
      className="fixed inset-0 flex items-center justify-center p-4"
      style={{ background: "rgba(74,58,115,0.35)", zIndex: 50 }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="w-full overflow-hidden"
        style={{
          maxWidth: width,
          background: COLORS.card,
          borderRadius: 18,
          boxShadow: "0 16px 44px rgba(74,58,115,0.16)",
          maxHeight: "88dvh",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {children}
      </div>
    </div>
  );
}

// Interruttore acceso/spento inequivocabile: non solo posizione e colore del
// cursore (che sul tema chiaro, con la pista "spenta" quasi bianca su sfondo
// bianco, restavano poco leggibili), ma anche un'etichetta Sì/No esplicita —
// a differenza dei chip testuali usati altrove che a volte cambiano solo di
// una lettera tra stato attivo/disattivo e sono facili da fraintendere.
export function Switch({
  checked,
  onChange,
  label,
  onText = "Sì",
  offText = "No",
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  onText?: string;
  offText?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex items-center gap-2.5"
    >
      <span
        style={{
          width: 36,
          height: 21,
          borderRadius: 999,
          position: "relative",
          flexShrink: 0,
          background: checked ? COLORS.primary : COLORS.subtle,
          border: `1.5px solid ${checked ? COLORS.primary : COLORS.inkSoft}`,
          transition: "background .15s, border-color .15s",
        }}
      >
        <span
          style={{
            position: "absolute",
            top: 1,
            left: checked ? 16 : 1,
            width: 16,
            height: 16,
            borderRadius: "50%",
            background: "#fff",
            transition: "left .15s",
            boxShadow: "0 1px 3px rgba(0,0,0,0.35)",
          }}
        />
      </span>
      <span style={{ fontSize: 12.5, fontWeight: 600, color: COLORS.ink, textAlign: "left" }}>
        {label}{" "}
        <span style={{ fontWeight: 800, color: checked ? COLORS.success : COLORS.inkSoft }}>· {checked ? onText : offText}</span>
      </span>
    </button>
  );
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block mb-1">
      <div style={{ fontSize: 11.5, fontWeight: 600, color: COLORS.inkSoft, marginBottom: 4 }}>{label}</div>
      {children}
    </label>
  );
}
