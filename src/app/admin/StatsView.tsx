"use client";

import { useEffect, useMemo, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { Eye, Users, ArrowRightLeft, UserPlus, RefreshCw } from "lucide-react";
import { COLORS, withAlpha } from "./colors";
import { fetchVisitorStats } from "./data";
import type { VisitorStats } from "./types";

const RANGE_OPTIONS = [
  { key: 7, label: "7 giorni" },
  { key: 30, label: "30 giorni" },
  { key: 90, label: "90 giorni" },
];

const PATH_LABELS: Record<string, string> = {
  "/login": "Accesso",
  "/signup": "Registrazione",
  "/calendario": "Calendario visitatore",
};

function pathLabel(path: string): string {
  return PATH_LABELS[path] || path;
}

function formatDay(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("it-IT", { day: "2-digit", month: "short" });
}

function StatCard({ icon: Icon, label, value, color }: { icon: typeof Eye; label: string; value: string; color: string }) {
  return (
    <div className="p-3.5 rounded-xl" style={{ background: COLORS.card, border: `1px solid ${COLORS.border}` }}>
      <div className="flex items-center gap-1.5 mb-1.5" style={{ fontSize: 11, fontWeight: 600, color: COLORS.inkSoft }}>
        <Icon size={13} color={color} /> {label}
      </div>
      <div style={{ fontFamily: "var(--font-display)", fontSize: 24, fontWeight: 600, color: COLORS.heading }}>{value}</div>
    </div>
  );
}

export function StatsView({ supabase }: { supabase: SupabaseClient }) {
  const [days, setDays] = useState(30);
  const [stats, setStats] = useState<VisitorStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(false);
      try {
        const s = await fetchVisitorStats(supabase, days);
        if (!cancelled) setStats(s);
      } catch {
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [supabase, days]);

  useEffect(() => {
    const interval = setInterval(() => {
      fetchVisitorStats(supabase, days)
        .then(setStats)
        .catch(() => {});
    }, 30000);
    return () => clearInterval(interval);
  }, [supabase, days]);

  async function handleManualRefresh() {
    setRefreshing(true);
    try {
      const s = await fetchVisitorStats(supabase, days);
      setStats(s);
      setError(false);
    } catch {
      setError(true);
    } finally {
      setRefreshing(false);
    }
  }

  const totalPageviews = useMemo(() => (stats?.byPath ?? []).reduce((sum, p) => sum + p.views, 0), [stats]);
  const totalSignups = useMemo(() => (stats?.daily ?? []).reduce((sum, d) => sum + d.signups, 0), [stats]);
  const conversionRate = stats && stats.calendarViewers > 0 ? Math.round((stats.calendarConversions / stats.calendarViewers) * 1000) / 10 : 0;
  const maxByPath = useMemo(() => Math.max(1, ...((stats?.byPath ?? []).map((p) => p.views))), [stats]);
  const maxDaily = useMemo(() => Math.max(1, ...((stats?.daily ?? []).map((d) => d.pageviews))), [stats]);

  return (
    <div>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 600, color: COLORS.heading }}>Statistiche visitatori</div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg overflow-hidden" style={{ border: `1px solid ${COLORS.border}` }}>
            {RANGE_OPTIONS.map((opt) => (
              <button
                key={opt.key}
                onClick={() => setDays(opt.key)}
                className="px-3 py-1.5 text-sm font-medium whitespace-nowrap"
                style={{ background: days === opt.key ? COLORS.primary : "transparent", color: days === opt.key ? "#fff" : COLORS.ink }}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <button
            onClick={handleManualRefresh}
            disabled={refreshing}
            title="Aggiorna statistiche"
            className="flex items-center justify-center p-2 rounded-lg disabled:opacity-60"
            style={{ border: `1px solid ${COLORS.border}` }}
          >
            <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ fontSize: 13, color: COLORS.inkSoft }}>Caricamento…</div>
      ) : error ? (
        <div style={{ fontSize: 13, color: COLORS.danger }}>Errore nel caricamento delle statistiche.</div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-6">
            <StatCard icon={Eye} label="Visualizzazioni totali" value={String(totalPageviews)} color={COLORS.primary} />
            <StatCard icon={Users} label="Visitatori unici" value={String(stats?.uniqueVisitors ?? 0)} color={COLORS.primary} />
            <StatCard icon={ArrowRightLeft} label="Conversione calendario → iscrizione" value={`${conversionRate}%`} color={COLORS.gold} />
            <StatCard icon={UserPlus} label="Nuove registrazioni" value={String(totalSignups)} color={COLORS.success} />
          </div>

          <div className="mb-6">
            <div style={{ fontSize: 13, fontWeight: 600 }} className="mb-2">
              Andamento visualizzazioni
            </div>
            {stats && stats.daily.length > 0 ? (
              <div className="p-3 rounded-xl" style={{ background: COLORS.card, border: `1px solid ${COLORS.border}` }}>
                <div className="flex items-end gap-[3px]" style={{ height: 96 }}>
                  {stats.daily.map((d) => (
                    <div
                      key={d.day}
                      className="flex-1 flex flex-col items-center justify-end"
                      style={{ height: "100%", minWidth: 4 }}
                      title={`${formatDay(d.day)}: ${d.pageviews} visualizzazion${d.pageviews === 1 ? "e" : "i"}${d.signups > 0 ? `, ${d.signups} registrazion${d.signups === 1 ? "e" : "i"}` : ""}`}
                    >
                      {d.signups > 0 && <span style={{ width: 5, height: 5, borderRadius: 999, background: COLORS.gold, marginBottom: 2, flexShrink: 0 }} />}
                      <div
                        style={{
                          width: "100%",
                          height: `${Math.max(3, (d.pageviews / maxDaily) * 100)}%`,
                          background: withAlpha(COLORS.primary, 70),
                          borderRadius: "3px 3px 0 0",
                        }}
                      />
                    </div>
                  ))}
                </div>
                <div className="flex items-center justify-between mt-2" style={{ fontSize: 10.5, color: COLORS.inkSoft }}>
                  <span>{formatDay(stats.daily[0].day)}</span>
                  <span className="flex items-center gap-1">
                    <span style={{ width: 5, height: 5, borderRadius: 999, background: COLORS.gold, display: "inline-block" }} /> giorno con registrazioni
                  </span>
                  <span>{formatDay(stats.daily[stats.daily.length - 1].day)}</span>
                </div>
              </div>
            ) : (
              <div style={{ fontSize: 12.5, color: COLORS.inkSoft }}>Nessun dato in questo periodo.</div>
            )}
          </div>

          <div>
            <div style={{ fontSize: 13, fontWeight: 600 }} className="mb-2">
              Visualizzazioni per pagina
            </div>
            {stats && stats.byPath.length > 0 ? (
              <div className="flex flex-col gap-1.5">
                {stats.byPath.map((p) => (
                  <div key={p.path} className="p-2.5 rounded-lg" style={{ background: COLORS.card, border: `1px solid ${COLORS.border}` }}>
                    <div className="flex items-center justify-between mb-1" style={{ fontSize: 12.5 }}>
                      <span>{pathLabel(p.path)}</span>
                      <span style={{ fontWeight: 700, color: COLORS.primaryDark }}>{p.views}</span>
                    </div>
                    <div style={{ height: 5, borderRadius: 999, background: COLORS.subtle, overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${(p.views / maxByPath) * 100}%`, background: COLORS.primary, borderRadius: 999 }} />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ fontSize: 12.5, color: COLORS.inkSoft }}>Nessuna visualizzazione registrata in questo periodo.</div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
