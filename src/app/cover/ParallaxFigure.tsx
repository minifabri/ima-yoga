"use client";

import Image from "next/image";
import { useTheme } from "./hooks";
import { toggleTheme } from "../admin/ThemeToggle";

const DARK = { src: "/figura-meditazione.png", width: 1187, height: 1325 };
const LIGHT = { src: "/figura-meditazione-light.png", width: 1227, height: 1199 };

export function ParallaxFigure() {
  const theme = useTheme();
  const figure = theme === "light" ? LIGHT : DARK;
  return (
    <button
      type="button"
      className="cover-figure-wrap"
      style={{ aspectRatio: `${figure.width} / ${figure.height}` }}
      onClick={toggleTheme}
      title={theme === "dark" ? "Passa al tema chiaro" : "Passa al tema scuro"}
      aria-label={theme === "dark" ? "Passa al tema chiaro" : "Passa al tema scuro"}
    >
      <Image
        src={figure.src}
        alt=""
        width={figure.width}
        height={figure.height}
        priority
        quality={95}
        sizes="(min-width: 900px) 560px, 78vw"
        className="cover-figure-img"
      />
      <div className="cover-figure-reflection">
        <Image
          src={figure.src}
          alt=""
          width={figure.width}
          height={figure.height}
          quality={95}
          sizes="(min-width: 900px) 560px, 78vw"
          className="cover-figure-img"
        />
      </div>
    </button>
  );
}
