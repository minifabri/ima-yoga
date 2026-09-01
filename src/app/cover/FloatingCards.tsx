"use client";

import { CARD_SECTIONS } from "./data";
import { TarotCard } from "./TarotCard";

type CardPose = { left: number; top: number; rot: number; scale: number };

// Tre tappe, guidate dallo scroll (vedi useScrollProgress in hooks.ts):
// 1. COLUMNS — due colonne ai lati della figura, stato iniziale.
// 2. LINE — le carte si raccolgono su un'unica riga orizzontale, ordinata.
// 3. CIRCLE — si dispongono a cerchio; la prima carta (Lezioni) resta al
//    centro, più grande, come carta "in rilievo".
const COLUMN_POSITIONS: CardPose[] = [
  { left: 9, top: 15, rot: 0, scale: 1 },
  { left: 91, top: 15, rot: 0, scale: 1 },
  { left: 6, top: 48, rot: 0, scale: 1 },
  { left: 94, top: 48, rot: 0, scale: 1 },
  { left: 9, top: 79, rot: 0, scale: 1 },
  { left: 91, top: 79, rot: 0, scale: 1 },
];

const LINE_POSITIONS: CardPose[] = [
  { left: 10, top: 58, rot: 0, scale: 1.1 },
  { left: 26, top: 58, rot: 0, scale: 1.1 },
  { left: 42, top: 58, rot: 0, scale: 1.1 },
  { left: 58, top: 58, rot: 0, scale: 1.1 },
  { left: 74, top: 58, rot: 0, scale: 1.1 },
  { left: 90, top: 58, rot: 0, scale: 1.1 },
];

// Pentagono intorno al centro (50%, 52%) per le carte 1..5, più la carta 0
// ferma al centro, in rilievo.
const CIRCLE_POSITIONS: CardPose[] = [
  { left: 50, top: 52, rot: 0, scale: 1.65 },
  { left: 50, top: 24, rot: -4, scale: 1.05 },
  { left: 78.5, top: 43.5, rot: 4, scale: 1.05 },
  { left: 67.5, top: 74.5, rot: 3, scale: 1.05 },
  { left: 32.5, top: 74.5, rot: -3, scale: 1.05 },
  { left: 21.5, top: 43.5, rot: -4, scale: 1.05 },
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

function poseForProgress(i: number, progress: number): CardPose {
  const col = COLUMN_POSITIONS[i];
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
  onSelect,
  scrollProgress,
}: {
  selectedId: string | null;
  onSelect: (id: string) => void;
  scrollProgress: number;
}) {
  return (
    <div id="carte" className="cover-cards-anchor">
      {/* Desktop / tablet: carte che partono ai lati, si allineano su una riga
          e poi si dispongono a cerchio, in tre tappe guidate dallo scroll */}
      <div className="cover-cards-ring" aria-hidden={false}>
        {CARD_SECTIONS.map((section, i) => {
          const pose = poseForProgress(i, scrollProgress);
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
                onSelect={onSelect}
              />
            </div>
          );
        })}
      </div>

      {/* Mobile: griglia verticale a due colonne — niente scroll orizzontale */}
      <div className="cover-cards-grid">
        {CARD_SECTIONS.map((section, i) => (
          <TarotCard key={section.id} section={section} index={i} active={selectedId === section.id} dimmed={false} onSelect={onSelect} />
        ))}
      </div>
    </div>
  );
}
