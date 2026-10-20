// Cosa è cambiato in un evento tra prima e dopo il salvataggio, per decidere
// se avvisare chi è prenotato e per scrivere il testo dell'avviso.
// Contano solo data, orario e luogo: il resto (descrizione, immagine, prezzo…)
// non cambia i piani di chi deve venire.

export type EventSchedule = { date: string; time: string; location: string };

export type EventChange = {
  dateChanged: boolean;
  timeChanged: boolean;
  locationChanged: boolean;
};

export function diffEventSchedule(before: EventSchedule, after: EventSchedule): EventChange | null {
  const change: EventChange = {
    dateChanged: before.date !== after.date,
    timeChanged: before.time.slice(0, 5) !== after.time.slice(0, 5),
    locationChanged: before.location.trim() !== after.location.trim(),
  };
  return change.dateChanged || change.timeChanged || change.locationChanged ? change : null;
}

const IT_DAY = new Intl.DateTimeFormat("it-IT", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });

// "2026-10-25" → "domenica 25 ottobre"
export function formatEventDay(date: string): string {
  const [y, m, d] = date.split("-").map(Number);
  if (!y || !m || !d) return date;
  return IT_DAY.format(new Date(Date.UTC(y, m - 1, d)));
}

// Titolo e testo del push (e dell'avviso in area). Il titolo dice cosa è cambiato, il testo dà il
// nuovo appuntamento completo, così basta leggere la notifica.
export function eventChangeMessage(
  eventName: string,
  change: EventChange,
  after: EventSchedule
): { title: string; body: string; notice: string } {
  const parts: string[] = [];
  if (change.dateChanged) parts.push("data");
  if (change.timeChanged) parts.push("orario");
  if (change.locationChanged) parts.push("luogo");
  const what = parts.length === 1 ? `Nuovo ${parts[0] === "data" ? "giorno" : parts[0]}` : "Cambio di programma";

  const when = `${formatEventDay(after.date)} alle ${after.time.slice(0, 5)}`;
  const where = after.location.trim() ? `, ${after.location.trim()}` : "";
  const title = `${what}: ${eventName}`;
  return {
    title,
    body: `Ora è ${when}${where}. Tocca per i dettagli.`,
    // Testo dell'avviso nell'area personale: una riga sola, senza "tocca".
    notice: `${title}. Ora è ${when}${where}.`,
  };
}
