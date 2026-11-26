import { newsletterAdminClient, simplePage } from "@/lib/newsletter";

export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function tokenFrom(url: string) {
  const t = new URL(url).searchParams.get("t") || "";
  return UUID_RE.test(t) ? t : null;
}

// GET mostra solo il pulsante (i link nelle email vengono aperti anche da
// antivirus e anteprime: non devono confermare da soli); POST conferma.
export async function GET(request: Request) {
  const t = tokenFrom(request.url);
  if (!t) return simplePage("Link non valido", "<p>Il link non è valido o è incompleto. Puoi iscriverti di nuovo dal sito.</p>", 400);
  return simplePage(
    "Conferma l'iscrizione",
    `<p>Riceverai le novità di ima yoga: nuove classi, eventi e sequenze. Puoi disiscriverti quando vuoi da ogni email.</p>
<form method="post" action="/api/newsletter/confirm?t=${encodeURIComponent(t)}"><button type="submit">Conferma</button></form>`
  );
}

export async function POST(request: Request) {
  const t = tokenFrom(request.url);
  if (!t) return simplePage("Link non valido", "<p>Il link non è valido o è incompleto.</p>", 400);

  const db = newsletterAdminClient();
  if (!db) return simplePage("Errore", "<p>Servizio non configurato, riprova più tardi.</p>", 500);

  const { data: sub, error } = await db
    .from("newsletter_subscribers")
    .select("id, email, status")
    .eq("confirm_token", t)
    .maybeSingle();
  if (error) return simplePage("Errore", "<p>Non è andata a buon fine, riprova più tardi.</p>", 500);
  if (!sub) return simplePage("Link scaduto", "<p>Questo link non è più valido. Puoi iscriverti di nuovo dal sito.</p>", 404);

  if (sub.status !== "confirmed") {
    const { error: updErr } = await db
      .from("newsletter_subscribers")
      .update({ status: "confirmed", confirmed_at: new Date().toISOString(), unsubscribed_at: null })
      .eq("id", sub.id);
    if (updErr) return simplePage("Errore", "<p>Non è andata a buon fine, riprova più tardi.</p>", 500);
    await db.rpc("notify_admin", {
      p_type: "newsletter",
      p_title: "Nuova iscrizione alla newsletter",
      p_message: `${sub.email} si è iscritta/o alla newsletter.`,
      p_entity_table: "newsletter_subscribers",
      p_entity_id: sub.id,
    });
  }

  return simplePage("Iscrizione confermata", '<p>Grazie! Ti scriverò quando ci sono novità. <a href="/">Torna al sito</a></p>');
}
