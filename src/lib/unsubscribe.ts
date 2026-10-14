import { createHmac, timingSafeEqual } from "node:crypto";

// Link "non ricevere più queste email" senza login: l'id del profilo firmato
// con un segreto del server, così nessuno può disiscrivere altri a caso.
// UNSUBSCRIBE_SECRET è facoltativa: senza, si usa la chiave di servizio
// Supabase (anch'essa solo lato server).
function secret(): string | null {
  return process.env.UNSUBSCRIBE_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || null;
}

export function unsubscribeToken(profileId: string): string | null {
  const s = secret();
  if (!s) return null;
  return createHmac("sha256", s).update(`unsubscribe:${profileId}`).digest("base64url");
}

export function verifyUnsubscribeToken(profileId: string, token: string): boolean {
  const expected = unsubscribeToken(profileId);
  if (!expected) return false;
  const a = Buffer.from(expected);
  const b = Buffer.from(token);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function unsubscribeUrl(origin: string, profileId: string): string | null {
  const token = unsubscribeToken(profileId);
  if (!token) return null;
  return `${origin}/api/unsubscribe?u=${encodeURIComponent(profileId)}&t=${encodeURIComponent(token)}`;
}
