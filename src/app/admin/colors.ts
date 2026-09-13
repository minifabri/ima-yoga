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

// I colori delle tipologie di classe (vedi PALETTE in utils.ts) sono fissi e
// scelti senza pensare al tema: alcuni (es. "Viola profondo" #4A3A73) sono
// stati pensati per leggersi bene su sfondo chiaro, ma dato che il tema scuro
// è quello di default finiscono per essere quasi invisibili su una card
// scura. Mescolare col colore di testo del tema corrente (var(--ink), chiaro
// al buio e scuro alla luce) sposta automaticamente la tinta nella direzione
// giusta in entrambi i temi, mantenendo comunque riconoscibile la tonalità
// originale del tipo.
export function readableAccent(color: string): string {
  return `color-mix(in srgb, ${color} 55%, var(--ink) 45%)`;
}
