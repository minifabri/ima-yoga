"use client";

import { useEffect, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { Plus, Pencil, ExternalLink, ClipboardList, AlertCircle, Check, Archive, ArchiveRestore, BarChart3, Trash2 } from "lucide-react";
import { COLORS, withAlpha } from "./colors";
import { SurveyFormModal, type NotifyChoice, type SurveyQuestionPayload } from "./SurveyFormModal";
import { SurveyResponsesPanel } from "./SurveyResponsesPanel";
import { deleteSurvey, fetchSurveys, saveSurvey, saveSurveyQuestions, setSurveyArchived } from "./data";
import { notifySurveyPublished } from "./actions";
import type { ClientItem, SurveyItem } from "./types";

type ModalState = { mode: "new" } | { mode: "edit"; survey: SurveyItem } | null;

function surveyStatus(s: SurveyItem): { label: string; color: string } {
  if (s.archived) return { label: "Archiviato", color: COLORS.inkSoft };
  if (!s.published) return { label: "Bozza", color: COLORS.gold };
  const now = Date.now();
  if (s.endsAt && new Date(s.endsAt).getTime() < now) return { label: "Chiuso", color: COLORS.inkSoft };
  if (s.startsAt && new Date(s.startsAt).getTime() > now) return { label: "Programmato", color: COLORS.gold };
  return { label: "Pubblicato", color: COLORS.success };
}

export function SurveysView({ supabase, clients }: { supabase: SupabaseClient; clients: ClientItem[] }) {
  const [surveys, setSurveys] = useState<SurveyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<ModalState>(null);
  const [responsesFor, setResponsesFor] = useState<SurveyItem | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [toast, setToast] = useState("");

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(""), 3200);
  }

  useEffect(() => {
    fetchSurveys(supabase)
      .then(setSurveys)
      .catch(() => showToast("Errore nel caricamento dei sondaggi."))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSave(
    survey: Omit<SurveyItem, "id" | "questions" | "responseCount" | "createdAt"> & { id?: string },
    questions: SurveyQuestionPayload[],
    notify: NotifyChoice
  ) {
    const saved = await saveSurvey(supabase, survey);
    const savedQuestions = await saveSurveyQuestions(supabase, saved.id, questions);
    const full: SurveyItem = { ...saved, questions: savedQuestions };
    setSurveys((cur) => (survey.id ? cur.map((s) => (s.id === full.id ? full : s)) : [full, ...cur]));
    showToast(survey.id ? "Sondaggio aggiornato." : "Sondaggio creato.");

    if (notify && (notify.sendEmail || notify.sendSiteNotice)) {
      notifySurveyPublished(full.id, full.slug, full.title, notify)
        .then((res) => {
          if (res.ok) showToast(`Notifica inviata — email: ${res.emailsSent ?? 0}, avvisi: ${res.noticesSent ?? 0}.`);
          else showToast(res.error || "Notifica non riuscita.");
        })
        .catch(() => showToast("Notifica non riuscita."));
    }
  }

  function handleDelete(id: string) {
    setSurveys((cur) => cur.filter((s) => s.id !== id));
    setConfirmDeleteId(null);
    deleteSurvey(supabase, id).catch(() => showToast("Eliminazione non riuscita."));
  }

  function toggleArchived(s: SurveyItem) {
    const next = !s.archived;
    setSurveys((cur) => cur.map((x) => (x.id === s.id ? { ...x, archived: next } : x)));
    setSurveyArchived(supabase, s.id, next)
      .then(() => showToast(next ? "Sondaggio archiviato." : "Sondaggio riattivato."))
      .catch(() => {
        setSurveys((cur) => cur.map((x) => (x.id === s.id ? { ...x, archived: s.archived } : x)));
        showToast("Errore nell'archiviazione.");
      });
  }

  const sorted = [...surveys].sort((a, b) => {
    if (a.archived !== b.archived) return a.archived ? 1 : -1;
    return b.createdAt.localeCompare(a.createdAt);
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div style={{ fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 600, color: COLORS.heading }}>Sondaggi</div>
        <button
          onClick={() => setModal({ mode: "new" })}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold text-white"
          style={{ background: COLORS.primary }}
        >
          <Plus size={15} /> Nuovo sondaggio
        </button>
      </div>

      {toast && (
        <div className="mb-4 flex items-center gap-2 text-sm rounded-lg px-3 py-2" style={{ background: COLORS.subtle, color: COLORS.primaryDark }}>
          {toast.includes("riuscit") || toast.includes("Errore") ? <AlertCircle size={15} color={COLORS.danger} /> : <Check size={15} />}
          {toast}
        </div>
      )}

      {loading ? (
        <div style={{ fontSize: 13, color: COLORS.inkSoft }}>Caricamento…</div>
      ) : sorted.length === 0 ? (
        <div className="flex flex-col items-center justify-center text-center py-14" style={{ color: COLORS.inkSoft }}>
          <ClipboardList size={28} className="mb-2" />
          <div style={{ fontSize: 13.5 }}>Nessun sondaggio creato finora.</div>
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {sorted.map((s) => {
            const status = surveyStatus(s);
            return (
              <div
                key={s.id}
                className="flex items-center gap-3 p-3.5 rounded-xl flex-wrap"
                style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, opacity: s.archived ? 0.6 : 1 }}
              >
                <div
                  className="flex items-center justify-center rounded-lg flex-shrink-0 overflow-hidden"
                  style={{ width: 48, height: 48, background: COLORS.subtle }}
                >
                  {s.coverImageLightUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={s.coverImageLightUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  ) : (
                    <ClipboardList size={18} color={COLORS.inkSoft} />
                  )}
                </div>

                <div style={{ flex: 1, minWidth: 160 }}>
                  <div className="flex items-center gap-1.5" style={{ fontSize: 14, fontWeight: 600 }}>
                    {s.title}
                    <span
                      className="inline-flex items-center rounded-full"
                      style={{ fontSize: 10, fontWeight: 700, color: status.color, background: withAlpha(status.color, 12), padding: "1px 7px" }}
                    >
                      {status.label}
                    </span>
                  </div>
                  <div style={{ fontSize: 12, color: COLORS.inkSoft }}>
                    {s.questions.length} {s.questions.length === 1 ? "domanda" : "domande"} · {s.responseCount}{" "}
                    {s.responseCount === 1 ? "risposta" : "risposte"}
                  </div>
                </div>

                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {!s.archived && (
                    <a
                      href={`/sondaggi/${s.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="Apri pagina pubblica"
                      className="flex items-center justify-center rounded-lg"
                      style={{ width: 34, height: 34, border: `1px solid ${COLORS.border}`, color: COLORS.primaryDark }}
                    >
                      <ExternalLink size={14} />
                    </a>
                  )}
                  <button
                    onClick={() => setResponsesFor(s)}
                    title="Risposte"
                    className="flex items-center gap-1.5 px-2.5 py-2 rounded-lg text-xs font-semibold"
                    style={{ border: `1px solid ${withAlpha(COLORS.primary, 33)}`, color: COLORS.primaryDark }}
                  >
                    <BarChart3 size={14} /> Risposte
                  </button>
                  <button
                    onClick={() => toggleArchived(s)}
                    title={s.archived ? "Riattiva sondaggio" : "Archivia sondaggio (resta lo storico, sparisce dalla pagina pubblica)"}
                    className="flex items-center justify-center rounded-lg"
                    style={{ width: 34, height: 34, border: `1px solid ${COLORS.border}` }}
                  >
                    {s.archived ? <ArchiveRestore size={14} /> : <Archive size={14} />}
                  </button>
                  <button
                    onClick={() => setModal({ mode: "edit", survey: s })}
                    title="Modifica"
                    className="flex items-center justify-center rounded-lg"
                    style={{ width: 34, height: 34, border: `1px solid ${COLORS.border}` }}
                  >
                    <Pencil size={14} />
                  </button>
                  {confirmDeleteId === s.id ? (
                    <button onClick={() => handleDelete(s.id)} className="text-xs font-semibold px-2.5 py-2 rounded-lg text-white" style={{ background: COLORS.danger }}>
                      Conferma
                    </button>
                  ) : (
                    <button
                      onClick={() => setConfirmDeleteId(s.id)}
                      title="Elimina sondaggio"
                      className="flex items-center justify-center rounded-lg"
                      style={{ width: 34, height: 34, color: COLORS.inkSoft }}
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {modal && (
        <SurveyFormModal
          data={modal}
          clients={clients}
          onClose={() => setModal(null)}
          onSave={async (survey, questions, notify) => {
            await handleSave(survey, questions, notify);
            setModal(null);
          }}
          onDelete={(id) => {
            setModal(null);
            handleDelete(id);
          }}
        />
      )}

      {responsesFor && <SurveyResponsesPanel survey={responsesFor} onClose={() => setResponsesFor(null)} />}
    </div>
  );
}
