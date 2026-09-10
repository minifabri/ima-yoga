"use client";

import { useRef, useState } from "react";
import { X, Trash2, Eye, EyeOff, ExternalLink, Mail, Bell } from "lucide-react";
import { Modal, Field, Switch, inputStyle, ImageUploadField } from "./ui";
import { COLORS, withAlpha } from "./colors";
import { slugify } from "./utils";
import { RichTextEditor } from "./RichTextEditor";
import { uploadSurveyImage } from "./data";
import { createClient } from "@/lib/supabase/client";
import { SurveyQuestionsEditor, newQuestionDraft, type QuestionDraft } from "./SurveyQuestionsEditor";
import type { SurveyItem } from "./types";

type ModalData = { mode: "new" } | { mode: "edit"; survey: SurveyItem };
export type SurveyQuestionPayload = {
  questionText: string;
  questionType: "choice" | "text";
  required: boolean;
  allowMultiple: boolean;
  allowOther: boolean;
  position: number;
  options: { label: string; position: number }[];
};
export type NotifyChoice = { sendEmail: boolean; sendSiteNotice: boolean } | null;

function isoToLocalInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
function localInputToIso(v: string): string | null {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

export function SurveyFormModal({
  data,
  onClose,
  onSave,
  onDelete,
}: {
  data: ModalData;
  onClose: () => void;
  onSave: (
    survey: Omit<SurveyItem, "id" | "questions" | "responseCount" | "createdAt"> & { id?: string },
    questions: SurveyQuestionPayload[],
    notify: NotifyChoice
  ) => Promise<void>;
  onDelete: (id: string) => void;
}) {
  const editing = data.mode === "edit";
  const base = editing ? data.survey : null;
  const supabase = useRef(createClient()).current;
  const wasPublished = base?.published ?? false;

  const [title, setTitle] = useState(base?.title || "");
  const [slug, setSlug] = useState(base?.slug || "");
  const [slugTouched, setSlugTouched] = useState(editing);
  const [descriptionHtml, setDescriptionHtml] = useState(base?.descriptionHtml || "");
  const [coverImageLightUrl, setCoverImageLightUrl] = useState<string | null>(base?.coverImageLightUrl || null);
  const [coverImageDarkUrl, setCoverImageDarkUrl] = useState<string | null>(base?.coverImageDarkUrl || null);
  const [coverImageFit, setCoverImageFit] = useState<"contain" | "cover">(base?.coverImageFit || "contain");
  const [startsAtInput, setStartsAtInput] = useState(isoToLocalInput(base?.startsAt ?? null));
  const [endsAtInput, setEndsAtInput] = useState(isoToLocalInput(base?.endsAt ?? null));
  const [published, setPublished] = useState(base?.published ?? false);
  const [notifyEmail, setNotifyEmail] = useState(false);
  const [notifySiteNotice, setNotifySiteNotice] = useState(false);
  const [questions, setQuestions] = useState<QuestionDraft[]>(
    base?.questions.map((q) => ({
      tempId: q.id,
      questionText: q.questionText,
      questionType: q.questionType,
      required: q.required,
      allowMultiple: q.allowMultiple,
      allowOther: q.allowOther,
      options: q.options.map((o) => ({ tempId: o.id, label: o.label })),
    })) ?? [newQuestionDraft()]
  );
  const [uploadingLight, setUploadingLight] = useState(false);
  const [uploadingDark, setUploadingDark] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const justPublished = published && !wasPublished;

  // Slug automatico dal titolo finché non lo si modifica a mano.
  function handleTitleChange(v: string) {
    setTitle(v);
    if (!slugTouched) setSlug(slugify(v));
  }

  async function handleUpload(variant: "light" | "dark", file: File) {
    const setPending = variant === "light" ? setUploadingLight : setUploadingDark;
    const setUrl = variant === "light" ? setCoverImageLightUrl : setCoverImageDarkUrl;
    setPending(true);
    try {
      const url = await uploadSurveyImage(supabase, slug || "sondaggio", variant, file);
      setUrl(url);
    } catch {
      setError("Caricamento immagine non riuscito.");
    } finally {
      setPending(false);
    }
  }

  async function handleSave() {
    setError("");
    if (!title.trim()) return setError("Indica il titolo del sondaggio.");
    if (!slug.trim()) return setError("Indica lo slug (usato nell'URL).");
    const cleanQuestions = questions.filter((q) => q.questionText.trim());
    if (cleanQuestions.length === 0) return setError("Aggiungi almeno una domanda.");
    if (cleanQuestions.some((q) => q.questionType === "choice" && q.options.filter((o) => o.label.trim()).length === 0)) {
      return setError("Ogni domanda a scelta deve avere almeno un'opzione di risposta.");
    }
    const startsAt = localInputToIso(startsAtInput);
    const endsAt = localInputToIso(endsAtInput);
    if (startsAt && endsAt && endsAt <= startsAt) return setError("La data di fine deve essere dopo la data di inizio.");

    setSaving(true);
    try {
      await onSave(
        {
          id: base?.id,
          slug: slugify(slug),
          title: title.trim(),
          descriptionHtml,
          coverImageLightUrl,
          coverImageDarkUrl,
          coverImageFit,
          published,
          startsAt,
          endsAt,
          archived: base?.archived ?? false,
        },
        cleanQuestions.map((q, i) => ({
          questionText: q.questionText.trim(),
          questionType: q.questionType,
          required: q.required,
          allowMultiple: q.allowMultiple,
          allowOther: q.allowOther,
          position: i,
          options:
            q.questionType === "text"
              ? []
              : q.options.filter((o) => o.label.trim()).map((o, oi) => ({ label: o.label.trim(), position: oi })),
        })),
        justPublished ? { sendEmail: notifyEmail, sendSiteNotice: notifySiteNotice } : null
      );
    } catch {
      setError("Il salvataggio non è riuscito.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal onClose={onClose} width={620}>
      <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: `1px solid ${COLORS.border}` }}>
        <div style={{ fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 600, color: COLORS.heading }}>
          {editing ? "Modifica sondaggio" : "Nuovo sondaggio"}
        </div>
        <button onClick={onClose} className="flex items-center justify-center" style={{ width: 36, height: 36 }}>
          <X size={18} />
        </button>
      </div>

      <div className="p-5 overflow-y-auto" style={{ flex: 1 }}>
        <button
          type="button"
          onClick={() => setPublished((v) => !v)}
          className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium mb-2"
          style={{
            border: `1px solid ${withAlpha(published ? COLORS.success : COLORS.gold, 33)}`,
            color: published ? COLORS.success : COLORS.gold,
            background: withAlpha(published ? COLORS.success : COLORS.gold, 8),
          }}
        >
          {published ? <Eye size={15} /> : <EyeOff size={15} />}
          <span className="flex-1 text-left">{published ? "Pubblicato — visibile a tutti" : "Bozza — visibile solo a te"}</span>
          <span style={{ fontSize: 11, fontWeight: 700, opacity: 0.8 }}>{published ? "Rendi bozza" : "Pubblica"}</span>
        </button>

        {justPublished && (
          <div className="mb-4 p-3 rounded-lg" style={{ background: withAlpha(COLORS.primary, 8), border: `1px solid ${withAlpha(COLORS.primary, 25)}` }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: COLORS.heading }} className="mb-2">
              Avvisa i clienti della pubblicazione?
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="flex items-center gap-2" style={{ fontSize: 12.5, color: COLORS.ink }}>
                <input type="checkbox" checked={notifyEmail} onChange={(e) => setNotifyEmail(e.target.checked)} />
                <Mail size={13} /> Notifica via email
              </label>
              <label className="flex items-center gap-2" style={{ fontSize: 12.5, color: COLORS.ink }}>
                <input type="checkbox" checked={notifySiteNotice} onChange={(e) => setNotifySiteNotice(e.target.checked)} />
                <Bell size={13} /> Notifica via avviso sito
              </label>
            </div>
          </div>
        )}

        <Field label="Titolo sondaggio">
          <input type="text" value={title} onChange={(e) => handleTitleChange(e.target.value)} style={inputStyle} />
        </Field>
        <Field label="Indirizzo pagina">
          <div className="flex items-center gap-1.5">
            <span style={{ fontSize: 12, color: COLORS.inkSoft, whiteSpace: "nowrap" }}>imayoga.app/sondaggi/</span>
            <input
              type="text"
              value={slug}
              onChange={(e) => {
                setSlugTouched(true);
                setSlug(slugify(e.target.value));
              }}
              style={inputStyle}
            />
          </div>
        </Field>
        {editing && slug && (
          <a
            href={`/sondaggi/${slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 mb-3"
            style={{ fontSize: 12, color: COLORS.primaryDark, fontWeight: 600 }}
          >
            <ExternalLink size={12} /> Apri anteprima pagina
          </a>
        )}

        <div className="grid grid-cols-2 gap-3 mb-3 mt-1">
          <ImageUploadField label="Copertina (tema chiaro)" url={coverImageLightUrl} pending={uploadingLight} onUpload={(f) => handleUpload("light", f)} />
          <ImageUploadField label="Copertina (tema scuro)" url={coverImageDarkUrl} pending={uploadingDark} onUpload={(f) => handleUpload("dark", f)} />
        </div>

        <div className="mb-3">
          <Switch
            checked={coverImageFit === "cover"}
            onChange={(v) => setCoverImageFit(v ? "cover" : "contain")}
            label="Copertina sondaggio"
            onText="Ritaglia per riempire"
            offText="Adatta senza tagliare"
          />
        </div>

        <div className="grid grid-cols-2 gap-3 mb-3">
          <Field label="Apertura (facoltativa)">
            <input type="datetime-local" value={startsAtInput} onChange={(e) => setStartsAtInput(e.target.value)} style={inputStyle} />
          </Field>
          <Field label="Chiusura (facoltativa)">
            <input type="datetime-local" value={endsAtInput} onChange={(e) => setEndsAtInput(e.target.value)} style={inputStyle} />
          </Field>
        </div>

        <Field label="Descrizione">
          <RichTextEditor value={descriptionHtml} onChange={setDescriptionHtml} />
        </Field>

        <div className="mt-4 pt-4" style={{ borderTop: `1px solid ${COLORS.border}` }}>
          <SurveyQuestionsEditor questions={questions} onChange={setQuestions} />
        </div>

        {error && (
          <div className="text-sm rounded-lg px-3 py-2 mt-3" style={{ background: withAlpha(COLORS.danger, 14), color: COLORS.danger }}>
            {error}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between px-5 py-4 flex-wrap gap-2.5" style={{ borderTop: `1px solid ${COLORS.border}` }}>
        <div>
          {editing && (
            <button onClick={() => onDelete(base!.id)} className="flex items-center gap-1.5 text-sm font-medium" style={{ color: COLORS.danger }} title="Elimina">
              <Trash2 size={14} /> <span className="hidden sm:inline">Elimina</span>
            </button>
          )}
        </div>
        <div className="flex gap-2 flex-shrink-0 ml-auto">
          <button onClick={onClose} className="px-3.5 py-2 rounded-lg text-sm font-medium" style={{ border: `1px solid ${COLORS.border}` }}>
            Annulla
          </button>
          <button disabled={saving} onClick={handleSave} className="px-3.5 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-60" style={{ background: COLORS.primary }}>
            {saving ? "Salvo…" : "Salva sondaggio"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
