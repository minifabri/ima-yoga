import Link from "next/link";
import { CARD_SECTIONS } from "./data";
import { SectionCard } from "./SectionCard";

// Copertina: testo a sinistra e sei carte 3×2 a destra. Sotto gli 860px il
// testo va sopra le carte (sempre allineato a sinistra), sotto i 600px le carte
// passano a due colonne — vedi .cover-hero in globals.css.
export function Hero({ onOpenSection }: { onOpenSection: (id: string) => void }) {
  return (
    <section className="cover-hero" id="top">
      <div className="cover-hero-copy">
        <h1 className="cover-hero-title">
          Uno spazio per
          <br />
          praticare.
        </h1>
        <p className="cover-hero-sub">Lezioni di yoga, meditazioni e incontri.</p>
        <Link href="/classi" className="cover-btn cover-hero-cta">
          Vedi le lezioni
        </Link>
      </div>

      <div id="carte" className="cover-cards">
        {CARD_SECTIONS.map((section, i) => (
          <SectionCard key={section.id} section={section} index={i} onSelect={onOpenSection} />
        ))}
      </div>
    </section>
  );
}
