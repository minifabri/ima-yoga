"use client";

import { useMemo, useRef, useState } from "react";
import { Bell, Megaphone, PackagePlus, Search, Send, Sparkles, Trash2, UserCheck, X } from "lucide-react";
import { COLORS, withAlpha } from "./colors";
import { EmojiPicker } from "./EmojiPicker";
import { RichTextEditor } from "./RichTextEditor";
import { inputStyle } from "./ui";
import type { Announcement, ClientItem, ClientNotice } from "./types";

export function NoticesView({
  clients,
  clientNotices,
  announcements,
  onSendNotice,
  onDeleteNotice,
  onAddAnnouncement,
  onUpdateAnnouncement,
  onRemoveAnnouncement,
}: {
  clients: ClientItem[];
  clientNotices: ClientNotice[];
  announcements: Announcement[];
  onSendNotice: (clientIds: string[], message: string) => Promise<void>;
  onDeleteNotice: (id: string) => void;
  onAddAnnouncement: (message: string) => Promise<void>;
  onUpdateAnnouncement: (id: string, patch: Partial<Pick<Announcement, "message" | "active">>) => void;
  onRemoveAnnouncement: (id: string) => void;
}) {
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const messageRef = useRef<HTMLTextAreaElement>(null);
  const [newAnnouncement, setNewAnnouncement] = useState("");
  const [editingAnnouncementId, setEditingAnnouncementId] = useState<string | null>(null);

  function addAnnouncement() {
    const html = newAnnouncement.trim();
    if (!html) return;
    onAddAnnouncement(html);
    setNewAnnouncement("");
  }

  const activeClients = useMemo(() => clients.filter((c) => !c.disabled), [clients]);
  const filteredClients = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return activeClients;
    return activeClients.filter((c) => c.name.toLowerCase().includes(q));
  }, [activeClients, search]);
  const clientById = useMemo(() => Object.fromEntries(clients.map((c) => [c.id, c])), [clients]);

  function toggleClient(id: string) {
    setSelectedIds((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));
  }

  async function handleSend() {
    if (selectedIds.length === 0 || !message.trim() || sending) return;
    setSending(true);
    try {
      await onSendNotice(selectedIds, message.trim());
      setSelectedIds([]);
      setMessage("");
    } finally {
      setSending(false);
    }
  }

  const sortedNotices = useMemo(() => [...clientNotices].sort((a, b) => b.createdAt.localeCompare(a.createdAt)), [clientNotices]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <div style={{ fontFamily: "var(--font-display)", fontSize: 19, fontWeight: 600, color: COLORS.heading }} className="mb-1 flex items-center gap-1.5">
          <Megaphone size={17} /> Avviso generale
        </div>
        <div style={{ fontSize: 11.5, color: COLORS.inkSoft }} className="mb-3">
          Appare come banner nell&apos;area clienti; ogni cliente può chiuderlo, resta comunque visibile agli altri finché non lo disattivi qui.
        </div>
        <div className="flex flex-col gap-1.5 mb-3">
          {announcements.map((a) => {
            const isEditing = editingAnnouncementId === a.id;
            return (
              <div key={a.id} className="rounded-lg" style={{ border: `1px solid ${a.active ? withAlpha(COLORS.gold, 40) : COLORS.border}` }}>
                <div className="flex items-center gap-2 px-2.5 py-2">
                  <button
                    onClick={() => setEditingAnnouncementId(isEditing ? null : a.id)}
                    className="flex-1 text-left truncate rich-content"
                    style={{ fontSize: 12.5, color: a.active ? COLORS.ink : COLORS.inkSoft }}
                    dangerouslySetInnerHTML={{ __html: a.message }}
                  />
                  <button
                    onClick={() => onUpdateAnnouncement(a.id, { active: !a.active })}
                    title={a.active ? "Clicca per disattivare" : "Clicca per attivare"}
                    style={{ fontSize: 10.5, fontWeight: 700, color: a.active ? COLORS.gold : COLORS.inkSoft, whiteSpace: "nowrap" }}
                  >
                    {a.active ? "Attivo" : "Spento"}
                  </button>
                  <button onClick={() => onRemoveAnnouncement(a.id)} title="Elimina" style={{ color: COLORS.danger, flexShrink: 0 }}>
                    <Trash2 size={14} />
                  </button>
                </div>
                {isEditing && (
                  <div className="px-2.5 pb-2.5">
                    <RichTextEditor
                      value={a.message}
                      onChange={(html) => {
                        if (html !== a.message) onUpdateAnnouncement(a.id, { message: html });
                      }}
                      minHeight={50}
                    />
                  </div>
                )}
              </div>
            );
          })}
          {announcements.length === 0 && <div style={{ fontSize: 12, color: COLORS.inkSoft }}>Nessun avviso ancora.</div>}
        </div>
        <div style={{ fontSize: 11.5, fontWeight: 600, color: COLORS.inkSoft, marginBottom: 4 }}>Nuovo avviso generale</div>
        <RichTextEditor value={newAnnouncement} onChange={setNewAnnouncement} minHeight={50} />
        <button
          onClick={addAnnouncement}
          disabled={!newAnnouncement.trim()}
          className="mt-2 flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-50"
          style={{ background: COLORS.primary }}
        >
          <Send size={14} /> Pubblica avviso
        </button>
      </div>

      <div>
        <div style={{ fontFamily: "var(--font-display)", fontSize: 19, fontWeight: 600, color: COLORS.heading }} className="mb-3">
          Nuovo avviso personale
        </div>
        <div className="rounded-xl p-4" style={{ background: COLORS.card, border: `1px solid ${COLORS.border}` }}>
          <div style={{ fontSize: 11.5, fontWeight: 600, color: COLORS.inkSoft, marginBottom: 6 }}>Destinatari</div>

          {selectedIds.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-2">
              {selectedIds.map((id) => (
                <span
                  key={id}
                  className="inline-flex items-center gap-1 rounded-full"
                  style={{
                    fontSize: 11.5,
                    fontWeight: 600,
                    color: COLORS.primaryDark,
                    background: withAlpha(COLORS.primary, 14),
                    border: `1px solid ${withAlpha(COLORS.primary, 33)}`,
                    padding: "3px 8px 3px 10px",
                  }}
                >
                  {clientById[id]?.name || "?"}
                  <button onClick={() => toggleClient(id)} title="Rimuovi" style={{ display: "flex" }}>
                    <X size={12} />
                  </button>
                </span>
              ))}
            </div>
          )}

          <div className="relative mb-2">
            <Search size={13} color={COLORS.inkSoft} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)" }} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cerca cliente…"
              style={{ ...inputStyle, paddingLeft: 30 }}
            />
          </div>

          <div
            className="flex flex-col rounded-lg mb-3"
            style={{ maxHeight: 180, overflowY: "auto", border: `1px solid ${COLORS.border}` }}
          >
            {filteredClients.length === 0 ? (
              <div style={{ fontSize: 12.5, color: COLORS.inkSoft, padding: "10px 12px" }}>Nessun cliente trovato.</div>
            ) : (
              filteredClients.map((c) => {
                const checked = selectedIds.includes(c.id);
                return (
                  <button
                    key={c.id}
                    onClick={() => toggleClient(c.id)}
                    className="flex items-center gap-2 text-left px-3 py-2"
                    style={{ fontSize: 13, borderBottom: `1px solid ${COLORS.border}`, background: checked ? withAlpha(COLORS.primary, 8) : "transparent" }}
                  >
                    <span
                      className="flex items-center justify-center flex-shrink-0"
                      style={{
                        width: 16,
                        height: 16,
                        borderRadius: 4,
                        border: `1.5px solid ${checked ? COLORS.primary : COLORS.border}`,
                        background: checked ? COLORS.primary : "transparent",
                        color: "#fff",
                      }}
                    >
                      {checked && <X size={11} style={{ transform: "rotate(45deg)" }} />}
                    </span>
                    {c.name}
                  </button>
                );
              })
            )}
          </div>

          <div style={{ fontSize: 11.5, fontWeight: 600, color: COLORS.inkSoft, marginBottom: 4 }}>Messaggio</div>
          <div className="flex items-start gap-1.5 mb-3">
            <textarea
              ref={messageRef}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
              placeholder="Scrivi l'avviso da inviare ai clienti selezionati…"
              style={{ ...inputStyle, resize: "vertical", flex: 1 }}
            />
            <EmojiPicker targetRef={messageRef} value={message} onChange={setMessage} />
          </div>

          <button
            onClick={handleSend}
            disabled={selectedIds.length === 0 || !message.trim() || sending}
            className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg text-sm font-semibold text-white disabled:opacity-50"
            style={{ background: COLORS.primary }}
          >
            <Send size={14} />
            {sending ? "Invio…" : `Invia a ${selectedIds.length || ""} ${selectedIds.length === 1 ? "cliente" : "clienti"}`.trim()}
          </button>
        </div>
      </div>

      <div>
        <div style={{ fontFamily: "var(--font-display)", fontSize: 19, fontWeight: 600, color: COLORS.heading }} className="mb-3">
          Avvisi inviati
        </div>
        {sortedNotices.length === 0 ? (
          <div style={{ fontSize: 13, color: COLORS.inkSoft }}>Nessun avviso personale inviato finora.</div>
        ) : (
          <div className="flex flex-col gap-2">
            {sortedNotices.map((n) => (
              <div
                key={n.id}
                className="flex items-start gap-2.5 p-3 rounded-xl"
                style={{ background: COLORS.card, border: `1px solid ${COLORS.border}` }}
              >
                {n.kind === "package_assigned" ? (
                  <PackagePlus size={15} color={COLORS.gold} style={{ flexShrink: 0, marginTop: 2 }} />
                ) : n.kind === "welcome" ? (
                  <Sparkles size={15} color={COLORS.gold} style={{ flexShrink: 0, marginTop: 2 }} />
                ) : n.kind === "waitlist_promoted" ? (
                  <UserCheck size={15} color={COLORS.success} style={{ flexShrink: 0, marginTop: 2 }} />
                ) : (
                  <Bell size={15} color={COLORS.primary} style={{ flexShrink: 0, marginTop: 2 }} />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                    <span style={{ fontSize: 13, fontWeight: 700 }}>{n.clientName || "Cliente eliminato"}</span>
                    <span
                      className="inline-flex items-center rounded-full"
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        color: n.read ? COLORS.success : COLORS.gold,
                        background: withAlpha(n.read ? COLORS.success : COLORS.gold, 14),
                        padding: "1px 7px",
                      }}
                    >
                      {n.read ? "Letto" : "Non letto"}
                    </span>
                  </div>
                  <div style={{ fontSize: 13, color: COLORS.ink }}>{n.message}</div>
                  <div style={{ fontSize: 11, color: COLORS.inkSoft }} className="mt-0.5">
                    {n.createdAt.slice(0, 10)}
                  </div>
                </div>
                <button onClick={() => onDeleteNotice(n.id)} title="Elimina" style={{ color: COLORS.inkSoft, flexShrink: 0 }}>
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
