"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ChevronLeft, ChevronRight, Eye, Gift, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { trackPageView } from "@/lib/track";
import { COLORS, withAlpha } from "@/app/admin/colors";
import { WEEKDAYS, MONTHS, dateKey, isSameDay, getCalendarDays } from "@/app/admin/utils";
import { fetchVisitorClasses } from "./data";
import type { VisitorClass } from "./types";

export function CalendarioVisitatore() {
  const supabase = useMemo(() => createClient(), []);
  const [viewDate, setViewDate] = useState(new Date());
  const [classes, setClasses] = useState<VisitorClass[]>([]);
  const [selected, setSelected] = useState<VisitorClass | null>(null);

  useEffect(() => {
    trackPageView(supabase, "/calendario");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const days = useMemo(() => getCalendarDays(viewDate), [viewDate]);

  useEffect(() => {
    const from = dateKey(days[0]);
    const to = dateKey(days[days.length - 1]);
    fetchVisitorClasses(supabase, from, to)
      .then(setClasses)
      .catch(() => setClasses([]));
  }, [days, supabase]);

  const classesByDay = useMemo(() => {
    const map: Record<string, VisitorClass[]> = {};
    for (const c of classes) (map[c.date] = map[c.date] || []).push(c);
    Object.values(map).forEach((list) => list.sort((a, b) => a.time.localeCompare(b.time)));
    return map;
  }, [classes]);

  return (
    <main className="flex-1 flex flex-col p-5" style={{ background: COLORS.bg, minHeight: "100vh" }}>
      <div className="w-full mx-auto" style={{ maxWidth: 860 }}>
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <Link href="/" className="inline-flex items-center gap-1 text-sm" style={{ color: COLORS.inkSoft }}>
            <ArrowLeft size={15} /> Fai un passo indietro
          </Link>
          <div
            className="inline-flex items-center gap-1.5 rounded-full"
            style={{
              fontSize: 11.5,
              fontWeight: 700,
              color: COLORS.primaryDark,
              background: withAlpha(COLORS.primary, 14),
              border: `1px solid ${withAlpha(COLORS.primary, 30)}`,
              padding: "5px 12px",
            }}
            title="Stai guardando il calendario come visitatore, senza aver effettuato l'accesso."
          >
            <Eye size={14} /> Modalità visitatore
          </div>
        </div>

        <div className="text-center mb-6">
          <div style={{ fontFamily: "var(--font-display)", fontSize: 26, color: COLORS.heading }}>Calendario</div>
          <p className="mt-2" style={{ fontSize: 13, color: COLORS.inkSoft }}>
            Stai sfogliando le classi in sola visualizzazione.{" "}
            <Link href="/login" style={{ color: COLORS.primaryDark, fontWeight: 600 }}>
              Accedi
            </Link>{" "}
            per vedere i posti disponibili e prenotare.
          </p>
        </div>

        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <div style={{ fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 600, textTransform: "capitalize", color: COLORS.heading }}>
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

        <div className="grid grid-cols-7 mb-1">
          {WEEKDAYS.map((w) => (
            <div key={w} className="text-center py-2" style={{ fontSize: 11, fontWeight: 600, color: COLORS.inkSoft, textTransform: "uppercase" }}>
              {w}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1.5">
          {days.map((d, i) => {
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
                  {dayClasses.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => setSelected(c)}
                      className="text-left truncate"
                      style={{
                        fontSize: 10.5,
                        padding: "3px 6px",
                        borderRadius: 6,
                        background: withAlpha(c.typeColor, 12),
                        borderLeft: `3px solid ${c.typeColor}`,
                        color: COLORS.ink,
                      }}
                    >
                      <div className="flex items-center gap-1" style={{ fontWeight: 700 }}>
                        {c.time}
                        {c.isFree && (
                          <span title="Classe gratuita" className="inline-flex">
                            <Gift size={10} color={COLORS.gold} />
                          </span>
                        )}
                      </div>
                      <div className="truncate">{c.typeName}</div>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {selected && (
        <div
          className="fixed inset-0 flex items-center justify-center p-4"
          style={{ background: "rgba(74,58,115,0.35)", zIndex: 50 }}
          onMouseDown={(e) => e.target === e.currentTarget && setSelected(null)}
        >
          <div className="w-full p-5" style={{ maxWidth: 380, background: COLORS.card, borderRadius: 18, boxShadow: "0 16px 44px rgba(74,58,115,0.16)" }}>
            <div className="flex items-center justify-between mb-3">
              <div style={{ fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 600, color: COLORS.heading }}>{selected.typeName}</div>
              <button onClick={() => setSelected(null)}>
                <X size={18} />
              </button>
            </div>
            <div className="flex items-center gap-1.5 flex-wrap mb-1">
              <span style={{ fontSize: 13, color: COLORS.inkSoft }}>
                {selected.date} · {selected.time}
              </span>
              {selected.isFree && (
                <span
                  className="inline-flex items-center gap-1 rounded-full"
                  style={{ fontSize: 10.5, fontWeight: 700, color: COLORS.gold, background: withAlpha(COLORS.gold, 16), padding: "1px 8px" }}
                >
                  <Gift size={10} /> Gratuita
                </span>
              )}
            </div>
            {selected.levelName && (
              <div style={{ fontSize: 13, color: COLORS.inkSoft }} className="mb-3">
                {selected.levelName}
              </div>
            )}
            {selected.description && (
              <div className="mb-4 p-2.5 rounded-lg" style={{ background: COLORS.subtle, fontSize: 12.5, color: COLORS.ink, lineHeight: 1.4 }}>
                {selected.description}
              </div>
            )}
            <Link
              href="/login"
              className="w-full py-2.5 rounded-lg text-sm font-semibold text-white flex items-center justify-center"
              style={{ background: COLORS.primary }}
            >
              Accedi per prenotare
            </Link>
          </div>
        </div>
      )}
    </main>
  );
}
