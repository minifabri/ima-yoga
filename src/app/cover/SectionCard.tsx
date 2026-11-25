import type { CardSection } from "./data";

// La carta di una sezione: icona al tratto e nome dentro un riquadro con il
// bordo sottile. Con `onSelect` è il pulsante della griglia in copertina;
// senza, è la carta in grande nel dettaglio e nelle pagine /classi e /chi-sono.
export function SectionCard({
  section,
  index = 0,
  onSelect,
  large = false,
}: {
  section: CardSection;
  index?: number;
  onSelect?: (id: string) => void;
  large?: boolean;
}) {
  const { Icon } = section;
  const content = (
    <>
      <Icon />
      <span className="cover-card-name">{section.label}</span>
    </>
  );

  if (!onSelect) {
    return <div className={`cover-card${large ? " cover-card-large" : ""}`}>{content}</div>;
  }

  return (
    <button
      type="button"
      className="cover-card"
      style={{ "--card-index": index } as React.CSSProperties}
      onClick={() => onSelect(section.id)}
      aria-label={`Apri la sezione ${section.label}`}
    >
      {content}
    </button>
  );
}
