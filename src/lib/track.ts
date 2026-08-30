import type { SupabaseClient } from "@supabase/supabase-js";

const VISITOR_ID_KEY = "ima-yoga-visitor-id";

// Un id anonimo per browser, salvato in localStorage (nessun cookie di
// tracciamento) — serve solo a contare visitatori unici e a collegare una
// pageview del calendario a un'eventuale registrazione successiva.
export function getVisitorId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    let id = localStorage.getItem(VISITOR_ID_KEY);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(VISITOR_ID_KEY, id);
    }
    return id;
  } catch {
    return null;
  }
}

export function trackPageView(supabase: SupabaseClient, path: string) {
  const visitorId = getVisitorId();
  if (!visitorId) return;
  supabase.rpc("track_page_view", { p_path: path, p_visitor_id: visitorId, p_kind: "pageview" }).then(
    () => {},
    () => {}
  );
}
