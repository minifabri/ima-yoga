"use client";

import { useEffect, useMemo, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { Mail, Trash2 } from "lucide-react";
import { COLORS, withAlpha } from "./colors";
import type { ClientItem } from "./types";

type Subscriber = {
  id: string;
  email: string;
  status: "pending" | "confirmed" | "unsubscribed";
  source: string | null;
  created_at: string;
  confirmed_at: string | null;
  unsubscribed_at: string | null;
};

const STATUS_LABEL: Record<Subscriber["status"], string> = {
  confirmed: "Iscritto",
  pending: "In attesa di conferma",
  unsubscribed: "Disiscritto",
};

const fmtDate = new Intl.DateTimeFormat("it-IT", { timeZone: "Europe/Rome", day: "numeric", month: "short", year: "numeric" });

// Iscritti alla newsletter dalla copertina (tabella newsletter_subscribers).
// Le email automatiche sulle nuove classi arrivano agli iscritti confermati
// e ai clienti con il consenso alle email, senza doppioni.
export function NewsletterView({ supabase, clients, showToast }: { supabase: SupabaseClient; clients: ClientItem[]; showToast: (msg: string) => void }) {
  const [rows, setRows] = useState<Subscriber[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Subscriber["status"] | "all">("confirmed");

  useEffect(() => {
    supabase
      .from("newsletter_subscribers")
      .select("id, email, status, source, created_at, confirmed_at, unsubscribed_at")
      .order("created_at", { ascending: false })
      .then(({ data, error }) => {
        if (error) setError(error.message);
        else setRows((data ?? []) as Subscriber[]);
        setLoading(false);
      });
  }, [supabase]);

  const counts = useMemo(() => {
    const c = { confirmed: 0, pending: 0, unsubscribed: 0 };
    for (const r of rows) c[r.status]++;
    return c;
  }, [rows]);
  const consentingClients = clients.filter((c) => c.marketingEmails && !c.disabled).length;
  const shown = filter === "all" ? rows : rows.filter((r) => r.status === filter);

  async function remove(sub: Subscriber) {
    if (!window.confirm(`Eliminare ${sub.email} dalla lista? Non riceverà più nulla e l'indirizzo viene cancellato.`)) return;
    const { error } = await supabase.from("newsletter_subscribers").delete().eq("id", sub.id);
    if (error) return showToast("Eliminazione non riuscita");
    setRows((prev) => prev.filter((r) => r.id !== sub.id));
    showToast("Indirizzo eliminato");
  }

  const chip = (key: Subscriber["status"] | "all", label: string) => (
    <button
      key={key}
      onClick={() => setFilter(key)}
      className="px-3 py-1.5 rounded-full text-xs font-semibold"
      style={{
        background: filter === key ? COLORS.primary : "transparent",
        color: filter === key ? "#FFF" : COLORS.ink,
        border: `1px solid ${filter === key ? COLORS.primary : COLORS.border}`,
      }}
    >
      {label}
    </button>
  );

  return (
    <div>
      <div style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 600, color: COLORS.heading }} className="mb-1">
        Newsletter
      </div>
      <p className="mb-4" style={{ fontSize: 12.5, color: COLORS.inkSoft, lineHeight: 1.55 }}>
        Chi si iscrive dalla copertina riceve un&apos;email per confermare: finché non conferma resta «in attesa» e non riceve nulla.
        Le email automatiche sulle nuove classi arrivano agli iscritti confermati e ai clienti che hanno dato il consenso, una sola volta per indirizzo.
      </p>

      <div className="grid gap-2.5 mb-5" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))" }}>
        {[
          { label: "Iscritti confermati", value: counts.confirmed },
          { label: "In attesa di conferma", value: counts.pending },
          { label: "Clienti con consenso email", value: consentingClients },
        ].map((s) => (
          <div key={s.label} className="p-3.5 rounded-xl" style={{ background: withAlpha(COLORS.primary, 6), border: `1px solid ${COLORS.border}` }}>
            <div style={{ fontSize: 24, fontWeight: 600, color: COLORS.heading }}>{s.value}</div>
            <div style={{ fontSize: 12, color: COLORS.inkSoft }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-2 mb-3">
        {chip("confirmed", `Iscritti (${counts.confirmed})`)}
        {chip("pending", `In attesa (${counts.pending})`)}
        {chip("unsubscribed", `Disiscritti (${counts.unsubscribed})`)}
        {chip("all", `Tutti (${rows.length})`)}
      </div>

      {error && (
        <div className="mb-3 text-sm rounded-lg px-3 py-2" style={{ background: withAlpha(COLORS.danger, 10), color: COLORS.danger }}>
          {error}
        </div>
      )}

      {loading ? (
        <p style={{ fontSize: 13, color: COLORS.inkSoft }}>Caricamento…</p>
      ) : shown.length === 0 ? (
        <div className="flex items-center gap-2 p-4 rounded-xl" style={{ border: `1px dashed ${COLORS.border}`, color: COLORS.inkSoft, fontSize: 13 }}>
          <Mail size={16} /> Nessun indirizzo qui, per ora.
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {shown.map((r) => {
            const when =
              r.status === "confirmed" && r.confirmed_at
                ? `iscritto il ${fmtDate.format(new Date(r.confirmed_at))}`
                : r.status === "unsubscribed" && r.unsubscribed_at
                  ? `disiscritto il ${fmtDate.format(new Date(r.unsubscribed_at))}`
                  : `richiesta il ${fmtDate.format(new Date(r.created_at))}`;
            return (
              <div key={r.id} className="flex items-center gap-3 p-3 rounded-xl" style={{ border: `1px solid ${COLORS.border}` }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 600, overflowWrap: "anywhere" }}>{r.email}</div>
                  <div style={{ fontSize: 12, color: COLORS.inkSoft }}>
                    {STATUS_LABEL[r.status]} · {when}
                  </div>
                </div>
                <button
                  onClick={() => remove(r)}
                  aria-label={`Elimina ${r.email}`}
                  title="Elimina"
                  className="flex items-center justify-center rounded-lg flex-shrink-0"
                  style={{ width: 36, height: 36, border: `1px solid ${COLORS.border}`, color: COLORS.inkSoft }}
                >
                  <Trash2 size={15} />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
