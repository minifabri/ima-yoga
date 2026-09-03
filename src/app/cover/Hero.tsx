import { ParallaxFigure } from "./ParallaxFigure";

export function Hero({ scrollProgress, onOrderCards }: { scrollProgress: number; onOrderCards: () => void }) {
  // La figura e il testo salgono e svaniscono nella prima parte dello scroll,
  // lasciando il posto alle carte che si raccolgono (vedi FloatingCards).
  const fadeT = Math.min(1, Math.max(0, scrollProgress / 0.4));
  const hintT = Math.min(1, Math.max(0, scrollProgress / 0.12));

  return (
    <div className="cover-hero-inner">
      <div
        className="cover-hero-fade"
        style={{
          opacity: 1 - fadeT,
          transform: `translateY(${-fadeT * 70}px)`,
          pointerEvents: fadeT > 0.9 ? "none" : "auto",
        }}
      >
        <ParallaxFigure />

        <div className="cover-hero-copy">
          <h1 className="cover-hero-title">
            Entra nel tuo spazio.
            <br />
            <span className="cover-hero-title-accent">Torna a te.</span>
          </h1>
          <p className="cover-hero-tagline">Movimento. Presenza. Pratica.</p>
          <a href="#carte" className="cover-cta-ghost cover-hero-cta">
            Esplora le carte <span aria-hidden="true">✦</span>
          </a>
        </div>
      </div>

      <button
        type="button"
        onClick={onOrderCards}
        className="cover-scroll-hint"
        style={{ opacity: 1 - hintT, pointerEvents: hintT > 0.9 ? "none" : "auto" }}
      >
        <span>Ordina le carte</span>
        <svg width="14" height="20" viewBox="0 0 14 20" fill="none" aria-hidden="true">
          <path d="M7 1v16M1 11l6 6 6-6" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
    </div>
  );
}
