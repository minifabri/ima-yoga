"use client";

import Image from "next/image";
import type { CardSection } from "./data";
import { useTheme } from "./hooks";

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
  const isLight = theme === "light";
  const image = isLight ? (section.imageLight ?? section.image) : section.image;
  // Rapporto derivato dalle dimensioni reali dell'artwork, per tema — evita
  // che object-fit: cover ritagli l'immagine in alto/basso quando la variante
  // chiara ha proporzioni diverse da quella scura.
  const imageWidth = isLight ? (section.imageLightWidth ?? section.imageWidth) : section.imageWidth;
  const imageHeight = isLight ? (section.imageLightHeight ?? section.imageHeight) : section.imageHeight;

  return (
    <button
      type="button"
      className={`tarot-card${active ? " is-active" : ""}${dimmed ? " is-dimmed" : ""}${flipping ? " is-flipping" : ""}`}
      style={{ "--card-index": index, aspectRatio: `${imageWidth} / ${imageHeight}` } as React.CSSProperties}
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
