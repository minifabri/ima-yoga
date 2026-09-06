"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { Plus, Trash2, AlertCircle, Link2, Unlink } from "lucide-react";
import { COLORS, withAlpha } from "./colors";
import { Field, inputStyle } from "./ui";
import { saveEventBudget, deleteEventBudget } from "./data";
import type { BudgetLineItem, EventBudget, EventItem } from "./types";

const fmtEUR = new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
const fmtEUR1 = new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR", maximumFractionDigits: 2 });
const fmtNum = new Intl.NumberFormat("it-IT");

function genLineId(): string {
  return `item-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export function computeTotals(items: BudgetLineItem[], days: number, ticketPrice: number, participants: number) {
  const d = Math.max(1, days || 1);
  const price = Math.max(0, ticketPrice || 0);
  const p = Math.max(0, participants);

  let fixedTotal = 0;
  let variablePerPerson = 0;
  items.forEach((item) => {
    const amount = Number(item.amount) || 0;
    const multiplier = item.freq === "day" ? d : 1;
    if (item.per === "total") fixedTotal += amount * multiplier;
    else variablePerPerson += amount * multiplier;
  });

  const costs = fixedTotal + variablePerPerson * p;
  const revenue = price * p;
  const profit = revenue - costs;
  const marginPerPerson = price - variablePerPerson;
  const breakeven = marginPerPerson > 0 ? Math.ceil(fixedTotal / marginPerPerson) : null;

  return { days: d, price, participants: p, fixedTotal, variablePerPerson, costs, revenue, profit, marginPerPerson, breakeven };
}

type Totals = ReturnType<typeof computeTotals>;

function Kpi({ label, value, note, tone }: { label: string; value: string; note?: string; tone?: "positive" | "negative" }) {
  return (
    <div className="p-3 rounded-xl" style={{ background: COLORS.card, border: `1px solid ${COLORS.border}` }}>
      <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: 0.4, fontWeight: 600, color: COLORS.inkSoft }}>{label}</div>
      <div
        style={{
          fontFamily: "var(--font-display)",
          fontSize: 22,
          fontWeight: 600,
          marginTop: 4,
          color: tone === "positive" ? COLORS.success : tone === "negative" ? COLORS.danger : COLORS.heading,
        }}
      >
        {value}
      </div>
      {note && (
        <div style={{ fontSize: 11, color: COLORS.inkSoft }} className="mt-0.5">
          {note}
        </div>
      )}
    </div>
  );
}

function ToggleGroup<T extends string>({ value, onChange, options }: { value: T; onChange: (v: T) => void; options: [T, string][] }) {
  return (
    <div className="inline-flex rounded-lg overflow-hidden" style={{ border: `1px solid ${COLORS.border}` }}>
      {options.map(([val, label]) => (
        <button
          key={val}
          type="button"
          onClick={() => onChange(val)}
          className="px-2 py-1"
          style={{ fontSize: 11, fontWeight: 600, background: value === val ? COLORS.primary : "transparent", color: value === val ? "#fff" : COLORS.inkSoft }}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

function ScenarioTable({ items, days, ticketPrice, totals }: { items: BudgetLineItem[]; days: number; ticketPrice: number; totals: Totals }) {
  const basePrice = totals.price;
  const baseParticipants = Math.max(totals.participants, totals.breakeven || 0, 1);
  const priceStep = Math.max(5, Math.round((basePrice * 0.1) / 5) * 5) || 5;
  const priceCols = [-2, -1, 0, 1, 2].map((m) => Math.max(0, basePrice + m * priceStep));
  const pStep = Math.max(1, Math.round(baseParticipants / 5));
  const pRows = [-2, -1, 0, 1, 2]
    .map((m) => Math.max(0, totals.participants + m * pStep))
    .filter((v, i, arr) => arr.indexOf(v) === i);

  return (
    <div className="overflow-x-auto">
      <table style={{ borderCollapse: "collapse", width: "100%", minWidth: 420, fontSize: 12.5 }}>
        <thead>
          <tr>
            <th style={{ textAlign: "left", padding: "6px 8px", color: COLORS.inkSoft, fontSize: 10.5, textTransform: "uppercase", borderBottom: `1px solid ${COLORS.border}` }}>
              Partecipanti \ Prezzo
            </th>
            {priceCols.map((price) => (
              <th
                key={price}
                style={{
                  textAlign: "right",
                  padding: "6px 8px",
                  color: price === basePrice ? COLORS.primaryDark : COLORS.inkSoft,
                  fontWeight: price === basePrice ? 700 : 600,
                  borderBottom: `1px solid ${COLORS.border}`,
                }}
              >
                {fmtEUR.format(price)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {pRows.map((participants) => {
            const rowCosts = computeTotals(items, days, ticketPrice, participants).costs;
            const isCurrentRow = participants === totals.participants;
            return (
              <tr key={participants}>
                <td style={{ padding: "6px 8px", fontWeight: 600, color: isCurrentRow ? COLORS.primaryDark : COLORS.inkSoft, borderBottom: `1px solid ${COLORS.border}` }}>
                  {fmtNum.format(participants)}
                </td>
                {priceCols.map((price) => {
                  const profit = price * participants - rowCosts;
                  const isCurrentCell = isCurrentRow && price === basePrice;
                  return (
                    <td
                      key={price}
                      style={{
                        textAlign: "right",
                        padding: "6px 8px",
                        color: profit >= 0 ? COLORS.success : COLORS.danger,
                        background: isCurrentCell ? withAlpha(COLORS.primary, 12) : "transparent",
                        borderRadius: isCurrentCell ? 4 : 0,
                        borderBottom: `1px solid ${COLORS.border}`,
                      }}
                    >
                      {fmtEUR.format(profit)}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function ProfitChart({ items, days, ticketPrice, totals }: { items: BudgetLineItem[]; days: number; ticketPrice: number; totals: Totals }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    function draw() {
      const dpr = window.devicePixelRatio || 1;
      const cssWidth = canvas!.clientWidth || canvas!.parentElement?.clientWidth || 320;
      const cssHeight = 200;
      canvas!.width = cssWidth * dpr;
      canvas!.height = cssHeight * dpr;
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx!.clearRect(0, 0, cssWidth, cssHeight);

      const styles = getComputedStyle(document.documentElement);
      const colAccent = styles.getPropertyValue("--primary").trim();
      const colAccent2 = styles.getPropertyValue("--gold").trim();
      const colMuted = styles.getPropertyValue("--ink-soft").trim();
      const colBorder = styles.getPropertyValue("--border").trim();
      const colSuccess = styles.getPropertyValue("--success").trim();

      const maxP = Math.ceil(Math.max(totals.participants * 1.6, (totals.breakeven || 0) * 1.4, 10) / 5) * 5;

      const padding = { top: 14, right: 12, bottom: 24, left: 52 };
      const plotW = cssWidth - padding.left - padding.right;
      const plotH = cssHeight - padding.top - padding.bottom;

      const points: { p: number; profit: number }[] = [];
      const steps = 40;
      let minProfit = 0;
      let maxProfit = 0;
      for (let i = 0; i <= steps; i++) {
        const p = (maxP / steps) * i;
        const t = computeTotals(items, days, ticketPrice, p);
        points.push({ p, profit: t.profit });
        if (t.profit < minProfit) minProfit = t.profit;
        if (t.profit > maxProfit) maxProfit = t.profit;
      }
      if (maxProfit === minProfit) {
        maxProfit += 1;
        minProfit -= 1;
      }
      const rangePad = (maxProfit - minProfit) * 0.1;
      maxProfit += rangePad;
      minProfit -= rangePad;

      const xFor = (p: number) => padding.left + (p / maxP) * plotW;
      const yFor = (profit: number) => padding.top + (1 - (profit - minProfit) / (maxProfit - minProfit)) * plotH;

      const zeroY = yFor(0);
      ctx!.strokeStyle = colBorder;
      ctx!.lineWidth = 1;
      ctx!.beginPath();
      ctx!.moveTo(padding.left, zeroY);
      ctx!.lineTo(cssWidth - padding.right, zeroY);
      ctx!.stroke();

      ctx!.fillStyle = colMuted;
      ctx!.font = "11px sans-serif";
      ctx!.textAlign = "right";
      ctx!.textBaseline = "middle";
      ctx!.fillText(fmtEUR.format(maxProfit - rangePad), padding.left - 8, padding.top + 4);
      ctx!.fillText(fmtEUR.format(0), padding.left - 8, zeroY);
      ctx!.fillText(fmtEUR.format(minProfit + rangePad), padding.left - 8, padding.top + plotH - 4);

      ctx!.textAlign = "center";
      ctx!.textBaseline = "top";
      ctx!.fillText("0", padding.left, cssHeight - padding.bottom + 6);
      ctx!.fillText(fmtNum.format(maxP), cssWidth - padding.right, cssHeight - padding.bottom + 6);

      ctx!.beginPath();
      ctx!.moveTo(xFor(points[0].p), yFor(points[0].profit));
      points.forEach((pt) => ctx!.lineTo(xFor(pt.p), yFor(pt.profit)));
      ctx!.lineTo(xFor(points[points.length - 1].p), zeroY);
      ctx!.lineTo(xFor(points[0].p), zeroY);
      ctx!.closePath();
      ctx!.fillStyle = withAlpha(colSuccess, 18);
      ctx!.fill();

      ctx!.beginPath();
      points.forEach((pt, idx) => {
        const x = xFor(pt.p);
        const y = yFor(pt.profit);
        if (idx === 0) ctx!.moveTo(x, y);
        else ctx!.lineTo(x, y);
      });
      ctx!.strokeStyle = colAccent;
      ctx!.lineWidth = 2.25;
      ctx!.lineJoin = "round";
      ctx!.stroke();

      if (totals.breakeven !== null && totals.breakeven <= maxP) {
        const bx = xFor(totals.breakeven);
        ctx!.save();
        ctx!.setLineDash([4, 4]);
        ctx!.strokeStyle = colMuted;
        ctx!.lineWidth = 1;
        ctx!.beginPath();
        ctx!.moveTo(bx, padding.top);
        ctx!.lineTo(bx, cssHeight - padding.bottom);
        ctx!.stroke();
        ctx!.restore();
      }

      const cx = xFor(totals.participants);
      const cy = yFor(totals.profit);
      ctx!.beginPath();
      ctx!.arc(cx, cy, 4.5, 0, Math.PI * 2);
      ctx!.fillStyle = colAccent2;
      ctx!.fill();
    }

    draw();
    // ResizeObserver invece del solo evento "resize" della finestra: il canvas
    // può cambiare larghezza anche senza che la finestra si ridimensioni (es.
    // passaggio da elenco a dettaglio nella stessa pagina, tastiera mobile che
    // si apre/chiude) — con solo "resize" restava disegnato alla larghezza 0
    // o sbagliata rilevata al primo mount.
    const container = canvas.parentElement;
    const observer = new ResizeObserver(() => draw());
    if (container) observer.observe(container);
    return () => observer.disconnect();
  }, [items, days, ticketPrice, totals]);

  return (
    <div>
      <canvas ref={canvasRef} style={{ width: "100%", height: 200, display: "block" }} />
      <div className="flex items-center gap-3 flex-wrap mt-2" style={{ fontSize: 11, color: COLORS.inkSoft }}>
        <span className="flex items-center gap-1.5">
          <span style={{ width: 10, height: 2, background: COLORS.primary, display: "inline-block" }} /> Guadagno
        </span>
        <span className="flex items-center gap-1.5">
          <span style={{ width: 10, height: 2, background: COLORS.inkSoft, display: "inline-block", opacity: 0.6 }} /> Pareggio
        </span>
        <span className="flex items-center gap-1.5">
          <span style={{ width: 8, height: 8, borderRadius: 999, background: COLORS.gold, display: "inline-block" }} /> Partecipanti previsti
        </span>
      </div>
    </div>
  );
}

export function EventBudgetCalculator({
  supabase,
  budget,
  initialEvent,
  events,
  budgets,
  onSaved,
  onDeleted,
  onClose,
}: {
  supabase: SupabaseClient;
  budget: EventBudget | null;
  initialEvent?: EventItem | null;
  events: EventItem[];
  budgets: EventBudget[];
  onSaved: (b: EventBudget) => void;
  onDeleted?: (id: string) => void;
  onClose?: () => void;
}) {
  const startEventId = budget ? budget.eventId : initialEvent?.id ?? null;
  const startEvent = events.find((e) => e.id === startEventId) || initialEvent || null;

  const [name, setName] = useState(budget?.name ?? startEvent?.name ?? "");
  const [eventId, setEventId] = useState<string | null>(startEventId);
  const [days, setDays] = useState(budget?.days ?? 1);
  const [ticketPrice, setTicketPrice] = useState(budget?.ticketPrice ?? startEvent?.price ?? 0);
  const [participants, setParticipants] = useState(budget?.participants ?? (startEvent && startEvent.capacity > 0 ? startEvent.capacity : 0));
  const [items, setItems] = useState<BudgetLineItem[]>(budget?.items ?? []);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const takenEventIds = useMemo(
    () => new Set(budgets.filter((b) => b.eventId && b.id !== budget?.id).map((b) => b.eventId as string)),
    [budgets, budget]
  );
  const pickableEvents = useMemo(
    () => events.filter((e) => !e.archived && (e.id === eventId || !takenEventIds.has(e.id))).sort((a, b) => b.date.localeCompare(a.date)),
    [events, takenEventIds, eventId]
  );
  const linkedEvent = events.find((e) => e.id === eventId) || (eventId && startEvent?.id === eventId ? startEvent : null);

  const totals = useMemo(() => computeTotals(items, days, ticketPrice, participants), [items, days, ticketPrice, participants]);

  function addItem() {
    setItems((cur) => [...cur, { id: genLineId(), name: "Nuova voce", amount: 0, per: "total", freq: "once" }]);
  }
  function updateItem(id: string, patch: Partial<BudgetLineItem>) {
    setItems((cur) => cur.map((it) => (it.id === id ? { ...it, ...patch } : it)));
  }
  function removeItem(id: string) {
    setItems((cur) => cur.filter((it) => it.id !== id));
  }

  async function handleSave() {
    setSaving(true);
    setError("");
    try {
      const saved = await saveEventBudget(supabase, {
        id: budget?.id,
        eventId,
        name: name.trim() || linkedEvent?.name || "Conto senza nome",
        days: Math.max(1, Number(days) || 1),
        ticketPrice: Math.max(0, Number(ticketPrice) || 0),
        participants: Math.max(0, Number(participants) || 0),
        items,
      });
      onSaved(saved);
    } catch {
      setError("Errore nel salvataggio del conto.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!budget) return;
    setSaving(true);
    setError("");
    try {
      await deleteEventBudget(supabase, budget.id);
      onDeleted?.(budget.id);
    } catch {
      setError("Errore nell'eliminazione.");
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="mb-4">
        <Field label="Nome del conto">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Es. Ritiro estate 2026" style={inputStyle} />
        </Field>
      </div>

      <div className="mb-4">
        <div style={{ fontSize: 11.5, fontWeight: 600, color: COLORS.inkSoft, marginBottom: 4 }}>Evento collegato</div>
        {linkedEvent ? (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg" style={{ fontSize: 12.5, border: `1px solid ${withAlpha(COLORS.primary, 33)}`, color: COLORS.primaryDark }}>
              <Link2 size={13} /> {linkedEvent.name} · {linkedEvent.date}
            </span>
            <button onClick={() => setEventId(null)} className="flex items-center gap-1 px-2 py-1.5 rounded-lg" style={{ fontSize: 11.5, color: COLORS.inkSoft }}>
              <Unlink size={12} /> Scollega
            </button>
          </div>
        ) : (
          <select value={eventId ?? ""} onChange={(e) => setEventId(e.target.value || null)} style={inputStyle}>
            <option value="">Nessun evento — conto libero</option>
            {pickableEvents.map((ev) => (
              <option key={ev.id} value={ev.id}>
                {ev.name} · {ev.date}
              </option>
            ))}
          </select>
        )}
      </div>

      <div className="grid grid-cols-3 gap-2 mb-4">
        <Field label="Durata (giorni)">
          <input type="number" min={1} value={days} onChange={(e) => setDays(Number(e.target.value) || 1)} style={inputStyle} />
        </Field>
        <Field label="Partecipanti previsti">
          <input type="number" min={0} value={participants} onChange={(e) => setParticipants(Number(e.target.value) || 0)} style={inputStyle} />
        </Field>
        <Field label="Prezzo biglietto (€)">
          <input type="number" min={0} value={ticketPrice} onChange={(e) => setTicketPrice(Number(e.target.value) || 0)} style={inputStyle} />
        </Field>
      </div>

      <div className="mb-2 flex items-center justify-between">
        <div style={{ fontSize: 12, fontWeight: 600, color: COLORS.inkSoft, textTransform: "uppercase" }}>Voci di spesa</div>
      </div>
      <div className="flex flex-col gap-2 mb-2">
        {items.map((item) => (
          <div key={item.id} className="flex items-center gap-2 flex-wrap p-2 rounded-lg" style={{ background: COLORS.card, border: `1px solid ${COLORS.border}` }}>
            <input
              value={item.name}
              onChange={(e) => updateItem(item.id, { name: e.target.value })}
              placeholder="Nome voce"
              style={{ ...inputStyle, flex: "1 1 130px", minWidth: 100 }}
            />
            <input
              type="number"
              min={0}
              step={0.5}
              value={item.amount}
              onChange={(e) => updateItem(item.id, { amount: Number(e.target.value) || 0 })}
              style={{ ...inputStyle, width: 90 }}
            />
            <ToggleGroup
              value={item.per}
              onChange={(v) => updateItem(item.id, { per: v })}
              options={[
                ["person", "A persona"],
                ["total", "Totale"],
              ]}
            />
            <ToggleGroup
              value={item.freq}
              onChange={(v) => updateItem(item.id, { freq: v })}
              options={[
                ["day", "Al giorno"],
                ["once", "Una tantum"],
              ]}
            />
            <button onClick={() => removeItem(item.id)} style={{ color: COLORS.inkSoft }}>
              <Trash2 size={14} />
            </button>
          </div>
        ))}
        {items.length === 0 && <div style={{ fontSize: 12, color: COLORS.inkSoft }}>Nessuna voce di spesa ancora.</div>}
      </div>
      <button
        onClick={addItem}
        className="w-full mb-5 px-3 py-2 rounded-lg text-center"
        style={{ fontSize: 12.5, fontWeight: 600, color: COLORS.primaryDark, border: `1px dashed ${COLORS.border}` }}
      >
        <Plus size={13} className="inline mr-1" /> Aggiungi voce di spesa
      </button>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
        <Kpi label="Incasso totale" value={fmtEUR.format(totals.revenue)} />
        <Kpi label="Spese totali" value={fmtEUR.format(totals.costs)} />
        <Kpi
          label="Guadagno netto"
          value={fmtEUR.format(totals.profit)}
          note={totals.participants > 0 ? `${fmtEUR1.format(totals.profit / totals.participants)} a persona` : "—"}
          tone={totals.profit >= 0 ? "positive" : "negative"}
        />
        <Kpi label="Pareggio" value={totals.breakeven === null ? "mai" : fmtNum.format(totals.breakeven)} note="partecipanti minimi" />
      </div>

      <div className="mb-5">
        <div style={{ fontSize: 12, fontWeight: 600, color: COLORS.inkSoft, textTransform: "uppercase" }} className="mb-2">
          Come cambia il guadagno
        </div>
        <ScenarioTable items={items} days={days} ticketPrice={ticketPrice} totals={totals} />
      </div>

      <div className="mb-5">
        <div style={{ fontSize: 12, fontWeight: 600, color: COLORS.inkSoft, textTransform: "uppercase" }} className="mb-2">
          Guadagno al variare dei partecipanti
        </div>
        <ProfitChart items={items} days={days} ticketPrice={ticketPrice} totals={totals} />
      </div>

      {error && (
        <div className="mb-3 flex items-center gap-1.5" style={{ fontSize: 12, color: COLORS.danger }}>
          <AlertCircle size={13} /> {error}
        </div>
      )}

      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          {budget && (
            <button onClick={handleDelete} disabled={saving} className="text-sm font-medium px-1" style={{ color: COLORS.danger }}>
              Elimina conto
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          {onClose && (
            <button onClick={onClose} className="px-3 py-2 rounded-lg text-sm font-medium" style={{ border: `1px solid ${COLORS.border}` }}>
              Chiudi
            </button>
          )}
          <button onClick={handleSave} disabled={saving} className="px-3 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-60" style={{ background: COLORS.primary }}>
            {saving ? "Salvataggio…" : "Salva conto"}
          </button>
        </div>
      </div>
    </div>
  );
}
