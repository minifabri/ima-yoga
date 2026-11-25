import Link from "next/link";
import type { CoverEvent } from "./data";

const fmtDay = new Intl.DateTimeFormat("it-IT", { day: "numeric" });
const fmtMonth = new Intl.DateTimeFormat("it-IT", { month: "short" });
const fmtWeekday = new Intl.DateTimeFormat("it-IT", { weekday: "long" });

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

// Prossimi eventi pubblicati come "visibili a tutti" (RPC cover_events):
// quelli "solo iscritti" non arrivano mai qui. Una riga per evento: data a
// sinistra (giorno grande, mese sotto), nome e dettagli al centro, freccia.
export function CoverEvents({ events }: { events: CoverEvent[] }) {
  if (events.length === 0) {
    return <p className="cover-events-empty">Al momento non ci sono eventi in programma: torna a trovarmi presto.</p>;
  }

  return (
    <ul className="cover-events">
      {events.map((ev) => {
        const date = new Date(`${ev.date}T00:00:00`);
        const meta = [capitalize(fmtWeekday.format(date)), ev.time, ev.location, !ev.bookingsOpen && "Iscrizioni chiuse"]
          .filter(Boolean)
          .join(" · ");
        return (
          <li key={ev.slug}>
            <Link href={`/eventi/${ev.slug}`} className="cover-event">
              <span className="cover-event-date">
                <span className="cover-event-day">{fmtDay.format(date)}</span>
                <span className="cover-event-month">{fmtMonth.format(date).replace(".", "")}</span>
              </span>
              <span className="cover-event-body">
                <span className="cover-event-name">{ev.name}</span>
                <span className="cover-event-meta">{meta}</span>
              </span>
              <span className="cover-event-arrow" aria-hidden="true">
                →
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
