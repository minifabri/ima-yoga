"use client";

import Link from "next/link";
import type { CoverEvent } from "./data";
import { useTheme } from "./hooks";

const fmtDate = new Intl.DateTimeFormat("it-IT", { weekday: "short", day: "numeric", month: "long" });

// Prossimi eventi pubblicati come "visibili a tutti" (RPC cover_events):
// quelli "solo iscritti" non arrivano mai qui.
export function CoverEvents({ events }: { events: CoverEvent[] }) {
  const isLight = useTheme() === "light";

  if (events.length === 0) {
    return <p className="cover-events-empty">Al momento non ci sono eventi in programma: torna a trovarmi presto.</p>;
  }

  return (
    <ul className="cover-events">
      {events.map((ev) => {
        const img = (isLight ? ev.imageLightUrl : ev.imageDarkUrl) || ev.imageLightUrl || ev.imageDarkUrl;
        return (
          <li key={ev.slug}>
            <Link href={`/eventi/${ev.slug}`} className="cover-event">
              <span className="cover-event-thumb" aria-hidden="true">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {img ? <img src={img} alt="" /> : <span>✦</span>}
              </span>
              <span className="cover-event-body">
                <span className="cover-event-date">
                  {fmtDate.format(new Date(`${ev.date}T00:00:00`))} · {ev.time}
                </span>
                <span className="cover-event-name">{ev.name}</span>
                {(ev.location || !ev.bookingsOpen) && (
                  <span className="cover-event-meta">
                    {ev.location}
                    {ev.location && !ev.bookingsOpen ? " · " : ""}
                    {!ev.bookingsOpen && "Iscrizioni chiuse"}
                  </span>
                )}
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
