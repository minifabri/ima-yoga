import { CLASSES, PRACTICE_MODES } from "./data";

// Le classi con la loro descrizione e i modi di praticare: stessa lista nella
// sezione "Classi" della copertina e nella pagina /classi.
// `level` è il livello dei titoli di sezione: 2 nella pagina (sotto l'h1),
// 3 nel dettaglio della copertina (sotto l'h2 della sezione).
export function ClassList({ level = 2 }: { level?: 2 | 3 }) {
  const Section = level === 2 ? "h2" : "h3";
  const Item = level === 2 ? "h3" : "h4";
  return (
    <>
      <Section className="static-page-section-title">Le classi</Section>
      <div className="class-grid">
        {CLASSES.map((c) => (
          <div key={c.name} className="class-card">
            <Item>{c.name}</Item>
            <p>{c.description}</p>
          </div>
        ))}
      </div>

      <Section className="static-page-section-title">Come si pratica</Section>
      <div className="practice-modes">
        {PRACTICE_MODES.map((m) => (
          <div key={m.name} className="mode-card">
            <Item>{m.name}</Item>
            <p>{m.description}</p>
          </div>
        ))}
      </div>
    </>
  );
}
