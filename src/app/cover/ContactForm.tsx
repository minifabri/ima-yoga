"use client";

import { useState } from "react";

type Status = "idle" | "sending" | "sent" | "error";

// Invia il messaggio all'API route /api/contact, che lo spedisce via email
// (Resend) all'indirizzo dell'insegnante — vedi src/app/api/contact/route.ts.
export function ContactForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  // Honeypot anti-spam: campo tenuto fuori dallo schermo, invisibile a chi
  // naviga normalmente ma spesso compilato dai bot.
  const [azienda, setAzienda] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    setErrorMessage("");

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, message, azienda }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setStatus("error");
        setErrorMessage(data.error || "Invio non riuscito, riprova più tardi.");
        return;
      }

      setStatus("sent");
      setName("");
      setEmail("");
      setMessage("");
    } catch {
      setStatus("error");
      setErrorMessage("Invio non riuscito, controlla la connessione e riprova.");
    }
  }

  if (status === "sent") {
    return <p className="cover-contact-success">Messaggio inviato, grazie! Ti risponderò appena possibile 🤍</p>;
  }

  return (
    <form id="contatti-form" className="cover-contact-form" onSubmit={handleSubmit}>
      <label className="cover-contact-field">
        <span>Nome</span>
        <input type="text" value={name} onChange={(e) => setName(e.target.value)} required />
      </label>
      <label className="cover-contact-field">
        <span>Email</span>
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
      </label>
      <label className="cover-contact-field">
        <span>Messaggio</span>
        <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={3} required />
      </label>
      <label className="cover-contact-field-honeypot" aria-hidden="true">
        <span>Azienda</span>
        <input
          type="text"
          tabIndex={-1}
          autoComplete="off"
          value={azienda}
          onChange={(e) => setAzienda(e.target.value)}
        />
      </label>
      {status === "error" && <p className="cover-contact-error">{errorMessage}</p>}
      <button type="submit" className="cover-cta-ghost" disabled={status === "sending"}>
        {status === "sending" ? "Invio…" : "Scrivimi"} <span aria-hidden="true">✦</span>
      </button>
    </form>
  );
}
