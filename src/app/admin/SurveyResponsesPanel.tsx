"use client";

import { useEffect, useMemo, useState } from "react";
import { X, ChevronDown, ChevronUp } from "lucide-react";
import { Modal, Badge } from "./ui";
import { COLORS } from "./colors";
import { createClient } from "@/lib/supabase/client";
import * as db from "./data";
import type { SurveyItem, SurveyResponseItem } from "./types";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("it-IT", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export function SurveyResponsesPanel({ survey, onClose }: { survey: SurveyItem; onClose: () => void }) {
  const supabase = createClient();
  const [responses, setResponses] = useState<SurveyResponseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"aggregate" | "list">("aggregate");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    db.fetchSurveyResponses(supabase, survey.id)
      .then(setResponses)
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [survey.id]);

  const optionLabelById = useMemo(() => {
    const map: Record<string, string> = {};
    survey.questions.forEach((q) => q.options.forEach((o) => (map[o.id] = o.label)));
    return map;
  }, [survey.questions]);

  function displayName(r: SurveyResponseItem): string {
    if (r.isAnonymous) return "Anonimo";
    return r.clientName || r.guestName || "—";
  }

  return (
    <Modal onClose={onClose} width={620}>
      <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: `1px solid ${COLORS.border}` }}>
        <div>
          <div style={{ fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 600, color: COLORS.heading }}>{survey.title}</div>
          <div style={{ fontSize: 12, color: COLORS.inkSoft }}>
            {responses.length} {responses.length === 1 ? "risposta" : "risposte"}
          </div>
        </div>
        <button onClick={onClose} className="flex items-center justify-center" style={{ width: 36, height: 36 }}>
          <X size={18} />
        </button>
      </div>

      <div className="px-5 pt-4 pb-3 flex items-center gap-2" style={{ borderBottom: `1px solid ${COLORS.border}` }}>
        <button
          onClick={() => setTab("aggregate")}
          className="px-3 py-1.5 rounded-lg text-xs font-semibold"
          style={{ background: tab === "aggregate" ? COLORS.primary : COLORS.subtle, color: tab === "aggregate" ? "#fff" : COLORS.inkSoft }}
        >
          Aggregato
        </button>
        <button
          onClick={() => setTab("list")}
          className="px-3 py-1.5 rounded-lg text-xs font-semibold"
          style={{ background: tab === "list" ? COLORS.primary : COLORS.subtle, color: tab === "list" ? "#fff" : COLORS.inkSoft }}
        >
          Elenco risposte
        </button>
      </div>

      <div className="p-5 overflow-y-auto" style={{ flex: 1 }}>
        {loading ? (
          <div style={{ fontSize: 13, color: COLORS.inkSoft }}>Caricamento…</div>
        ) : responses.length === 0 ? (
          <div style={{ fontSize: 13, color: COLORS.inkSoft }}>Nessuna risposta finora.</div>
        ) : tab === "aggregate" ? (
          <div className="flex flex-col gap-5">
            {survey.questions.map((q) => {
              const answers = responses.flatMap((r) => r.answers.filter((a) => a.questionId === q.id));
              const respondentCount = answers.length;
              const counts: Record<string, number> = {};
              q.options.forEach((o) => (counts[o.id] = 0));
              answers.forEach((a) => a.optionIds.forEach((oid) => (counts[oid] = (counts[oid] ?? 0) + 1)));
              const otherTexts = answers.map((a) => a.otherText).filter((t): t is string => !!t && t.trim().length > 0);

              return (
                <div key={q.id}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: COLORS.heading }} className="mb-2">
                    {q.questionText}
                    {!q.required && <span style={{ fontSize: 10.5, fontWeight: 500, color: COLORS.inkSoft }}> (facoltativa)</span>}
                  </div>
                  <div className="flex flex-col gap-1.5">
                    {q.options.map((o) => {
                      const count = counts[o.id] ?? 0;
                      const pct = respondentCount > 0 ? Math.round((count / respondentCount) * 100) : 0;
                      return (
                        <div key={o.id}>
                          <div className="flex items-center justify-between mb-0.5" style={{ fontSize: 12, color: COLORS.ink }}>
                            <span>{o.label}</span>
                            <span style={{ color: COLORS.inkSoft }}>
                              {count} · {pct}%
                            </span>
                          </div>
                          <div style={{ height: 6, borderRadius: 999, background: COLORS.subtle, overflow: "hidden" }}>
                            <div style={{ height: "100%", width: `${pct}%`, background: COLORS.primary, borderRadius: 999, transition: "width .3s" }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {q.allowOther && otherTexts.length > 0 && (
                    <div className="mt-2 flex flex-col gap-1">
                      <div style={{ fontSize: 10.5, fontWeight: 600, color: COLORS.inkSoft }}>Risposte &quot;Altro&quot; ({otherTexts.length})</div>
                      {otherTexts.map((t, i) => (
                        <div key={i} className="px-2.5 py-1.5 rounded-lg" style={{ fontSize: 12, color: COLORS.ink, background: COLORS.subtle }}>
                          &ldquo;{t}&rdquo;
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {responses.map((r) => {
              const expanded = expandedId === r.id;
              return (
                <div key={r.id} className="rounded-xl overflow-hidden" style={{ background: COLORS.card, border: `1px solid ${COLORS.border}` }}>
                  <button onClick={() => setExpandedId(expanded ? null : r.id)} className="w-full flex items-center justify-between p-3">
                    <div className="flex items-center gap-1.5" style={{ fontSize: 13, fontWeight: 600 }}>
                      {displayName(r)}
                      {!r.clientId && !r.isAnonymous && <Badge color={COLORS.inkSoft}>Ospite</Badge>}
                      {r.isAnonymous && <Badge color={COLORS.inkSoft}>Anonimo</Badge>}
                    </div>
                    <div className="flex items-center gap-2">
                      <span style={{ fontSize: 11, color: COLORS.inkSoft }}>{formatDate(r.submittedAt)}</span>
                      {expanded ? <ChevronUp size={14} color={COLORS.inkSoft} /> : <ChevronDown size={14} color={COLORS.inkSoft} />}
                    </div>
                  </button>
                  {expanded && (
                    <div className="px-3 pb-3 flex flex-col gap-2" style={{ borderTop: `1px solid ${COLORS.border}` }}>
                      {survey.questions.map((q) => {
                        const a = r.answers.find((x) => x.questionId === q.id);
                        const labels = (a?.optionIds ?? []).map((oid) => optionLabelById[oid]).filter(Boolean);
                        if (a?.otherText) labels.push(`Altro: ${a.otherText}`);
                        return (
                          <div key={q.id} className="pt-2">
                            <div style={{ fontSize: 11.5, fontWeight: 600, color: COLORS.inkSoft }}>{q.questionText}</div>
                            <div style={{ fontSize: 12.5, color: COLORS.ink }}>{labels.length > 0 ? labels.join(", ") : "—"}</div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Modal>
  );
}
