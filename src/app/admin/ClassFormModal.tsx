"use client";

import { useRef, useState } from "react";
import { X, Plus, Trash2, Search, Check, ListPlus, CheckSquare, Square, Copy, Lock, LockOpen, Eye, EyeOff } from "lucide-react";
import { Modal, Field, CapacityBar, inputStyle } from "./ui";
import { COLORS } from "./colors";
import { genId, dateKey } from "./utils";
import type { ClassItem, ClassType, ClientItem, Level, PackageWithUsage, Payment, PaymentStatus } from "./types";

type ModalData = { mode: "new"; date: Date } | { mode: "edit"; classItem: ClassItem };

type ClassClipboard = {
  typeId: string;
  levelId: string;
  time: string;
  capacity: number;
  notes: string;
  description: string;
  bookingsOpen: boolean;
};

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

export function ClassFormModal({
  data,
  classTypes,
  levels,
  clients,
  packages,
  recentClientIds,
  defaultTime,
  defaultCapacity,
  singleClassPrice,
  onClose,
  onSave,
  onDelete,
  onAddClient,
  onOpenSettings,
  onCopy,
}: {
  data: ModalData;
  classTypes: ClassType[];
  levels: Level[];
  clients: ClientItem[];
  packages: PackageWithUsage[];
  recentClientIds: string[];
  defaultTime: string;
  defaultCapacity: number;
  singleClassPrice: number;
  onClose: () => void;
  onSave: (item: ClassItem) => void;
  onDelete: (id: string) => void;
  onAddClient: (client: ClientItem) => void;
  onOpenSettings: () => void;
  onCopy: (clip: ClassClipboard) => void;
}) {
  const editing = data.mode === "edit";
  const base = editing ? data.classItem : null;

  const [date, setDate] = useState(editing ? base!.date : dateKey(data.date));
  const [time, setTime] = useState(editing ? base!.time || "" : defaultTime);
  const [typeId, setTypeId] = useState(editing ? base!.typeId : classTypes[0]?.id || "");
  const [levelId, setLevelId] = useState(editing ? base!.levelId : levels[0]?.id || "");
  const [capacity, setCapacity] = useState<number | string>(editing ? base!.capacity ?? defaultCapacity : defaultCapacity);
  const [notes, setNotes] = useState(editing ? base!.notes || "" : "");
  const [description, setDescription] = useState(editing ? base!.description || "" : "");
  const [bookingsOpen, setBookingsOpen] = useState(editing ? base!.bookingsOpen : true);
  const [clientIds, setClientIds] = useState<string[]>(editing ? base!.clientIds || [] : []);
  const [waitlistIds, setWaitlistIds] = useState<string[]>(editing ? base!.waitlistIds || [] : []);
  const [payments, setPayments] = useState<Record<string, Payment>>(editing ? base!.payments || {} : {});
  const [query, setQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [copied, setCopied] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const typeObj = classTypes.find((t) => t.id === typeId);
  const bookedClients = clientIds.map((id) => clients.find((c) => c.id === id)).filter((c): c is ClientItem => !!c);
  const waitlistClients = waitlistIds.map((id) => clients.find((c) => c.id === id)).filter((c): c is ClientItem => !!c);
  const capNum = Number(capacity) || 0;
  const isFull = capNum > 0 && clientIds.length >= capNum;
  const allBookedIds = new Set([...clientIds, ...waitlistIds]);
  const suggestions = query.trim()
    ? clients.filter((c) => c.name.toLowerCase().includes(query.trim().toLowerCase()) && !allBookedIds.has(c.id)).slice(0, 6)
    : [];
  const recentSuggestions = recentClientIds
    .map((id) => clients.find((c) => c.id === id))
    .filter((c): c is ClientItem => !!c && !allBookedIds.has(c.id))
    .slice(0, 6);

  function toggleSelect(id: string) {
    setSelectedIds((cur) => {
      const next = new Set(cur);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function eligiblePackageFor(clientId: string) {
    if (!typeObj?.packageEligible) return null;
    const candidates = packages
      .filter((p) => p.clientId === clientId && p.date <= date && p.remaining > 0)
      .sort((a, b) => a.date.localeCompare(b.date));
    return candidates[0] || null;
  }

  function initPayment(id: string, cur: Record<string, Payment>): Record<string, Payment> {
    if (cur[id]) return cur;
    const price = Number(singleClassPrice) || 0;
    const pkg = eligiblePackageFor(id);
    if (pkg) return { ...cur, [id]: { status: "package", amount: price, price, packageId: pkg.id } };
    return { ...cur, [id]: { status: "unpaid", amount: 0, price } };
  }

  function addPersonId(id: string) {
    if (isFull) {
      setWaitlistIds((ids) => [...ids, id]);
    } else {
      setClientIds((ids) => [...ids, id]);
      setPayments((p) => initPayment(id, p));
    }
    setQuery("");
  }
  function addExistingClient(client: ClientItem) {
    addPersonId(client.id);
  }
  function addNewClient() {
    const name = query.trim();
    if (!name) return;
    const client: ClientItem = { id: genId(), name, phone: "", notes: "", disabled: false, hasAccount: false };
    onAddClient(client);
    addPersonId(client.id);
  }
  function addSelected() {
    if (selectedIds.size === 0) return;
    const ids = Array.from(selectedIds);
    setClientIds((cur) => {
      const nextClients = [...cur];
      const nextWaitlist = [...waitlistIds];
      let nextPayments = { ...payments };
      ids.forEach((id) => {
        if (capNum > 0 && nextClients.length >= capNum) {
          nextWaitlist.push(id);
        } else {
          nextClients.push(id);
          nextPayments = initPayment(id, nextPayments);
        }
      });
      setWaitlistIds(nextWaitlist);
      setPayments(nextPayments);
      return nextClients;
    });
    setSelectedIds(new Set());
    setQuery("");
  }
  function removeClient(id: string) {
    const filtered = clientIds.filter((x) => x !== id);
    const nextPayments = { ...payments };
    delete nextPayments[id];
    if ((capNum === 0 || filtered.length < capNum) && waitlistIds.length > 0) {
      const [promoted, ...rest] = waitlistIds;
      setClientIds([...filtered, promoted]);
      setWaitlistIds(rest);
      setPayments(initPayment(promoted, nextPayments));
    } else {
      setClientIds(filtered);
      setPayments(nextPayments);
    }
  }
  function removeFromWaitlist(id: string) {
    setWaitlistIds((ids) => ids.filter((x) => x !== id));
  }
  function promoteFromWaitlist(id: string) {
    setWaitlistIds((ids) => ids.filter((x) => x !== id));
    setClientIds((ids) => [...ids, id]);
    setPayments((p) => initPayment(id, p));
  }
  function handlePaymentChange(id: string, status: PaymentStatus) {
    setPayments((p) => {
      const cur = p[id] || { status: "unpaid" as const, amount: 0, price: Number(singleClassPrice) || 0 };
      const next: Payment = { ...cur, status };
      if (status === "paid") next.amount = cur.price;
      if (status === "unpaid") {
        next.amount = 0;
        next.packageId = undefined;
      }
      if (status === "partial") next.packageId = undefined;
      if (status === "package") {
        const pkg = packages
          .filter((pp) => pp.clientId === id && pp.remaining > 0)
          .sort((a, b) => a.date.localeCompare(b.date))[0];
        next.packageId = pkg?.id;
        next.amount = cur.price;
      }
      return { ...p, [id]: next };
    });
  }
  function handlePartialAmount(id: string, amount: string) {
    setPayments((p) => ({ ...p, [id]: { ...(p[id] || {}), amount: Number(amount) || 0 } as Payment }));
  }

  function handleTypeChange(newTypeId: string) {
    setTypeId(newTypeId);
    const t = classTypes.find((x) => x.id === newTypeId);
    if (t?.defaultCapacity != null) setCapacity(t.defaultCapacity);
  }

  function handleSave() {
    if (!typeId) return;
    onSave({
      id: editing ? base!.id : genId(),
      date,
      time,
      typeId,
      levelId,
      capacity: capNum,
      notes: notes.trim(),
      description: description.trim(),
      bookingsOpen,
      clientIds,
      waitlistIds,
      payments,
    });
  }
  function handleCopy() {
    onCopy({ typeId, levelId, time, capacity: capNum, notes: notes.trim(), description: description.trim(), bookingsOpen });
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  if (classTypes.length === 0) {
    return (
      <Modal onClose={onClose} width={380}>
        <div className="p-6 text-center">
          <div className="font-semibold mb-2">Nessuna tipologia di classe</div>
          <div style={{ fontSize: 13, color: COLORS.inkSoft }} className="mb-4">
            Crea prima una tipologia (es. Ashtanga, Flexibility) dalle impostazioni.
          </div>
          <button onClick={onOpenSettings} className="px-4 py-2 rounded-lg text-sm font-semibold text-white" style={{ background: COLORS.primary }}>
            Vai alle impostazioni
          </button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal onClose={onClose} width={500}>
      <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: `1px solid ${COLORS.border}` }}>
        <div style={{ fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 600, color: COLORS.heading }}>
          {editing ? "Modifica classe" : "Nuova classe"}
        </div>
        <button onClick={onClose} className="flex items-center justify-center" style={{ width: 36, height: 36 }}>
          <X size={18} />
        </button>
      </div>

      <div className="p-5 overflow-y-auto" style={{ flex: 1 }}>
        <div className="grid grid-cols-2 gap-3 mb-3">
          <Field label="Data">
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={inputStyle} />
          </Field>
          <Field label="Orario">
            <input type="time" required value={time} onChange={(e) => setTime(e.target.value)} style={inputStyle} />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-3">
          <Field label="Tipologia">
            <select value={typeId} onChange={(e) => handleTypeChange(e.target.value)} style={inputStyle}>
              {classTypes.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </Field>
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

        <div className="grid grid-cols-2 gap-3 mb-3">
          <Field label="Massimo iscritti">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setCapacity((v) => Math.max(0, (Number(v) || 0) - 1))}
                className="flex items-center justify-center font-bold"
                style={{ width: 30, height: 30, borderRadius: 8, border: `1px solid ${COLORS.border}`, color: COLORS.primaryDark, flexShrink: 0 }}
              >
                −
              </button>
              <input
                type="number"
                min={0}
                value={capacity}
                onChange={(e) => setCapacity(e.target.value)}
                style={{ ...inputStyle, textAlign: "center" }}
              />
              <button
                type="button"
                onClick={() => setCapacity((v) => (Number(v) || 0) + 1)}
                className="flex items-center justify-center font-bold"
                style={{ width: 30, height: 30, borderRadius: 8, border: `1px solid ${COLORS.border}`, color: COLORS.primaryDark, flexShrink: 0 }}
              >
                +
              </button>
            </div>
          </Field>
        </div>

        <Field label="Note">
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Facoltativo" style={{ ...inputStyle, resize: "vertical" }} />
        </Field>
        <div className="flex items-center gap-1" style={{ fontSize: 10.5, color: COLORS.inkSoft, marginTop: -4, marginBottom: 12 }}>
          <EyeOff size={11} /> Solo per te — i clienti non la vedono.
        </div>

        <div className="p-2.5 rounded-lg mb-3" style={{ background: COLORS.subtle, border: `1px solid ${COLORS.border}` }}>
          <div className="flex items-center gap-1.5 mb-1.5" style={{ fontSize: 11.5, fontWeight: 600, color: COLORS.primaryDark }}>
            <Eye size={13} /> Descrizione per i clienti
          </div>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            placeholder="Facoltativa — si aggiunge a quella della tipologia, se presente"
            style={{ ...inputStyle, resize: "vertical", background: "#fff" }}
          />
          <div className="flex items-center gap-1 mt-1" style={{ fontSize: 10.5, color: COLORS.primaryDark }}>
            <Eye size={11} /> I clienti la vedranno aprendo questa classe.
          </div>
        </div>

        <button
          type="button"
          onClick={() => setBookingsOpen((v) => !v)}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium mt-1"
          style={{
            border: `1px solid ${bookingsOpen ? COLORS.success : COLORS.danger}55`,
            color: bookingsOpen ? COLORS.success : COLORS.danger,
            background: bookingsOpen ? COLORS.success + "14" : COLORS.danger + "14",
          }}
        >
          {bookingsOpen ? <LockOpen size={13} /> : <Lock size={13} />}
          {bookingsOpen ? "Iscrizioni aperte per questa classe" : "Iscrizioni chiuse per questa classe"}
        </button>

        <div className="mt-4 pt-4" style={{ borderTop: `1px solid ${COLORS.border}` }}>
          <div style={{ fontSize: 13, fontWeight: 600 }} className="mb-2">
            Iscritti
          </div>
          <div className="mb-3" style={{ maxWidth: 220 }}>
            <CapacityBar booked={bookedClients.length} capacity={capNum} waiting={waitlistClients.length} />
          </div>

          <div className="flex flex-col gap-1.5 mb-2">
            {bookedClients.map((c) => {
              const pay = payments[c.id] || { status: "unpaid" as const, amount: 0, price: Number(singleClassPrice) || 0 };
              const meta = paymentMeta(pay.status);
              const hasPackage = typeObj?.packageEligible && packages.some((p) => p.clientId === c.id && p.remaining > 0);
              return (
                <div key={c.id} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg flex-wrap" style={{ background: COLORS.subtle }}>
                  <span style={{ fontSize: 12.5, flex: 1, minWidth: 70 }}>{c.name}</span>
                  {pay.status === "partial" && (
                    <input
                      type="number"
                      min={0}
                      value={pay.amount}
                      onChange={(e) => handlePartialAmount(c.id, e.target.value)}
                      placeholder="€"
                      style={{ width: 50, fontSize: 11, border: `1px solid ${COLORS.border}`, borderRadius: 6, padding: "3px 5px", background: "#fff" }}
                    />
                  )}
                  <select
                    value={pay.status}
                    onChange={(e) => handlePaymentChange(c.id, e.target.value as PaymentStatus)}
                    style={{ fontSize: 11, fontWeight: 600, border: `1px solid ${meta.color}55`, borderRadius: 6, padding: "3px 4px", color: meta.color, background: "#fff" }}
                  >
                    <option value="unpaid">Da pagare</option>
                    <option value="paid">Pagato</option>
                    <option value="partial">Parziale</option>
                    {hasPackage && <option value="package">Pacchetto</option>}
                  </select>
                  <button onClick={() => removeClient(c.id)} style={{ color: COLORS.inkSoft }}>
                    <X size={12} />
                  </button>
                </div>
              );
            })}
            {bookedClients.length === 0 && <span style={{ fontSize: 12, color: COLORS.inkSoft }}>Ancora nessun iscritto.</span>}
          </div>

          {waitlistClients.length > 0 && (
            <div className="mb-2">
              <div className="flex items-center gap-1.5 mb-1.5" style={{ fontSize: 11.5, fontWeight: 700, color: COLORS.gold }}>
                <ListPlus size={13} /> Lista d&apos;attesa ({waitlistClients.length})
              </div>
              <div className="flex flex-wrap gap-1.5">
                {waitlistClients.map((c) => (
                  <span
                    key={c.id}
                    className="inline-flex items-center gap-1.5 rounded-full"
                    style={{ background: "#FBF3E3", fontSize: 12, padding: "3px 6px 3px 10px", border: `1px solid ${COLORS.gold}55` }}
                  >
                    {c.name}
                    <button onClick={() => promoteFromWaitlist(c.id)} title="Conferma iscrizione" style={{ color: COLORS.primaryDark }}>
                      <Check size={12} />
                    </button>
                    <button onClick={() => removeFromWaitlist(c.id)} title="Rimuovi" style={{ color: COLORS.inkSoft }}>
                      <X size={12} />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          )}

          {recentSuggestions.length > 0 && (
            <div className="mb-2">
              <div style={{ fontSize: 11, fontWeight: 600, color: COLORS.inkSoft }} className="mb-1">
                Aggiunti di recente — tocca per selezionare
              </div>
              <div className="flex flex-wrap gap-1.5">
                {recentSuggestions.map((c) => {
                  const sel = selectedIds.has(c.id);
                  return (
                    <button
                      key={c.id}
                      onClick={() => toggleSelect(c.id)}
                      className="inline-flex items-center gap-1 rounded-full"
                      style={{
                        fontSize: 12,
                        padding: "3px 9px 3px 7px",
                        background: sel ? COLORS.primary : "#fff",
                        color: sel ? "#fff" : COLORS.ink,
                        border: `1px solid ${sel ? COLORS.primary : COLORS.border}`,
                      }}
                    >
                      {sel ? <CheckSquare size={12} /> : <Square size={12} />} {c.name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="relative">
            <div className="flex items-center gap-2" style={{ ...inputStyle, padding: "6px 10px" }}>
              <Search size={14} color={COLORS.inkSoft} />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={isFull ? "Classe piena — aggiungi in lista d'attesa…" : "Cerca o aggiungi una persona…"}
                style={{ border: "none", outline: "none", fontSize: 13, flex: 1, background: "transparent" }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    if (suggestions[0]) addExistingClient(suggestions[0]);
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
                {suggestions.map((c) => {
                  const sel = selectedIds.has(c.id);
                  return (
                    <button
                      key={c.id}
                      onClick={() => toggleSelect(c.id)}
                      className="w-full text-left px-3 py-2 flex items-center gap-2"
                      style={{ fontSize: 13, background: sel ? COLORS.subtle : "transparent" }}
                    >
                      {sel ? <CheckSquare size={13} color={COLORS.primary} /> : <Square size={13} color={COLORS.inkSoft} />} {c.name}
                    </button>
                  );
                })}
                <button onClick={addNewClient} className="w-full text-left px-3 py-2 flex items-center gap-2" style={{ fontSize: 13, color: COLORS.primaryDark, fontWeight: 600 }}>
                  <Plus size={13} /> Aggiungi &quot;{query.trim()}&quot; come nuovo cliente
                </button>
              </div>
            )}
          </div>

          {selectedIds.size > 0 && (
            <button
              onClick={addSelected}
              className="mt-2 w-full flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-semibold text-white"
              style={{ background: COLORS.primary }}
            >
              <Plus size={14} /> Aggiungi {selectedIds.size} selezionat{selectedIds.size === 1 ? "o" : "i"}
            </button>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between px-5 py-4" style={{ borderTop: `1px solid ${COLORS.border}` }}>
        <div className="flex items-center gap-3">
          {editing && (
            <button onClick={() => onDelete(base!.id)} className="flex items-center gap-1.5 text-sm font-medium" style={{ color: COLORS.danger }}>
              <Trash2 size={14} /> Elimina
            </button>
          )}
          <button onClick={handleCopy} className="flex items-center gap-1.5 text-sm font-medium" style={{ color: COLORS.primaryDark }} title="Copia questa classe per incollarla su un altro giorno">
            <Copy size={14} /> {copied ? "Copiata ✓" : "Copia"}
          </button>
        </div>
        <div className="flex gap-2">
          <button onClick={onClose} className="px-3.5 py-2 rounded-lg text-sm font-medium" style={{ border: `1px solid ${COLORS.border}` }}>
            Annulla
          </button>
          <button onClick={handleSave} className="px-3.5 py-2 rounded-lg text-sm font-semibold text-white" style={{ background: COLORS.primary }}>
            Salva classe
          </button>
        </div>
      </div>
    </Modal>
  );
}
