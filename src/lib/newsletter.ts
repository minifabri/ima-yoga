import { createClient as createServiceClient, type SupabaseClient } from "@supabase/supabase-js";

// Client con chiave di servizio per la tabella newsletter_subscribers: da
// browser nessuno la legge o la scrive (RLS), tutto passa dalle rotte /api.
export function newsletterAdminClient(): SupabaseClient | null {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) return null;
  return createServiceClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey);
}

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Pagina HTML minima per conferma e disiscrizione (stesso stile di
// app/api/unsubscribe): i link nelle email aprono una pagina con un pulsante,
// perché antivirus e anteprime "aprono" i link da soli.
export function simplePage(title: string, body: string, status = 200) {
  const html = `<!doctype html><html lang="it"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${title} — ima yoga</title>
<style>body{margin:0;font-family:Helvetica,Arial,sans-serif;background:#F7F4FB;color:#362D4A;display:flex;min-height:100vh;align-items:center;justify-content:center;padding:20px}
.card{max-width:380px;background:#fff;border:1px solid #E6DFF0;border-radius:16px;padding:24px;text-align:center;line-height:1.5}
h1{font-size:20px;margin:0 0 8px}p{font-size:14px;color:#6B6180}a{color:#7A5FB0}button{margin-top:12px;border:0;border-radius:9px;padding:10px 16px;background:#7A5FB0;color:#fff;font-weight:600;font-size:14px;cursor:pointer}</style>
</head><body><div class="card"><h1>${title}</h1>${body}</div></body></html>`;
  return new Response(html, { status, headers: { "Content-Type": "text/html; charset=utf-8" } });
}

export function siteOrigin(request: Request): string {
  return process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin;
}
