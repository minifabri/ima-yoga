"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, Plus, ClipboardPaste, LayoutGrid, List, Lock } from "lucide-react";
import { IconButton } from "./ui";
import { COLORS } from "./colors";
import { WEEKDAYS, MONTHS, dateKey, isSameDay, getCalendarDays } from "./utils";
import type { ClassItem, ClassType, Level } from "./types";

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
  onAddClass,
  onOpenClass,
  onMoveClass,
  onPasteClass,
}: {
  viewDate: Date;
  setViewDate: (d: Date) => void;
  classesByDay: Record<string, ClassItem[]>;
  typeById: Record<string, ClassType>;
  levelById: Record<string, Level>;
  clipboard: ClassClipboard | null;
  onAddClass: (date: Date) => void;
  onOpenClass: (classItem: ClassItem) => void;
  onMoveClass: (id: string, targetDate: string) => void;
  onPasteClass: (dateStr: string) => void;
}) {
  const days = getCalendarDays(viewDate);
  const today = new Date();
  const monthLabel = `${MONTHS[viewDate.getMonth()]} ${viewDate.getFullYear()}`;
  const [dragOverKey, setDragOverKey] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [mode, setMode] = useState<"grid" | "list">("grid");

  function shiftMonth(delta: number) {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + delta, 1));
  }

  const listDays = days.filter((d) => (classesByDay[dateKey(d)] || []).length > 0);

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
            className="px-3 py-1.5 rounded-lg text-sm font-medium mr-1"
            style={{ border: `1px solid ${COLORS.border}` }}
          >
            Oggi
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

      {mode === "grid" ? (
        <>
          <div className="grid grid-cols-7 mb-1">
            {WEEKDAYS.map((w) => (
              <div
                key={w}
                className="text-center py-2"
                style={{ fontSize: 11, fontWeight: 600, letterSpacing: 0.5, color: COLORS.inkSoft, textTransform: "uppercase" }}
              >
                {w}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1.5">
            {days.map((d, i) => {
              const inMonth = d.getMonth() === viewDate.getMonth();
              const key = dateKey(d);
              const dayClasses = classesByDay[key] || [];
              const isToday = isSameDay(d, today);
              const isDragOver = dragOverKey === key;
              const canDrop = inMonth && (dayClasses.length === 0 || (draggingId != null && dayClasses.some((c) => c.id === draggingId)));

              return (
                <div
                  key={i}
                  className="group relative flex flex-col"
                  style={{
                    minHeight: 58,
                    borderRadius: 10,
                    padding: 5,
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
                            background: color + "1E",
                            borderLeft: `2.5px solid ${color}`,
                            gap: 2,
                          }}
                          title={`${c.time || "—"} · Trascina per spostare in un altro giorno`}
                        >
                          <span className="flex items-center gap-0.5" style={{ fontSize: 9.5, fontWeight: 800, color: COLORS.ink, letterSpacing: 0.3 }}>
                            {!c.bookingsOpen && <Lock size={8} color={COLORS.inkSoft} />}
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
                        style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderLeft: `3px solid ${color}` }}
                      >
                        <div>
                          <div style={{ fontSize: 12.5, fontWeight: 700 }} className="flex items-center gap-1.5">
                            {c.time || "—"} · {type?.name || "Classe"}
                            {!c.bookingsOpen && <Lock size={11} color={COLORS.inkSoft} />}
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
    </div>
  );
}
