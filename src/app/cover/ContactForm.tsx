"use client";

import { useState } from "react";
import { CONTACT } from "./data";

// Form minimale, senza backend: apre il client email del visitatore con i
// campi già compilati. Nessun dato viene inviato da qui.
export function ContactForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const subject = encodeURIComponent(`Messaggio da ${name || "il sito"} — ima yoga`);
    const body = encodeURIComponent(`${message}\n\n— ${name}${email ? ` (${email})` : ""}`);
    window.location.href = `mailto:${CONTACT.email}?subject=${subject}&body=${body}`;
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
      <button type="submit" className="cover-cta-ghost">
        Scrivimi <span aria-hidden="true">✦</span>
      </button>
    </form>
  );
}
