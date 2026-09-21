"use client";

import { useRef, useState } from "react";
import { X, Plus, Trash2, Search, Download, Gift, Eye, EyeOff, User } from "lucide-react";
import { downloadIcsFile } from "@/lib/ics";
import { INDIVIDUAL_LESSON_TITLE, individualLessonIcsTitle } from "@/lib/classTitle";
import { Modal, Field, inputStyle } from "./ui";
import { COLORS, withAlpha } from "./colors";
import { genId, dateKey } from "./utils";
import type { ClassItem, ClientItem, Level, Payment, PaymentStatus } from "./types";

// assignClientId: usato dal flusso di accettazione di una richiesta di lezione
// individuale (src/app/admin/lezioni-individuali/page.tsx). Lo slot scelto dal
// cliente è già una lezione (senza cliente): si apre in modifica con il
// cliente della richiesta già assegnato, così l'admin lo rivede e lo salva
// come farebbe assegnandolo a mano — nessuna logica di prezzo/pacchetto
// duplicata altrove.
type ModalData = { mode: "new"; date: Date } | { mode: "edit"; classItem: ClassItem; assignClientId?: string };

function paymentMeta(status: PaymentStatus) {
  switch (status) {
    case "paid":
      return { label: "Pagato", color: COLORS.success };
    case "partial":
      return { label: "Parziale", color: COLORS.gold };
    case "package":
      return { label: "Pacchetto", color: COLORS.primary };
    default:
      return { label: "Da pagare", color: COLORS.danger };
  }
}

// Pagamento iniziale di un cliente appena assegnato: gratuita → pagata, altrimenti
// da pagare. Le lezioni individuali non hanno tipologia, quindi non c'è modo di
// scalarle da un pacchetto (come per book_class lato database). Funzione pura,
// condivisa tra assignClient (scelta manuale) e lo stato iniziale (cliente
// pre-assegnato da una richiesta accettata).
function assignedPayment(opts: { isFree: boolean; price: number }): Payment {
  if (opts.isFree) return { status: "paid", amount: 0, price: 0 };
  return { status: "unpaid", amount: 0, price: opts.price };
}

// Flusso dedicato per le lezioni individuali (one-to-one): a differenza del
// ClassFormModal di gruppo, qui non c'è la tipologia (il titolo è sempre
// "Lezione individuale"), c'è un solo cliente possibile (niente lista
// d'attesa, niente multi-selezione), la capienza è sempre 1 e le iscrizioni
// non sono mai "aperte" — è l'admin ad assegnare/riassegnare il cliente a
// mano. Senza cliente la lezione è uno slot: pubblicato, i clienti lo possono
// scegliere quando richiedono una lezione individuale. La riserva di
// visibilità (solo il cliente assegnato la vede in calendario) è applicata
// lato database da public_classes() e dalla RLS di classes, non qui.
export function PersonalClassFormModal({
  data,
  levels,
  clients,
  defaultTime,
  singleClassPrice,
  onClose,
  onSave,
  onDelete,
  onAddClient,
}: {
  data: ModalData;
  levels: Level[];
  clients: ClientItem[];
  defaultTime: string;
  singleClassPrice: number;
  onClose: () => void;
  onSave: (item: ClassItem) => void;
  onDelete: (id: string) => void;
  onAddClient: (client: ClientItem) => void;
}) {
  const editing = data.mode === "edit";
  const base = editing ? data.classItem : null;

  const [date, setDate] = useState(editing ? base!.date : dateKey(data.date));
  const [time, setTime] = useState(editing ? base!.time || "" : defaultTime);
  const [levelId, setLevelId] = useState(editing ? base!.levelId : levels[0]?.id || "");
  const [notes, setNotes] = useState(editing ? base!.notes || "" : "");
  const [description, setDescription] = useState(editing ? base!.description || "" : "");
  const [priceOverride, setPriceOverride] = useState<number | string>(editing ? base!.priceOverride ?? "" : "");
  const [isFree, setIsFree] = useState(editing ? base!.isFree : false);
  const [published, setPublished] = useState(editing ? base!.published : false);
  const assignClientId = data.mode === "edit" && !data.classItem.personalClientId ? data.assignClientId : undefined;
  const [clientId, setClientId] = useState<string | null>(editing ? base!.personalClientId ?? assignClientId ?? null : null);
  const [payment, setPayment] = useState<Payment | null>(() => {
    if (!editing) return null;
    if (base!.personalClientId) return base!.payments[base!.personalClientId] || null;
    if (!assignClientId) return null;
    return assignedPayment({
      isFree: base!.isFree,
      price: base!.isFree ? 0 : Number(base!.priceOverride ?? singleClassPrice) || 0,
    });
  });
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const client = clientId ? clients.find((c) => c.id === clientId) : null;
  const suggestions = query.trim()
    ? clients.filter((c) => c.name.toLowerCase().includes(query.trim().toLowerCase())).slice(0, 6)
    : [];

  function effectivePrice(): number {
    if (isFree) return 0;
    if (priceOverride === "") return Number(singleClassPrice) || 0;
    return Number(priceOverride) || 0;
  }

  function assignClient(id: string) {
    const price = isFree ? 0 : effectivePrice();
    setClientId(id);
    setPayment(assignedPayment({ isFree, price }));
    setQuery("");
  }

  function addNewClient() {
    const name = query.trim();
    if (!name) return;
    const created: ClientItem = { id: genId(), name, phone: "", notes: "", disabled: false, hasAccount: false };
    onAddClient(created);
    assignClient(created.id);
  }
  function handlePaymentChange(status: PaymentStatus) {
    setPayment((cur) => {
      const price = effectivePrice();
      const base = cur || { status: "unpaid" as const, amount: 0, price };
      const next: Payment = { ...base, status, price };
      if (status === "paid") next.amount = price;
      if (status === "unpaid") next.amount = 0;
      return next;
    });
  }

  function handleSave() {
    onSave({
      id: editing ? base!.id : genId(),
      date,
      time,
      typeId: null,
      levelId,
      capacity: 1,
      notes: notes.trim(),
      description: description.trim(),
      bookingsOpen: false,
      priceOverride: priceOverride === "" ? null : Number(priceOverride) || 0,
      isFree,
      published,
      clientIds: clientId ? [clientId] : [],
      waitlistIds: [],
      payments: clientId && payment ? { [clientId]: { ...payment, price: effectivePrice(), amount: isFree ? 0 : payment.amount } } : {},
      isIndividual: true,
      personalClientId: clientId,
    });
  }

  return (
    <Modal onClose={onClose} width={460}>
      <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: `1px solid ${COLORS.border}` }}>
        <div className="flex items-center gap-2" style={{ fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 600, color: COLORS.heading }}>
          <User size={16} color={COLORS.primary} />
          {editing ? "Modifica lezione individuale" : "Nuova lezione individuale"}
        </div>
        <button onClick={onClose} className="flex items-center justify-center" style={{ width: 36, height: 36 }}>
          <X size={18} />
        </button>
      </div>

      <div className="p-5 overflow-y-auto" style={{ flex: 1 }}>
        <button
          type="button"
          onClick={() => setPublished((v) => !v)}
          className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium mb-4"
          style={{
            border: `1px solid ${withAlpha(published ? COLORS.success : COLORS.gold, 33)}`,
            color: published ? COLORS.success : COLORS.gold,
            background: withAlpha(published ? COLORS.success : COLORS.gold, 8),
          }}
        >
          {published ? <Eye size={15} /> : <EyeOff size={15} />}
          <span className="flex-1 text-left">
            {published ? (clientId ? "Pubblicata — visibile solo al cliente assegnato" : "Slot pubblicato — i clienti lo possono richiedere") : "Bozza — visibile solo a te"}
          </span>
          <span style={{ fontSize: 11, fontWeight: 700, opacity: 0.8 }}>{published ? "Rendi bozza" : "Pubblica"}</span>
        </button>

        <div className="grid grid-cols-2 gap-3 mb-3">
          <Field label="Data">
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={inputStyle} />
          </Field>
          <Field label="Orario">
            <input type="time" required value={time} onChange={(e) => setTime(e.target.value)} style={inputStyle} />
          </Field>
        </div>

        <div className="mb-3">
          <Field label="Livello">
            <select value={levelId} onChange={(e) => setLevelId(e.target.value)} style={inputStyle}>
              {levels.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <Field label={`Prezzo (default €${Number(singleClassPrice) || 0})`}>
          <input
            type="number"
            min={0}
            step="0.5"
            disabled={isFree}
            value={priceOverride}
            onChange={(e) => setPriceOverride(e.target.value)}
            placeholder={String(Number(singleClassPrice) || 0)}
            style={{ ...inputStyle, opacity: isFree ? 0.5 : 1 }}
          />
        </Field>

        <button
          type="button"
          onClick={() => setIsFree((v) => !v)}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium mt-2 mb-3"
          style={{
            border: `1px solid ${isFree ? COLORS.gold : COLORS.border}`,
            color: isFree ? COLORS.primaryDark : COLORS.inkSoft,
            background: isFree ? withAlpha(COLORS.gold, 16) : "transparent",
          }}
        >
          <Gift size={13} />
          {isFree ? "Lezione gratuita" : "Segna come gratuita"}
        </button>

        <Field label="Note">
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Facoltativo" style={{ ...inputStyle, resize: "vertical" }} />
        </Field>
        <div className="flex items-center gap-1" style={{ fontSize: 10.5, color: COLORS.inkSoft, marginTop: -4, marginBottom: 12 }}>
          <EyeOff size={11} /> Solo per te — il cliente non la vede.
        </div>

        <div className="p-2.5 rounded-lg mb-4" style={{ background: COLORS.subtle, border: `1px solid ${COLORS.border}` }}>
          <div className="flex items-center gap-1.5 mb-1.5" style={{ fontSize: 11.5, fontWeight: 600, color: COLORS.primaryDark }}>
            <Eye size={13} /> Descrizione per il cliente
          </div>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            placeholder="Facoltativa — si aggiunge a quella della tipologia, se presente"
            style={{ ...inputStyle, resize: "vertical", background: COLORS.card }}
          />
        </div>

        <div className="pt-1" style={{ borderTop: `1px solid ${COLORS.border}` }}>
          <div style={{ fontSize: 13, fontWeight: 600 }} className="mt-3 mb-2">
            Cliente
          </div>

          {client ? (
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg flex-wrap mb-2" style={{ background: COLORS.subtle }}>
              <span style={{ fontSize: 12.5, flex: 1, minWidth: 70, fontWeight: 600 }}>{client.name}</span>
              {payment && (
                <>
                  {payment.status === "partial" && (
                    <input
                      type="number"
                      min={0}
                      value={payment.amount}
                      onChange={(e) => setPayment((p) => (p ? { ...p, amount: Number(e.target.value) || 0 } : p))}
                      placeholder="€"
                      style={{ width: 50, fontSize: 11, border: `1px solid ${COLORS.border}`, borderRadius: 6, padding: "3px 5px", background: COLORS.card }}
                    />
                  )}
                  <select
                    value={payment.status}
                    onChange={(e) => handlePaymentChange(e.target.value as PaymentStatus)}
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      border: `1px solid ${withAlpha(paymentMeta(payment.status).color, 33)}`,
                      borderRadius: 6,
                      padding: "3px 4px",
                      color: paymentMeta(payment.status).color,
                      background: COLORS.card,
                    }}
                  >
                    <option value="unpaid">Da pagare</option>
                    <option value="paid">Pagato</option>
                    <option value="partial">Parziale</option>
                  </select>
                </>
              )}
              <button
                onClick={() => {
                  setClientId(null);
                  setPayment(null);
                }}
                style={{ color: COLORS.inkSoft }}
                title="Rimuovi"
              >
                <X size={12} />
              </button>
            </div>
          ) : (
            <div className="relative mb-2">
              <div className="flex items-center gap-2" style={{ ...inputStyle, padding: "6px 10px" }}>
                <Search size={14} color={COLORS.inkSoft} />
                <input
                  ref={inputRef}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Cerca o aggiungi una persona…"
                  style={{ border: "none", outline: "none", fontSize: 13, flex: 1, background: "transparent" }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      if (suggestions[0]) assignClient(suggestions[0].id);
                      else addNewClient();
                    }
                  }}
                />
              </div>
              {query.trim() && (
                <div
                  className="absolute left-0 right-0 mt-1 overflow-hidden"
                  style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 10, boxShadow: "0 8px 24px rgba(74,58,115,0.14)", zIndex: 10 }}
                >
                  {suggestions.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => assignClient(c.id)}
                      className="w-full text-left px-3 py-2"
                      style={{ fontSize: 13 }}
                    >
                      {c.name}
                    </button>
                  ))}
                  <button onClick={addNewClient} className="w-full text-left px-3 py-2 flex items-center gap-2" style={{ fontSize: 13, color: COLORS.primaryDark, fontWeight: 600 }}>
                    <Plus size={13} /> Aggiungi &quot;{query.trim()}&quot; come nuovo cliente
                  </button>
                </div>
              )}
            </div>
          )}
          {!client && (
            <div style={{ fontSize: 11.5, color: COLORS.inkSoft }}>
              Senza cliente è uno <strong>slot disponibile</strong>: pubblicato, i clienti lo possono scegliere quando richiedono una lezione individuale.
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between px-5 py-4 flex-wrap gap-2.5" style={{ borderTop: `1px solid ${COLORS.border}` }}>
        <div className="flex items-center gap-3 flex-wrap">
          {editing && (
            <button onClick={() => onDelete(base!.id)} className="flex items-center gap-1.5 text-sm font-medium" style={{ color: COLORS.danger }} title="Elimina">
              <Trash2 size={14} /> <span className="hidden sm:inline">Elimina</span>
            </button>
          )}
          <button
            onClick={() =>
              downloadIcsFile(`${INDIVIDUAL_LESSON_TITLE}-${date}`, [
                { date, time, title: individualLessonIcsTitle(client?.name), description: levels.find((l) => l.id === levelId)?.name },
              ])
            }
            className="flex items-center gap-1.5 text-sm font-medium"
            style={{ color: COLORS.primaryDark }}
            title="Scarica questa lezione come file .ics"
          >
            <Download size={14} /> <span className="hidden sm:inline">Calendario</span>
          </button>
        </div>
        <div className="flex gap-2 flex-shrink-0 ml-auto">
          <button onClick={onClose} className="px-3.5 py-2 rounded-lg text-sm font-medium" style={{ border: `1px solid ${COLORS.border}` }}>
            Annulla
          </button>
          <button onClick={handleSave} className="px-3.5 py-2 rounded-lg text-sm font-semibold text-white" style={{ background: COLORS.primary }}>
            Salva lezione
          </button>
        </div>
      </div>
    </Modal>
  );
}
