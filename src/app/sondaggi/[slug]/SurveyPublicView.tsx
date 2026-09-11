"use client";

import { useMemo, useState, type CSSProperties } from "react";
import Link from "next/link";
import { Check, AlertCircle, EyeOff, ArrowLeft, ArrowRight, ClipboardCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { COLORS, withAlpha } from "@/app/admin/colors";
import { Field, inputStyle } from "@/app/admin/ui";
import { ThemeToggle, useTheme } from "@/app/admin/ThemeToggle";
import { PeekEyesIcon } from "@/app/admin/PeekEyesIcon";
import type { PublicSurveyData, PublicSurveyQuestion } from "./types";

type AnswerState = { optionIds: string[]; otherSelected: boolean; otherText: string };

function storageKey(slug: string): string {
  return `ima-yoga-survey-response-${slug}`;
}

function formatDateLabel(iso: string): string {
  return new Date(iso).toLocaleDateString("it-IT", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export function SurveyPublicView({
  survey,
  loggedIn,
  profileRole,
  clientFullName,
}: {
  survey: PublicSurveyData;
  loggedIn: boolean;
  profileRole: "admin" | "client" | null;
  clientFullName: string;
}) {
  const supabase = useMemo(() => createClient(), []);
  const theme = useTheme();
  const isClientProfile = profileRole === "client";
  const isAdminProfile = profileRole === "admin";

  const [respondentToken] = useState(() => crypto.randomUUID());
  // Letto una sola volta all'inizializzazione (non in un effetto): è già
  // solo un controllo lato client di cortesia, l'unico che conta davvero è
  // quello del server al momento dell'invio.
  const [alreadyRespondedLocally] = useState(() => {
    try {
      return localStorage.getItem(storageKey(survey.slug)) === "1";
    } catch {
      return false;
    }
  });

  const [phase, setPhase] = useState<"gate" | "guestForm" | "flow" | "done">(
    loggedIn && (isClientProfile || isAdminProfile) ? "flow" : "gate"
  );
  const [guestName, setGuestName] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(false);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, AnswerState>>({});
  const [stepError, setStepError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const imageUrl = (theme === "dark" ? survey.coverImageDarkUrl : survey.coverImageLightUrl) || survey.coverImageLightUrl || survey.coverImageDarkUrl;

  const [now] = useState(() => Date.now());
  const notYetOpen = !isAdminProfile && survey.startsAt ? new Date(survey.startsAt).getTime() > now : false;
  const closed = !isAdminProfile && survey.endsAt ? new Date(survey.endsAt).getTime() < now : false;
  const alreadyResponded = (loggedIn && isClientProfile && !!survey.myResponseId) || (!loggedIn && alreadyRespondedLocally) || phase === "done";

  const totalSteps = survey.questions.length + 1; // +1 = riepilogo
  const nextParam = `?next=${encodeURIComponent(`/sondaggi/${survey.slug}`)}`;

  function answerFor(qId: string): AnswerState {
    return answers[qId] ?? { optionIds: [], otherSelected: false, otherText: "" };
  }

  function toggleOption(qId: string, optionId: string) {
    const allowMultiple = survey.questions.find((q) => q.id === qId)?.allowMultiple ?? true;
    setAnswers((cur) => {
      const a = cur[qId] ?? { optionIds: [], otherSelected: false, otherText: "" };
      if (!allowMultiple) {
        // A scelta singola selezionarne una sostituisce sempre la
        // precedente (e l'eventuale "Altro"), come un radio button.
        return { ...cur, [qId]: { ...a, optionIds: [optionId], otherSelected: false } };
      }
      const has = a.optionIds.includes(optionId);
      return { ...cur, [qId]: { ...a, optionIds: has ? a.optionIds.filter((id) => id !== optionId) : [...a.optionIds, optionId] } };
    });
    setStepError("");
  }

  function toggleOther(qId: string) {
    const allowMultiple = survey.questions.find((q) => q.id === qId)?.allowMultiple ?? true;
    setAnswers((cur) => {
      const a = cur[qId] ?? { optionIds: [], otherSelected: false, otherText: "" };
      if (!allowMultiple) {
        return { ...cur, [qId]: { ...a, optionIds: [], otherSelected: true } };
      }
      return { ...cur, [qId]: { ...a, otherSelected: !a.otherSelected, otherText: a.otherSelected ? "" : a.otherText } };
    });
    setStepError("");
  }

  function setOtherText(qId: string, text: string) {
    setAnswers((cur) => {
      const a = cur[qId] ?? { optionIds: [], otherSelected: false, otherText: "" };
      return { ...cur, [qId]: { ...a, otherText: text } };
    });
  }

  function canAdvance(q: PublicSurveyQuestion): boolean {
    if (!q.required) return true;
    const a = answerFor(q.id);
    if (q.questionType === "text") return a.otherText.trim().length > 0;
    if (a.optionIds.length > 0) return true;
    if (a.otherSelected && a.otherText.trim()) return true;
    return false;
  }

  function handleNext() {
    const q = survey.questions[currentIndex];
    if (q && !canAdvance(q)) {
      setStepError("Rispondi alla domanda per continuare.");
      return;
    }
    setStepError("");
    setCurrentIndex((i) => Math.min(i + 1, totalSteps - 1));
  }

  function handleBack() {
    setStepError("");
    setCurrentIndex((i) => Math.max(i - 1, 0));
  }

  function restartPreview() {
    setAnswers({});
    setCurrentIndex(0);
    setStepError("");
    setPhase("flow");
  }

  async function handleSubmit() {
    setSubmitError("");
    // L'admin può scorrere l'intero flusso per vedere come si presenta, ma
    // non scrive una vera risposta: eviterebbe di sporcare i dati reali con
    // un tentativo di anteprima.
    if (isAdminProfile) {
      setPhase("done");
      return;
    }
    setSubmitting(true);
    try {
      const asClient = loggedIn && isClientProfile;
      const payload = survey.questions.map((q) => {
        const a = answerFor(q.id);
        return {
          question_id: q.id,
          option_ids: a.optionIds,
          other_text: q.questionType === "text" || a.otherSelected ? a.otherText.trim() : "",
        };
      });
      const { error } = await supabase.rpc("submit_survey_response", {
        p_survey_id: survey.id,
        p_respondent_token: asClient ? null : respondentToken,
        p_guest_name: asClient || isAnonymous ? null : guestName.trim() || null,
        p_is_anonymous: asClient ? false : isAnonymous,
        p_answers: payload,
      });
      if (error) throw error;
      if (!asClient) {
        try {
          localStorage.setItem(storageKey(survey.slug), "1");
        } catch {
          // vedi commento sopra sul controllo in lettura
        }
      }
      setPhase("done");
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : "Invio non riuscito.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="flex-1 flex flex-col p-5" style={{ background: COLORS.bg, minHeight: "100vh" }}>
      <div className="w-full mx-auto" style={{ maxWidth: 620 }}>
        <div className="flex items-center justify-end mb-4">
          <ThemeToggle size={34} />
        </div>

        {!survey.published && (
          <div
            className="mb-4 flex items-center gap-1.5 rounded-lg px-3 py-2"
            style={{ fontSize: 12, fontWeight: 600, color: COLORS.gold, background: withAlpha(COLORS.gold, 12), border: `1px solid ${withAlpha(COLORS.gold, 30)}` }}
          >
            <EyeOff size={13} /> Anteprima — questo sondaggio è ancora in bozza, non è visibile pubblicamente.
          </div>
        )}

        {imageUrl && (
          <div
            className="mb-5 rounded-2xl overflow-hidden flex items-center justify-center"
            style={{ border: `1px solid ${COLORS.border}`, background: COLORS.subtle }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imageUrl}
              alt={survey.title}
              style={
                survey.coverImageFit === "cover"
                  ? { width: "100%", height: 320, objectFit: "cover", display: "block" }
                  : { maxWidth: "100%", maxHeight: 480, width: "auto", height: "auto", display: "block" }
              }
            />
          </div>
        )}

        <div className="text-center mb-2" style={{ fontFamily: "var(--font-display)", fontSize: 28, fontWeight: 500, color: COLORS.heading }}>
          {survey.title}
        </div>
        {(survey.startsAt || survey.endsAt) && (
          <div className="text-center mb-4" style={{ fontSize: 12, color: COLORS.inkSoft }}>
            {survey.startsAt && `Aperto dal ${formatDateLabel(survey.startsAt)}`}
            {survey.startsAt && survey.endsAt && " "}
            {survey.endsAt && `al ${formatDateLabel(survey.endsAt)}`}
          </div>
        )}

        {survey.descriptionHtml && phase !== "flow" && (
          <div
            className="mb-7 p-4 rounded-2xl rich-content"
            style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, fontSize: 13.5, color: COLORS.ink, lineHeight: 1.6 }}
            dangerouslySetInnerHTML={{ __html: survey.descriptionHtml }}
          />
        )}

        {loggedIn && !isClientProfile && !isAdminProfile ? (
          <div className="p-4 rounded-2xl text-center" style={{ background: COLORS.subtle, fontSize: 13, color: COLORS.inkSoft }}>
            Non troviamo un profilo cliente collegato al tuo account. Scrivici direttamente e ti aiutiamo a sistemarlo.
          </div>
        ) : notYetOpen ? (
          <div className="p-4 rounded-2xl text-center" style={{ background: COLORS.subtle, fontSize: 13.5, color: COLORS.inkSoft }}>
            Questo sondaggio non è ancora aperto.
          </div>
        ) : closed ? (
          <div className="p-4 rounded-2xl text-center" style={{ background: COLORS.subtle, fontSize: 13.5, color: COLORS.inkSoft }}>
            Questo sondaggio è chiuso.
          </div>
        ) : isAdminProfile && phase === "done" ? (
          <div className="p-4 rounded-2xl" style={{ background: COLORS.card, border: `1px solid ${COLORS.border}` }}>
            <div className="flex items-center gap-1.5 mb-1" style={{ fontSize: 14, fontWeight: 700, color: COLORS.success }}>
              <Check size={15} /> Anteprima completata
            </div>
            <div style={{ fontSize: 12.5, color: COLORS.inkSoft }} className="mb-3">
              Hai visto l&apos;intero flusso di risposta. Le tue selezioni non sono state salvate — questo era solo un giro di prova.
            </div>
            <button
              onClick={restartPreview}
              className="px-3.5 py-2 rounded-full text-sm font-semibold text-white"
              style={{ background: COLORS.primary }}
            >
              Ricomincia anteprima
            </button>
          </div>
        ) : alreadyResponded ? (
          <div className="p-4 rounded-2xl" style={{ background: COLORS.card, border: `1px solid ${COLORS.border}` }}>
            <div className="flex items-center gap-1.5 mb-1" style={{ fontSize: 14, fontWeight: 700, color: COLORS.success }}>
              <Check size={15} /> Grazie, hai già risposto a questo sondaggio
            </div>
            <div style={{ fontSize: 12.5, color: COLORS.inkSoft }}>La tua risposta è stata registrata.</div>
          </div>
        ) : phase === "gate" ? (
          <div className="p-4 rounded-2xl" style={{ background: COLORS.card, border: `1px solid ${COLORS.border}` }}>
            <div style={{ fontSize: 13.5, fontWeight: 600, color: COLORS.heading }} className="mb-3">
              Come vuoi partecipare?
            </div>
            <div className="flex flex-col gap-2">
              <Link href={`/login${nextParam}`} className="w-full py-2.5 rounded-lg text-sm font-semibold text-white text-center" style={{ background: COLORS.primary }}>
                Accedi
              </Link>
              <Link
                href={`/signup${nextParam}`}
                className="w-full py-2.5 rounded-lg text-sm font-semibold text-center"
                style={{ border: `1px solid ${COLORS.primary}`, color: COLORS.primaryDark }}
              >
                Registrati
              </Link>
              <button
                onClick={() => setPhase("guestForm")}
                className="w-full py-2.5 rounded-lg text-sm font-medium text-center"
                style={{ color: COLORS.inkSoft }}
              >
                Continua come ospite
              </button>
            </div>
          </div>
        ) : phase === "guestForm" ? (
          <div className="p-4 rounded-2xl" style={{ background: COLORS.card, border: `1px solid ${COLORS.border}` }}>
            <div style={{ fontSize: 13.5, fontWeight: 600, color: COLORS.heading }} className="mb-3">
              Partecipa come ospite
            </div>
            {!isAnonymous && (
              <Field label="Nome (facoltativo)">
                <input type="text" value={guestName} onChange={(e) => setGuestName(e.target.value)} style={inputStyle} />
              </Field>
            )}
            <button
              type="button"
              onClick={() => {
                const next = !isAnonymous;
                setIsAnonymous(next);
                if (next) setGuestName("");
              }}
              className="w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-left mb-4 mt-1 transition"
              style={{
                border: `1px solid ${isAnonymous ? COLORS.gold : COLORS.border}`,
                background: isAnonymous ? withAlpha(COLORS.gold, 10) : "transparent",
              }}
            >
              <PeekEyesIcon />
              <span style={{ fontSize: 12.5, fontWeight: 600, color: isAnonymous ? COLORS.heading : COLORS.ink }}>
                Preferisco rispondere in anonimo
              </span>
            </button>
            <div className="flex gap-2">
              <button onClick={() => setPhase("gate")} className="px-3.5 py-2 rounded-lg text-sm font-medium" style={{ border: `1px solid ${COLORS.border}` }}>
                Indietro
              </button>
              <button
                onClick={() => setPhase("flow")}
                className="flex-1 py-2.5 rounded-lg text-sm font-semibold text-white"
                style={{ background: COLORS.primary }}
              >
                Inizia
              </button>
            </div>
          </div>
        ) : (
          <>
            {isAdminProfile ? (
              <div className="flex items-center gap-1.5 mb-3" style={{ fontSize: 12, fontWeight: 600, color: COLORS.gold }}>
                <EyeOff size={13} /> Modalità anteprima admin — le risposte non verranno salvate
              </div>
            ) : (
              loggedIn &&
              isClientProfile && (
                <div className="flex items-center gap-1.5 mb-3" style={{ fontSize: 12, fontWeight: 600, color: COLORS.success }}>
                  <Check size={13} /> Ciao {clientFullName.split(" ")[0]}, hai eseguito l&apos;accesso
                </div>
              )
            )}
            <SurveyFlow
              survey={survey}
              currentIndex={currentIndex}
              answers={answers}
              stepError={stepError}
              submitting={submitting}
              submitError={submitError}
              answerFor={answerFor}
              canAdvanceCurrent={currentIndex >= survey.questions.length || canAdvance(survey.questions[currentIndex])}
              onToggleOption={toggleOption}
              onToggleOther={toggleOther}
              onSetOtherText={setOtherText}
              onNext={handleNext}
              onBack={handleBack}
              onSubmit={handleSubmit}
            />
          </>
        )}
      </div>
    </main>
  );
}

function SurveyFlow({
  survey,
  currentIndex,
  answers,
  stepError,
  submitting,
  submitError,
  answerFor,
  canAdvanceCurrent,
  onToggleOption,
  onToggleOther,
  onSetOtherText,
  onNext,
  onBack,
  onSubmit,
}: {
  survey: PublicSurveyData;
  currentIndex: number;
  answers: Record<string, AnswerState>;
  stepError: string;
  submitting: boolean;
  submitError: string;
  answerFor: (qId: string) => AnswerState;
  canAdvanceCurrent: boolean;
  onToggleOption: (qId: string, optionId: string) => void;
  onToggleOther: (qId: string) => void;
  onSetOtherText: (qId: string, text: string) => void;
  onNext: () => void;
  onBack: () => void;
  onSubmit: () => void;
}) {
  const isReview = currentIndex === survey.questions.length;

  const currentQuestion = survey.questions[currentIndex];

  return (
    <div className="p-4 rounded-2xl" style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, overflow: "hidden" }}>
      <div key={currentIndex} className="survey-step-in">
        {isReview || !currentQuestion ? (
          <ReviewStep survey={survey} answers={answers} />
        ) : (
          <QuestionStep
            q={currentQuestion}
            answer={answerFor(currentQuestion.id)}
            onToggleOption={onToggleOption}
            onToggleOther={onToggleOther}
            onSetOtherText={onSetOtherText}
          />
        )}
      </div>

      {stepError && (
        <div className="text-sm rounded-lg px-3 py-2 mt-3" style={{ background: withAlpha(COLORS.danger, 14), color: COLORS.danger }}>
          <AlertCircle size={13} className="inline mr-1" /> {stepError}
        </div>
      )}
      {submitError && (
        <div className="text-sm rounded-lg px-3 py-2 mt-3" style={{ background: withAlpha(COLORS.danger, 14), color: COLORS.danger }}>
          <AlertCircle size={13} className="inline mr-1" /> {submitError}
        </div>
      )}

      <div className="flex gap-2 mt-4" style={{ minHeight: 42 }}>
        {currentIndex > 0 && (
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-full text-sm font-medium"
            style={{ border: `1px solid ${COLORS.border}` }}
          >
            <ArrowLeft size={14} /> Indietro
          </button>
        )}
        {isReview ? (
          <button
            disabled={submitting}
            onClick={onSubmit}
            className="flex-1 py-2.5 rounded-full text-sm font-semibold text-white disabled:opacity-60"
            style={{ background: COLORS.primary }}
          >
            {submitting ? "Invio…" : "Invia risposte"}
          </button>
        ) : (
          canAdvanceCurrent && (
            <button
              key={currentIndex}
              onClick={onNext}
              className="survey-next-in flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-full text-sm font-semibold text-white"
              style={{ background: COLORS.primary }}
            >
              Avanti <ArrowRight size={14} />
            </button>
          )
        )}
      </div>
    </div>
  );
}

function QuestionStep({
  q,
  answer,
  onToggleOption,
  onToggleOther,
  onSetOtherText,
}: {
  q: PublicSurveyQuestion;
  answer: AnswerState;
  onToggleOption: (qId: string, optionId: string) => void;
  onToggleOther: (qId: string) => void;
  onSetOtherText: (qId: string, text: string) => void;
}) {
  function badgeStyle(selected: boolean, delayMs: number): CSSProperties {
    return {
      padding: "14px 22px",
      fontSize: 15,
      fontWeight: 600,
      border: `1.5px solid ${selected ? COLORS.gold : COLORS.border}`,
      background: selected ? COLORS.gold : "transparent",
      color: selected ? "#3a2a12" : COLORS.ink,
      "--pop-delay": `${delayMs}ms`,
    } as CSSProperties;
  }

  if (q.questionType === "text") {
    return (
      <div className="pr-1">
        <div style={{ fontSize: 15.5, fontWeight: 600, color: COLORS.heading, lineHeight: 1.4 }} className="mb-3">
          {q.questionText}
        </div>
        <textarea
          autoFocus
          rows={4}
          value={answer.otherText}
          onChange={(e) => onSetOtherText(q.id, e.target.value)}
          placeholder="Scrivi qui…"
          style={{ ...inputStyle, resize: "vertical" }}
        />
      </div>
    );
  }

  return (
    <div className="pr-1">
      <div style={{ fontSize: 15.5, fontWeight: 600, color: COLORS.heading, lineHeight: 1.4 }} className="mb-1">
        {q.questionText}
      </div>
      <div className="flex flex-col items-start gap-2 mt-3">
        {q.options.map((o, i) => {
          const selected = answer.optionIds.includes(o.id);
          return (
            <button
              key={o.id}
              type="button"
              onClick={() => onToggleOption(q.id, o.id)}
              className="survey-option-pop rounded-full transition"
              style={badgeStyle(selected, i * 70)}
            >
              {o.label}
            </button>
          );
        })}
        {q.allowOther && (
          <button
            type="button"
            onClick={() => onToggleOther(q.id)}
            className="survey-option-pop rounded-full transition"
            style={badgeStyle(answer.otherSelected, q.options.length * 70)}
          >
            Altro
          </button>
        )}
      </div>
      {answer.otherSelected && (
        <input
          type="text"
          autoFocus
          value={answer.otherText}
          onChange={(e) => onSetOtherText(q.id, e.target.value)}
          placeholder="Scrivi qui…"
          style={{ ...inputStyle, marginTop: 10 }}
        />
      )}
    </div>
  );
}

function ReviewStep({ survey, answers }: { survey: PublicSurveyData; answers: Record<string, AnswerState> }) {
  return (
    <div className="pr-1">
      <div className="flex items-center gap-1.5 mb-3" style={{ fontSize: 14, fontWeight: 600, color: COLORS.heading }}>
        <ClipboardCheck size={16} color={COLORS.primary} /> Controlla le tue risposte
      </div>
      <div className="flex flex-col gap-3 mb-2">
        {survey.questions.map((q) => {
          const a = answers[q.id];
          const labels =
            q.questionType === "text"
              ? a?.otherText?.trim()
                ? [a.otherText.trim()]
                : []
              : ((a?.optionIds ?? []).map((oid) => q.options.find((o) => o.id === oid)?.label).filter(Boolean) as string[]);
          if (q.questionType !== "text" && a?.otherSelected && a.otherText.trim()) labels.push(a.otherText.trim());
          return (
            <div key={q.id}>
              <div style={{ fontSize: 12, fontWeight: 600, color: COLORS.inkSoft }}>{q.questionText}</div>
              <div style={{ fontSize: 13, color: COLORS.ink }}>{labels.length > 0 ? labels.join(", ") : "— nessuna risposta —"}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
