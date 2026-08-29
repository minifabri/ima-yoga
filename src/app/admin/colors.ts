// Questi valori puntano alle CSS custom properties definite in globals.css,
// così cambiano da soli quando si passa da tema chiaro a tema scuro
// (vedi ThemeToggle.tsx), senza dover toccare i tanti punti che usano COLORS.*.
export const COLORS = {
  bg: "var(--bg)",
  card: "var(--card)",
  subtle: "var(--subtle)",
  border: "var(--border)",
  ink: "var(--ink)",
  inkSoft: "var(--ink-soft)",
  heading: "var(--heading)",
  primary: "var(--primary)",
  primaryDark: "var(--primary-dark)",
  gold: "var(--gold)",
  success: "var(--success)",
  danger: "var(--danger)",
};

// Applica una trasparenza a un colore (funziona sia con gli hex delle tipologie
// di classe, sia con i riferimenti var(--x) di COLORS qui sopra).
export function withAlpha(color: string, percent: number): string {
  return `color-mix(in srgb, ${color} ${percent}%, transparent)`;
}
