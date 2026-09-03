"use client";

import Image from "next/image";
import type { CardSection } from "./data";
import { useTheme } from "./hooks";

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
  flipping = false,
  onSelect,
}: {
  section: CardSection;
  index: number;
  active: boolean;
  dimmed: boolean;
  flipping?: boolean;
  onSelect: (id: string) => void;
}) {
  const theme = useTheme();
  const image = theme === "light" ? (section.imageLight ?? section.image) : section.image;

  return (
    <button
      type="button"
      className={`tarot-card${active ? " is-active" : ""}${dimmed ? " is-dimmed" : ""}${flipping ? " is-flipping" : ""}`}
      style={{ "--card-index": index, aspectRatio: DISPLAY_RATIO } as React.CSSProperties}
      onClick={() => onSelect(section.id)}
      aria-label={`Apri la sezione ${section.label}`}
    >
      <span className="tarot-card-float">
        <Image
          src={image}
          alt=""
          fill
          quality={95}
          unoptimized
          className="tarot-card-img"
          sizes="(min-width: 860px) 160px, 220px"
        />
      </span>
    </button>
  );
}
