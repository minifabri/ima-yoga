"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, MoreHorizontal } from "lucide-react";
import { COLORS, withAlpha } from "./colors";

export type MoreMenuItem = {
  key: string;
  label: string;
  icon: React.ComponentType<{ size?: number }>;
};

// Voci di navigazione secondarie, raccolte in un menu a tendina invece di
// stare tutte in riga: con la barra admin già stretta (calendario, clienti,
// pagamenti + azioni rapide), non c'entrano tutte senza sovraffollare o
// dover scorrere lateralmente.
export function MoreMenu({
  items,
  activeKey,
  onSelect,
}: {
  items: MoreMenuItem[];
  activeKey: string;
  onSelect: (key: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const activeItem = items.find((i) => i.key === activeKey);

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

  return (
    <div ref={rootRef} style={{ position: "relative" }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="px-2.5 py-2 rounded-lg text-sm font-medium flex items-center gap-1.5"
        style={{
          background: activeItem ? COLORS.primary : "transparent",
          color: activeItem ? "#fff" : COLORS.ink,
          border: activeItem ? "none" : `1px solid ${COLORS.border}`,
        }}
      >
        {activeItem ? <activeItem.icon size={15} /> : <MoreHorizontal size={15} />}
        <span className="hidden sm:inline">{activeItem ? activeItem.label : "Altro"}</span>
        <ChevronDown size={13} style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform .15s" }} />
      </button>

      {open && (
        <div
          className="absolute overflow-hidden flex flex-col"
          style={{
            top: "calc(100% + 8px)",
            right: 0,
            minWidth: 190,
            background: COLORS.card,
            border: `1px solid ${COLORS.border}`,
            borderRadius: 12,
            boxShadow: "0 16px 44px rgba(74,58,115,0.20)",
            zIndex: 40,
            padding: 4,
          }}
        >
          {items.map((item) => {
            const Icon = item.icon;
            const isActive = item.key === activeKey;
            return (
              <button
                key={item.key}
                onClick={() => {
                  onSelect(item.key);
                  setOpen(false);
                }}
                className="flex items-center gap-2 text-left rounded-lg"
                style={{
                  padding: "8px 10px",
                  fontSize: 13,
                  fontWeight: 500,
                  background: isActive ? withAlpha(COLORS.primary, 12) : "transparent",
                  color: isActive ? COLORS.primaryDark : COLORS.ink,
                }}
              >
                <Icon size={15} /> {item.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
