"use client";

import type { CSSProperties } from "react";
import { useCallback, useEffect, useState } from "react";
import { CARD_SECTIONS } from "./cardSections";
import { Card } from "./Card";

// Disposizione a ventaglio: le carte centrali stanno più in alto e dritte,
// quelle ai lati ruotano leggermente e scendono, come tenute in mano.
function fanStyle(index: number, total: number): CSSProperties {
  const mid = (total - 1) / 2;
  const t = index - mid;
  const rot = t * 6;
  const y = Math.abs(t) * 16;
  return {
    "--fan-rot": `${rot}deg`,
    "--fan-y": `${y}px`,
    "--fan-overlap": index === 0 ? "0px" : "-56px",
    "--fan-delay": `${index * 0.35}s`,
    zIndex: index,
  } as CSSProperties;
}

export function Deck() {
  const [hasHover, setHasHover] = useState(
    () => typeof window === "undefined" || window.matchMedia("(hover: hover) and (pointer: fine)").matches,
  );
  const [activeId, setActiveId] = useState<string | null>(null);
  const [flippedId, setFlippedId] = useState<string | null>(null);

  useEffect(() => {
    const mql = window.matchMedia("(hover: hover) and (pointer: fine)");
    const onChange = (e: MediaQueryListEvent) => setHasHover(e.matches);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  const closeAll = useCallback(() => {
    setActiveId(null);
    setFlippedId(null);
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") closeAll();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [closeAll]);

  function handleTap(id: string) {
    // Desktop (hover disponibile): un click apre/chiude direttamente.
    if (hasHover) {
      setFlippedId((cur) => (cur === id ? null : id));
      setActiveId(null);
      return;
    }
    // Mobile: primo tap solleva la carta, secondo tap la gira.
    if (flippedId === id) return;
    if (activeId === id) {
      setFlippedId(id);
    } else {
      setActiveId(id);
      setFlippedId(null);
    }
  }

  return (
    <div
      className="flex-1 w-full flex flex-wrap md:flex-nowrap items-center md:items-end justify-center gap-7 md:gap-0 px-5 py-10"
      onClick={(e) => {
        if (e.target === e.currentTarget) closeAll();
      }}
    >
      {CARD_SECTIONS.map((section, index) => {
        const status = flippedId === section.id ? "flipped" : activeId === section.id ? "active" : "closed";
        return (
          <Card
            key={section.id}
            section={section}
            status={status}
            fanStyle={fanStyle(index, CARD_SECTIONS.length)}
            onTap={() => handleTap(section.id)}
            onClose={closeAll}
          />
        );
      })}
    </div>
  );
}
