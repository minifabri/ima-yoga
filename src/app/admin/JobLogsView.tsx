"use client";

import { useEffect, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { AlertCircle, CheckCircle2, Clock, XCircle } from "lucide-react";
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

const fmtTime = new Intl.DateTimeFormat("it-IT", {
  timeZone: "Europe/Rome",
  hour: "2-digit",
  minute: "2-digit",
});

const ROME_DATE_KEY = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Rome" }); // yyyy-mm-dd

// Rispecchia la config cron di vercel.json: l'unico job schedulato è
// class-reminders, alle 16:00 UTC (17:00 o 18:00 locali secondo l'ora
// legale). Se in futuro si aggiungono altri cron in vercel.json, vanno
// replicati qui.
const SCHEDULED_JOBS: { jobName: string; label: string; utcHour: number; utcMinute: number }[] = [
  { jobName: "class-reminders", label: "Promemoria lezioni", utcHour: 16, utcMinute: 0 },
];

function nextRun(utcHour: number, utcMinute: number, from: Date): Date {
  const next = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate(), utcHour, utcMinute, 0, 0));
  if (next <= from) {
    next.setUTCDate(next.getUTCDate() + 1);
  }
  return next;
}

function dayLabel(date: Date, from: Date): string {
  if (ROME_DATE_KEY.format(date) === ROME_DATE_KEY.format(from)) return "oggi";
  return "domani";
}

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

      <div className="mb-5 flex flex-col gap-2.5">
        {SCHEDULED_JOBS.map((job) => {
          const now = new Date();
          const next = nextRun(job.utcHour, job.utcMinute, now);
          return (
            <div
              key={job.jobName}
              className="flex items-start gap-3 p-3.5 rounded-xl"
              style={{ background: withAlpha(COLORS.primary, 6), border: `1px solid ${COLORS.border}` }}
            >
              <Clock size={18} style={{ color: COLORS.primary, flexShrink: 0, marginTop: 1 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13.5, fontWeight: 600 }}>{job.label}</div>
                <div style={{ fontSize: 12, color: COLORS.inkSoft }}>
                  Prossima esecuzione: {dayLabel(next, now)} alle {fmtTime.format(next)} · {job.jobName}
                </div>
              </div>
            </div>
          );
        })}
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
