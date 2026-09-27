import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => {
    switch (char) {
      case "&":
        return "&amp;";
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case '"':
        return "&quot;";
      default:
        return "&#39;";
    }
  });
}

export async function POST(request: Request) {
  let body: { name?: unknown; email?: unknown; message?: unknown; azienda?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Richiesta non valida." }, { status: 400 });
  }

  // Honeypot: campo nascosto agli utenti reali (vedi ContactForm), i bot lo
  // compilano spesso. Rispondiamo "ok" senza inviare nulla, per non dargli
  // un segnale utile a distinguere questo caso da un invio riuscito.
  if (typeof body.azienda === "string" && body.azienda.trim() !== "") {
    return NextResponse.json({ ok: true });
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim() : "";
  const message = typeof body.message === "string" ? body.message.trim() : "";

  if (!name || !email || !message) {
    return NextResponse.json({ error: "Compila tutti i campi." }, { status: 400 });
  }
  if (!EMAIL_RE.test(email)) {
    return NextResponse.json({ error: "L'indirizzo email non è valido." }, { status: 400 });
  }
  if (name.length > 200 || email.length > 200 || message.length > 5000) {
    return NextResponse.json({ error: "Testo troppo lungo." }, { status: 400 });
  }

  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.ADMIN_NOTIFICATION_EMAIL;
  if (!apiKey || !to) {
    return NextResponse.json({ error: "Invio email non configurato sul server." }, { status: 500 });
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: process.env.RESEND_FROM_EMAIL || "ima yoga <onboarding@resend.dev>",
        to,
        reply_to: email,
        subject: `Messaggio dal sito — ${name}`,
        html: `
          <div style="font-family:Helvetica,Arial,sans-serif; font-size:14px; color:#362D4A; line-height:1.6;">
            <p><strong>${escapeHtml(name)}</strong> (${escapeHtml(email)}) ha scritto dal form contatti del sito:</p>
            <p style="white-space:pre-wrap;">${escapeHtml(message)}</p>
          </div>
        `,
      }),
    });
    if (!res.ok) {
      return NextResponse.json({ error: "Invio non riuscito, riprova più tardi." }, { status: 502 });
    }
  } catch {
    return NextResponse.json({ error: "Invio non riuscito, riprova più tardi." }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}
