"use client";

import Image from "next/image";
import { useTheme } from "./hooks";
import { toggleTheme } from "../admin/ThemeToggle";

const DARK = { src: "/figura-meditazione.png", width: 1187, height: 1325 };
const LIGHT = { src: "/figura-meditazione-light.png", width: 1227, height: 1199 };

// Entrambe le varianti restano montate e si dissolvono via opacity (invece di
// scambiare src di scatto): lo swap segue lo stesso ritmo dello sfondo, senza
// aspettare che l'immagine nuova finisca di scaricarsi.
function FigureImages({ isLight, priority }: { isLight: boolean; priority?: boolean }) {
  return (
    <>
      <Image
        src={DARK.src}
        alt=""
        width={DARK.width}
        height={DARK.height}
        priority={priority}
        quality={95}
        sizes="(min-width: 900px) 560px, 78vw"
        className="cover-figure-img theme-crossfade-img"
        style={{ opacity: isLight ? 0 : 1 }}
      />
      <Image
        src={LIGHT.src}
        alt=""
        width={LIGHT.width}
        height={LIGHT.height}
        quality={95}
        sizes="(min-width: 900px) 560px, 78vw"
        className="cover-figure-img theme-crossfade-img"
        style={{ opacity: isLight ? 1 : 0 }}
      />
    </>
  );
}

export function ParallaxFigure() {
  const theme = useTheme();
  const isLight = theme === "light";
  const figure = isLight ? LIGHT : DARK;
  return (
    <button
      type="button"
      className="cover-figure-wrap"
      style={{ aspectRatio: `${figure.width} / ${figure.height}` }}
      onClick={toggleTheme}
      title={theme === "dark" ? "Passa al tema chiaro" : "Passa al tema scuro"}
      aria-label={theme === "dark" ? "Passa al tema chiaro" : "Passa al tema scuro"}
    >
      <FigureImages isLight={isLight} priority />
      <div className="cover-figure-reflection">
        <FigureImages isLight={isLight} />
      </div>
    </button>
  );
}
