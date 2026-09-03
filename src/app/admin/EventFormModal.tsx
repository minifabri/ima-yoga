"use client";

import { useRef, useState } from "react";
import { X, Trash2, Eye, EyeOff, ExternalLink, Lock, LockOpen, Image as ImageIcon } from "lucide-react";
import { Modal, Field, Switch, inputStyle } from "./ui";
import { COLORS, withAlpha } from "./colors";
import { slugify } from "./utils";
import { RichTextEditor } from "./RichTextEditor";
import { uploadEventImage } from "./data";
import { createClient } from "@/lib/supabase/client";
import type { EventItem } from "./types";

type ModalData = { mode: "new" } | { mode: "edit"; event: EventItem };

function ImageUploadField({
  label,
  url,
  pending,
  onUpload,
}: {
  label: string;
  url: string | null;
  pending: boolean;
  onUpload: (file: File) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <Field label={label}>
      <div className="flex items-center gap-2">
        <div
          className="flex items-center justify-center rounded-lg flex-shrink-0 overflow-hidden"
          style={{ width: 56, height: 56, border: `1px solid ${COLORS.border}`, background: COLORS.subtle }}
        >
          {url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          ) : (
            <ImageIcon size={18} color={COLORS.inkSoft} />
          )}
        </div>
        <button
          type="button"
          disabled={pending}
          onClick={() => inputRef.current?.click()}
          className="px-3 py-2 rounded-lg text-xs font-semibold disabled:opacity-60"
          style={{ border: `1px solid ${COLORS.border}`, color: COLORS.primaryDark }}
        >
          {pending ? "Carico…" : url ? "Cambia" : "Carica"}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onUpload(file);
            e.target.value = "";
          }}
        />
      </div>
    </Field>
  );
}

export function EventFormModal({
  data,
  onClose,
  onSave,
  onDelete,
}: {
  data: ModalData;
  onClose: () => void;
  onSave: (event: Omit<EventItem, "id"> & { id?: string }) => Promise<void>;
  onDelete: (id: string) => void;
}) {
  const editing = data.mode === "edit";
  const base = editing ? data.event : null;
  const supabase = useRef(createClient()).current;

  const [name, setName] = useState(base?.name || "");
  const [slug, setSlug] = useState(base?.slug || "");
  const [slugTouched, setSlugTouched] = useState(editing);
  const [descriptionHtml, setDescriptionHtml] = useState(base?.descriptionHtml || "");
  const [imageLightUrl, setImageLightUrl] = useState<string | null>(base?.imageLightUrl || null);
  const [imageDarkUrl, setImageDarkUrl] = useState<string | null>(base?.imageDarkUrl || null);
  const [imageFit, setImageFit] = useState<"contain" | "cover">(base?.imageFit || "contain");
  const [date, setDate] = useState(base?.date || "");
  const [time, setTime] = useState(base?.time || "19:00");
  const [location, setLocation] = useState(base?.location || "");
  const [capacity, setCapacity] = useState<number | string>(base?.capacity ?? 0);
  const [price, setPrice] = useState<number | string>(base?.price ?? 0);
  const [allowPlusOne, setAllowPlusOne] = useState(base?.allowPlusOne ?? true);
  const [bookingsOpen, setBookingsOpen] = useState(base?.bookingsOpen ?? true);
  const [published, setPublished] = useState(base?.published ?? false);
  const [uploadingLight, setUploadingLight] = useState(false);
  const [uploadingDark, setUploadingDark] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function handleNameChange(v: string) {
    setName(v);
    if (!slugTouched) setSlug(slugify(v));
  }

  async function handleUpload(variant: "light" | "dark", file: File) {
    const setPending = variant === "light" ? setUploadingLight : setUploadingDark;
    const setUrl = variant === "light" ? setImageLightUrl : setImageDarkUrl;
    setPending(true);
    try {
      const url = await uploadEventImage(supabase, slug || "evento", variant, file);
      setUrl(url);
    } catch {
      setError("Caricamento immagine non riuscito.");
    } finally {
      setPending(false);
    }
  }

  async function handleSave() {
    setError("");
    if (!name.trim()) return setError("Indica il nome dell'evento.");
    if (!slug.trim()) return setError("Indica lo slug (usato nell'URL).");
    if (!date) return setError("Indica la data dell'evento.");
    setSaving(true);
    try {
      await onSave({
        id: base?.id,
        slug: slugify(slug),
        name: name.trim(),
        descriptionHtml,
        imageLightUrl,
        imageDarkUrl,
        imageFit,
        date,
        time,
        location: location.trim(),
        capacity: Number(capacity) || 0,
        price: Number(price) || 0,
        allowPlusOne,
        bookingsOpen,
        published,
      });
    } catch {
      setError("Il salvataggio non è riuscito.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal onClose={onClose} width={560}>
      <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: `1px solid ${COLORS.border}` }}>
        <div style={{ fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 600, color: COLORS.heading }}>
          {editing ? "Modifica evento" : "Nuovo evento"}
        </div>
        <button onClick={onClose} className="flex items-center justify-center" style={{ width: 36, height: 36 }}>
          <X size={18} />
        </button>
      </div>

      <div className="p-5 overflow-y-auto" style={{ flex: 1 }}>
        <button
          type="button"
          onClick={() => setPublished((v) => !v)}
          className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium mb-4"
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

        <Field label="Nome evento">
          <input type="text" value={name} onChange={(e) => handleNameChange(e.target.value)} style={inputStyle} />
        </Field>
        <Field label="Indirizzo pagina">
          <div className="flex items-center gap-1.5">
            <span style={{ fontSize: 12, color: COLORS.inkSoft, whiteSpace: "nowrap" }}>imayoga.app/eventi/</span>
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
            href={`/eventi/${slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 mb-3"
            style={{ fontSize: 12, color: COLORS.primaryDark, fontWeight: 600 }}
          >
            <ExternalLink size={12} /> Apri anteprima pagina
          </a>
        )}

        <div className="grid grid-cols-2 gap-3 mb-3 mt-1">
          <ImageUploadField label="Immagine (tema chiaro)" url={imageLightUrl} pending={uploadingLight} onUpload={(f) => handleUpload("light", f)} />
          <ImageUploadField label="Immagine (tema scuro)" url={imageDarkUrl} pending={uploadingDark} onUpload={(f) => handleUpload("dark", f)} />
        </div>

        <div className="mb-3">
          <Switch
            checked={imageFit === "cover"}
            onChange={(v) => setImageFit(v ? "cover" : "contain")}
            label="Immagine evento"
            onText="Ritaglia per riempire"
            offText="Adatta senza tagliare"
          />
        </div>

        <div className="grid grid-cols-2 gap-3 mb-3">
          <Field label="Data">
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={inputStyle} />
          </Field>
          <Field label="Orario">
            <input type="time" value={time} onChange={(e) => setTime(e.target.value)} style={inputStyle} />
          </Field>
        </div>

        <Field label="Luogo (facoltativo)">
          <input type="text" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Es. Studio ima yoga" style={inputStyle} />
        </Field>

        <div className="grid grid-cols-2 gap-3 mb-3 mt-1">
          <Field label="Capienza (0 = nessun limite)">
            <input type="number" min={0} value={capacity} onChange={(e) => setCapacity(e.target.value)} style={inputStyle} />
          </Field>
          <Field label="Prezzo a persona (€)">
            <input type="number" min={0} step="0.5" value={price} onChange={(e) => setPrice(e.target.value)} style={inputStyle} />
          </Field>
        </div>

        <div className="mb-3">
          <Switch checked={allowPlusOne} onChange={setAllowPlusOne} label="Consenti ai partecipanti di aggiungere un +1" />
        </div>

        <div className="flex items-center gap-2 mb-4">
          <button
            type="button"
            onClick={() => setBookingsOpen((v) => !v)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium"
            style={{
              border: `1px solid ${withAlpha(bookingsOpen ? COLORS.success : COLORS.danger, 33)}`,
              color: bookingsOpen ? COLORS.success : COLORS.danger,
              background: withAlpha(bookingsOpen ? COLORS.success : COLORS.danger, 8),
            }}
          >
            {bookingsOpen ? <LockOpen size={13} /> : <Lock size={13} />}
            {bookingsOpen ? "Iscrizioni aperte" : "Iscrizioni chiuse"}
          </button>
        </div>

        <Field label="Descrizione">
          <RichTextEditor value={descriptionHtml} onChange={setDescriptionHtml} />
        </Field>

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
            {saving ? "Salvo…" : "Salva evento"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
