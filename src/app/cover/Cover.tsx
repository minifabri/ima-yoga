"use client";

import { useEffect, useRef, useState } from "react";
import { Header } from "./Header";
import { Hero } from "./Hero";
import { FloatingCards } from "./FloatingCards";
import { SectionOverlay } from "./SectionOverlay";
import { CosmicBackground } from "./CosmicBackground";
import { Particles } from "./Particles";
import { Footer } from "./Footer";
import { getSection } from "./data";
import { useReducedMotion, useScrollProgress } from "./hooks";

const CLOSE_DURATION = 480;

export function Cover() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [phase, setPhase] = useState<"open" | "closing">("open");
  const reducedMotion = useReducedMotion();
  const heroRef = useRef<HTMLElement | null>(null);
  const scrollProgress = useScrollProgress(heroRef);

  // Deep link: /#chi-sono apre direttamente la sezione, condivisibile.
  // Lettura una tantum dell'URL all'avvio — non c'è uno "state esterno" a
  // cui iscriversi dopo, i cambi successivi li gestiamo noi via history.replaceState.
  useEffect(() => {
    const hash = window.location.hash.replace("#", "");
    if (hash && getSection(hash)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSelectedId(hash);
    }
  }, []);

  function openSection(id: string) {
    setSelectedId(id);
    setPhase("open");
    history.replaceState(null, "", `#${id}`);
  }

  function closeSection() {
    setPhase("closing");
    window.setTimeout(() => {
      setSelectedId(null);
      history.replaceState(null, "", "#top");
    }, CLOSE_DURATION);
  }

  const section = getSection(selectedId);

  return (
    <main className="cover-root" data-reduced-motion={reducedMotion ? "true" : "false"}>
      <section className="cover-hero-section" id="top" ref={heroRef}>
        <div className="cover-hero-sticky">
          <CosmicBackground variant="hero" />
          {!reducedMotion && <Particles />}

          <div className="cover-side-text" aria-hidden="true">
            PRESENZA · EQUILIBRIO · TRASFORMAZIONE
          </div>

          <Header onOpenSection={openSection} />

          <div className={`cover-scene${selectedId ? " has-selection" : ""}`}>
            <Hero parallaxEnabled={!reducedMotion} scrollProgress={scrollProgress} />
            <FloatingCards selectedId={selectedId} onSelect={openSection} scrollProgress={scrollProgress} />
          </div>
        </div>
      </section>

      <Footer />

      {section && <SectionOverlay section={section} phase={phase} onClose={closeSection} />}
    </main>
  );
}
