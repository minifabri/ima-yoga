import type { ReactNode } from "react";
import { CARD_SECTIONS } from "./data";
import { SectionCard } from "./SectionCard";

// Copertina: testo a sinistra e sei carte 3×2 a destra. Su schermi molto larghi
// `aside` (la nota "anche da casa") diventa una terza colonna accanto alle
// carte; sotto va dopo le carte, a tutta larghezza. Sotto gli 860px il testo va
// sopra le carte, sotto i 600px le carte passano a due colonne — vedi
// .cover-hero in globals.css.
export function Hero({ onOpenSection, aside }: { onOpenSection: (id: string) => void; aside?: ReactNode }) {
  return (
    <section className="cover-hero" id="top">
      <div className="cover-hero-copy">
        <h1 className="cover-hero-title">
          Uno spazio per
          <br />
          praticare.
        </h1>
        <p className="cover-hero-sub">Lezioni di yoga, meditazioni e incontri.</p>
        <button type="button" className="cover-btn cover-hero-cta" onClick={() => onOpenSection("classi")}>
          Scopri le classi
        </button>
      </div>

      <div id="carte" className="cover-cards">
        {CARD_SECTIONS.map((section, i) => (
          <SectionCard key={section.id} section={section} index={i} onSelect={onOpenSection} />
        ))}
      </div>

      {aside && <aside className="cover-hero-aside">{aside}</aside>}
    </section>
  );
}
