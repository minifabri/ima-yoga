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
const FLIP_DURATION = 600;

export function Cover() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [flippingId, setFlippingId] = useState<string | null>(null);
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

  // La carta cliccata fa un breve "flip" (vedi .is-flipping in globals.css)
  // prima che la sezione si apra — con reduced-motion si salta e si apre subito.
  function openSection(id: string) {
    if (reducedMotion) {
      setSelectedId(id);
      setPhase("open");
      history.replaceState(null, "", `#${id}`);
      return;
    }
    setFlippingId(id);
    window.setTimeout(() => {
      setFlippingId(null);
      setSelectedId(id);
      setPhase("open");
      history.replaceState(null, "", `#${id}`);
    }, FLIP_DURATION);
  }

  function closeSection() {
    setPhase("closing");
    window.setTimeout(() => {
      setSelectedId(null);
      history.replaceState(null, "", "#top");
    }, CLOSE_DURATION);
  }

  // "Ordina le carte": scorre fino al punto in cui le carte sono già
  // raccolte in riga orizzontale (metà della sosta "linea" in FloatingCards),
  // come se l'utente avesse scrollato fin lì da solo. Su mobile non esiste
  // questa messa in scena (griglia statica): scorre solo fino alle carte.
  function scrollToLine() {
    const el = heroRef.current;
    if (!el) return;
    if (window.innerWidth < 860) {
      document.getElementById("carte")?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    const rect = el.getBoundingClientRect();
    const total = rect.height - window.innerHeight;
    if (total <= 0) return;
    const target = window.scrollY + rect.top + total * 0.5;
    window.scrollTo({ top: target, behavior: "smooth" });
  }

  const section = getSection(selectedId);

  return (
    <main className="cover-root" data-reduced-motion={reducedMotion ? "true" : "false"}>
      <section className="cover-hero-section" id="top" ref={heroRef}>
        <div className="cover-hero-sticky">
          <CosmicBackground variant="hero" />
          {!reducedMotion && <Particles />}

          <Header onOpenSection={openSection} />

          <div className={`cover-scene${selectedId ? " has-selection" : ""}`}>
            <Hero scrollProgress={scrollProgress} onOrderCards={scrollToLine} />
            <FloatingCards selectedId={selectedId} flippingId={flippingId} onSelect={openSection} scrollProgress={scrollProgress} />
          </div>
        </div>
      </section>

      <Footer />

      {section && <SectionOverlay section={section} phase={phase} onClose={closeSection} />}
    </main>
  );
}
