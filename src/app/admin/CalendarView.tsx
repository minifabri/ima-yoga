"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, Plus, ClipboardPaste, LayoutGrid, List, Lock, EyeOff, GripVertical, CalendarClock, Download, Gift } from "lucide-react";
import { IconButton, CapacityBar } from "./ui";
import { COLORS, withAlpha } from "./colors";
import { WEEKDAYS, MONTHS, dateKey, isSameDay, getCalendarDays } from "./utils";
import { downloadIcsFile } from "@/lib/ics";
import type { ClassItem, ClassType, EventItem, Level } from "./types";

type ClassClipboard = {
  typeId: string;
  levelId: string;
  time: string;
  capacity: number;
  notes: string;
  bookingsOpen: boolean;
};

function typeInitials(name?: string): string {
  if (!name) return "?";
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

function availabilityDot(c: ClassItem): string {
  const booked = c.clientIds.length;
  const capNum = c.capacity;
  const full = capNum > 0 && booked >= capNum;
  const ratio = capNum > 0 ? booked / capNum : 0;
  return full ? COLORS.danger : ratio >= 0.7 ? COLORS.gold : COLORS.success;
}

export function CalendarView({
  viewDate,
  setViewDate,
  classesByDay,
  typeById,
  levelById,
  clipboard,
  monthEvents = [],
  onAddClass,
  onOpenClass,
  onMoveClass,
  onPasteClass,
  onGoToNextClass,
  onOpenEvents,
}: {
  viewDate: Date;
  setViewDate: (d: Date) => void;
  classesByDay: Record<string, ClassItem[]>;
  typeById: Record<string, ClassType>;
  levelById: Record<string, Level>;
  clipboard: ClassClipboard | null;
  monthEvents?: EventItem[];
  onAddClass: (date: Date) => void;
  onOpenClass: (classItem: ClassItem) => void;
  onMoveClass: (id: string, targetDate: string) => void;
  onPasteClass: (dateStr: string) => void;
  onGoToNextClass: () => void;
  onOpenEvents?: () => void;
}) {
  const days = getCalendarDays(viewDate).filter((d) => d.getDay() !== 0 && d.getDay() !== 6);
  const weekdayLabels = WEEKDAYS.slice(0, 5);
  const today = new Date();
  const monthLabel = `${MONTHS[viewDate.getMonth()]} ${viewDate.getFullYear()}`;
  const [dragOverKey, setDragOverKey] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [mode, setMode] = useState<"grid" | "list">("grid");

  function shiftMonth(delta: number) {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + delta, 1));
  }

  const listDays = days.filter((d) => (classesByDay[dateKey(d)] || []).length > 0);

  function downloadMonth() {
    const monthClasses = Object.values(classesByDay)
      .flat()
      .filter((c) => {
        const [y, m] = c.date.split("-").map(Number);
        return y === viewDate.getFullYear() && m === viewDate.getMonth() + 1;
      });
    downloadIcsFile(
      `ima-yoga-${viewDate.getFullYear()}-${String(viewDate.getMonth() + 1).padStart(2, "0")}`,
      monthClasses.map((c) => ({
        date: c.date,
        time: c.time,
        title: typeById[c.typeId]?.name || "Classe",
        description: [levelById[c.levelId]?.name, `${c.clientIds.length}/${c.capacity || "—"} iscritti`].filter(Boolean).join(" · "),
      }))
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <div
          style={{
            fontFamily: "var(--font-display)",
            fontSize: 22,
            fontWeight: 600,
            textTransform: "capitalize",
            color: COLORS.heading,
          }}
        >
          {monthLabel}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setViewDate(new Date())}
            className="px-2.5 py-1.5 rounded-lg text-xs sm:text-sm font-medium"
            style={{ border: `1px solid ${COLORS.border}` }}
          >
            Oggi
          </button>
          <button
            onClick={onGoToNextClass}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs sm:text-sm font-medium mr-1"
            style={{ border: `1px solid ${COLORS.border}` }}
          >
            <CalendarClock size={13} /> <span className="hidden sm:inline">Prossima lezione</span>
          </button>
          <IconButton onClick={() => shiftMonth(-1)} style={{ border: `1px solid ${COLORS.border}` }}>
            <ChevronLeft size={17} />
          </IconButton>
          <IconButton onClick={() => shiftMonth(1)} style={{ border: `1px solid ${COLORS.border}` }}>
            <ChevronRight size={17} />
          </IconButton>
        </div>
      </div>

      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div className="flex rounded-lg overflow-hidden" style={{ border: `1px solid ${COLORS.border}` }}>
          <button
            onClick={() => setMode("grid")}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium"
            style={{ background: mode === "grid" ? COLORS.primary : "transparent", color: mode === "grid" ? "#fff" : COLORS.ink }}
          >
            <LayoutGrid size={13} /> Calendario
          </button>
          <button
            onClick={() => setMode("list")}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium"
            style={{ background: mode === "list" ? COLORS.primary : "transparent", color: mode === "list" ? "#fff" : COLORS.ink }}
          >
            <List size={13} /> Elenco
          </button>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={downloadMonth}
            title="Scarica tutte le classi del mese come file .ics"
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium"
            style={{ border: `1px solid ${COLORS.border}`, color: COLORS.primaryDark }}
          >
            <Download size={13} /> <span className="hidden sm:inline">Scarica mese</span>
          </button>
          {mode === "list" && (
            <button
              onClick={() => onAddClass(new Date())}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white"
              style={{ background: COLORS.primary }}
            >
              <Plus size={13} /> Nuova classe
            </button>
          )}
        </div>
      </div>

      {mode === "grid" ? (
        <>
          <div className="grid grid-cols-5 mb-1">
            {weekdayLabels.map((w) => (
              <div
                key={w}
                className="text-center py-2"
                style={{ fontSize: 11, fontWeight: 600, letterSpacing: 0.5, color: COLORS.inkSoft, textTransform: "uppercase" }}
              >
                {w}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-5 gap-1.5">
            {days.map((d, i) => {
              const inMonth = d.getMonth() === viewDate.getMonth();
              const key = dateKey(d);
              const dayClasses = classesByDay[key] || [];
              const mainClass = dayClasses[0];
              const extraClasses = dayClasses.slice(1);
              const isToday = isSameDay(d, today);
              const isDragOver = dragOverKey === key;
              const canDrop = inMonth && (dayClasses.length === 0 || (draggingId != null && dayClasses.some((c) => c.id === draggingId)));

              return (
                <div
                  key={i}
                  className="group relative flex flex-col rounded-[10px] sm:rounded-xl p-[5px] sm:p-2 min-h-[58px] sm:min-h-[148px]"
                  style={{
                    background: inMonth ? COLORS.card : "transparent",
                    border: `1.5px solid ${isDragOver && canDrop ? COLORS.primary : inMonth ? COLORS.border : "transparent"}`,
                    opacity: inMonth ? 1 : 0.4,
                    transition: "border-color .15s",
                  }}
                  onDragOver={(e) => {
                    if (!inMonth) return;
                    e.preventDefault();
                  }}
                  onDragEnter={() => inMonth && setDragOverKey(key)}
                  onDragLeave={() => setDragOverKey((k) => (k === key ? null : k))}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDragOverKey(null);
                    const id = e.dataTransfer.getData("text/plain");
                    if (id) onMoveClass(id, key);
                  }}
                >
                  {/* Mobile: card minimale */}
                  <div className="sm:hidden flex flex-col flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span
                        style={{
                          fontSize: 10.5,
                          fontWeight: isToday ? 700 : 500,
                          color: isToday ? "#fff" : COLORS.ink,
                          background: isToday ? COLORS.primary : "transparent",
                          width: 17,
                          height: 17,
                          borderRadius: 999,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        {d.getDate()}
                      </span>
                      {dayClasses.length === 0 && inMonth && (
                        <button
                          onClick={() => onAddClass(d)}
                          className="opacity-0 group-hover:opacity-100 transition flex items-center justify-center"
                          style={{ width: 16, height: 16, borderRadius: 5, background: COLORS.subtle, color: COLORS.primaryDark }}
                          title="Aggiungi classe"
                        >
                          <Plus size={11} />
                        </button>
                      )}
                    </div>

                    <div className="flex flex-col gap-0.5">
                      {dayClasses.map((c) => {
                        const type = typeById[c.typeId];
                        const color = type?.color || COLORS.primary;
                        const dot = availabilityDot(c);
                        return (
                          <button
                            key={c.id}
                            draggable
                            onDragStart={(e) => {
                              setDraggingId(c.id);
                              e.dataTransfer.setData("text/plain", c.id);
                              e.dataTransfer.effectAllowed = "move";
                            }}
                            onDragEnd={() => setDraggingId(null)}
                            onClick={() => onOpenClass(c)}
                            className="flex flex-col items-center justify-center w-full"
                            style={{
                              cursor: "grab",
                              minHeight: 26,
                              padding: "3px 2px",
                              borderRadius: 5,
                              background: withAlpha(color, 12),
                              borderLeft: `2.5px solid ${color}`,
                              gap: 2,
                              opacity: c.published ? 1 : 0.6,
                            }}
                            title={`${c.time || "—"}${c.published ? "" : " · Bozza"} · Trascina per spostare in un altro giorno`}
                          >
                            <span className="flex items-center gap-0.5" style={{ fontSize: 9.5, fontWeight: 800, color: COLORS.ink, letterSpacing: 0.3 }}>
                              {!c.published && <EyeOff size={8} color={COLORS.inkSoft} />}
                              {!c.bookingsOpen && <Lock size={8} color={COLORS.inkSoft} />}
                              {c.isFree && <Gift size={8} color={COLORS.gold} />}
                              {typeInitials(type?.name)}
                            </span>
                            <span style={{ width: 5, height: 5, borderRadius: 999, background: dot, flexShrink: 0 }} />
                          </button>
                        );
                      })}
                    </div>

                    {dayClasses.length === 0 && inMonth && clipboard && (
                      <button
                        onClick={() => onPasteClass(key)}
                        className="flex items-center gap-1 text-left mt-0.5"
                        style={{ fontSize: 9, color: COLORS.primaryDark, fontWeight: 600 }}
                        title="Incolla la classe copiata"
                      >
                        <ClipboardPaste size={9} /> incolla
                      </button>
                    )}
                  </div>

                  {/* Desktop: card completa, come in origine */}
                  <div className="hidden sm:flex sm:flex-col sm:flex-1">
                    <div className="flex items-center justify-between mb-1.5">
                      <span
                        style={{
                          fontSize: 12,
                          fontWeight: isToday ? 700 : 500,
                          color: isToday ? "#fff" : COLORS.ink,
                          background: isToday ? COLORS.primary : "transparent",
                          width: 20,
                          height: 20,
                          borderRadius: 999,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        {d.getDate()}
                      </span>
                      {!mainClass && inMonth && (
                        <button
                          onClick={() => onAddClass(d)}
                          className="opacity-0 group-hover:opacity-100 transition flex items-center justify-center"
                          style={{ width: 18, height: 18, borderRadius: 6, background: COLORS.subtle, color: COLORS.primaryDark }}
                          title="Aggiungi classe"
                        >
                          <Plus size={12} />
                        </button>
                      )}
                    </div>

                    {mainClass ? (
                      <ClassCard
                        classItem={mainClass}
                        type={typeById[mainClass.typeId]}
                        level={levelById[mainClass.levelId]}
                        onOpen={() => onOpenClass(mainClass)}
                        onDragStart={(e) => {
                          setDraggingId(mainClass.id);
                          e.dataTransfer.setData("text/plain", mainClass.id);
                          e.dataTransfer.effectAllowed = "move";
                        }}
                        onDragEnd={() => setDraggingId(null)}
                      />
                    ) : inMonth ? (
                      <div className="flex flex-col items-start gap-1 flex-1 justify-center">
                        <button
                          onClick={() => onAddClass(d)}
                          className="opacity-0 group-hover:opacity-100 transition text-left"
                          style={{ fontSize: 10.5, color: COLORS.inkSoft, paddingLeft: 2 }}
                        >
                          + aggiungi classe
                        </button>
                        {clipboard && (
                          <button
                            onClick={() => onPasteClass(key)}
                            className="flex items-center gap-1 text-left"
                            style={{ fontSize: 10.5, color: COLORS.primaryDark, fontWeight: 600, paddingLeft: 2 }}
                            title="Incolla la classe copiata"
                          >
                            <ClipboardPaste size={11} /> incolla
                          </button>
                        )}
                      </div>
                    ) : null}

                    {extraClasses.length > 0 && (
                      <div className="flex flex-col gap-1 mt-1">
                        {extraClasses.map((c) => {
                          const type = typeById[c.typeId];
                          return (
                            <button
                              key={c.id}
                              onClick={() => onOpenClass(c)}
                              className="text-left truncate flex items-center gap-1"
                              style={{
                                fontSize: 10.5,
                                padding: "2px 6px",
                                borderRadius: 6,
                                background: withAlpha(type?.color || COLORS.primary, 12),
                                borderLeft: `3px solid ${type?.color || COLORS.primary}`,
                                color: COLORS.ink,
                                opacity: c.published ? 1 : 0.6,
                              }}
                            >
                              {!c.published && <EyeOff size={9} color={COLORS.inkSoft} />}
                              {!c.bookingsOpen && <Lock size={9} color={COLORS.inkSoft} />}
                              {c.isFree && <Gift size={9} color={COLORS.gold} />}
                              {c.time ? `${c.time} · ` : ""}
                              {type?.name || "Classe"}
                            </button>
                          );
                        })}
                      </div>
                    )}
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
              Nessuna classe in programma questo mese.
            </div>
          )}
          {listDays.map((d) => {
            const key = dateKey(d);
            const dayClasses = classesByDay[key] || [];
            const isToday = isSameDay(d, today);
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
                    const level = levelById[c.levelId];
                    const color = type?.color || COLORS.primary;
                    const booked = c.clientIds.length;
                    const waiting = c.waitlistIds.length;
                    const dot = availabilityDot(c);
                    return (
                      <button
                        key={c.id}
                        onClick={() => onOpenClass(c)}
                        className="flex items-center justify-between text-left p-2.5 rounded-lg w-full gap-2"
                        style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderLeft: `3px solid ${color}`, opacity: c.published ? 1 : 0.65 }}
                      >
                        <div>
                          <div style={{ fontSize: 12.5, fontWeight: 700 }} className="flex items-center gap-1.5">
                            {c.time || "—"} · {type?.name || "Classe"}
                            {!c.published && (
                              <span
                                className="inline-flex items-center gap-0.5 rounded-full"
                                style={{ fontSize: 9.5, fontWeight: 700, color: COLORS.gold, background: withAlpha(COLORS.gold, 16), padding: "1px 6px" }}
                              >
                                <EyeOff size={9} /> Bozza
                              </span>
                            )}
                            {!c.bookingsOpen && <Lock size={11} color={COLORS.inkSoft} />}
                            {c.isFree && <span title="Classe gratuita" className="inline-flex"><Gift size={11} color={COLORS.gold} /></span>}
                          </div>
                          <div style={{ fontSize: 11, color: COLORS.inkSoft }}>{level?.name}</div>
                        </div>
                        <span className="flex items-center gap-1.5" style={{ fontSize: 11, fontWeight: 700, whiteSpace: "nowrap" }}>
                          <span style={{ width: 7, height: 7, borderRadius: 999, background: dot }} />
                          {booked}/{c.capacity || "—"}
                          {waiting > 0 && <span style={{ color: COLORS.gold }}> · {waiting} attesa</span>}
                        </span>
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
            <button
              key={e.id}
              onClick={onOpenEvents}
              className="flex items-start gap-2 p-2.5 rounded-lg text-left"
              style={{ background: withAlpha(COLORS.gold, 12), border: `1px solid ${withAlpha(COLORS.gold, 35)}` }}
            >
              <span style={{ width: 6, height: 6, borderRadius: 999, background: COLORS.gold, marginTop: 5, flexShrink: 0 }} />
              <span style={{ fontSize: 12, color: COLORS.ink, lineHeight: 1.45 }}>
                <strong>
                  {WEEKDAYS[(new Date(`${e.date}T00:00:00`).getDay() + 6) % 7]} {new Date(`${e.date}T00:00:00`).getDate()}
                </strong>{" "}
                · {e.name}
                {e.location && <span style={{ color: COLORS.inkSoft }}> — {e.location}</span>}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function ClassCard({
  classItem,
  type,
  level,
  onOpen,
  onDragStart,
  onDragEnd,
}: {
  classItem: ClassItem;
  type?: ClassType;
  level?: Level;
  onOpen: () => void;
  onDragStart: (e: React.DragEvent) => void;
  onDragEnd: () => void;
}) {
  const c = classItem;
  const color = type?.color || COLORS.primary;
  const booked = c.clientIds.length;
  const waiting = c.waitlistIds.length;

  return (
    <button
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={onOpen}
      className="text-left flex-1 flex flex-col"
      style={{
        cursor: "grab",
        borderRadius: 10,
        padding: "8px 9px",
        background: withAlpha(color, 9),
        borderLeft: `3px solid ${color}`,
        gap: 4,
        opacity: c.published ? 1 : 0.7,
      }}
      title={`Trascina per spostare in un altro giorno${c.published ? "" : " · Bozza, non visibile ai clienti"}`}
    >
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1" style={{ fontSize: 12.5, fontWeight: 700, color: COLORS.ink }}>
          {c.time || "—"}
          {c.isFree && <span title="Classe gratuita" className="inline-flex"><Gift size={11} color={COLORS.gold} /></span>}
        </span>
        <span className="flex items-center gap-1">
          {!c.bookingsOpen && <Lock size={11} color={COLORS.inkSoft} />}
          <GripVertical size={12} color={COLORS.inkSoft} style={{ opacity: 0.6 }} />
        </span>
      </div>
      <div style={{ fontSize: 12.5, fontWeight: 600, color: COLORS.ink, lineHeight: 1.2 }}>{type?.name || "Classe"}</div>
      {!c.published && (
        <span
          className="self-start inline-flex items-center gap-0.5 rounded-full"
          style={{ fontSize: 9.5, fontWeight: 700, color: COLORS.gold, background: withAlpha(COLORS.gold, 16), padding: "1px 6px" }}
        >
          <EyeOff size={9} /> Bozza
        </span>
      )}
      {level && (
        <span
          className="self-start"
          style={{
            fontSize: 10,
            fontWeight: 600,
            color: COLORS.primaryDark,
            background: COLORS.card,
            borderRadius: 999,
            padding: "1px 7px",
            border: `1px solid ${withAlpha(color, 33)}`,
          }}
        >
          {level.name}
        </span>
      )}
      <div className="mt-auto pt-1.5">
        <CapacityBar booked={booked} capacity={c.capacity} waiting={waiting} />
      </div>
    </button>
  );
}
