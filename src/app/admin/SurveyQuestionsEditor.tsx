"use client";

import { Plus, Trash2, ChevronUp, ChevronDown } from "lucide-react";
import { COLORS } from "./colors";
import { Switch, inputStyle } from "./ui";

export type QuestionOptionDraft = { tempId: string; label: string };
export type QuestionDraft = {
  tempId: string;
  questionText: string;
  questionType: "choice" | "text";
  required: boolean;
  allowMultiple: boolean;
  allowOther: boolean;
  options: QuestionOptionDraft[];
};

export function newQuestionDraft(): QuestionDraft {
  return {
    tempId: crypto.randomUUID(),
    questionText: "",
    questionType: "choice",
    required: true,
    allowMultiple: true,
    allowOther: false,
    options: [{ tempId: crypto.randomUUID(), label: "" }],
  };
}

// CRUD domande/opzioni dentro il form del sondaggio: niente drag-and-drop,
// per una lista corta dentro un modal bastano i bottoni su/giù.
export function SurveyQuestionsEditor({
  questions,
  onChange,
}: {
  questions: QuestionDraft[];
  onChange: (next: QuestionDraft[]) => void;
}) {
  function updateQuestion(tempId: string, patch: Partial<QuestionDraft>) {
    onChange(questions.map((q) => (q.tempId === tempId ? { ...q, ...patch } : q)));
  }
  function removeQuestion(tempId: string) {
    onChange(questions.filter((q) => q.tempId !== tempId));
  }
  function addQuestion() {
    onChange([...questions, newQuestionDraft()]);
  }
  function moveQuestion(index: number, dir: -1 | 1) {
    const next = questions.slice();
    const target = index + dir;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  }

  function updateOption(qTempId: string, optTempId: string, label: string) {
    onChange(
      questions.map((q) =>
        q.tempId === qTempId ? { ...q, options: q.options.map((o) => (o.tempId === optTempId ? { ...o, label } : o)) } : q
      )
    );
  }
  function addOption(qTempId: string) {
    onChange(
      questions.map((q) => (q.tempId === qTempId ? { ...q, options: [...q.options, { tempId: crypto.randomUUID(), label: "" }] } : q))
    );
  }
  function removeOption(qTempId: string, optTempId: string) {
    onChange(questions.map((q) => (q.tempId === qTempId ? { ...q, options: q.options.filter((o) => o.tempId !== optTempId) } : q)));
  }
  function moveOption(qTempId: string, index: number, dir: -1 | 1) {
    onChange(
      questions.map((q) => {
        if (q.tempId !== qTempId) return q;
        const opts = q.options.slice();
        const target = index + dir;
        if (target < 0 || target >= opts.length) return q;
        [opts[index], opts[target]] = [opts[target], opts[index]];
        return { ...q, options: opts };
      })
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div style={{ fontSize: 12.5, fontWeight: 700, color: COLORS.heading }}>Domande</div>
        <button
          type="button"
          onClick={addQuestion}
          className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg"
          style={{ border: `1px solid ${COLORS.primary}`, color: COLORS.primaryDark }}
        >
          <Plus size={13} /> Aggiungi domanda
        </button>
      </div>

      {questions.length === 0 && (
        <div className="text-center py-6" style={{ fontSize: 12.5, color: COLORS.inkSoft }}>
          Nessuna domanda ancora — aggiungine una.
        </div>
      )}

      <div className="flex flex-col gap-3">
        {questions.map((q, qi) => (
          <div key={q.tempId} className="p-3 rounded-xl" style={{ background: COLORS.subtle, border: `1px solid ${COLORS.border}` }}>
            <div className="flex items-start gap-2 mb-2">
              <div className="flex flex-col" style={{ flexShrink: 0 }}>
                <button
                  type="button"
                  disabled={qi === 0}
                  onClick={() => moveQuestion(qi, -1)}
                  style={{ color: COLORS.inkSoft, opacity: qi === 0 ? 0.3 : 1 }}
                >
                  <ChevronUp size={14} />
                </button>
                <button
                  type="button"
                  disabled={qi === questions.length - 1}
                  onClick={() => moveQuestion(qi, 1)}
                  style={{ color: COLORS.inkSoft, opacity: qi === questions.length - 1 ? 0.3 : 1 }}
                >
                  <ChevronDown size={14} />
                </button>
              </div>
              <div style={{ flex: 1 }}>
                <input
                  type="text"
                  value={q.questionText}
                  onChange={(e) => updateQuestion(q.tempId, { questionText: e.target.value })}
                  placeholder={`Domanda ${qi + 1}`}
                  style={inputStyle}
                />
              </div>
              <button type="button" onClick={() => removeQuestion(q.tempId)} title="Elimina domanda" style={{ color: COLORS.danger, flexShrink: 0 }}>
                <Trash2 size={15} />
              </button>
            </div>

            <div className="flex items-center gap-1.5 mb-3">
              <button
                type="button"
                onClick={() => updateQuestion(q.tempId, { questionType: "choice" })}
                className="px-2.5 py-1 rounded-full text-xs font-semibold"
                style={{
                  background: q.questionType === "choice" ? COLORS.primary : "transparent",
                  color: q.questionType === "choice" ? "#fff" : COLORS.inkSoft,
                  border: `1px solid ${q.questionType === "choice" ? COLORS.primary : COLORS.border}`,
                }}
              >
                A scelta
              </button>
              <button
                type="button"
                onClick={() => updateQuestion(q.tempId, { questionType: "text" })}
                className="px-2.5 py-1 rounded-full text-xs font-semibold"
                style={{
                  background: q.questionType === "text" ? COLORS.primary : "transparent",
                  color: q.questionType === "text" ? "#fff" : COLORS.inkSoft,
                  border: `1px solid ${q.questionType === "text" ? COLORS.primary : COLORS.border}`,
                }}
              >
                Risposta aperta
              </button>
            </div>

            <div className="flex items-center gap-4 mb-3 flex-wrap">
              <Switch checked={q.required} onChange={(v) => updateQuestion(q.tempId, { required: v })} label="Obbligatoria" />
              {q.questionType === "choice" && (
                <>
                  <Switch
                    checked={q.allowMultiple}
                    onChange={(v) => updateQuestion(q.tempId, { allowMultiple: v })}
                    label="Risposta multipla"
                    onText="Sì"
                    offText="Una sola"
                  />
                  <Switch checked={q.allowOther} onChange={(v) => updateQuestion(q.tempId, { allowOther: v })} label="Consenti &quot;Altro&quot;" />
                </>
              )}
            </div>

            {q.questionType === "choice" && (
              <>
                <div style={{ fontSize: 11, fontWeight: 600, color: COLORS.inkSoft, marginBottom: 4 }}>Opzioni di risposta</div>
                <div className="flex flex-col gap-1.5 mb-2">
                  {q.options.map((o, oi) => (
                    <div key={o.tempId} className="flex items-center gap-1.5">
                      <input
                        type="text"
                        value={o.label}
                        onChange={(e) => updateOption(q.tempId, o.tempId, e.target.value)}
                        placeholder={`Opzione ${oi + 1}`}
                        style={{ ...inputStyle, flex: 1 }}
                      />
                      <button
                        type="button"
                        disabled={oi === 0}
                        onClick={() => moveOption(q.tempId, oi, -1)}
                        style={{ color: COLORS.inkSoft, opacity: oi === 0 ? 0.3 : 1 }}
                      >
                        <ChevronUp size={13} />
                      </button>
                      <button
                        type="button"
                        disabled={oi === q.options.length - 1}
                        onClick={() => moveOption(q.tempId, oi, 1)}
                        style={{ color: COLORS.inkSoft, opacity: oi === q.options.length - 1 ? 0.3 : 1 }}
                      >
                        <ChevronDown size={13} />
                      </button>
                      <button type="button" onClick={() => removeOption(q.tempId, o.tempId)} style={{ color: COLORS.danger }}>
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))}
                </div>
                <button type="button" onClick={() => addOption(q.tempId)} className="flex items-center gap-1 text-xs font-medium" style={{ color: COLORS.primaryDark }}>
                  <Plus size={12} /> Aggiungi opzione
                </button>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
