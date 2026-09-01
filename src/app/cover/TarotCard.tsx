"use client";

import Image from "next/image";
import type { CardSection } from "./data";

// Rapporto di visualizzazione della carta — più largo del rapporto nativo
// dell'illustrazione (che è molto stretta e allungata), per una proporzione
// da tarocco classico. L'immagine viene ritagliata (object-fit: cover), non
// distorta.
const DISPLAY_RATIO = "0.56";

export function TarotCard({
  section,
  index,
  active,
  dimmed,
  onSelect,
}: {
  section: CardSection;
  index: number;
  active: boolean;
  dimmed: boolean;
  onSelect: (id: string) => void;
}) {
  return (
    <button
      type="button"
      className={`tarot-card${active ? " is-active" : ""}${dimmed ? " is-dimmed" : ""}`}
      style={{ "--card-index": index, aspectRatio: DISPLAY_RATIO } as React.CSSProperties}
      onClick={() => onSelect(section.id)}
      aria-label={`Apri la sezione ${section.label}`}
    >
      <span className="tarot-card-float">
        <Image
          src={section.image}
          alt=""
          fill
          className="tarot-card-img"
          sizes="(min-width: 860px) 160px, 220px"
        />
      </span>
    </button>
  );
}
