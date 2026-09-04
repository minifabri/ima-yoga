"use client";

import { useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { AlertTriangle, BellRing, CalendarPlus, CalendarX, Check, UserPlus } from "lucide-react";
import { COLORS, withAlpha } from "./colors";
import type { NotificationItem, NotificationType } from "./types";

export const TYPE_META: Record<NotificationType, { icon: typeof UserPlus; color: string }> = {
  registration: { icon: UserPlus, color: COLORS.primary },
  enrollment: { icon: CalendarPlus, color: COLORS.success },
  cancellation: { icon: CalendarX, color: COLORS.gold },
  issue_report: { icon: AlertTriangle, color: COLORS.danger },
};

export function formatWhen(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  const time = d.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" });
  if (sameDay) return `Oggi, ${time}`;
  return `${d.toLocaleDateString("it-IT", { day: "2-digit", month: "short" })}, ${time}`;
}

export function NotificationsPanel({
  notifications,
  onMarkRead,
  onMarkAllRead,
}: {
  notifications: NotificationItem[];
  onMarkRead: (id: string) => void;
  onMarkAllRead: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [panelStyle, setPanelStyle] = useState<CSSProperties>({});
  const rootRef = useRef<HTMLDivElement>(null);
  const unreadCount = notifications.filter((n) => !n.read).length;

  useLayoutEffect(() => {
    if (!open) return;

    function computePosition() {
      const rect = rootRef.current?.getBoundingClientRect();
      if (!rect) return;
      const isMobile = window.innerWidth < 640;
      if (isMobile) {
        setPanelStyle({
          position: "fixed",
          top: rect.bottom + 8,
          left: 12,
          right: 12,
          width: "auto",
          maxWidth: "none",
        });
      } else {
        setPanelStyle({
          position: "absolute",
          top: "calc(100% + 8px)",
          right: 0,
          width: 340,
          maxWidth: "90vw",
        });
      }
    }

    computePosition();
    window.addEventListener("resize", computePosition);

    function onDocClick(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("resize", computePosition);
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} style={{ position: "relative" }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        title="Notifiche"
        aria-label="Notifiche"
        className="flex items-center justify-center rounded-lg flex-shrink-0 relative"
        style={{ width: 36, height: 36, border: `1px solid ${COLORS.border}`, color: COLORS.ink }}
      >
        <BellRing size={16} />
        {unreadCount > 0 && (
          <span
            className="flex items-center justify-center absolute rounded-full"
            style={{
              top: -5,
              right: -5,
              minWidth: 16,
              height: 16,
              padding: "0 3px",
              fontSize: 10,
              fontWeight: 700,
              lineHeight: 1,
              background: COLORS.danger,
              color: "#fff",
            }}
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          className="overflow-hidden"
          style={{
            ...panelStyle,
            background: COLORS.card,
            border: `1px solid ${COLORS.border}`,
            borderRadius: 14,
            boxShadow: "0 16px 44px rgba(74,58,115,0.20)",
            zIndex: 40,
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div className="flex items-center justify-between px-3.5 py-2.5" style={{ borderBottom: `1px solid ${COLORS.border}` }}>
            <span style={{ fontSize: 13.5, fontWeight: 700, color: COLORS.heading }}>Notifiche</span>
            {unreadCount > 0 && (
              <button
                onClick={onMarkAllRead}
                className="flex items-center gap-1"
                style={{ fontSize: 11.5, fontWeight: 600, color: COLORS.primary }}
              >
                <Check size={12} /> Segna tutte come lette
              </button>
            )}
          </div>

          <div style={{ maxHeight: 400, overflowY: "auto" }}>
            {notifications.length === 0 ? (
              <div style={{ fontSize: 12.5, color: COLORS.inkSoft, padding: "18px 14px", textAlign: "center" }}>
                Nessuna notifica al momento.
              </div>
            ) : (
              notifications.map((n) => {
                const meta = TYPE_META[n.type];
                const Icon = meta.icon;
                return (
                  <button
                    key={n.id}
                    onClick={() => !n.read && onMarkRead(n.id)}
                    className="flex items-start gap-2.5 w-full text-left px-3.5 py-2.5"
                    style={{ borderBottom: `1px solid ${COLORS.border}`, background: n.read ? "transparent" : withAlpha(COLORS.primary, 7) }}
                  >
                    <span
                      className="flex items-center justify-center flex-shrink-0 rounded-full"
                      style={{ width: 26, height: 26, marginTop: 1, background: withAlpha(meta.color, 16), color: meta.color }}
                    >
                      <Icon size={13} />
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span style={{ fontSize: 12.5, fontWeight: 700, color: COLORS.ink }}>{n.title}</span>
                        {!n.read && <span className="flex-shrink-0 rounded-full" style={{ width: 6, height: 6, background: COLORS.primary }} />}
                      </div>
                      <div style={{ fontSize: 12.5, color: COLORS.inkSoft }} className="line-clamp-2">
                        {n.message}
                      </div>
                      <div style={{ fontSize: 10.5, color: COLORS.inkSoft }} className="mt-0.5">
                        {formatWhen(n.createdAt)}
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
