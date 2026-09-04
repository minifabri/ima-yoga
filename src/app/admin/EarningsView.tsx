"use client";

import { useEffect, useMemo, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { ChevronLeft, ChevronRight, TrendingUp, TrendingDown, Wallet, Receipt, Plus, Trash2 } from "lucide-react";
import { IconButton, inputStyle } from "./ui";
import { COLORS } from "./colors";
import { MONTHS } from "./utils";
import { fetchAllEventBookings, fetchEvents } from "./data";
import type { ClassItem, EventBookingItem, EventItem, Expense, PackageItem } from "./types";

type PeriodMode = "month" | "year" | "total";

function monthKeyOf(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function yearKeyOf(d: Date): string {
  return String(d.getFullYear());
}

function StatCard({
  icon,
  label,
  amount,
  color,
  breakdown,
}: {
  icon: React.ReactNode;
  label: string;
  amount: number;
  color: string;
  breakdown?: string;
}) {
  return (
    <div className="p-4 rounded-xl" style={{ background: COLORS.card, border: `1px solid ${COLORS.border}` }}>
      <div className="flex items-center gap-1.5 mb-1.5" style={{ color: COLORS.inkSoft, fontSize: 12, fontWeight: 600 }}>
        {icon} {label}
      </div>
      <div style={{ fontFamily: "var(--font-display)", fontSize: 24, fontWeight: 600, color }}>
        €{amount.toFixed(2)}
      </div>
      {breakdown && (
        <div style={{ fontSize: 11, color: COLORS.inkSoft }} className="mt-0.5">
          {breakdown}
        </div>
      )}
    </div>
  );
}

export function EarningsView({
  supabase,
  classes,
  packages,
  expenses,
  onAddExpense,
  onDeleteExpense,
}: {
  supabase: SupabaseClient;
  classes: ClassItem[];
  packages: PackageItem[];
  expenses: Expense[];
  onAddExpense: (args: { amount: number; note: string; date: string }) => void;
  onDeleteExpense: (id: string) => void;
}) {
  const [periodMode, setPeriodMode] = useState<PeriodMode>("month");
  const [viewDate, setViewDate] = useState(new Date());
  const [addOpen, setAddOpen] = useState(false);
  const [expDate, setExpDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [expAmount, setExpAmount] = useState("");
  const [expNote, setExpNote] = useState("");

  const [events, setEvents] = useState<EventItem[]>([]);
  const [eventBookings, setEventBookings] = useState<EventBookingItem[]>([]);
  const [eventsError, setEventsError] = useState(false);

  useEffect(() => {
    Promise.all([fetchEvents(supabase), fetchAllEventBookings(supabase)])
      .then(([ev, bookings]) => {
        setEvents(ev);
        setEventBookings(bookings);
      })
      .catch(() => setEventsError(true));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function inPeriod(dateStr: string): boolean {
    if (periodMode === "total") return true;
    if (periodMode === "year") return dateStr.startsWith(yearKeyOf(viewDate));
    return dateStr.startsWith(monthKeyOf(viewDate));
  }

  const periodLabel =
    periodMode === "total" ? "Storico completo" : periodMode === "year" ? String(viewDate.getFullYear()) : `${MONTHS[viewDate.getMonth()]} ${viewDate.getFullYear()}`;

  function shiftPeriod(delta: number) {
    if (periodMode === "year") setViewDate(new Date(viewDate.getFullYear() + delta, viewDate.getMonth(), 1));
    else setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + delta, 1));
  }

  const classFigures = useMemo(() => {
    function compute(predicate: (date: string) => boolean) {
      let collected = 0;
      let owed = 0;
      classes.forEach((c) => {
        if (!predicate(c.date)) return;
        Object.values(c.payments || {}).forEach((pay) => {
          if (pay.status === "package") return;
          collected += pay.amount || 0;
          owed += Math.max(0, (pay.price || 0) - (pay.amount || 0));
        });
      });
      return { collected, owed };
    }
    return { period: compute(inPeriod), all: compute(() => true) };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classes, periodMode, viewDate]);

  const packageFigures = useMemo(() => {
    function compute(predicate: (date: string) => boolean) {
      let collected = 0;
      let owed = 0;
      packages.forEach((p) => {
        if (!predicate(p.date)) return;
        collected += p.paidAmount || 0;
        owed += Math.max(0, (p.price || 0) - (p.paidAmount || 0));
      });
      return { collected, owed };
    }
    return { period: compute(inPeriod), all: compute(() => true) };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [packages, periodMode, viewDate]);

  const eventDateById = useMemo(() => Object.fromEntries(events.map((e) => [e.id, e.date])), [events]);

  const eventFigures = useMemo(() => {
    function compute(predicate: (date: string) => boolean) {
      let collected = 0;
      let owed = 0;
      eventBookings.forEach((b) => {
        if (b.status !== "booked") return;
        const evDate = eventDateById[b.eventId];
        if (!evDate || !predicate(evDate)) return;
        const amount = b.price * (b.plusOne ? 2 : 1);
        if (b.paymentStatus === "paid") collected += amount;
        else owed += amount;
      });
      return { collected, owed };
    }
    return { period: compute(inPeriod), all: compute(() => true) };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventBookings, eventDateById, periodMode, viewDate]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const expensesPeriod = useMemo(() => expenses.filter((e) => inPeriod(e.date)), [expenses, periodMode, viewDate]);
  const expensesPeriodTotal = useMemo(() => expensesPeriod.reduce((s, e) => s + (e.amount || 0), 0), [expensesPeriod]);
  const expensesAllTotal = useMemo(() => expenses.reduce((s, e) => s + (e.amount || 0), 0), [expenses]);

  const collectedPeriod = classFigures.period.collected + packageFigures.period.collected + eventFigures.period.collected;
  const potentialPeriod = classFigures.period.owed + packageFigures.period.owed + eventFigures.period.owed;
  const netPeriod = collectedPeriod - expensesPeriodTotal;

  const collectedAll = classFigures.all.collected + packageFigures.all.collected + eventFigures.all.collected;
  const potentialAll = classFigures.all.owed + packageFigures.all.owed + eventFigures.all.owed;
  const netAll = collectedAll - expensesAllTotal;

  const sortedExpenses = [...expenses].sort((a, b) => b.date.localeCompare(a.date));

  function confirmAddExpense() {
    const amount = Number(expAmount);
    if (!amount || amount <= 0) return;
    onAddExpense({ amount, note: expNote, date: expDate });
    setAddOpen(false);
    setExpAmount("");
    setExpNote("");
    setExpDate(new Date().toISOString().slice(0, 10));
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <div style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 600, textTransform: "capitalize", color: COLORS.heading }}>
          {periodLabel}
        </div>
        <div className="flex items-center gap-1.5 flex-wrap justify-end">
          <div className="flex rounded-lg overflow-hidden" style={{ border: `1px solid ${COLORS.border}` }}>
            {([
              ["month", "Mensile"],
              ["year", "Annuale"],
              ["total", "Totale"],
            ] as [PeriodMode, string][]).map(([mode, label]) => (
              <button
                key={mode}
                onClick={() => setPeriodMode(mode)}
                className="px-2.5 py-1.5 text-xs sm:text-sm font-medium"
                style={{ background: periodMode === mode ? COLORS.primary : "transparent", color: periodMode === mode ? "#fff" : COLORS.ink }}
              >
                {label}
              </button>
            ))}
          </div>
          {periodMode !== "total" && (
            <div className="flex items-center gap-1">
              <button onClick={() => setViewDate(new Date())} className="px-2.5 py-1.5 rounded-lg text-xs sm:text-sm font-medium" style={{ border: `1px solid ${COLORS.border}` }}>
                {periodMode === "year" ? "Quest'anno" : "Oggi"}
              </button>
              <IconButton onClick={() => shiftPeriod(-1)} style={{ border: `1px solid ${COLORS.border}` }}>
                <ChevronLeft size={16} />
              </IconButton>
              <IconButton onClick={() => shiftPeriod(1)} style={{ border: `1px solid ${COLORS.border}` }}>
                <ChevronRight size={16} />
              </IconButton>
            </div>
          )}
        </div>
      </div>

      {eventsError && (
        <div className="mb-3 px-1" style={{ fontSize: 11.5, color: COLORS.danger }}>
          Incassi eventi non disponibili al momento — i totali qui sotto non li includono.
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
        <StatCard
          icon={<TrendingUp size={13} />}
          label="Incassato"
          amount={collectedPeriod}
          color={COLORS.success}
          breakdown={`Lezioni €${classFigures.period.collected.toFixed(2)} · Pacchetti €${packageFigures.period.collected.toFixed(2)} · Eventi €${eventFigures.period.collected.toFixed(2)}`}
        />
        <StatCard
          icon={<Wallet size={13} />}
          label="Potenziale"
          amount={potentialPeriod}
          color={COLORS.gold}
          breakdown={`Lezioni €${classFigures.period.owed.toFixed(2)} · Pacchetti €${packageFigures.period.owed.toFixed(2)} · Eventi €${eventFigures.period.owed.toFixed(2)}`}
        />
        <StatCard icon={<Receipt size={13} />} label="Spese" amount={expensesPeriodTotal} color={COLORS.danger} />
        <StatCard
          icon={<TrendingDown size={13} />}
          label="Netto"
          amount={netPeriod}
          color={netPeriod >= 0 ? COLORS.primaryDark : COLORS.danger}
          breakdown="Incassato − spese"
        />
      </div>

      {periodMode !== "total" && (
        <div className="mb-6 px-1" style={{ fontSize: 11.5, color: COLORS.inkSoft }}>
          Totale complessivo: incassato €{collectedAll.toFixed(2)} · potenziale €{potentialAll.toFixed(2)} · spese €{expensesAllTotal.toFixed(2)} · netto{" "}
          <span style={{ fontWeight: 700, color: netAll >= 0 ? COLORS.success : COLORS.danger }}>€{netAll.toFixed(2)}</span>
        </div>
      )}

      <div>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Receipt size={16} color={COLORS.heading} />
            <div style={{ fontFamily: "var(--font-display)", fontSize: 19, fontWeight: 600, color: COLORS.heading }}>Spese</div>
          </div>
          <button onClick={() => setAddOpen((v) => !v)} className="flex items-center gap-1.5 text-sm font-semibold px-3 py-1.5 rounded-lg text-white" style={{ background: COLORS.primary }}>
            <Plus size={14} /> Aggiungi spesa
          </button>
        </div>

        {addOpen && (
          <div className="mb-3 p-3 rounded-xl" style={{ background: COLORS.card, border: `1px solid ${COLORS.border}` }}>
            <div className="grid grid-cols-2 gap-2 mb-2">
              <input type="date" value={expDate} onChange={(e) => setExpDate(e.target.value)} style={inputStyle} />
              <input type="number" min={0} value={expAmount} onChange={(e) => setExpAmount(e.target.value)} placeholder="Importo (€)" style={inputStyle} />
            </div>
            <input value={expNote} onChange={(e) => setExpNote(e.target.value)} placeholder="Descrizione (es. affitto sala, materiale…)" style={{ ...inputStyle, marginBottom: 8 }} />
            <div className="flex justify-end">
              <button onClick={confirmAddExpense} className="px-3 py-1.5 rounded-lg text-sm font-semibold text-white" style={{ background: COLORS.primary }}>
                Salva
              </button>
            </div>
          </div>
        )}

        {sortedExpenses.length === 0 ? (
          <div style={{ fontSize: 13, color: COLORS.inkSoft }} className="px-1">
            Nessuna spesa registrata.
          </div>
        ) : (
          <div className="flex flex-col gap-1.5">
            {sortedExpenses.map((e) => (
              <div key={e.id} className="flex items-center justify-between px-3 py-2 rounded-lg flex-wrap gap-1.5" style={{ background: COLORS.card, border: `1px solid ${COLORS.border}` }}>
                <div style={{ fontSize: 12.5 }}>
                  <span style={{ fontWeight: 600, color: COLORS.danger }}>€{e.amount.toFixed(2)}</span>
                  {e.note && <span style={{ color: COLORS.ink }}> — {e.note}</span>}
                  <span style={{ color: COLORS.inkSoft }}> · {e.date}</span>
                </div>
                <button onClick={() => onDeleteExpense(e.id)} style={{ color: COLORS.inkSoft }}>
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
