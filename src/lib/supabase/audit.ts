import { headers } from "next/headers";
import type { SupabaseClient } from "@supabase/supabase-js";

async function getRequestInfo() {
  const hdrs = await headers();
  const forwardedFor = hdrs.get("x-forwarded-for");
  const ip = forwardedFor?.split(",")[0]?.trim() || hdrs.get("x-real-ip") || null;
  const userAgent = hdrs.get("user-agent");
  return { ip, userAgent };
}

// Registra un evento di autenticazione (login, logout, registrazione, reset
// password...) nel registro attività admin. Chiamabile anche senza sessione
// (es. tentativo di login fallito), perché risolve l'attore dall'email.
export async function logAuthEvent(
  supabase: SupabaseClient,
  action: string,
  email: string | null,
  description: string
) {
  const { ip, userAgent } = await getRequestInfo();
  try {
    await supabase.rpc("log_auth_event", {
      p_action: action,
      p_email: email,
      p_description: description,
      p_ip: ip,
      p_user_agent: userAgent,
    });
  } catch {
    // l'audit log non deve mai bloccare l'operazione principale
  }
}

// Registra un'azione amministrativa non legata a un'operazione diretta su
// una riga (es. reset password di un cliente, reinvio email di attivazione).
// L'attore è sempre risolto lato DB dalla sessione admin corrente.
export async function logAdminAction(
  supabase: SupabaseClient,
  action: string,
  entityTable: string,
  entityId: string | null,
  description: string
) {
  try {
    await supabase.rpc("log_admin_action", {
      p_action: action,
      p_entity_table: entityTable,
      p_entity_id: entityId,
      p_description: description,
    });
  } catch {
    // l'audit log non deve mai bloccare l'operazione principale
  }
}
