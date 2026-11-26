import { createClient as createServiceClient } from "@supabase/supabase-js";
import { verifyNewsletterUnsubscribeToken, verifyUnsubscribeToken } from "@/lib/unsubscribe";

export const dynamic = "force-dynamic";

// GET mostra solo una conferma (i link nelle email vengono spesso "aperti" da
// antivirus e anteprime: non devono disiscrivere da soli); POST disiscrive
// davvero — è anche la richiesta "one-click" che fanno Gmail e Apple Mail
// tramite l'intestazione List-Unsubscribe (RFC 8058).
// Due liste: ?u=<profilo> per i clienti con account (consenso
// marketing_emails), ?n=<iscritto> per la newsletter senza account.
function page(title: string, body: string, status = 200) {
  const html = `<!doctype html><html lang="it"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${title} — ima yoga</title>
<style>body{margin:0;font-family:Helvetica,Arial,sans-serif;background:#F7F4FB;color:#362D4A;display:flex;min-height:100vh;align-items:center;justify-content:center;padding:20px}
.card{max-width:380px;background:#fff;border:1px solid #E6DFF0;border-radius:16px;padding:24px;text-align:center;line-height:1.5}
h1{font-size:20px;margin:0 0 8px}p{font-size:14px;color:#6B6180}button{margin-top:12px;border:0;border-radius:9px;padding:10px 16px;background:#7A5FB0;color:#fff;font-weight:600;font-size:14px;cursor:pointer}</style>
</head><body><div class="card"><h1>${title}</h1>${body}</div></body></html>`;
  return new Response(html, { status, headers: { "Content-Type": "text/html; charset=utf-8" } });
}

type Target = { kind: "client" | "newsletter"; id: string; t: string };

function params(url: string): Target | null {
  const { searchParams } = new URL(url);
  const u = searchParams.get("u") || "";
  const n = searchParams.get("n") || "";
  const t = searchParams.get("t") || "";
  if (!t) return null;
  if (u && verifyUnsubscribeToken(u, t)) return { kind: "client", id: u, t };
  if (n && verifyNewsletterUnsubscribeToken(n, t)) return { kind: "newsletter", id: n, t };
  return null;
}

export async function GET(request: Request) {
  const target = params(request.url);
  if (!target) return page("Link non valido", "<p>Il link non è valido o è incompleto. Puoi gestire le email dalla tua area, alla voce «Privacy e consensi».</p>", 400);
  const action = `/api/unsubscribe?${target.kind === "client" ? "u" : "n"}=${encodeURIComponent(target.id)}&t=${encodeURIComponent(target.t)}`;
  if (target.kind === "newsletter") {
    return page(
      "Disiscriviti dalla newsletter",
      `<p>Non riceverai più la newsletter di ima yoga.</p><form method="post" action="${action}"><button type="submit">Conferma</button></form>`
    );
  }
  return page(
    "Non ricevere più queste email",
    `<p>Non riceverai più email su nuove classi, eventi e sondaggi. Le email legate alle tue prenotazioni continueranno ad arrivare.</p>
<form method="post" action="${action}"><button type="submit">Conferma</button></form>`
  );
}

export async function POST(request: Request) {
  const target = params(request.url);
  if (!target) return page("Link non valido", "<p>Il link non è valido o è incompleto.</p>", 400);

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) return page("Errore", "<p>Servizio non configurato, scrivici e ti togliamo noi dalla lista.</p>", 500);
  const adminClient = createServiceClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey);
  const now = new Date().toISOString();

  if (target.kind === "newsletter") {
    const { error } = await adminClient
      .from("newsletter_subscribers")
      .update({ status: "unsubscribed", unsubscribed_at: now })
      .eq("id", target.id);
    if (error) return page("Errore", "<p>Non è andata a buon fine, riprova più tardi.</p>", 500);
    return page("Fatto", "<p>Non riceverai più la newsletter. Se cambi idea, puoi iscriverti di nuovo dal sito.</p>");
  }

  const { error } = await adminClient
    .from("profiles")
    .update({ marketing_emails: false, marketing_emails_updated_at: now })
    .eq("id", target.id);
  if (error) return page("Errore", "<p>Non è andata a buon fine, riprova più tardi.</p>", 500);

  return page("Fatto", "<p>Non riceverai più email su nuove classi, eventi e sondaggi. Puoi riattivarle quando vuoi dalla tua area, alla voce «Privacy e consensi».</p>");
}
