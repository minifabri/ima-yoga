"use client";

import { useEffect, useMemo, useState } from "react";
import { Bell, Eye, Search, Send, X } from "lucide-react";
import { Modal, inputStyle } from "./ui";
import { COLORS, withAlpha } from "./colors";
import { createClient } from "@/lib/supabase/client";
import { fetchSurveyResponses } from "./data";
import { EmailPreviewModal } from "./EmailPreviewModal";
import { surveyReminderEmailHtml } from "@/lib/emailTemplates";
import type { ClientItem, SurveyItem } from "./types";

export function SurveyReminderModal({
  survey,
  clients,
  onClose,
  onSend,
}: {
  survey: SurveyItem;
  clients: ClientItem[];
  onClose: () => void;
  onSend: (clientIds: string[]) => Promise<{ ok: boolean; emailsSent?: number; error?: string }>;
}) {
  const [respondedIds, setRespondedIds] = useState<Set<string> | null>(null);
  const [excludedIds, setExcludedIds] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [showPreview, setShowPreview] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const supabase = createClient();
    fetchSurveyResponses(supabase, survey.id)
      .then((responses) => setRespondedIds(new Set(responses.filter((r) => r.clientId).map((r) => r.clientId as string))))
      .catch(() => setRespondedIds(new Set()));
  }, [survey.id]);

  // Chi ha già risposto non compare proprio tra i destinatari selezionabili:
  // non ha senso ricordargli un sondaggio a cui ha già partecipato.
  const candidates = useMemo(
    () => (respondedIds ? clients.filter((c) => c.hasAccount && !c.disabled && !respondedIds.has(c.id)) : []),
    [clients, respondedIds]
  );
  const filteredCandidates = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return candidates;
    return candidates.filter((c) => c.name.toLowerCase().includes(q));
  }, [candidates, search]);
  const includedIds = useMemo(() => candidates.filter((c) => !excludedIds.includes(c.id)).map((c) => c.id), [candidates, excludedIds]);

  function toggle(id: string) {
    setExcludedIds((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));
  }

  async function handleSend() {
    if (includedIds.length === 0 || sending) return;
    setSending(true);
    setError("");
    try {
      const res = await onSend(includedIds);
      if (res.ok) onClose();
      else setError(res.error || "Invio non riuscito.");
    } finally {
      setSending(false);
    }
  }

  const respondedCount = respondedIds?.size ?? 0;

  return (
    <Modal onClose={onClose} width={480}>
      <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: `1px solid ${COLORS.border}` }}>
        <div className="flex items-center gap-1.5" style={{ fontFamily: "var(--font-display)", fontSize: 17, fontWeight: 600, color: COLORS.heading }}>
          <Bell size={16} /> Promemoria — {survey.title}
        </div>
        <button onClick={onClose} className="flex items-center justify-center" style={{ width: 36, height: 36 }}>
          <X size={18} />
        </button>
      </div>

      <div className="p-5 overflow-y-auto" style={{ flex: 1 }}>
        {respondedIds === null ? (
          <div style={{ fontSize: 13, color: COLORS.inkSoft }}>Caricamento…</div>
        ) : (
          <>
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <div style={{ fontSize: 11.5, fontWeight: 600, color: COLORS.inkSoft }}>Destinatari (chi non ha ancora risposto)</div>
              <button
                type="button"
                onClick={() => setShowPreview(true)}
                className="flex items-center gap-1 text-xs font-semibold flex-shrink-0"
                style={{ color: COLORS.primaryDark }}
              >
                <Eye size={12} /> Anteprima email
              </button>
            </div>
            {respondedCount > 0 && (
              <div className="mb-2" style={{ fontSize: 11.5, color: COLORS.inkSoft }}>
                {respondedCount} {respondedCount === 1 ? "cliente ha" : "clienti hanno"} già risposto e{" "}
                {respondedCount === 1 ? "è escluso" : "sono esclusi"} automaticamente.
              </div>
            )}

            <div className="relative mb-1.5">
              <Search size={12} color={COLORS.inkSoft} style={{ position: "absolute", left: 9, top: "50%", transform: "translateY(-50%)" }} />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cerca cliente da escludere…"
                style={{ ...inputStyle, paddingLeft: 27, fontSize: 12, padding: "6px 8px 6px 27px" }}
              />
            </div>

            <div className="flex flex-col rounded-lg mb-3" style={{ maxHeight: 220, overflowY: "auto", border: `1px solid ${COLORS.border}` }}>
              {candidates.length === 0 ? (
                <div style={{ fontSize: 12.5, color: COLORS.inkSoft, padding: "10px 12px" }}>
                  Nessun cliente da avvisare: hanno già risposto tutti, o nessuno ha un account.
                </div>
              ) : filteredCandidates.length === 0 ? (
                <div style={{ fontSize: 12.5, color: COLORS.inkSoft, padding: "10px 12px" }}>Nessun cliente trovato.</div>
              ) : (
                filteredCandidates.map((c) => {
                  const included = !excludedIds.includes(c.id);
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => toggle(c.id)}
                      className="flex items-center gap-2 text-left px-3 py-2 w-full"
                      style={{ fontSize: 12.5, borderBottom: `1px solid ${COLORS.border}` }}
                    >
                      <input type="checkbox" checked={included} onChange={() => toggle(c.id)} onClick={(e) => e.stopPropagation()} />
                      <span style={{ color: included ? COLORS.ink : COLORS.inkSoft, textDecoration: included ? "none" : "line-through" }}>{c.name}</span>
                    </button>
                  );
                })
              )}
            </div>

            {error && (
              <div className="text-sm rounded-lg px-3 py-2 mb-3" style={{ background: withAlpha(COLORS.danger, 14), color: COLORS.danger }}>
                {error}
              </div>
            )}

            {showPreview && (
              <EmailPreviewModal
                subject={`Il sondaggio "${survey.title}" aspetta ancora 🤍`}
                html={surveyReminderEmailHtml({
                  fullName: "Nome Cognome",
                  surveyTitle: survey.title,
                  surveyUrl: `https://imayoga.app/sondaggi/${survey.slug}`,
                })}
                onClose={() => setShowPreview(false)}
              />
            )}
          </>
        )}
      </div>

      <div className="flex items-center justify-end gap-2 px-5 py-4" style={{ borderTop: `1px solid ${COLORS.border}` }}>
        <button onClick={onClose} className="px-3.5 py-2 rounded-lg text-sm font-medium" style={{ border: `1px solid ${COLORS.border}` }}>
          Annulla
        </button>
        <button
          onClick={handleSend}
          disabled={includedIds.length === 0 || sending}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-50"
          style={{ background: COLORS.primary }}
        >
          <Send size={14} /> {sending ? "Invio…" : `Invia a ${includedIds.length || ""} ${includedIds.length === 1 ? "cliente" : "clienti"}`.trim()}
        </button>
      </div>
    </Modal>
  );
}
