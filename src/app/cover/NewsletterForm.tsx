"use client";

import { useState } from "react";
import Link from "next/link";

type Status = "idle" | "sending" | "sent" | "error";

// Iscrizione alla newsletter (vedi app/api/newsletter/subscribe): si lascia
// solo l'email, poi arriva un'email per confermare (doppio opt-in).
export function NewsletterForm({ source = "home" }: { source?: string }) {
  const [email, setEmail] = useState("");
  // Honeypot anti-spam, come nel form contatti: invisibile alle persone.
  const [sito, setSito] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    setErrorMessage("");
    try {
      const res = await fetch("/api/newsletter/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, sito, source }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setStatus("error");
        setErrorMessage(data.error || "Iscrizione non riuscita, riprova più tardi.");
        return;
      }
      setStatus("sent");
    } catch {
      setStatus("error");
      setErrorMessage("Iscrizione non riuscita, controlla la connessione e riprova.");
    }
  }

  return (
    <div className="newsletter" id="newsletter">
      <h2 className="newsletter-title">Resta in contatto</h2>
      <p className="newsletter-text">
        Nuove classi in calendario, eventi e sequenze: ti scrivo quando c&apos;è qualcosa di nuovo, niente di più.
      </p>

      {status === "sent" ? (
        <p className="newsletter-sent" role="status">
          Quasi fatto: ti ho mandato un&apos;email, clicca sul link per confermare l&apos;iscrizione.
        </p>
      ) : (
        <form className="newsletter-form" onSubmit={handleSubmit} noValidate={false}>
          <label className="newsletter-label" htmlFor="newsletter-email">
            La tua email
          </label>
          <div className="newsletter-row">
            <input
              id="newsletter-email"
              type="email"
              required
              autoComplete="email"
              placeholder="nome@esempio.it"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              maxLength={200}
            />
            <button type="submit" className="cover-btn" disabled={status === "sending"}>
              {status === "sending" ? "Invio…" : "Iscriviti"}
            </button>
          </div>
          <label className="cover-contact-field-honeypot" aria-hidden="true">
            Sito
            <input tabIndex={-1} autoComplete="off" value={sito} onChange={(e) => setSito(e.target.value)} />
          </label>
          {status === "error" && (
            <p className="newsletter-error" role="alert">
              {errorMessage}
            </p>
          )}
          <p className="newsletter-privacy">
            Puoi disiscriverti quando vuoi da ogni email. Leggi l&apos;<Link href="/privacy">informativa privacy</Link>.
          </p>
        </form>
      )}
    </div>
  );
}
