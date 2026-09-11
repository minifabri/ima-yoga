"use client";

import { CalendarDays, Check, List } from "lucide-react";
import { COLORS, withAlpha } from "@/app/admin/colors";
import { dateKey } from "@/app/admin/utils";
import { availabilityLabel, formatEventDate, formatUpcomingDate } from "./helpers";
import type { ClassType, Level, PublicClass, PublicEvent } from "./types";

// Schermata di ingresso mobile: al posto del calendario, le prossime lezioni
// ben visibili in cima (la prima cosa che un cliente vuole sapere aprendo
// l'app) e sotto le due scorciatoie principali — niente scroll orizzontale,
// stesso principio usato per l'hub mobile dell'admin.
export function MobileAreaHome({
  classes,
  typeById,
  levelById,
  nextEvent,
  onOpenClass,
  onGoToCalendar,
  onGoToMine,
}: {
  classes: PublicClass[];
  typeById: Record<string, ClassType>;
  levelById: Record<string, Level>;
  nextEvent: PublicEvent | null;
  onOpenClass: (c: PublicClass) => void;
  onGoToCalendar: () => void;
  onGoToMine: () => void;
}) {
  const todayKey = dateKey(new Date());
  const upcoming = classes
    .filter((c) => c.date >= todayKey)
    .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time))
    .slice(0, 5);

  return (
    <div className="flex flex-col gap-5">
      <div>
        <div className="flex items-center gap-2 mb-2">
          <CalendarDays size={15} color={COLORS.primary} />
          <span style={{ fontSize: 13.5, fontWeight: 700, color: COLORS.heading }}>Prossime lezioni</span>
        </div>
        <div className="rounded-2xl overflow-hidden" style={{ background: COLORS.card, border: `1px solid ${COLORS.border}` }}>
          {upcoming.length === 0 ? (
            <div style={{ fontSize: 12.5, color: COLORS.inkSoft, padding: 14 }}>Nessuna lezione in programma.</div>
          ) : (
            upcoming.map((c, i) => {
              const type = typeById[c.typeId];
              const level = levelById[c.levelId];
              const avail = availabilityLabel(c);
              const booked = c.myStatus === "booked";
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => onOpenClass(c)}
                  className="flex items-start gap-3 w-full text-left px-3.5 py-2.5"
                  style={{
                    borderBottom: i < upcoming.length - 1 ? `1px solid ${COLORS.border}` : "none",
                    background: booked ? withAlpha(COLORS.primary, 7) : "transparent",
                  }}
                >
                  <div className="flex-shrink-0" style={{ width: 44, paddingTop: 1 }}>
                    <div style={{ fontSize: 10.5, fontWeight: 700, color: COLORS.ink }}>{formatUpcomingDate(c.date)}</div>
                    <div style={{ fontSize: 10.5, color: COLORS.inkSoft }}>{c.time}</div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5" style={{ fontSize: 12.5, fontWeight: 600, color: COLORS.ink }}>
                      <span className="flex-shrink-0 rounded-full" style={{ width: 7, height: 7, background: type?.color || COLORS.primary }} />
                      {type?.name || "Classe"}
                    </div>
                    <div style={{ fontSize: 11, color: COLORS.inkSoft, marginTop: 2, lineHeight: 1.4 }}>
                      {level?.name}
                      <span> · </span>
                      <span style={{ fontWeight: 700, color: avail.color }}>
                        {booked && <Check size={11} style={{ display: "inline", verticalAlign: -1, marginRight: 2 }} />}
                        {avail.text}
                      </span>
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {nextEvent && (
        <a
          href={`/eventi/${nextEvent.slug}`}
          className="flex items-start gap-2 p-2.5 rounded-lg"
          style={{ background: withAlpha(COLORS.gold, 12), border: `1px solid ${withAlpha(COLORS.gold, 35)}` }}
        >
          <span style={{ width: 6, height: 6, borderRadius: 999, background: COLORS.gold, marginTop: 5, flexShrink: 0 }} />
          <span style={{ fontSize: 12, color: COLORS.ink, lineHeight: 1.45 }}>
            <strong>{formatEventDate(nextEvent.date)}</strong> · {nextEvent.name}
            {nextEvent.location && <span style={{ color: COLORS.inkSoft }}> — {nextEvent.location}</span>}
          </span>
        </a>
      )}

      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={onGoToCalendar}
          className="flex flex-col items-center justify-center gap-2 rounded-2xl text-center"
          style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, padding: "22px 12px", minHeight: 108 }}
        >
          <span
            className="flex items-center justify-center rounded-full"
            style={{ width: 44, height: 44, background: withAlpha(COLORS.primary, 12), color: COLORS.primary }}
          >
            <CalendarDays size={22} />
          </span>
          <span style={{ fontSize: 13.5, fontWeight: 600, color: COLORS.ink }}>Calendario</span>
        </button>
        <button
          type="button"
          onClick={onGoToMine}
          className="flex flex-col items-center justify-center gap-2 rounded-2xl text-center"
          style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, padding: "22px 12px", minHeight: 108 }}
        >
          <span
            className="flex items-center justify-center rounded-full"
            style={{ width: 44, height: 44, background: withAlpha(COLORS.primary, 12), color: COLORS.primary }}
          >
            <List size={22} />
          </span>
          <span style={{ fontSize: 13.5, fontWeight: 600, color: COLORS.ink }}>Le mie prenotazioni</span>
        </button>
      </div>
    </div>
  );
}
