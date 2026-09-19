"use client";

import Image from "next/image";
import type { SectionImage } from "./data";
import { useTheme } from "./hooks";

// Carta della sezione a grandezza "hero" (overlay e pagine statiche): monta la
// variante scura e quella chiara e le scambia con una dissolvenza, come fa
// TarotCard. Il rapporto segue le dimensioni reali dell'artwork del tema.
export function SectionCardImage({
  image,
  width,
  sizes,
}: {
  image: SectionImage;
  width?: string;
  sizes: string;
}) {
  const isLight = useTheme() === "light";
  const imageWidth = isLight ? (image.imageLightWidth ?? image.imageWidth) : image.imageWidth;
  const imageHeight = isLight ? (image.imageLightHeight ?? image.imageHeight) : image.imageHeight;

  return (
    <div className="cover-overlay-image-wrap" style={{ aspectRatio: `${imageWidth} / ${imageHeight}`, width }}>
      <Image
        src={image.image}
        alt=""
        fill
        quality={95}
        unoptimized
        sizes={sizes}
        className="cover-overlay-image theme-crossfade-img"
        style={{ opacity: isLight ? 0 : 1 }}
      />
      {image.imageLight && (
        <Image
          src={image.imageLight}
          alt=""
          fill
          quality={95}
          unoptimized
          sizes={sizes}
          className="cover-overlay-image theme-crossfade-img"
          style={{ opacity: isLight ? 1 : 0 }}
        />
      )}
    </div>
  );
}
