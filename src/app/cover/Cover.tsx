"use client";

import { useEffect, useState } from "react";
import { Header } from "./Header";
import { Hero } from "./Hero";
import { SectionOverlay } from "./SectionOverlay";
import { Footer } from "./Footer";
import { InterestCallout } from "./InterestCallout";
import { getSection, type CoverAccess, type CoverEvent, type CoverSequence } from "./data";

const CLOSE_DURATION = 320;

// In anteprima admin i link "Accedi" riportano al gestionale invece che al login.
// Il logo in anteprima admin deve restare sulla copertina: "/" porterebbe al gestionale.
const LOGIN_ACCESS: CoverAccess = { href: "/login", label: "Accedi", home: "/" };
const ADMIN_ACCESS: CoverAccess = { href: "/admin", label: "Gestionale", home: "/?anteprima=1" };

export function Cover({
  events,
  sequences,
  adminPreview = false,
}: {
  events: CoverEvent[];
  sequences: CoverSequence[];
  adminPreview?: boolean;
}) {
  const access = adminPreview ? ADMIN_ACCESS : LOGIN_ACCESS;
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [phase, setPhase] = useState<"open" | "closing">("open");

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

  // Clic sul logo: chiude la sezione eventualmente aperta e torna in cima.
  function goHome() {
    if (selectedId) closeSection();
    else history.replaceState(null, "", window.location.pathname + window.location.search);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const section = getSection(selectedId);

  return (
    <main className="cover-root cover-theme">
      <Header onOpenSection={openSection} onHome={goHome} access={access} />
      <Hero onOpenSection={openSection} aside={<InterestCallout source="home" />} />

      <Footer access={access} onHome={goHome} />

      {section && (
        <SectionOverlay
          section={section}
          events={events}
          sequences={sequences}
          phase={phase}
          onClose={closeSection}
          onHome={goHome}
          homeHref={access.home}
        />
      )}
    </main>
  );
}
