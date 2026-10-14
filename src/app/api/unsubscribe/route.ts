import { createClient as createServiceClient } from "@supabase/supabase-js";
import { verifyUnsubscribeToken } from "@/lib/unsubscribe";

export const dynamic = "force-dynamic";

// GET mostra solo una conferma (i link nelle email vengono spesso "aperti" da
// antivirus e anteprime: non devono disiscrivere da soli); POST disiscrive
// davvero — è anche la richiesta "one-click" che fanno Gmail e Apple Mail
// tramite l'intestazione List-Unsubscribe (RFC 8058).
function page(title: string, body: string, status = 200) {
  const html = `<!doctype html><html lang="it"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${title} — ima yoga</title>
<style>body{margin:0;font-family:Helvetica,Arial,sans-serif;background:#F7F4FB;color:#362D4A;display:flex;min-height:100vh;align-items:center;justify-content:center;padding:20px}
.card{max-width:380px;background:#fff;border:1px solid #E6DFF0;border-radius:16px;padding:24px;text-align:center;line-height:1.5}
h1{font-size:20px;margin:0 0 8px}p{font-size:14px;color:#6B6180}button{margin-top:12px;border:0;border-radius:9px;padding:10px 16px;background:#7A5FB0;color:#fff;font-weight:600;font-size:14px;cursor:pointer}</style>
</head><body><div class="card"><h1>${title}</h1>${body}</div></body></html>`;
  return new Response(html, { status, headers: { "Content-Type": "text/html; charset=utf-8" } });
}

function params(url: string) {
  const { searchParams } = new URL(url);
  const u = searchParams.get("u") || "";
  const t = searchParams.get("t") || "";
  return { u, t, valid: !!u && !!t && verifyUnsubscribeToken(u, t) };
}

export async function GET(request: Request) {
  const { u, t, valid } = params(request.url);
  if (!valid) return page("Link non valido", "<p>Il link non è valido o è incompleto. Puoi gestire le email dalla tua area, alla voce «Privacy e consensi».</p>", 400);
  return page(
    "Non ricevere più queste email",
    `<p>Non riceverai più email su nuovi eventi e sondaggi. Le email legate alle tue prenotazioni continueranno ad arrivare.</p>
<form method="post" action="/api/unsubscribe?u=${encodeURIComponent(u)}&t=${encodeURIComponent(t)}"><button type="submit">Conferma</button></form>`
  );
}

export async function POST(request: Request) {
  const { u, valid } = params(request.url);
  if (!valid) return page("Link non valido", "<p>Il link non è valido o è incompleto.</p>", 400);

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) return page("Errore", "<p>Servizio non configurato, scrivici e ti togliamo noi dalla lista.</p>", 500);
  const adminClient = createServiceClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey);
  const { error } = await adminClient
    .from("profiles")
    .update({ marketing_emails: false, marketing_emails_updated_at: new Date().toISOString() })
    .eq("id", u);
  if (error) return page("Errore", "<p>Non è andata a buon fine, riprova più tardi.</p>", 500);

  return page("Fatto", "<p>Non riceverai più email su eventi e sondaggi. Puoi riattivarle quando vuoi dalla tua area, alla voce «Privacy e consensi».</p>");
}
