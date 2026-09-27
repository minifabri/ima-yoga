// Le lezioni individuali non hanno una tipologia: ovunque compaiano (calendario,
// prenotazioni, file .ics, promemoria) il loro titolo è sempre questo.
export const INDIVIDUAL_LESSON_TITLE = "Lezione individuale";

// Titolo di una classe: "Lezione individuale" per le individuali, altrimenti il
// nome della tipologia.
export function classTitle(isIndividual: boolean, typeId: string | null, typeById: Record<string, { name: string }>): string {
  if (isIndividual) return INDIVIDUAL_LESSON_TITLE;
  return (typeId && typeById[typeId]?.name) || "Classe";
}

// Titolo dell'evento da aggiungere a un calendario esterno. Chi organizza (admin)
// vede anche il cliente: "Lezione individuale - Nome" (senza cliente, uno slot
// libero, resta solo il titolo).
export function individualLessonIcsTitle(clientName?: string | null): string {
  return clientName ? `${INDIVIDUAL_LESSON_TITLE} - ${clientName}` : INDIVIDUAL_LESSON_TITLE;
}
