"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, TrendingUp, TrendingDown, Wallet, Receipt, Plus, Trash2 } from "lucide-react";
import { IconButton, inputStyle } from "./ui";
import { COLORS } from "./colors";
import { MONTHS } from "./utils";
import type { ClassItem, Expense, PackageItem } from "./types";

function monthKeyOf(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
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
  classes,
  packages,
  expenses,
  onAddExpense,
  onDeleteExpense,
}: {
  classes: ClassItem[];
  packages: PackageItem[];
  expenses: Expense[];
  onAddExpense: (args: { amount: number; note: string; date: string }) => void;
  onDeleteExpense: (id: string) => void;
}) {
  const [viewDate, setViewDate] = useState(new Date());
  const [addOpen, setAddOpen] = useState(false);
  const [expDate, setExpDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [expAmount, setExpAmount] = useState("");
  const [expNote, setExpNote] = useState("");

  const monthKey = monthKeyOf(viewDate);
  const monthLabel = `${MONTHS[viewDate.getMonth()]} ${viewDate.getFullYear()}`;

  function shiftMonth(delta: number) {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + delta, 1));
  }

  const classFigures = useMemo(() => {
    function compute(filterMonth: string | null) {
      let collected = 0;
      let owed = 0;
      classes.forEach((c) => {
        if (filterMonth && !c.date.startsWith(filterMonth)) return;
        Object.values(c.payments || {}).forEach((pay) => {
          if (pay.status === "package") return;
          collected += pay.amount || 0;
          owed += Math.max(0, (pay.price || 0) - (pay.amount || 0));
        });
      });
      return { collected, owed };
    }
    return { month: compute(monthKey), all: compute(null) };
  }, [classes, monthKey]);

  const packageFigures = useMemo(() => {
    function compute(filterMonth: string | null) {
      let collected = 0;
      let owed = 0;
      packages.forEach((p) => {
        if (filterMonth && !p.date.startsWith(filterMonth)) return;
        collected += p.paidAmount || 0;
        owed += Math.max(0, (p.price || 0) - (p.paidAmount || 0));
      });
      return { collected, owed };
    }
    return { month: compute(monthKey), all: compute(null) };
  }, [packages, monthKey]);

  const expensesMonth = useMemo(() => expenses.filter((e) => e.date.startsWith(monthKey)), [expenses, monthKey]);
  const expensesMonthTotal = useMemo(() => expensesMonth.reduce((s, e) => s + (e.amount || 0), 0), [expensesMonth]);
  const expensesAllTotal = useMemo(() => expenses.reduce((s, e) => s + (e.amount || 0), 0), [expenses]);

  const collectedMonth = classFigures.month.collected + packageFigures.month.collected;
  const potentialMonth = classFigures.month.owed + packageFigures.month.owed;
  const netMonth = collectedMonth - expensesMonthTotal;

  const collectedAll = classFigures.all.collected + packageFigures.all.collected;
  const potentialAll = classFigures.all.owed + packageFigures.all.owed;
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
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 600, textTransform: "capitalize", color: COLORS.heading }}>
          {monthLabel}
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => setViewDate(new Date())} className="px-2.5 py-1.5 rounded-lg text-xs sm:text-sm font-medium" style={{ border: `1px solid ${COLORS.border}` }}>
            Oggi
          </button>
          <IconButton onClick={() => shiftMonth(-1)} style={{ border: `1px solid ${COLORS.border}` }}>
            <ChevronLeft size={16} />
          </IconButton>
          <IconButton onClick={() => shiftMonth(1)} style={{ border: `1px solid ${COLORS.border}` }}>
            <ChevronRight size={16} />
          </IconButton>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
        <StatCard
          icon={<TrendingUp size={13} />}
          label="Incassato"
          amount={collectedMonth}
          color={COLORS.success}
          breakdown={`Lezioni €${classFigures.month.collected.toFixed(2)} · Pacchetti €${packageFigures.month.collected.toFixed(2)}`}
        />
        <StatCard
          icon={<Wallet size={13} />}
          label="Potenziale"
          amount={potentialMonth}
          color={COLORS.gold}
          breakdown="Ancora da riscuotere"
        />
        <StatCard icon={<Receipt size={13} />} label="Spese" amount={expensesMonthTotal} color={COLORS.danger} />
        <StatCard
          icon={<TrendingDown size={13} />}
          label="Netto"
          amount={netMonth}
          color={netMonth >= 0 ? COLORS.primaryDark : COLORS.danger}
          breakdown="Incassato − spese"
        />
      </div>

      <div className="mb-6 px-1" style={{ fontSize: 11.5, color: COLORS.inkSoft }}>
        Totale complessivo: incassato €{collectedAll.toFixed(2)} · potenziale €{potentialAll.toFixed(2)} · spese €{expensesAllTotal.toFixed(2)} · netto{" "}
        <span style={{ fontWeight: 700, color: netAll >= 0 ? COLORS.success : COLORS.danger }}>€{netAll.toFixed(2)}</span>
      </div>

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
