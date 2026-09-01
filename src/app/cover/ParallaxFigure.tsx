"use client";

import Image from "next/image";
import { usePointerParallax } from "./hooks";

export function ParallaxFigure({ parallaxEnabled }: { parallaxEnabled: boolean }) {
  const pos = usePointerParallax(parallaxEnabled);

  return (
    <div className="cover-figure-wrap" aria-hidden="true">
      <Image
        src="/figura-meditazione.png"
        alt=""
        width={442}
        height={529}
        priority
        sizes="(min-width: 900px) 560px, 78vw"
        className="cover-figure-img"
        style={{ transform: `translate(${pos.x * 5}px, ${pos.y * 5}px)` }}
      />
      <div className="cover-figure-reflection" style={{ transform: `translate(${pos.x * 5}px, ${pos.y * 3}px)` }}>
        <Image
          src="/figura-meditazione.png"
          alt=""
          width={442}
          height={529}
          sizes="(min-width: 900px) 560px, 78vw"
          className="cover-figure-img"
        />
      </div>
    </div>
  );
}
