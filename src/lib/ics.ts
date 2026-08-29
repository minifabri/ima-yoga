export type IcsEvent = {
  date: string; // yyyy-mm-dd
  time: string; // HH:mm
  title: string;
  description?: string;
  durationMinutes?: number;
};

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function escapeIcs(s: string): string {
  return s.replace(/[\\;,]/g, (m) => "\\" + m).replace(/\n/g, "\\n");
}

function formatIcsDate(dt: Date): string {
  return `${dt.getFullYear()}${pad(dt.getMonth() + 1)}${pad(dt.getDate())}T${pad(dt.getHours())}${pad(dt.getMinutes())}00`;
}

export function buildIcsCalendar(events: IcsEvent[]): string {
  const stamp = formatIcsDate(new Date());
  const veventBlocks = events.map((ev) => {
    const [y, m, d] = ev.date.split("-").map(Number);
    const [hh, mm] = (ev.time || "00:00").split(":").map(Number);
    const start = new Date(y, m - 1, d, hh, mm);
    const end = new Date(start.getTime() + (ev.durationMinutes ?? 60) * 60000);
    return [
      "BEGIN:VEVENT",
      `UID:${crypto.randomUUID()}@ima-yoga`,
      `DTSTAMP:${stamp}`,
      `DTSTART:${formatIcsDate(start)}`,
      `DTEND:${formatIcsDate(end)}`,
      `SUMMARY:${escapeIcs(ev.title)}`,
      ev.description ? `DESCRIPTION:${escapeIcs(ev.description)}` : null,
      "END:VEVENT",
    ]
      .filter((l): l is string => l !== null)
      .join("\r\n");
  });

  return ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//ima yoga//booking//IT", ...veventBlocks, "END:VCALENDAR"].join("\r\n");
}

export function downloadIcsFile(filename: string, events: IcsEvent[]) {
  const ics = buildIcsCalendar(events);
  const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".ics") ? filename : `${filename}.ics`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
