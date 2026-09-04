"use client";

import { COLORS, withAlpha } from "./colors";
import type { MoreMenuItem } from "./MoreMenu";

// Schermata di ingresso per mobile: al posto del calendario, una griglia di
// bottoni grandi per le scorciatoie principali, con le voci meno usate
// raccolte sotto in una fila scorrevole invece che in un altro menu a tendina
// (su schermi stretti i bottoni a icona del menu "Altro" erano scomodi da toccare).
export function MobileHub({
  primaryItems,
  secondaryItems,
  onSelect,
}: {
  primaryItems: MoreMenuItem[];
  secondaryItems: MoreMenuItem[];
  onSelect: (key: string) => void;
}) {
  return (
    <div>
      <div className="grid grid-cols-2 gap-3">
        {primaryItems.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => onSelect(item.key)}
              className="flex flex-col items-center justify-center gap-2 rounded-2xl text-center"
              style={{
                background: COLORS.card,
                border: `1px solid ${COLORS.border}`,
                padding: "22px 12px",
                minHeight: 108,
              }}
            >
              <span
                className="flex items-center justify-center rounded-full"
                style={{ width: 44, height: 44, background: withAlpha(COLORS.primary, 12), color: COLORS.primary }}
              >
                <Icon size={22} />
              </span>
              <span style={{ fontSize: 13.5, fontWeight: 600, color: COLORS.ink }}>{item.label}</span>
            </button>
          );
        })}
      </div>

      {secondaryItems.length > 0 && (
        <div className="mt-5">
          <div
            style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", color: COLORS.inkSoft }}
            className="mb-2 px-0.5"
          >
            Altro
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollSnapType: "x proximity" }}>
            {secondaryItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => onSelect(item.key)}
                  className="flex flex-col items-center justify-center gap-1.5 rounded-xl flex-shrink-0"
                  style={{
                    background: COLORS.card,
                    border: `1px solid ${COLORS.border}`,
                    padding: "14px 18px",
                    minWidth: 92,
                    scrollSnapAlign: "start",
                  }}
                >
                  <Icon size={18} />
                  <span style={{ fontSize: 11.5, fontWeight: 600, color: COLORS.ink, whiteSpace: "nowrap" }}>{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
