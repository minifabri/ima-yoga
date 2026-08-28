"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, Plus, ClipboardPaste, GripVertical } from "lucide-react";
import { IconButton, CapacityBar } from "./ui";
import { COLORS } from "./colors";
import { WEEKDAYS, MONTHS, dateKey, isSameDay, getCalendarDays } from "./utils";
import type { ClassItem, ClassType, Level } from "./types";

type ClassClipboard = {
  typeId: string;
  levelId: string;
  time: string;
  capacity: number;
  notes: string;
};

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

  function shiftMonth(delta: number) {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + delta, 1));
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div
          style={{
            fontFamily: "var(--font-display)",
            fontSize: 24,
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
          const mainClass = dayClasses[0];
          const extraClasses = dayClasses.slice(1);
          const isToday = isSameDay(d, today);
          const isDragOver = dragOverKey === key;
          const canDrop = inMonth && (!mainClass || (draggingId != null && mainClass.id === draggingId));

          return (
            <div
              key={i}
              className="group relative flex flex-col"
              style={{
                minHeight: 148,
                borderRadius: 12,
                padding: 8,
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
                        className="text-left truncate"
                        style={{
                          fontSize: 10.5,
                          padding: "2px 6px",
                          borderRadius: 6,
                          background: (type?.color || COLORS.primary) + "1E",
                          borderLeft: `3px solid ${type?.color || COLORS.primary}`,
                          color: COLORS.ink,
                        }}
                      >
                        {c.time ? `${c.time} · ` : ""}
                        {type?.name || "Classe"}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
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
        background: color + "16",
        borderLeft: `3px solid ${color}`,
        gap: 4,
      }}
      title="Trascina per spostare in un altro giorno"
    >
      <div className="flex items-center justify-between">
        <span style={{ fontSize: 12.5, fontWeight: 700, color: COLORS.ink }}>{c.time || "—"}</span>
        <GripVertical size={12} color={COLORS.inkSoft} style={{ opacity: 0.6 }} />
      </div>
      <div style={{ fontSize: 12.5, fontWeight: 600, color: COLORS.ink, lineHeight: 1.2 }}>{type?.name || "Classe"}</div>
      {level && (
        <span
          className="self-start"
          style={{
            fontSize: 10,
            fontWeight: 600,
            color: COLORS.primaryDark,
            background: "#fff",
            borderRadius: 999,
            padding: "1px 7px",
            border: `1px solid ${color}55`,
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
