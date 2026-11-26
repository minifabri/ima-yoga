import { NextResponse } from "next/server";
import { sendNewsletterConfirmationEmail } from "@/lib/notifications";
import { EMAIL_RE, newsletterAdminClient, siteOrigin } from "@/lib/newsletter";

export const dynamic = "force-dynamic";

// Non si rimanda l'email di conferma più di una volta ogni tanto allo stesso
// indirizzo: evita che qualcuno usi il form per tempestare una casella.
const RESEND_AFTER_MS = 10 * 60 * 1000;

// Iscrizione alla newsletter dalla copertina. Risponde sempre allo stesso modo
// ("controlla la posta"), che l'indirizzo sia nuovo, già iscritto o in attesa:
// così il form non rivela chi è iscritto.
export async function POST(request: Request) {
  let body: { email?: unknown; sito?: unknown; source?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Richiesta non valida." }, { status: 400 });
  }

  // Honeypot (vedi NewsletterForm): i bot lo compilano, le persone non lo vedono.
  if (typeof body.sito === "string" && body.sito.trim() !== "") return NextResponse.json({ ok: true });

  const email = typeof body.email === "string" ? body.email.trim() : "";
  const source = typeof body.source === "string" ? body.source.slice(0, 40) : "home";
  if (!email || email.length > 200 || !EMAIL_RE.test(email)) {
    return NextResponse.json({ error: "L'indirizzo email non è valido." }, { status: 400 });
  }

  const db = newsletterAdminClient();
  if (!db) return NextResponse.json({ error: "Iscrizione non disponibile al momento." }, { status: 500 });

  const { data: existing, error: findErr } = await db
    .from("newsletter_subscribers")
    .select("id, status, confirm_token, confirmation_sent_at")
    .eq("email_lower", email.toLowerCase())
    .maybeSingle();
  if (findErr) return NextResponse.json({ error: "Iscrizione non riuscita, riprova più tardi." }, { status: 500 });

  if (existing?.status === "confirmed") return NextResponse.json({ ok: true });

  let token: string;
  if (existing) {
    const lastSent = existing.confirmation_sent_at ? new Date(existing.confirmation_sent_at).getTime() : 0;
    if (existing.status === "pending" && Date.now() - lastSent < RESEND_AFTER_MS) return NextResponse.json({ ok: true });
    const { data: updated, error } = await db
      .from("newsletter_subscribers")
      .update({ status: "pending", source, unsubscribed_at: null, confirm_token: crypto.randomUUID() })
      .eq("id", existing.id)
      .select("confirm_token")
      .single();
    if (error || !updated) return NextResponse.json({ error: "Iscrizione non riuscita, riprova più tardi." }, { status: 500 });
    token = updated.confirm_token;
  } else {
    const { data: inserted, error } = await db
      .from("newsletter_subscribers")
      .insert({ email, source })
      .select("id, confirm_token")
      .single();
    if (error || !inserted) return NextResponse.json({ error: "Iscrizione non riuscita, riprova più tardi." }, { status: 500 });
    token = inserted.confirm_token;
  }

  const confirmUrl = `${siteOrigin(request)}/api/newsletter/confirm?t=${encodeURIComponent(token)}`;
  const sent = await sendNewsletterConfirmationEmail({ to: email, confirmUrl });
  if (!sent) return NextResponse.json({ error: "Non sono riuscita a mandarti l'email di conferma, riprova più tardi." }, { status: 500 });

  await db.from("newsletter_subscribers").update({ confirmation_sent_at: new Date().toISOString() }).eq("confirm_token", token);
  return NextResponse.json({ ok: true });
}
