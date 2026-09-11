"use client";

import { useMemo, useState } from "react";
import { CalendarClock, CheckSquare, ChevronLeft, ChevronRight, Gift, LayoutGrid, List, Lock, Square } from "lucide-react";
import { COLORS, withAlpha } from "@/app/admin/colors";
import { WEEKDAYS, MONTHS, dateKey, isSameDay } from "@/app/admin/utils";
import { availabilityLabel, formatEventDate, isPastClass, typeInitials } from "./helpers";
import { useArea } from "./AreaShell";
import type { PublicClass } from "./types";

export function CalendarContent() {
  const { viewDate, setViewDate, days, classes, typeById, levelById, bookingsOpen, events, setSelected, goToNextClass } = useArea();
  const [calendarMode, setCalendarMode] = useState<"grid" | "list">("grid");
  const [onlyMine, setOnlyMine] = useState(false);

  const visibleClasses = useMemo(() => (onlyMine ? classes.filter((c) => c.myStatus) : classes), [classes, onlyMine]);
  const classesByDay = useMemo(() => {
    const map: Record<string, PublicClass[]> = {};
    for (const c of visibleClasses) (map[c.date] = map[c.date] || []).push(c);
    Object.values(map).forEach((list) => list.sort((a, b) => a.time.localeCompare(b.time)));
    return map;
  }, [visibleClasses]);
  const listDays = useMemo(() => days.filter((d) => (classesByDay[dateKey(d)] || []).length > 0), [days, classesByDay]);
  const monthEvents = useMemo(
    () =>
      events.filter((e) => {
        const [y, m] = e.date.split("-").map(Number);
        return y === viewDate.getFullYear() && m === viewDate.getMonth() + 1;
      }),
    [events, viewDate]
  );

  return (
    <>
      {!bookingsOpen && (
        <div className="mb-4 flex items-center gap-2 text-sm rounded-lg px-3 py-2" style={{ background: withAlpha(COLORS.gold, 16), color: COLORS.gold }}>
          <Lock size={15} /> Le iscrizioni non sono ancora aperte.
        </div>
      )}
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <div style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 600, textTransform: "capitalize", color: COLORS.heading }}>
          {MONTHS[viewDate.getMonth()]} {viewDate.getFullYear()}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setViewDate(new Date())}
            className="px-2.5 py-1.5 rounded-lg text-xs font-medium"
            style={{ border: `1px solid ${COLORS.border}` }}
          >
            Oggi
          </button>
          <button
            onClick={goToNextClass}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium mr-1"
            style={{ border: `1px solid ${COLORS.border}` }}
          >
            <CalendarClock size={13} /> Prossima lezione
          </button>
          <button
            onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1))}
            className="flex items-center justify-center rounded-lg"
            style={{ width: 34, height: 34, border: `1px solid ${COLORS.border}` }}
          >
            <ChevronLeft size={16} />
          </button>
          <button
            onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1))}
            className="flex items-center justify-center rounded-lg"
            style={{ width: 34, height: 34, border: `1px solid ${COLORS.border}` }}
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div className="flex rounded-lg overflow-hidden" style={{ border: `1px solid ${COLORS.border}` }}>
          <button
            onClick={() => setCalendarMode("grid")}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium"
            style={{ background: calendarMode === "grid" ? COLORS.primary : "transparent", color: calendarMode === "grid" ? "#fff" : COLORS.ink }}
          >
            <LayoutGrid size={13} /> Calendario
          </button>
          <button
            onClick={() => setCalendarMode("list")}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium"
            style={{ background: calendarMode === "list" ? COLORS.primary : "transparent", color: calendarMode === "list" ? "#fff" : COLORS.ink }}
          >
            <List size={13} /> Elenco
          </button>
        </div>
        <button onClick={() => setOnlyMine((v) => !v)} className="flex items-center gap-1.5 text-xs font-medium" style={{ color: onlyMine ? COLORS.primaryDark : COLORS.inkSoft }}>
          {onlyMine ? <CheckSquare size={15} color={COLORS.primary} /> : <Square size={15} />} Solo le mie prenotazioni
        </button>
      </div>

      {calendarMode === "grid" ? (
        <>
          <div className="grid grid-cols-5 mb-1">
            {WEEKDAYS.slice(0, 5).map((w) => (
              <div key={w} className="text-center py-2" style={{ fontSize: 11, fontWeight: 600, color: COLORS.inkSoft, textTransform: "uppercase" }}>
                {w}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-5 gap-1.5">
            {days.filter((d) => d.getDay() !== 0 && d.getDay() !== 6).map((d, i) => {
              const inMonth = d.getMonth() === viewDate.getMonth();
              const key = dateKey(d);
              const dayClasses = classesByDay[key] || [];
              const isToday = isSameDay(d, new Date());
              return (
                <div
                  key={i}
                  className="flex flex-col rounded-[10px] sm:rounded-xl p-1 sm:p-1.5 min-h-[56px] sm:min-h-[84px]"
                  style={{
                    background: inMonth ? COLORS.card : "transparent",
                    border: `1.5px solid ${inMonth ? COLORS.border : "transparent"}`,
                    opacity: inMonth ? 1 : 0.4,
                  }}
                >
                  {/* Mobile: card minimale */}
                  <div className="sm:hidden flex flex-col flex-1">
                    <span
                      style={{
                        fontSize: 10.5,
                        fontWeight: isToday ? 700 : 500,
                        color: isToday ? "#fff" : COLORS.ink,
                        background: isToday ? COLORS.primary : "transparent",
                        width: 16,
                        height: 16,
                        borderRadius: 999,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        marginBottom: 3,
                      }}
                    >
                      {d.getDate()}
                    </span>
                    <div className="flex flex-col gap-1">
                      {dayClasses.map((c) => {
                        const type = typeById[c.typeId];
                        const color = type?.color || COLORS.primary;
                        const avail = availabilityLabel(c);
                        const past = isPastClass(c.date, c.time);
                        return (
                          <button
                            key={c.id}
                            onClick={() => setSelected(c)}
                            title={`${c.time} · ${type?.name || "Classe"}`}
                            className="flex flex-col items-center justify-center w-full"
                            style={{
                              minHeight: 26,
                              padding: "3px 2px",
                              borderRadius: 5,
                              background: withAlpha(color, past ? 6 : 12),
                              borderLeft: `2.5px solid ${color}`,
                              gap: 2,
                              opacity: past ? 0.5 : 1,
                            }}
                          >
                            <span className="flex items-center gap-0.5" style={{ fontSize: 9.5, fontWeight: 800, color: COLORS.ink, letterSpacing: 0.3 }}>
                              {c.isFree && <Gift size={8} color={COLORS.gold} />}
                              {typeInitials(type?.name)}
                            </span>
                            <span style={{ width: 5, height: 5, borderRadius: 999, background: avail.color, flexShrink: 0 }} />
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Desktop: card completa, come in origine */}
                  <div className="hidden sm:flex sm:flex-col sm:flex-1">
                    <span
                      style={{
                        fontSize: 11.5,
                        fontWeight: isToday ? 700 : 500,
                        color: isToday ? "#fff" : COLORS.ink,
                        background: isToday ? COLORS.primary : "transparent",
                        width: 19,
                        height: 19,
                        borderRadius: 999,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        marginBottom: 4,
                      }}
                    >
                      {d.getDate()}
                    </span>
                    <div className="flex flex-col gap-1">
                      {dayClasses.map((c) => {
                        const type = typeById[c.typeId];
                        const color = type?.color || COLORS.primary;
                        const avail = availabilityLabel(c);
                        const past = isPastClass(c.date, c.time);
                        return (
                          <button
                            key={c.id}
                            onClick={() => setSelected(c)}
                            className="text-left truncate"
                            style={{
                              fontSize: 10.5,
                              padding: "3px 6px",
                              borderRadius: 6,
                              background: withAlpha(color, past ? 6 : 12),
                              borderLeft: `3px solid ${color}`,
                              color: COLORS.ink,
                              opacity: past ? 0.5 : 1,
                            }}
                          >
                            <div className="flex items-center gap-1" style={{ fontWeight: 700 }}>
                              {c.time}
                              {c.isFree && <span title="Classe gratuita" className="inline-flex"><Gift size={10} color={COLORS.gold} /></span>}
                            </div>
                            <div>{type?.name || "Classe"}</div>
                            <div style={{ color: avail.color, fontWeight: 600 }}>{avail.text}</div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      ) : (
        <div className="flex flex-col gap-4">
          {listDays.length === 0 && (
            <div style={{ fontSize: 13, color: COLORS.inkSoft }} className="px-1">
              Nessuna lezione in programma questo mese.
            </div>
          )}
          {listDays.map((d) => {
            const key = dateKey(d);
            const dayClasses = classesByDay[key] || [];
            const isToday = isSameDay(d, new Date());
            return (
              <div key={key}>
                <div
                  style={{ fontSize: 11.5, fontWeight: 700, color: isToday ? COLORS.primary : COLORS.inkSoft, textTransform: "capitalize" }}
                  className="mb-1.5"
                >
                  {WEEKDAYS[(d.getDay() + 6) % 7]} {d.getDate()} {MONTHS[d.getMonth()].slice(0, 3)}
                  {isToday && " · Oggi"}
                </div>
                <div className="flex flex-col gap-1.5">
                  {dayClasses.map((c) => {
                    const type = typeById[c.typeId];
                    const color = type?.color || COLORS.primary;
                    const avail = availabilityLabel(c);
                    const past = isPastClass(c.date, c.time);
                    return (
                      <button
                        key={c.id}
                        onClick={() => setSelected(c)}
                        className="flex items-center justify-between text-left p-2.5 rounded-lg w-full gap-2"
                        style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderLeft: `3px solid ${color}`, opacity: past ? 0.55 : 1 }}
                      >
                        <div>
                          <div className="flex items-center gap-1" style={{ fontSize: 12.5, fontWeight: 700 }}>
                            {c.time} · {type?.name || "Classe"}
                            {c.isFree && <span title="Classe gratuita" className="inline-flex"><Gift size={11} color={COLORS.gold} /></span>}
                          </div>
                          <div style={{ fontSize: 11, color: COLORS.inkSoft }}>{levelById[c.levelId]?.name}</div>
                        </div>
                        <span style={{ fontSize: 11, fontWeight: 700, color: avail.color, whiteSpace: "nowrap" }}>{avail.text}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {monthEvents.length > 0 && (
        <div className="flex flex-col gap-1.5 mt-4">
          {monthEvents.map((e) => (
            <a
              key={e.slug}
              href={`/eventi/${e.slug}`}
              className="flex items-start gap-2 p-2.5 rounded-lg"
              style={{ background: withAlpha(COLORS.gold, 12), border: `1px solid ${withAlpha(COLORS.gold, 35)}` }}
            >
              <span style={{ width: 6, height: 6, borderRadius: 999, background: COLORS.gold, marginTop: 5, flexShrink: 0 }} />
              <span style={{ fontSize: 12, color: COLORS.ink, lineHeight: 1.45 }}>
                <strong>{formatEventDate(e.date)}</strong> · {e.name}
                {e.location && <span style={{ color: COLORS.inkSoft }}> — {e.location}</span>}
              </span>
            </a>
          ))}
        </div>
      )}
    </>
  );
}
