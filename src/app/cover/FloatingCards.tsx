"use client";

import { useEffect, useState } from "react";
import { CARD_SECTIONS } from "./data";
import { TarotCard } from "./TarotCard";

type CardPose = { left: number; top: number; rot: number; scale: number };

// Larghezza della finestra, per adattare lo scarto orizzontale delle colonne
// (vedi columnLeftForWidth) — SSR e primo render assumono desktop "largo",
// corretto subito dopo il mount.
function useViewportWidth(defaultWidth = 1280) {
  const [width, setWidth] = useState(defaultWidth);
  useEffect(() => {
    function update() {
      setWidth(window.innerWidth);
    }
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);
  return width;
}

// Tre tappe, guidate dallo scroll (vedi useScrollProgress in hooks.ts):
// 1. COLUMNS — due colonne ai lati della figura, stato iniziale.
// 2. LINE — le carte si raccolgono su un'unica riga orizzontale, ordinata.
// 3. CIRCLE — si dispongono a cerchio; la prima carta (Lezioni) resta al
//    centro, più grande, come carta "in rilievo".
// Colonna sinistra (indici pari 0/2/4) e colonna destra (indici dispari
// 1/3/5), 3 carte ciascuna, allineate a coppie sulla stessa riga, a fianco
// della figura centrale. Il top parte da 28% (non più 14%) per lasciare
// respiro sotto il banner. `arc` sposta la riga rispetto al centro (punti
// percentuali extra di distanza): positivo per la riga centrale, così le
// colonne si incurvano leggermente verso l'esterno all'altezza del busto e
// si stringono verso testa/gambe, avvolgendo la figura invece di restare
// due linee dritte.
const COLUMN_TOPS: { side: "L" | "R"; top: number; arc: number }[] = [
  { side: "L", top: 28, arc: 0 },
  { side: "R", top: 28, arc: 0 },
  { side: "L", top: 53, arc: 3 },
  { side: "R", top: 53, arc: 3 },
  { side: "L", top: 78, arc: 0 },
  { side: "R", top: 78, arc: 0 },
];

// Quanto sono vicine al centro le colonne dipende dalla larghezza: al limite
// minimo del layout a due colonne (860px) il titolo dell'hero è relativamente
// più largo e le carte devono restare più esterne per non coprirlo; su schermi
// più larghi il titolo pesa meno e le carte possono avvicinarsi alla figura.
const COLUMN_MIN_VW = 860;
const COLUMN_MAX_VW = 1400;
const COLUMN_LEFT_MIN = 20;
const COLUMN_LEFT_MAX = 27;

// Sotto questa larghezza ("responsive": tablet e laptop stretti) le colonne
// si spostano di un pizzico verso l'esterno rispetto al valore base.
const RESPONSIVE_MAX_VW = 1280;
const RESPONSIVE_EXTRA_OFFSET = 2;

function columnLeftForWidth(vw: number) {
  const t = Math.min(1, Math.max(0, (vw - COLUMN_MIN_VW) / (COLUMN_MAX_VW - COLUMN_MIN_VW)));
  const left = COLUMN_LEFT_MIN + (COLUMN_LEFT_MAX - COLUMN_LEFT_MIN) * t;
  return vw < RESPONSIVE_MAX_VW ? left - RESPONSIVE_EXTRA_OFFSET : left;
}

function buildColumnPositions(vw: number): CardPose[] {
  const colLeft = columnLeftForWidth(vw);
  return COLUMN_TOPS.map(({ side, top, arc }) => ({
    left: side === "L" ? colLeft - arc : 100 - colLeft + arc,
    top,
    rot: 0,
    scale: 1,
  }));
}

const LINE_POSITIONS: CardPose[] = [
  { left: 13, top: 58, rot: 0, scale: 1.1 },
  { left: 27.8, top: 58, rot: 0, scale: 1.1 },
  { left: 42.6, top: 58, rot: 0, scale: 1.1 },
  { left: 57.4, top: 58, rot: 0, scale: 1.1 },
  { left: 72.2, top: 58, rot: 0, scale: 1.1 },
  { left: 87, top: 58, rot: 0, scale: 1.1 },
];

// Pentagono intorno al centro (50%, 52%) per le carte 1..5, più la carta 0
// ferma al centro, in rilievo.
const CIRCLE_POSITIONS: CardPose[] = [
  { left: 50, top: 52, rot: 0, scale: 1.65 },
  { left: 50, top: 29, rot: -4, scale: 1.05 },
  { left: 71, top: 45, rot: 4, scale: 1.05 },
  { left: 63, top: 71, rot: 3, scale: 1.05 },
  { left: 37, top: 71, rot: -3, scale: 1.05 },
  { left: 29, top: 45, rot: 4, scale: 1.05 },
];

const T1_START = 0.12;
const T1_END = 0.42;
const T2_START = 0.58;
const T2_END = 0.88;

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}
function ease(t: number) {
  return t * t * (3 - 2 * t);
}
function lerpPose(a: CardPose, b: CardPose, t: number): CardPose {
  return { left: lerp(a.left, b.left, t), top: lerp(a.top, b.top, t), rot: lerp(a.rot, b.rot, t), scale: lerp(a.scale, b.scale, t) };
}

function poseForProgress(i: number, progress: number, columnPositions: CardPose[]): CardPose {
  const col = columnPositions[i];
  const line = LINE_POSITIONS[i];
  const circle = CIRCLE_POSITIONS[i];
  if (progress <= T1_START) return col;
  if (progress <= T1_END) return lerpPose(col, line, ease((progress - T1_START) / (T1_END - T1_START)));
  if (progress <= T2_START) return line;
  if (progress <= T2_END) return lerpPose(line, circle, ease((progress - T2_START) / (T2_END - T2_START)));
  return circle;
}

export function FloatingCards({
  selectedId,
  flippingId,
  onSelect,
  scrollProgress,
}: {
  selectedId: string | null;
  flippingId: string | null;
  onSelect: (id: string) => void;
  scrollProgress: number;
}) {
  const viewportWidth = useViewportWidth();
  const columnPositions = buildColumnPositions(viewportWidth);

  return (
    <div id="carte" className="cover-cards-anchor">
      {/* Desktop / tablet: carte che partono ai lati, si allineano su una riga
          e poi si dispongono a cerchio, in tre tappe guidate dallo scroll */}
      <div className="cover-cards-ring" aria-hidden={false}>
        {CARD_SECTIONS.map((section, i) => {
          const pose = poseForProgress(i, scrollProgress, columnPositions);
          const isCenterFeatured = i === 0 && scrollProgress > T2_START;
          return (
            <div
              key={section.id}
              className={`cover-card-slot${isCenterFeatured ? " is-featured" : ""}`}
              style={{
                left: `${pose.left}%`,
                top: `${pose.top}%`,
                transform: `translate(-50%, -50%) rotate(${pose.rot}deg) scale(${pose.scale})`,
              }}
            >
              <TarotCard
                section={section}
                index={i}
                active={selectedId === section.id}
                dimmed={selectedId !== null && selectedId !== section.id}
                flipping={flippingId === section.id}
                onSelect={onSelect}
              />
            </div>
          );
        })}
      </div>

      {/* Mobile: griglia verticale a due colonne — niente scroll orizzontale */}
      <div className="cover-cards-grid">
        {CARD_SECTIONS.map((section, i) => (
          <TarotCard
            key={section.id}
            section={section}
            index={i}
            active={selectedId === section.id}
            dimmed={false}
            flipping={flippingId === section.id}
            onSelect={onSelect}
          />
        ))}
      </div>
    </div>
  );
}
