"use client";

import { useEffect, useMemo, useState } from "react";
import { RefreshCw, Search, ShieldCheck, Trash2, User } from "lucide-react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { COLORS, withAlpha } from "./colors";
import { inputStyle } from "./ui";
import { deleteWorkLogEntry, fetchWorkLog } from "./data";
import type { WorkLogEntry } from "./types";

type ActorFilter = "all" | "admin" | "client";

const FILTERS: { key: ActorFilter; label: string }[] = [
  { key: "all", label: "Tutti" },
  { key: "admin", label: "Admin" },
  { key: "client", label: "Clienti" },
];

type ActionFilter = "all" | "bookings" | "cancellations" | "registrations";

const ACTION_FILTERS: { key: ActionFilter; label: string; actions?: string[] }[] = [
  { key: "all", label: "Tutte le azioni" },
  { key: "bookings", label: "Prenotazioni", actions: ["booking_created", "booking_waitlisted", "admin_booking_added", "booking_promoted"] },
  { key: "cancellations", label: "Cancellazioni", actions: ["booking_cancelled", "admin_booking_removed"] },
  { key: "registrations", label: "Registrazioni", actions: ["client_registered", "client_created"] },
];

function formatDateTime(iso: string): { date: string; time: string } {
  const d = new Date(iso);
  return {
    date: d.toLocaleDateString("it-IT", { day: "2-digit", month: "long", year: "numeric" }),
    time: d.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" }),
  };
}

function roleMeta(role: WorkLogEntry["actorRole"]) {
  if (role === "admin") return { label: "Admin", color: COLORS.primary, icon: ShieldCheck };
  if (role === "client") return { label: "Cliente", color: COLORS.gold, icon: User };
  return { label: "Sistema", color: COLORS.inkSoft, icon: User };
}

export function WorklogView({ supabase }: { supabase: SupabaseClient }) {
  const [filter, setFilter] = useState<ActorFilter>("all");
  const [actionFilter, setActionFilter] = useState<ActionFilter>("all");
  const [search, setSearch] = useState("");
  const [entries, setEntries] = useState<WorkLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState(false);

  const selectedActions = ACTION_FILTERS.find((f) => f.key === actionFilter)?.actions;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(false);
      try {
        const { entries: rows, hasMore: more } = await fetchWorkLog(supabase, {
          actorRole: filter === "all" ? undefined : filter,
          actions: selectedActions,
          search,
        });
        if (cancelled) return;
        setEntries(rows);
        setHasMore(more);
      } catch {
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase, filter, actionFilter, search]);

  async function loadMore() {
    setLoadingMore(true);
    try {
      const { entries: more, hasMore: next } = await fetchWorkLog(supabase, {
        actorRole: filter === "all" ? undefined : filter,
        actions: selectedActions,
        search,
        offset: entries.length,
      });
      setEntries((cur) => [...cur, ...more]);
      setHasMore(next);
    } catch {
      // l'utente può ritentare col bottone
    } finally {
      setLoadingMore(false);
    }
  }

  async function deleteEntry(id: string) {
    const prev = entries;
    setEntries((cur) => cur.filter((e) => e.id !== id));
    try {
      await deleteWorkLogEntry(supabase, id);
    } catch {
      setEntries(prev);
    }
  }

  const grouped = useMemo(() => {
    const groups: { label: string; items: WorkLogEntry[] }[] = [];
    for (const entry of entries) {
      const label = formatDateTime(entry.createdAt).date;
      const last = groups[groups.length - 1];
      if (last && last.label === label) last.items.push(entry);
      else groups.push({ label, items: [entry] });
    }
    return groups;
  }, [entries]);

  return (
    <div>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 600, color: COLORS.heading }}>Registro attività</div>
        <div className="flex rounded-lg overflow-hidden" style={{ border: `1px solid ${COLORS.border}` }}>
          {FILTERS.map((opt) => (
            <button
              key={opt.key}
              onClick={() => setFilter(opt.key)}
              className="px-3 py-1.5 text-sm font-medium"
              style={{ background: filter === opt.key ? COLORS.primary : "transparent", color: filter === opt.key ? "#fff" : COLORS.ink }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex rounded-lg overflow-hidden mb-4" style={{ border: `1px solid ${COLORS.border}`, width: "fit-content" }}>
        {ACTION_FILTERS.map((opt) => (
          <button
            key={opt.key}
            onClick={() => setActionFilter(opt.key)}
            className="px-3 py-1.5 text-sm font-medium whitespace-nowrap"
            style={{ background: actionFilter === opt.key ? COLORS.primary : "transparent", color: actionFilter === opt.key ? "#fff" : COLORS.ink }}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <div className="relative mb-4">
        <Search size={13} color={COLORS.inkSoft} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)" }} />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cerca nel registro…"
          style={{ ...inputStyle, paddingLeft: 30, maxWidth: 320 }}
        />
      </div>

      {loading ? (
        <div style={{ fontSize: 13, color: COLORS.inkSoft }}>Caricamento…</div>
      ) : error ? (
        <div style={{ fontSize: 13, color: COLORS.danger }}>Errore nel caricamento del registro.</div>
      ) : entries.length === 0 ? (
        <div style={{ fontSize: 13, color: COLORS.inkSoft }}>Nessuna attività trovata.</div>
      ) : (
        <div className="flex flex-col gap-5">
          {grouped.map((group) => (
            <div key={group.label}>
              <div style={{ fontSize: 11, fontWeight: 700, color: COLORS.inkSoft, textTransform: "capitalize" }} className="mb-1.5">
                {group.label}
              </div>
              <div className="flex flex-col gap-1.5">
                {group.items.map((entry) => {
                  const { time } = formatDateTime(entry.createdAt);
                  const meta = roleMeta(entry.actorRole);
                  const Icon = meta.icon;
                  return (
                    <div
                      key={entry.id}
                      className="flex items-start gap-2.5 px-3 py-2 rounded-lg"
                      style={{ background: COLORS.card, border: `1px solid ${COLORS.border}` }}
                    >
                      <span
                        className="flex items-center justify-center flex-shrink-0 rounded-full"
                        style={{ width: 22, height: 22, marginTop: 1, background: withAlpha(meta.color, 14), color: meta.color }}
                      >
                        <Icon size={12} />
                      </span>
                      <div className="flex-1 min-w-0">
                        <div style={{ fontSize: 13, color: COLORS.ink }}>{entry.description}</div>
                        <div className="flex items-center gap-1.5 mt-0.5" style={{ fontSize: 11, color: COLORS.inkSoft }}>
                          <span>{time}</span>
                          <span>·</span>
                          <span style={{ fontWeight: 600, color: meta.color }}>{meta.label}</span>
                        </div>
                      </div>
                      <button onClick={() => deleteEntry(entry.id)} title="Elimina" style={{ color: COLORS.inkSoft, flexShrink: 0 }}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          {hasMore && (
            <button
              onClick={loadMore}
              disabled={loadingMore}
              className="self-center flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium disabled:opacity-60"
              style={{ border: `1px solid ${COLORS.border}` }}
            >
              <RefreshCw size={13} className={loadingMore ? "animate-spin" : ""} />
              {loadingMore ? "Caricamento…" : "Carica altri"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
