"use client";

import { useEffect, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { AlertCircle, CheckCircle2, XCircle } from "lucide-react";
import { COLORS, withAlpha } from "./colors";
import { fetchCronJobLogs } from "./data";
import type { CronJobLog } from "./types";

const fmtDateTime = new Intl.DateTimeFormat("it-IT", {
  timeZone: "Europe/Rome",
  day: "numeric",
  month: "long",
  hour: "2-digit",
  minute: "2-digit",
});

export function JobLogsView({ supabase }: { supabase: SupabaseClient }) {
  const [logs, setLogs] = useState<CronJobLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    fetchCronJobLogs(supabase)
      .then(setLogs)
      .catch(() => setLoadError(true))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div>
      <div style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 600, color: COLORS.heading }} className="mb-4">
        Log automazioni
      </div>

      <div className="mb-4" style={{ fontSize: 12.5, color: COLORS.inkSoft }}>
        Storico delle esecuzioni dei job automatici (es. promemoria lezione), con l&apos;esito di ognuna. Resta qui
        anche quando i log di Vercel sono già scaduti.
      </div>

      {loadError && (
        <div className="mb-4 flex items-center gap-2 text-sm rounded-lg px-3 py-2" style={{ background: withAlpha(COLORS.danger, 10), color: COLORS.danger }}>
          <AlertCircle size={15} /> Errore nel caricamento dei log.
        </div>
      )}

      {loading ? (
        <div style={{ fontSize: 13, color: COLORS.inkSoft }}>Caricamento…</div>
      ) : logs.length === 0 ? (
        <div className="flex flex-col items-center justify-center text-center py-14" style={{ color: COLORS.inkSoft }}>
          <div style={{ fontSize: 13.5 }}>Nessuna esecuzione registrata finora.</div>
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {logs.map((log) => {
            const ok = log.status === "ok";
            return (
              <div
                key={log.id}
                className="flex items-start gap-3 p-3.5 rounded-xl"
                style={{ background: COLORS.card, border: `1px solid ${COLORS.border}` }}
              >
                {ok ? (
                  <CheckCircle2 size={18} style={{ color: COLORS.success, flexShrink: 0, marginTop: 1 }} />
                ) : (
                  <XCircle size={18} style={{ color: COLORS.danger, flexShrink: 0, marginTop: 1 }} />
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="flex items-center gap-1.5 flex-wrap" style={{ fontSize: 13.5, fontWeight: 600 }}>
                    {log.jobName}
                    <span style={{ fontSize: 11.5, fontWeight: 400, color: COLORS.inkSoft }}>
                      · {fmtDateTime.format(new Date(log.startedAt))}
                    </span>
                  </div>
                  {ok ? (
                    <div style={{ fontSize: 12, color: COLORS.inkSoft }}>
                      {log.sent ?? 0} {log.sent === 1 ? "inviato" : "inviati"} · {log.skipped ?? 0}{" "}
                      {log.skipped === 1 ? "saltato" : "saltati"}
                    </div>
                  ) : (
                    <div style={{ fontSize: 12, color: COLORS.danger }}>{log.error || "Errore non specificato."}</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
