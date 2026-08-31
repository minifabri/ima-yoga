"use client";

import { useMemo, useState } from "react";
import { Search, Plus, Clock, Trash2, Ban, CheckCircle2, KeyRound, Copy, Mail, Send } from "lucide-react";
import { Badge, Modal, inputStyle } from "./ui";
import { COLORS, withAlpha } from "./colors";
import type { ClassItem, ClassType, ClientItem } from "./types";

type AuthStatus = { email: string; emailConfirmed: boolean };

export function ClientsView({
  clients,
  classes,
  typeById,
  onUpsert,
  onDelete,
  onSetDisabled,
  onResetPassword,
  onGetAuthStatus,
  onResendActivation,
  onResendPasswordReset,
}: {
  clients: ClientItem[];
  classes: ClassItem[];
  typeById: Record<string, ClassType>;
  onUpsert: (client: ClientItem) => void;
  onDelete: (id: string) => void;
  onSetDisabled: (id: string, disabled: boolean, cancelFuture: boolean) => void;
  onResetPassword: (id: string) => Promise<string>;
  onGetAuthStatus: (id: string) => Promise<AuthStatus | null>;
  onResendActivation: (id: string) => Promise<boolean>;
  onResendPasswordReset: (id: string) => Promise<boolean>;
}) {
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [disableTarget, setDisableTarget] = useState<ClientItem | null>(null);
  const [cancelFuture, setCancelFuture] = useState(false);
  const [tempPasswords, setTempPasswords] = useState<Record<string, string>>({});
  const [resettingId, setResettingId] = useState<string | null>(null);
  const [authStatus, setAuthStatus] = useState<Record<string, AuthStatus | null>>({});
  const [authStatusLoading, setAuthStatusLoading] = useState<Record<string, boolean>>({});
  const [resendLoading, setResendLoading] = useState<Record<string, "activation" | "reset" | null>>({});

  const bookingsByClient = useMemo(() => {
    const map: Record<string, ClassItem[]> = {};
    for (const c of classes) {
      for (const cid of c.clientIds || []) {
        (map[cid] = map[cid] || []).push(c);
      }
    }
    Object.values(map).forEach((list) => list.sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time)));
    return map;
  }, [classes]);

  const filtered = clients.filter((c) => c.name.toLowerCase().includes(search.toLowerCase())).sort((a, b) => a.name.localeCompare(b.name));

  function addClient() {
    const name = newName.trim();
    if (!name) return;
    onUpsert({ id: crypto.randomUUID(), name, phone: newPhone.trim(), notes: "", disabled: false, hasAccount: false });
    setNewName("");
    setNewPhone("");
  }

  async function handleResetPassword(id: string) {
    setResettingId(id);
    try {
      const temp = await onResetPassword(id);
      setTempPasswords((cur) => ({ ...cur, [id]: temp }));
    } finally {
      setResettingId(null);
    }
  }

  async function toggleExpand(c: ClientItem) {
    const opening = expandedId !== c.id;
    setExpandedId(opening ? c.id : null);
    if (opening && c.hasAccount && authStatus[c.id] === undefined && !authStatusLoading[c.id]) {
      setAuthStatusLoading((cur) => ({ ...cur, [c.id]: true }));
      const status = await onGetAuthStatus(c.id);
      setAuthStatus((cur) => ({ ...cur, [c.id]: status }));
      setAuthStatusLoading((cur) => ({ ...cur, [c.id]: false }));
    }
  }

  async function handleResendActivation(id: string) {
    setResendLoading((cur) => ({ ...cur, [id]: "activation" }));
    try {
      await onResendActivation(id);
    } finally {
      setResendLoading((cur) => ({ ...cur, [id]: null }));
    }
  }

  async function handleResendPasswordReset(id: string) {
    setResendLoading((cur) => ({ ...cur, [id]: "reset" }));
    try {
      await onResendPasswordReset(id);
    } finally {
      setResendLoading((cur) => ({ ...cur, [id]: null }));
    }
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <div className="flex items-center gap-2 flex-1" style={{ ...inputStyle, padding: "8px 12px" }}>
          <Search size={15} color={COLORS.inkSoft} />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cerca cliente…" style={{ border: "none", outline: "none", fontSize: 13, flex: 1, background: "transparent" }} />
        </div>
      </div>

      <div className="flex items-center gap-2 mb-4 p-3 rounded-xl" style={{ background: COLORS.card, border: `1px solid ${COLORS.border}` }}>
        <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Nome nuovo cliente" style={{ ...inputStyle, flex: 2 }} onKeyDown={(e) => e.key === "Enter" && addClient()} />
        <input value={newPhone} onChange={(e) => setNewPhone(e.target.value)} placeholder="Telefono (facoltativo)" style={{ ...inputStyle, flex: 1 }} onKeyDown={(e) => e.key === "Enter" && addClient()} />
        <button onClick={addClient} className="px-3.5 py-2 rounded-lg text-sm font-semibold text-white flex items-center gap-1 whitespace-nowrap" style={{ background: COLORS.primary }}>
          <Plus size={14} /> Aggiungi
        </button>
      </div>

      <div className="flex flex-col gap-2">
        {filtered.map((c) => {
          const bookings = bookingsByClient[c.id] || [];
          const isOpen = expandedId === c.id;
          return (
            <div key={c.id} className="rounded-xl overflow-hidden" style={{ background: COLORS.card, border: `1px solid ${c.disabled ? withAlpha(COLORS.danger, 33) : COLORS.border}` }}>
              <button onClick={() => toggleExpand(c)} className="w-full flex items-center justify-between px-4 py-3 text-left">
                <div>
                  <div className="flex items-center gap-1.5">
                    <span style={{ fontSize: 14, fontWeight: 600 }}>{c.name}</span>
                    {c.disabled && <Badge color={COLORS.danger}>Disabilitato</Badge>}
                  </div>
                  {c.phone && <div style={{ fontSize: 12, color: COLORS.inkSoft }}>{c.phone}</div>}
                </div>
                <Badge color={COLORS.primaryDark}>{bookings.length} classi</Badge>
              </button>
              {isOpen && (
                <div className="px-4 pb-3" style={{ borderTop: `1px solid ${COLORS.border}` }}>
                  <div className="pt-3 flex flex-col gap-1.5">
                    {bookings.length === 0 && <div style={{ fontSize: 12, color: COLORS.inkSoft }}>Nessuna classe prenotata.</div>}
                    {bookings.map((b) => (
                      <div key={b.id} className="flex items-center gap-2" style={{ fontSize: 12.5 }}>
                        <Clock size={12} color={COLORS.inkSoft} />
                        {b.date} {b.time && `· ${b.time}`} — {typeById[b.typeId]?.name || "Classe"}
                      </div>
                    ))}
                  </div>

                  {c.hasAccount && (
                    <div className="mt-3 p-2.5 rounded-lg" style={{ background: COLORS.subtle }}>
                      {authStatusLoading[c.id] ? (
                        <div style={{ fontSize: 12, color: COLORS.inkSoft }}>Verifica stato account…</div>
                      ) : authStatus[c.id] ? (
                        <div className="flex items-center gap-2 flex-wrap" style={{ fontSize: 12 }}>
                          <span style={{ color: COLORS.inkSoft }}>{authStatus[c.id]!.email}</span>
                          {authStatus[c.id]!.emailConfirmed ? (
                            <Badge color={COLORS.success}>Email verificata</Badge>
                          ) : (
                            <Badge color={COLORS.danger}>Email non verificata</Badge>
                          )}
                        </div>
                      ) : (
                        <div style={{ fontSize: 12, color: COLORS.inkSoft }}>Stato account non disponibile.</div>
                      )}
                    </div>
                  )}

                  {tempPasswords[c.id] && (
                    <div className="mt-3 p-2.5 rounded-lg flex items-center justify-between gap-2" style={{ background: COLORS.subtle }}>
                      <div style={{ fontSize: 12 }}>
                        Password temporanea: <strong style={{ fontFamily: "monospace" }}>{tempPasswords[c.id]}</strong>
                        <div style={{ fontSize: 10.5, color: COLORS.inkSoft }}>Comunicala al cliente — potrà cambiarla dopo l&apos;accesso.</div>
                      </div>
                      <button
                        onClick={() => navigator.clipboard?.writeText(tempPasswords[c.id])}
                        title="Copia"
                        style={{ color: COLORS.primaryDark }}
                      >
                        <Copy size={14} />
                      </button>
                    </div>
                  )}

                  <div className="mt-3 flex items-center gap-3 flex-wrap">
                    <button onClick={() => onDelete(c.id)} className="flex items-center gap-1.5 text-xs font-medium" style={{ color: COLORS.danger }}>
                      <Trash2 size={12} /> Elimina cliente
                    </button>
                    {c.disabled ? (
                      <button
                        onClick={() => onSetDisabled(c.id, false, false)}
                        className="flex items-center gap-1.5 text-xs font-medium"
                        style={{ color: COLORS.success }}
                      >
                        <CheckCircle2 size={12} /> Riabilita cliente
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          setDisableTarget(c);
                          setCancelFuture(false);
                        }}
                        className="flex items-center gap-1.5 text-xs font-medium"
                        style={{ color: COLORS.danger }}
                      >
                        <Ban size={12} /> Disabilita cliente
                      </button>
                    )}
                    {c.hasAccount && (
                      <button
                        onClick={() => handleResetPassword(c.id)}
                        disabled={resettingId === c.id}
                        className="flex items-center gap-1.5 text-xs font-medium disabled:opacity-60"
                        style={{ color: COLORS.primaryDark }}
                      >
                        <KeyRound size={12} /> {resettingId === c.id ? "Reset in corso…" : "Resetta password"}
                      </button>
                    )}
                    {c.hasAccount && (
                      <button
                        onClick={() => handleResendPasswordReset(c.id)}
                        disabled={resendLoading[c.id] === "reset"}
                        className="flex items-center gap-1.5 text-xs font-medium disabled:opacity-60"
                        style={{ color: COLORS.primaryDark }}
                      >
                        <Send size={12} /> {resendLoading[c.id] === "reset" ? "Invio…" : "Rinvia reset password"}
                      </button>
                    )}
                    {c.hasAccount && authStatus[c.id] && !authStatus[c.id]!.emailConfirmed && (
                      <button
                        onClick={() => handleResendActivation(c.id)}
                        disabled={resendLoading[c.id] === "activation"}
                        className="flex items-center gap-1.5 text-xs font-medium disabled:opacity-60"
                        style={{ color: COLORS.primaryDark }}
                      >
                        <Mail size={12} /> {resendLoading[c.id] === "activation" ? "Invio…" : "Rinvia link attivazione"}
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div className="text-center py-10" style={{ fontSize: 13, color: COLORS.inkSoft }}>
            Nessun cliente trovato. Aggiungine uno qui sopra.
          </div>
        )}
      </div>

      {disableTarget && (
        <Modal onClose={() => setDisableTarget(null)} width={380}>
          <div className="p-5">
            <div className="font-semibold mb-1">Disabilitare {disableTarget.name}?</div>
            <div style={{ fontSize: 13, color: COLORS.inkSoft }} className="mb-3">
              Non potrà più accedere alla sua area né prenotare nuove classi, finché non lo riabiliti.
            </div>
            <label className="flex items-center gap-1.5 mb-4" style={{ fontSize: 12.5, color: COLORS.ink }}>
              <input type="checkbox" checked={cancelFuture} onChange={(e) => setCancelFuture(e.target.checked)} />
              Cancella anche le sue prenotazioni per lezioni future
            </label>
            <div className="flex justify-end gap-2">
              <button onClick={() => setDisableTarget(null)} className="px-3 py-2 rounded-lg text-sm font-medium" style={{ border: `1px solid ${COLORS.border}` }}>
                Annulla
              </button>
              <button
                onClick={() => {
                  onSetDisabled(disableTarget.id, true, cancelFuture);
                  setDisableTarget(null);
                }}
                className="px-3 py-2 rounded-lg text-sm font-medium text-white"
                style={{ background: COLORS.danger }}
              >
                Disabilita
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
