"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Calendar, Clock, MapPin, UserPlus, X, Users, EyeOff, Check, AlertCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { sendEventBookingConfirmationEmail } from "@/lib/notifications";
import { COLORS, withAlpha } from "@/app/admin/colors";
import { Field, inputStyle } from "@/app/admin/ui";
import { ThemeToggle, useTheme } from "@/app/admin/ThemeToggle";
import type { PublicEventData } from "./types";

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

function formatDateLabel(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00`);
  return d.toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

export function EventPublicView({
  event,
  loggedIn,
  isClientProfile,
  clientFullName,
  clientEmail,
}: {
  event: PublicEventData;
  loggedIn: boolean;
  isClientProfile: boolean;
  clientFullName: string;
  clientEmail: string;
}) {
  const supabase = useMemo(() => createClient(), []);
  const theme = useTheme();

  const [myStatus, setMyStatus] = useState(event.myStatus);
  const [myPlusOne, setMyPlusOne] = useState(event.myPlusOne ?? false);
  const [myPlusOneName, setMyPlusOneName] = useState(event.myPlusOneName ?? "");
  const [bookedSeats, setBookedSeats] = useState(event.bookedSeats);
  const [waitlistCount, setWaitlistCount] = useState(event.waitlistCount);

  const [showGuestForm, setShowGuestForm] = useState(false);
  const [plusOne, setPlusOne] = useState(false);
  const [plusOneName, setPlusOneName] = useState("");
  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [guestResult, setGuestResult] = useState<{ status: "booked" | "waitlist"; plusOne: boolean; plusOneName: string } | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const imageUrl = (theme === "dark" ? event.imageDarkUrl : event.imageLightUrl) || event.imageLightUrl || event.imageDarkUrl;

  const capacity = event.capacity;
  const remaining = capacity > 0 ? Math.max(0, capacity - bookedSeats) : null;
  const isFull = capacity > 0 && (remaining ?? 0) <= 0;
  const lowSeats = capacity > 0 && !isFull && remaining !== null && remaining / capacity < 0.2;
  const availabilityLabel = isFull ? "Al completo" : lowSeats ? `Ultimi ${remaining} posti` : "Posti liberi";
  const availabilityColor = isFull ? COLORS.gold : lowSeats ? COLORS.gold : COLORS.success;

  async function handleBookRegistered() {
    setError("");
    if (plusOne && !plusOneName.trim()) return setError("Indica il nome del tuo +1.");
    setSubmitting(true);
    try {
      const { data, error } = await supabase.rpc("book_event", {
        p_event_id: event.id,
        p_plus_one: plusOne,
        p_plus_one_name: plusOne ? plusOneName.trim() : null,
      });
      if (error) throw error;
      const status = data as "booked" | "waitlist";
      setMyStatus(status);
      setMyPlusOne(plusOne);
      setMyPlusOneName(plusOne ? plusOneName.trim() : "");
      if (status === "booked") setBookedSeats((s) => s + (plusOne ? 2 : 1));
      else setWaitlistCount((w) => w + 1);
      sendEventBookingConfirmationEmail({
        to: clientEmail,
        fullName: clientFullName,
        eventName: event.name,
        date: event.date,
        time: event.time,
        status,
        plusOne,
        plusOneName: plusOne ? plusOneName.trim() : null,
        price: event.price,
        isGuest: false,
      }).catch(() => {});
    } catch (e) {
      setError(e instanceof Error ? e.message : "Prenotazione non riuscita.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCancelRegistered() {
    setSubmitting(true);
    try {
      const { error } = await supabase.rpc("cancel_event_booking", { p_event_id: event.id });
      if (error) throw error;
      if (myStatus === "booked") setBookedSeats((s) => Math.max(0, s - (myPlusOne ? 2 : 1)));
      else if (myStatus === "waitlist") setWaitlistCount((w) => Math.max(0, w - 1));
      setMyStatus(null);
    } catch {
      setError("Cancellazione non riuscita.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleBookGuest() {
    setError("");
    if (!guestName.trim()) return setError("Indica nome e cognome.");
    if (!EMAIL_RE.test(guestEmail.trim())) return setError("Indica un indirizzo email valido.");
    if (plusOne && !plusOneName.trim()) return setError("Indica il nome del tuo +1.");
    setSubmitting(true);
    try {
      const { data, error } = await supabase.rpc("book_event_as_guest", {
        p_event_id: event.id,
        p_full_name: guestName.trim(),
        p_email: guestEmail.trim(),
        p_plus_one: plusOne,
        p_plus_one_name: plusOne ? plusOneName.trim() : null,
      });
      if (error) throw error;
      const status = data as "booked" | "waitlist";
      setGuestResult({ status, plusOne, plusOneName: plusOne ? plusOneName.trim() : "" });
      if (status === "booked") setBookedSeats((s) => s + (plusOne ? 2 : 1));
      else setWaitlistCount((w) => w + 1);
      sendEventBookingConfirmationEmail({
        to: guestEmail.trim(),
        fullName: guestName.trim(),
        eventName: event.name,
        date: event.date,
        time: event.time,
        status,
        plusOne,
        plusOneName: plusOne ? plusOneName.trim() : null,
        price: event.price,
        isGuest: true,
      }).catch(() => {});
    } catch (e) {
      setError(e instanceof Error ? e.message : "Prenotazione non riuscita.");
    } finally {
      setSubmitting(false);
    }
  }

  const nextParam = `?next=${encodeURIComponent(`/eventi/${event.slug}`)}`;

  return (
    <main className="flex-1 flex flex-col p-5" style={{ background: COLORS.bg, minHeight: "100vh" }}>
      <div className="w-full mx-auto" style={{ maxWidth: 620 }}>
        <div className="flex items-center justify-between mb-4">
          <Link href="/" className="inline-flex items-center gap-1 text-sm" style={{ color: COLORS.inkSoft }}>
            <ArrowLeft size={15} /> Fai un passo indietro
          </Link>
          <ThemeToggle size={34} />
        </div>

        {!event.published && (
          <div
            className="mb-4 flex items-center gap-1.5 rounded-lg px-3 py-2"
            style={{ fontSize: 12, fontWeight: 600, color: COLORS.gold, background: withAlpha(COLORS.gold, 12), border: `1px solid ${withAlpha(COLORS.gold, 30)}` }}
          >
            <EyeOff size={13} /> Anteprima — questo evento è ancora in bozza, non è visibile pubblicamente.
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
              alt={event.name}
              style={
                event.imageFit === "cover"
                  ? { width: "100%", height: 320, objectFit: "cover", display: "block" }
                  : { maxWidth: "100%", maxHeight: 480, width: "auto", height: "auto", display: "block" }
              }
            />
          </div>
        )}

        <div className="text-center mb-2" style={{ fontFamily: "var(--font-display)", fontSize: 28, fontWeight: 500, color: COLORS.heading }}>
          {event.name}
        </div>
        <div className="flex items-center justify-center gap-3 flex-wrap mb-4" style={{ fontSize: 13.5, color: COLORS.inkSoft }}>
          <span className="inline-flex items-center gap-1">
            <Calendar size={14} /> {formatDateLabel(event.date)}
          </span>
          <span className="inline-flex items-center gap-1">
            <Clock size={14} /> {event.time}
          </span>
          {event.location && (
            <span className="inline-flex items-center gap-1">
              <MapPin size={14} /> {event.location}
            </span>
          )}
        </div>

        <div className="flex items-center justify-center mb-6">
          <span
            className="inline-flex items-center gap-1.5 rounded-full"
            style={{ fontSize: 11.5, fontWeight: 700, color: availabilityColor, background: withAlpha(availabilityColor, 14), padding: "5px 12px" }}
          >
            <Users size={13} /> {availabilityLabel}
            {waitlistCount > 0 && <span style={{ opacity: 0.85 }}>· {waitlistCount} in lista d&apos;attesa</span>}
          </span>
        </div>

        {event.descriptionHtml && (
          <div
            className="mb-7 p-4 rounded-2xl rich-content"
            style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, fontSize: 13.5, color: COLORS.ink, lineHeight: 1.6 }}
            dangerouslySetInnerHTML={{ __html: event.descriptionHtml }}
          />
        )}

        {loggedIn && !isClientProfile ? (
          <div className="p-4 rounded-2xl text-center" style={{ background: COLORS.subtle, fontSize: 13, color: COLORS.inkSoft }}>
            Stai visualizzando questa pagina con un account admin: la prenotazione non è disponibile da qui.
          </div>
        ) : !event.bookingsOpen ? (
          <div className="p-4 rounded-2xl text-center" style={{ background: COLORS.subtle, fontSize: 13.5, color: COLORS.inkSoft }}>
            Le iscrizioni per questo evento sono chiuse.
          </div>
        ) : myStatus ? (
          <div className="p-4 rounded-2xl" style={{ background: COLORS.card, border: `1px solid ${COLORS.border}` }}>
            <div className="flex items-center gap-1.5 mb-1" style={{ fontSize: 14, fontWeight: 700, color: myStatus === "waitlist" ? COLORS.gold : COLORS.success }}>
              <Check size={15} /> {myStatus === "waitlist" ? "Sei in lista d'attesa" : "Prenotazione confermata"}
            </div>
            {myPlusOne && (
              <div style={{ fontSize: 12.5, color: COLORS.inkSoft }} className="mb-2">
                <UserPlus size={12} className="inline mr-1" /> +1: {myPlusOneName}
              </div>
            )}
            <div style={{ fontSize: 12.5, color: COLORS.inkSoft }} className="mb-3">
              Totale: €{(event.price * (myPlusOne ? 2 : 1)).toFixed(2)}
            </div>
            <button
              disabled={submitting}
              onClick={handleCancelRegistered}
              className="flex items-center gap-1.5 text-sm font-semibold px-3 py-2 rounded-lg disabled:opacity-60"
              style={{ color: COLORS.danger, border: `1px solid ${withAlpha(COLORS.danger, 33)}` }}
            >
              <X size={14} /> Cancella prenotazione
            </button>
          </div>
        ) : guestResult ? (
          <div className="p-4 rounded-2xl" style={{ background: COLORS.card, border: `1px solid ${COLORS.border}` }}>
            <div className="flex items-center gap-1.5 mb-1" style={{ fontSize: 14, fontWeight: 700, color: guestResult.status === "waitlist" ? COLORS.gold : COLORS.success }}>
              <Check size={15} /> {guestResult.status === "waitlist" ? "Sei in lista d'attesa" : "Prenotazione confermata"}
            </div>
            <div style={{ fontSize: 12.5, color: COLORS.inkSoft }}>
              Ti abbiamo inviato un&apos;email di conferma a {guestEmail}. Per modificare o cancellare, scrivici direttamente rispondendo a quell&apos;email.
            </div>
          </div>
        ) : loggedIn && isClientProfile ? (
          <div className="p-4 rounded-2xl" style={{ background: COLORS.card, border: `1px solid ${COLORS.border}` }}>
            <div className="flex items-center justify-between mb-3">
              <span style={{ fontSize: 13.5, fontWeight: 600, color: COLORS.heading }}>Prenota il tuo posto</span>
              <span style={{ fontSize: 15, fontWeight: 700, color: COLORS.primaryDark }}>€{event.price.toFixed(2)}</span>
            </div>
            {event.allowPlusOne && (
              <PlusOneFields plusOne={plusOne} setPlusOne={setPlusOne} plusOneName={plusOneName} setPlusOneName={setPlusOneName} />
            )}
            {error && <ErrorBox>{error}</ErrorBox>}
            <button
              disabled={submitting}
              onClick={handleBookRegistered}
              className="w-full mt-3 py-2.5 rounded-lg text-sm font-semibold text-white disabled:opacity-60"
              style={{ background: COLORS.primary }}
            >
              {submitting ? "Confermo…" : `Conferma prenotazione · €${(event.price * (plusOne ? 2 : 1)).toFixed(2)}`}
            </button>
          </div>
        ) : showGuestForm ? (
          <div className="p-4 rounded-2xl" style={{ background: COLORS.card, border: `1px solid ${COLORS.border}` }}>
            <div className="flex items-center justify-between mb-3">
              <span style={{ fontSize: 13.5, fontWeight: 600, color: COLORS.heading }}>Prenota come ospite</span>
              <span style={{ fontSize: 15, fontWeight: 700, color: COLORS.primaryDark }}>€{event.price.toFixed(2)}</span>
            </div>
            <Field label="Nome e cognome">
              <input type="text" value={guestName} onChange={(e) => setGuestName(e.target.value)} style={inputStyle} />
            </Field>
            <Field label="Email">
              <input type="email" value={guestEmail} onChange={(e) => setGuestEmail(e.target.value)} style={inputStyle} />
            </Field>
            {event.allowPlusOne && (
              <PlusOneFields plusOne={plusOne} setPlusOne={setPlusOne} plusOneName={plusOneName} setPlusOneName={setPlusOneName} />
            )}
            {error && <ErrorBox>{error}</ErrorBox>}
            <div className="flex gap-2 mt-3">
              <button onClick={() => setShowGuestForm(false)} className="px-3.5 py-2 rounded-lg text-sm font-medium" style={{ border: `1px solid ${COLORS.border}` }}>
                Indietro
              </button>
              <button
                disabled={submitting}
                onClick={handleBookGuest}
                className="flex-1 py-2.5 rounded-lg text-sm font-semibold text-white disabled:opacity-60"
                style={{ background: COLORS.primary }}
              >
                {submitting ? "Confermo…" : `Conferma prenotazione · €${(event.price * (plusOne ? 2 : 1)).toFixed(2)}`}
              </button>
            </div>
          </div>
        ) : (
          <div className="p-4 rounded-2xl" style={{ background: COLORS.card, border: `1px solid ${COLORS.border}` }}>
            <div style={{ fontSize: 13.5, fontWeight: 600, color: COLORS.heading }} className="mb-3">
              Come vuoi prenotare?
            </div>
            <div className="flex flex-col gap-2">
              <Link
                href={`/login${nextParam}`}
                className="w-full py-2.5 rounded-lg text-sm font-semibold text-white text-center"
                style={{ background: COLORS.primary }}
              >
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
                onClick={() => setShowGuestForm(true)}
                className="w-full py-2.5 rounded-lg text-sm font-medium text-center"
                style={{ color: COLORS.inkSoft }}
              >
                Continua come ospite
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

function PlusOneFields({
  plusOne,
  setPlusOne,
  plusOneName,
  setPlusOneName,
}: {
  plusOne: boolean;
  setPlusOne: (v: boolean) => void;
  plusOneName: string;
  setPlusOneName: (v: string) => void;
}) {
  return (
    <div className="mb-1">
      <button
        type="button"
        onClick={() => setPlusOne(!plusOne)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium mb-2"
        style={{
          border: `1px solid ${plusOne ? COLORS.primary : COLORS.border}`,
          color: plusOne ? COLORS.primaryDark : COLORS.inkSoft,
          background: plusOne ? withAlpha(COLORS.primary, 12) : "transparent",
        }}
      >
        <UserPlus size={13} /> {plusOne ? "Porto un +1" : "Aggiungi un +1"}
      </button>
      {plusOne && (
        <Field label="Nome del tuo +1">
          <input type="text" value={plusOneName} onChange={(e) => setPlusOneName(e.target.value)} style={inputStyle} />
        </Field>
      )}
    </div>
  );
}

function ErrorBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-sm rounded-lg px-3 py-2 mt-2" style={{ background: withAlpha(COLORS.danger, 14), color: COLORS.danger }}>
      <AlertCircle size={13} className="inline mr-1" /> {children}
    </div>
  );
}
