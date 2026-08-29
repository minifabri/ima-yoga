function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function escapeIcs(s: string): string {
  return s.replace(/[\\;,]/g, (m) => "\\" + m).replace(/\n/g, "\\n");
}

function formatIcsDate(dt: Date): string {
  return `${dt.getFullYear()}${pad(dt.getMonth() + 1)}${pad(dt.getDate())}T${pad(dt.getHours())}${pad(dt.getMinutes())}00`;
}

export function downloadClassIcs(opts: { date: string; time: string; title: string; description?: string; durationMinutes?: number }) {
  const { date, time, title, description, durationMinutes = 60 } = opts;
  const [y, m, d] = date.split("-").map(Number);
  const [hh, mm] = (time || "00:00").split(":").map(Number);
  const start = new Date(y, m - 1, d, hh, mm);
  const end = new Date(start.getTime() + durationMinutes * 60000);

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//ima yoga//booking//IT",
    "BEGIN:VEVENT",
    `UID:${crypto.randomUUID()}@ima-yoga`,
    `DTSTAMP:${formatIcsDate(new Date())}`,
    `DTSTART:${formatIcsDate(start)}`,
    `DTEND:${formatIcsDate(end)}`,
    `SUMMARY:${escapeIcs(title)}`,
    description ? `DESCRIPTION:${escapeIcs(description)}` : null,
    "END:VEVENT",
    "END:VCALENDAR",
  ].filter((l): l is string => l !== null);

  const blob = new Blob([lines.join("\r\n")], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${title.replace(/[^a-z0-9]+/gi, "-")}-${date}.ics`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
