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
        {/* Le due varianti restano entrambe montate e si dissolvono via opacity
            (invece di scambiare src di scatto): lo swap segue lo stesso ritmo
            dello sfondo, invece di "arrivare in ritardo" una volta scaricata. */}
        <Image
          src={section.image}
          alt=""
          fill
          quality={95}
          unoptimized
          className="tarot-card-img theme-crossfade-img"
          style={{ opacity: isLight ? 0 : 1 }}
          sizes="(min-width: 860px) 160px, 220px"
        />
        {section.imageLight && (
          <Image
            src={section.imageLight}
            alt=""
            fill
            quality={95}
            unoptimized
            className="tarot-card-img theme-crossfade-img"
            style={{ opacity: isLight ? 1 : 0 }}
            sizes="(min-width: 860px) 160px, 220px"
          />
        )}
      </span>
    </button>
  );
}
