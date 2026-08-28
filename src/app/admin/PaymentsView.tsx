"use client";

import { useMemo, useState } from "react";
import { Wallet, PackagePlus, Euro, User, CheckSquare, Square, Check, Trash2, Plus, Pencil } from "lucide-react";
import { Badge, Field, inputStyle } from "./ui";
import { COLORS } from "./colors";
import type { ClassItem, ClassType, ClientItem, LedgerEntry, PackageWithUsage, Settings } from "./types";

export function PaymentsView({
  clients,
  classes,
  packages,
  ledger,
  typeById,
  defaults,
  onUpsertClient,
  onSellPackage,
  onRecordPackagePayment,
  onUpdatePackageDetails,
  onDeletePackage,
  onAddLedgerEntry,
  onDeleteLedgerEntry,
  onMarkClassPaymentPaid,
}: {
  clients: ClientItem[];
  classes: ClassItem[];
  packages: PackageWithUsage[];
  ledger: LedgerEntry[];
  typeById: Record<string, ClassType>;
  defaults: Settings;
  onUpsertClient: (client: ClientItem) => void;
  onSellPackage: (args: { clientId: string; paidAmount: number; linkClassIds: string[] }) => void;
  onRecordPackagePayment: (packageId: string, amount: number) => void;
  onUpdatePackageDetails: (id: string, patch: Partial<{ date: string; manualAdjustment: number; paidAmount: number }>) => void;
  onDeletePackage: (id: string) => void;
  onAddLedgerEntry: (args: { clientId: string; kind: "debt" | "credit"; amount: number; note: string }) => void;
  onDeleteLedgerEntry: (id: string) => void;
  onMarkClassPaymentPaid: (classId: string, clientId: string) => void;
}) {
  const [expandedClientId, setExpandedClientId] = useState<string | null>(null);
  const [sellOpen, setSellOpen] = useState(false);
  const [sellQuery, setSellQuery] = useState("");
  const [sellClientId, setSellClientId] = useState<string | null>(null);
  const [sellPaid, setSellPaid] = useState("");
  const [linkSelected, setLinkSelected] = useState<Set<string>>(() => new Set());
  const [payAmounts, setPayAmounts] = useState<Record<string, string>>({});
  const [editingPkgId, setEditingPkgId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<{ date: string; used: number; paidAmount: number }>({ date: "", used: 0, paidAmount: 0 });
  const [ledgerOpen, setLedgerOpen] = useState(false);
  const [ledgerQuery, setLedgerQuery] = useState("");
  const [ledgerClientId, setLedgerClientId] = useState<string | null>(null);
  const [ledgerKind, setLedgerKind] = useState<"debt" | "credit">("debt");
  const [ledgerAmount, setLedgerAmount] = useState("");
  const [ledgerNote, setLedgerNote] = useState("");

  const clientById = useMemo(() => Object.fromEntries(clients.map((c) => [c.id, c])), [clients]);

  const outstandingByClient = useMemo(() => {
    const map: Record<string, { total: number; items: { classId: string; date: string; time: string; typeId: string; owed: number; status: string }[] }> = {};
    classes.forEach((c) => {
      Object.entries(c.payments || {}).forEach(([clientId, pay]) => {
        if (pay.status === "unpaid" || pay.status === "partial") {
          const owed = (pay.price || 0) - (pay.amount || 0);
          if (owed > 0) {
            if (!map[clientId]) map[clientId] = { total: 0, items: [] };
            map[clientId].total += owed;
            map[clientId].items.push({ classId: c.id, date: c.date, time: c.time, typeId: c.typeId, owed, status: pay.status });
          }
        }
      });
    });
    Object.values(map).forEach((v) => v.items.sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time)));
    return map;
  }, [classes]);

  const outstandingList = Object.entries(outstandingByClient)
    .map(([clientId, v]) => ({ clientId, name: clientById[clientId]?.name || "Cliente", ...v }))
    .sort((a, b) => b.total - a.total);

  const linkedByPackage = useMemo(() => {
    const map: Record<string, { date: string; time: string; typeId: string }[]> = {};
    classes.forEach((c) => {
      Object.entries(c.payments || {}).forEach(([, pay]) => {
        if (pay.status === "package" && pay.packageId) {
          (map[pay.packageId] = map[pay.packageId] || []).push({ date: c.date, time: c.time, typeId: c.typeId });
        }
      });
    });
    Object.values(map).forEach((list) => list.sort((a, b) => (a.date + (a.time || "")).localeCompare(b.date + (b.time || ""))));
    return map;
  }, [classes]);

  const sortedPackages = [...packages].sort((a, b) => b.date.localeCompare(a.date));
  const sellSuggestions = sellQuery.trim() ? clients.filter((c) => c.name.toLowerCase().includes(sellQuery.trim().toLowerCase())).slice(0, 6) : [];
  const ledgerSuggestions = ledgerQuery.trim() ? clients.filter((c) => c.name.toLowerCase().includes(ledgerQuery.trim().toLowerCase())).slice(0, 6) : [];

  const linkableClasses = sellClientId
    ? classes
        .filter((c) => c.clientIds.includes(sellClientId) && typeById[c.typeId]?.packageEligible && c.payments?.[sellClientId]?.status !== "package")
        .sort((a, b) => (a.date + (a.time || "")).localeCompare(b.date + (b.time || "")))
    : [];

  function toggleLink(classId: string) {
    setLinkSelected((cur) => {
      const next = new Set(cur);
      if (next.has(classId)) next.delete(classId);
      else next.add(classId);
      return next;
    });
  }

  function confirmSell() {
    let clientId = sellClientId;
    if (!clientId && sellQuery.trim()) {
      const client: ClientItem = { id: crypto.randomUUID(), name: sellQuery.trim(), phone: "", notes: "" };
      onUpsertClient(client);
      clientId = client.id;
    }
    if (!clientId) return;
    onSellPackage({ clientId, paidAmount: sellPaid === "" ? defaults.packagePrice : Number(sellPaid) || 0, linkClassIds: Array.from(linkSelected) });
    setSellOpen(false);
    setSellQuery("");
    setSellClientId(null);
    setSellPaid("");
    setLinkSelected(new Set());
  }

  function startEditPkg(p: PackageWithUsage) {
    setEditingPkgId(p.id);
    setEditDraft({ date: p.date, used: p.usedCount, paidAmount: p.paidAmount });
  }
  function saveEditPkg(p: PackageWithUsage) {
    const desiredUsed = Math.max(0, Math.min(p.size, Number(editDraft.used) || 0));
    const manualAdjustment = desiredUsed - p.autoUsed;
    onUpdatePackageDetails(p.id, {
      date: editDraft.date,
      manualAdjustment,
      paidAmount: Math.max(0, Math.min(p.price, Number(editDraft.paidAmount) || 0)),
    });
    setEditingPkgId(null);
  }

  function confirmLedger() {
    let clientId = ledgerClientId;
    if (!clientId && ledgerQuery.trim()) {
      const client: ClientItem = { id: crypto.randomUUID(), name: ledgerQuery.trim(), phone: "", notes: "" };
      onUpsertClient(client);
      clientId = client.id;
    }
    if (!clientId || !ledgerAmount) return;
    onAddLedgerEntry({ clientId, kind: ledgerKind, amount: Number(ledgerAmount) || 0, note: ledgerNote });
    setLedgerOpen(false);
    setLedgerQuery("");
    setLedgerClientId(null);
    setLedgerAmount("");
    setLedgerNote("");
  }

  return (
    <div>
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <Wallet size={16} color={COLORS.heading} />
          <div style={{ fontFamily: "var(--font-display)", fontSize: 19, fontWeight: 600, color: COLORS.heading }}>Da riscuotere</div>
        </div>
        {outstandingList.length === 0 ? (
          <div style={{ fontSize: 13, color: COLORS.inkSoft }} className="px-1">
            Tutti in regola: nessun pagamento in sospeso.
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {outstandingList.map((o) => {
              const isOpen = expandedClientId === o.clientId;
              return (
                <div key={o.clientId} className="rounded-xl overflow-hidden" style={{ background: COLORS.card, border: `1px solid ${COLORS.border}` }}>
                  <button onClick={() => setExpandedClientId(isOpen ? null : o.clientId)} className="w-full flex items-center justify-between px-4 py-3 text-left">
                    <span style={{ fontSize: 14, fontWeight: 600 }}>{o.name}</span>
                    <Badge color={COLORS.danger}>€{o.total.toFixed(2)}</Badge>
                  </button>
                  {isOpen && (
                    <div className="px-4 pb-3 flex flex-col gap-1.5" style={{ borderTop: `1px solid ${COLORS.border}` }}>
                      {o.items.map((it) => (
                        <div key={it.classId} className="flex items-center justify-between pt-2.5" style={{ fontSize: 12.5 }}>
                          <span>
                            {it.date} {it.time && `· ${it.time}`} — {typeById[it.typeId]?.name || "Classe"} ·{" "}
                            <span style={{ color: COLORS.danger, fontWeight: 600 }}>€{it.owed.toFixed(2)}</span>
                          </span>
                          <button
                            onClick={() => onMarkClassPaymentPaid(it.classId, o.clientId)}
                            className="flex items-center gap-1 font-semibold"
                            style={{ color: COLORS.success, fontSize: 11.5 }}
                          >
                            <Check size={12} /> Segna pagato
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <PackagePlus size={16} color={COLORS.heading} />
            <div style={{ fontFamily: "var(--font-display)", fontSize: 19, fontWeight: 600, color: COLORS.heading }}>Pacchetti</div>
          </div>
          <button onClick={() => setSellOpen((v) => !v)} className="flex items-center gap-1.5 text-sm font-semibold px-3 py-1.5 rounded-lg text-white" style={{ background: COLORS.primary }}>
            <Plus size={14} /> Vendi pacchetto
          </button>
        </div>

        {sellOpen && (
          <div className="mb-3 p-3 rounded-xl" style={{ background: COLORS.card, border: `1px solid ${COLORS.border}` }}>
            <div className="grid grid-cols-2 gap-2 mb-2">
              <div className="relative">
                <input
                  value={sellClientId ? clientById[sellClientId]?.name || "" : sellQuery}
                  onChange={(e) => {
                    setSellClientId(null);
                    setSellQuery(e.target.value);
                    setLinkSelected(new Set());
                  }}
                  placeholder="Cerca o aggiungi cliente…"
                  style={inputStyle}
                />
                {sellQuery.trim() && !sellClientId && (
                  <div className="absolute left-0 right-0 mt-1 overflow-hidden" style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 10, boxShadow: "0 8px 24px rgba(74,58,115,0.14)", zIndex: 10 }}>
                    {sellSuggestions.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => {
                          setSellClientId(c.id);
                          setSellQuery("");
                        }}
                        className="w-full text-left px-3 py-2 flex items-center gap-2"
                        style={{ fontSize: 13 }}
                      >
                        <User size={13} color={COLORS.inkSoft} /> {c.name}
                      </button>
                    ))}
                    <div className="px-3 py-1.5" style={{ fontSize: 11.5, color: COLORS.inkSoft }}>
                      Oppure invio come nuovo cliente
                    </div>
                  </div>
                )}
              </div>
              <input type="number" min={0} value={sellPaid} onChange={(e) => setSellPaid(e.target.value)} placeholder={`Pagato ora (€, def. ${defaults.packagePrice})`} style={inputStyle} />
            </div>

            {sellClientId && linkableClasses.length > 0 && (
              <div className="mb-2 p-2 rounded-lg" style={{ background: COLORS.subtle }}>
                <div style={{ fontSize: 11.5, fontWeight: 600, color: COLORS.inkSoft }} className="mb-1.5">
                  Lezioni già prenotate da collegare a questo pacchetto (facoltativo)
                </div>
                <div className="flex flex-col gap-1">
                  {linkableClasses.map((c) => {
                    const sel = linkSelected.has(c.id);
                    return (
                      <button key={c.id} onClick={() => toggleLink(c.id)} className="flex items-center gap-1.5 text-left" style={{ fontSize: 12 }}>
                        {sel ? <CheckSquare size={13} color={COLORS.primary} /> : <Square size={13} color={COLORS.inkSoft} />}
                        {c.date} {c.time && `· ${c.time}`} — {typeById[c.typeId]?.name || "Classe"}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="flex items-center justify-between">
              <span style={{ fontSize: 11.5, color: COLORS.inkSoft }}>
                {defaults.packageSize} lezioni · €{defaults.packagePrice}
              </span>
              <button onClick={confirmSell} className="px-3 py-1.5 rounded-lg text-sm font-semibold text-white" style={{ background: COLORS.primary }}>
                Registra
              </button>
            </div>
          </div>
        )}

        {sortedPackages.length === 0 ? (
          <div style={{ fontSize: 13, color: COLORS.inkSoft }} className="px-1">
            Nessun pacchetto venduto ancora.
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {sortedPackages.map((p) => {
              const debt = p.price - p.paidAmount;
              const isEditing = editingPkgId === p.id;
              const linked = linkedByPackage[p.id] || [];
              const futureReserved = Math.max(0, p.reservedTotal - p.usedCount);
              return (
                <div key={p.id} className="p-3 rounded-xl" style={{ background: COLORS.card, border: `1px solid ${COLORS.border}` }}>
                  <div className="flex items-center justify-between mb-1">
                    <span style={{ fontSize: 13.5, fontWeight: 600 }}>{clientById[p.clientId]?.name || "Cliente"}</span>
                    <div className="flex items-center gap-2">
                      <button onClick={() => (isEditing ? setEditingPkgId(null) : startEditPkg(p))} style={{ color: COLORS.primaryDark }} title="Modifica pacchetto">
                        <Pencil size={13} />
                      </button>
                      <button onClick={() => onDeletePackage(p.id)} style={{ color: COLORS.inkSoft }}>
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>

                  {isEditing ? (
                    <div className="mb-2 p-2 rounded-lg" style={{ background: COLORS.subtle }}>
                      <div className="grid grid-cols-3 gap-2 mb-2">
                        <Field label="Data acquisto">
                          <input type="date" value={editDraft.date} onChange={(e) => setEditDraft((d) => ({ ...d, date: e.target.value }))} style={{ ...inputStyle, fontSize: 12 }} />
                        </Field>
                        <Field label={`Lezioni svolte (su ${p.size})`}>
                          <input
                            type="number"
                            min={0}
                            max={p.size}
                            value={editDraft.used}
                            onChange={(e) => setEditDraft((d) => ({ ...d, used: Number(e.target.value) }))}
                            style={{ ...inputStyle, fontSize: 12 }}
                          />
                        </Field>
                        <Field label="Pagato (€)">
                          <input
                            type="number"
                            min={0}
                            max={p.price}
                            value={editDraft.paidAmount}
                            onChange={(e) => setEditDraft((d) => ({ ...d, paidAmount: Number(e.target.value) }))}
                            style={{ ...inputStyle, fontSize: 12 }}
                          />
                        </Field>
                      </div>
                      <div style={{ fontSize: 11, color: COLORS.inkSoft }} className="mb-2">
                        Calcolato in automatico dalle lezioni prenotate: {p.autoUsed} svolte finora. Cambia il numero solo per correggere lezioni fatte prima di usare l&apos;app.
                      </div>
                      <div className="flex justify-end gap-2">
                        <button onClick={() => setEditingPkgId(null)} className="px-2.5 py-1 rounded-md text-xs font-medium" style={{ border: `1px solid ${COLORS.border}` }}>
                          Annulla
                        </button>
                        <button onClick={() => saveEditPkg(p)} className="px-2.5 py-1 rounded-md text-xs font-semibold text-white" style={{ background: COLORS.primary }}>
                          Salva
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div style={{ fontSize: 12, color: COLORS.inkSoft }} className="mb-1.5">
                      Acquistato il {p.date} · {p.usedCount}/{p.size} lezioni svolte
                      {futureReserved > 0 && ` · ${futureReserved} prenotate per il futuro`} · {p.remaining} disponibili
                    </div>
                  )}

                  {!isEditing && linked.length > 0 && (
                    <div className="mb-2 flex flex-col gap-0.5">
                      {linked.map((l, i) => (
                        <span key={i} style={{ fontSize: 11, color: COLORS.inkSoft }}>
                          · {l.date} {l.time && `· ${l.time}`} — {typeById[l.typeId]?.name || "Classe"}
                        </span>
                      ))}
                    </div>
                  )}

                  {!isEditing && (
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <span style={{ fontSize: 12, fontWeight: 600, color: debt > 0 ? COLORS.danger : COLORS.success }}>
                        {debt > 0 ? `Debito €${debt.toFixed(2)} di €${p.price}` : `Saldato · €${p.price}`}
                      </span>
                      {debt > 0 && (
                        <div className="flex items-center gap-1.5">
                          <input
                            type="number"
                            min={0}
                            value={payAmounts[p.id] ?? ""}
                            onChange={(e) => setPayAmounts((a) => ({ ...a, [p.id]: e.target.value }))}
                            placeholder="€"
                            style={{ width: 60, fontSize: 12, border: `1px solid ${COLORS.border}`, borderRadius: 6, padding: "3px 6px" }}
                          />
                          <button
                            onClick={() => {
                              onRecordPackagePayment(p.id, Number(payAmounts[p.id]) || debt);
                              setPayAmounts((a) => ({ ...a, [p.id]: "" }));
                            }}
                            className="text-xs font-semibold px-2 py-1 rounded-md text-white"
                            style={{ background: COLORS.primary }}
                          >
                            Registra
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Euro size={16} color={COLORS.heading} />
            <div style={{ fontFamily: "var(--font-display)", fontSize: 19, fontWeight: 600, color: COLORS.heading }}>Crediti e debiti</div>
          </div>
          <button onClick={() => setLedgerOpen((v) => !v)} className="flex items-center gap-1.5 text-sm font-semibold px-3 py-1.5 rounded-lg text-white" style={{ background: COLORS.primary }}>
            <Plus size={14} /> Aggiungi nota
          </button>
        </div>
        <div style={{ fontSize: 11.5, color: COLORS.inkSoft }} className="mb-2">
          Per saldi non legati a una classe o a un pacchetto specifico — es. un anticipo o un conto in sospeso da prima.
        </div>

        {ledgerOpen && (
          <div className="mb-3 p-3 rounded-xl" style={{ background: COLORS.card, border: `1px solid ${COLORS.border}` }}>
            <div className="relative mb-2">
              <input
                value={ledgerClientId ? clientById[ledgerClientId]?.name || "" : ledgerQuery}
                onChange={(e) => {
                  setLedgerClientId(null);
                  setLedgerQuery(e.target.value);
                }}
                placeholder="Cerca o aggiungi cliente…"
                style={inputStyle}
              />
              {ledgerQuery.trim() && !ledgerClientId && (
                <div className="absolute left-0 right-0 mt-1 overflow-hidden" style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 10, boxShadow: "0 8px 24px rgba(74,58,115,0.14)", zIndex: 10 }}>
                  {ledgerSuggestions.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => {
                        setLedgerClientId(c.id);
                        setLedgerQuery("");
                      }}
                      className="w-full text-left px-3 py-2 flex items-center gap-2"
                      style={{ fontSize: 13 }}
                    >
                      <User size={13} color={COLORS.inkSoft} /> {c.name}
                    </button>
                  ))}
                  <div className="px-3 py-1.5" style={{ fontSize: 11.5, color: COLORS.inkSoft }}>
                    Oppure invio come nuovo cliente
                  </div>
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2 mb-2">
              <div className="flex rounded-lg overflow-hidden" style={{ border: `1px solid ${COLORS.border}` }}>
                <button
                  onClick={() => setLedgerKind("debt")}
                  className="flex-1 py-2 text-xs font-semibold"
                  style={{ background: ledgerKind === "debt" ? COLORS.danger : "transparent", color: ledgerKind === "debt" ? "#fff" : COLORS.ink }}
                >
                  Debito
                </button>
                <button
                  onClick={() => setLedgerKind("credit")}
                  className="flex-1 py-2 text-xs font-semibold"
                  style={{ background: ledgerKind === "credit" ? COLORS.success : "transparent", color: ledgerKind === "credit" ? "#fff" : COLORS.ink }}
                >
                  Credito
                </button>
              </div>
              <input type="number" min={0} value={ledgerAmount} onChange={(e) => setLedgerAmount(e.target.value)} placeholder="Importo (€)" style={inputStyle} />
            </div>
            <input value={ledgerNote} onChange={(e) => setLedgerNote(e.target.value)} placeholder="Nota (facoltativa)" style={{ ...inputStyle, marginBottom: 8 }} />
            <div className="flex justify-end">
              <button onClick={confirmLedger} className="px-3 py-1.5 rounded-lg text-sm font-semibold text-white" style={{ background: COLORS.primary }}>
                Salva
              </button>
            </div>
          </div>
        )}

        {ledger.length === 0 ? (
          <div style={{ fontSize: 13, color: COLORS.inkSoft }} className="px-1">
            Nessuna nota di credito o debito.
          </div>
        ) : (
          <div className="flex flex-col gap-1.5">
            {[...ledger]
              .sort((a, b) => b.date.localeCompare(a.date))
              .map((e) => (
                <div key={e.id} className="flex items-center justify-between px-3 py-2 rounded-lg flex-wrap gap-1.5" style={{ background: COLORS.card, border: `1px solid ${COLORS.border}` }}>
                  <div style={{ fontSize: 12.5 }}>
                    <span style={{ fontWeight: 600 }}>{clientById[e.clientId]?.name || "Cliente"}</span>
                    {" · "}
                    <span style={{ color: e.kind === "debt" ? COLORS.danger : COLORS.success, fontWeight: 600 }}>
                      {e.kind === "debt" ? "Debito" : "Credito"} €{e.amount.toFixed(2)}
                    </span>
                    {e.note && <span style={{ color: COLORS.inkSoft }}> — {e.note}</span>}
                    <span style={{ color: COLORS.inkSoft }}> · {e.date}</span>
                  </div>
                  <button onClick={() => onDeleteLedgerEntry(e.id)} className="flex items-center gap-1 text-xs font-semibold" style={{ color: COLORS.primaryDark }}>
                    <Check size={12} /> Salda
                  </button>
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}
