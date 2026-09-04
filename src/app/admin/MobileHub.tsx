"use client";

import { useState } from "react";
import { BellRing, CalendarDays, Check, ChevronDown, ChevronRight } from "lucide-react";
import { COLORS, withAlpha } from "./colors";
import { CapacityBar } from "./ui";
import { TYPE_META, formatWhen } from "./NotificationsPanel";
import type { MoreMenuItem } from "./MoreMenu";
import type { NotificationItem } from "./types";

export type UpcomingClassPreview = {
  id: string;
  date: string; // yyyy-mm-dd
  time: string;
  typeName: string;
  typeColor: string;
  levelName: string;
  capacity: number;
  booked: number;
  waiting: number;
};

function formatClassDate(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const label = new Date(y, m - 1, d).toLocaleDateString("it-IT", { weekday: "short", day: "2-digit", month: "short" });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

// Schermata di ingresso per mobile: al posto del calendario, notifiche e
// prossime lezioni ben visibili in cima (l'admin controlla spesso proprio
// queste due cose per prime), poi le scorciatoie principali come bottoni
// grandi e infine le voci meno usate in un elenco verticale — niente scroll
// orizzontale, che si è rivelato scomodo e poco leggibile su mobile.
export function MobileHub({
  primaryItems,
  secondaryItems,
  onSelect,
  notifications,
  onMarkNotificationRead,
  onMarkAllNotificationsRead,
  upcomingClasses,
  onOpenClassDate,
  onGoToCalendar,
}: {
  primaryItems: MoreMenuItem[];
  secondaryItems: MoreMenuItem[];
  onSelect: (key: string) => void;
  notifications: NotificationItem[];
  onMarkNotificationRead: (id: string) => void;
  onMarkAllNotificationsRead: () => void;
  upcomingClasses: UpcomingClassPreview[];
  onOpenClassDate: (date: string) => void;
  onGoToCalendar: () => void;
}) {
  const unreadCount = notifications.filter((n) => !n.read).length;
  const recentNotifications = notifications.slice(0, 4);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  return (
    <div className="flex flex-col gap-5">
      {recentNotifications.length > 0 && (
        <div className="rounded-2xl overflow-hidden" style={{ background: COLORS.card, border: `1px solid ${COLORS.border}` }}>
          <button
            type="button"
            onClick={() => setNotificationsOpen((o) => !o)}
            className="flex items-center justify-between w-full px-3.5 py-3"
            style={{ borderBottom: notificationsOpen ? `1px solid ${COLORS.border}` : "none" }}
          >
            <div className="flex items-center gap-2">
              <BellRing size={15} color={COLORS.primary} />
              <span style={{ fontSize: 13.5, fontWeight: 700, color: COLORS.heading }}>Notifiche</span>
              {unreadCount > 0 && (
                <span
                  className="flex items-center justify-center rounded-full"
                  style={{ minWidth: 17, height: 17, padding: "0 4px", fontSize: 10, fontWeight: 700, background: COLORS.danger, color: "#fff" }}
                >
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </div>
            <ChevronDown
              size={16}
              color={COLORS.inkSoft}
              style={{ transform: notificationsOpen ? "rotate(180deg)" : "none", transition: "transform .15s" }}
            />
          </button>
          {notificationsOpen && (
            <div>
              {unreadCount > 0 && (
                <div className="flex justify-end px-3.5 py-2" style={{ borderBottom: `1px solid ${COLORS.border}` }}>
                  <button
                    type="button"
                    onClick={onMarkAllNotificationsRead}
                    className="flex items-center gap-1"
                    style={{ fontSize: 11.5, fontWeight: 600, color: COLORS.primary }}
                  >
                    <Check size={12} /> Tutte lette
                  </button>
                </div>
              )}
              {recentNotifications.map((n) => {
                const meta = TYPE_META[n.type];
                const Icon = meta.icon;
                return (
                  <button
                    key={n.id}
                    type="button"
                    onClick={() => !n.read && onMarkNotificationRead(n.id)}
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
              })}
            </div>
          )}
        </div>
      )}

      <div className="rounded-2xl overflow-hidden" style={{ background: COLORS.card, border: `1px solid ${COLORS.border}` }}>
        <button
          type="button"
          onClick={onGoToCalendar}
          className="flex items-center justify-between w-full px-3.5 py-3"
          style={{ borderBottom: upcomingClasses.length > 0 ? `1px solid ${COLORS.border}` : "none" }}
        >
          <div className="flex items-center gap-2">
            <CalendarDays size={15} color={COLORS.primary} />
            <span style={{ fontSize: 13.5, fontWeight: 700, color: COLORS.heading }}>Prossime lezioni</span>
          </div>
          <ChevronRight size={15} color={COLORS.inkSoft} />
        </button>
        {upcomingClasses.length === 0 ? (
          <div style={{ fontSize: 12.5, color: COLORS.inkSoft, padding: "14px" }}>Nessuna lezione in programma.</div>
        ) : (
          upcomingClasses.map((c, i) => (
            <button
              key={c.id}
              type="button"
              onClick={() => onOpenClassDate(c.date)}
              className="flex items-center gap-3 w-full text-left px-3.5 py-2.5"
              style={{ borderBottom: i < upcomingClasses.length - 1 ? `1px solid ${COLORS.border}` : "none" }}
            >
              <div className="flex-shrink-0" style={{ width: 54 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: COLORS.ink }}>{formatClassDate(c.date)}</div>
                <div style={{ fontSize: 11, color: COLORS.inkSoft }}>{c.time}</div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="flex-shrink-0 rounded-full" style={{ width: 8, height: 8, background: c.typeColor }} />
                  <span style={{ fontSize: 12.5, fontWeight: 600, color: COLORS.ink }} className="truncate">
                    {c.typeName}
                    {c.levelName ? ` · ${c.levelName}` : ""}
                  </span>
                </div>
                <div className="mt-1" style={{ maxWidth: 200 }}>
                  <CapacityBar booked={c.booked} capacity={c.capacity} waiting={c.waiting} />
                </div>
              </div>
            </button>
          ))
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        {primaryItems.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => onSelect(item.key)}
              className="flex flex-col items-center justify-center gap-2 rounded-2xl text-center"
              style={{
                background: COLORS.card,
                border: `1px solid ${COLORS.border}`,
                padding: "22px 12px",
                minHeight: 108,
              }}
            >
              <span
                className="flex items-center justify-center rounded-full"
                style={{ width: 44, height: 44, background: withAlpha(COLORS.primary, 12), color: COLORS.primary }}
              >
                <Icon size={22} />
              </span>
              <span style={{ fontSize: 13.5, fontWeight: 600, color: COLORS.ink }}>{item.label}</span>
            </button>
          );
        })}
      </div>

      {secondaryItems.length > 0 && (
        <div>
          <div
            style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", color: COLORS.inkSoft }}
            className="mb-2 px-0.5"
          >
            Altro
          </div>
          <div className="rounded-2xl overflow-hidden" style={{ background: COLORS.card, border: `1px solid ${COLORS.border}` }}>
            {secondaryItems.map((item, i) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => onSelect(item.key)}
                  className="flex items-center gap-3 w-full text-left px-3.5 py-3"
                  style={{ borderBottom: i < secondaryItems.length - 1 ? `1px solid ${COLORS.border}` : "none" }}
                >
                  <span
                    className="flex items-center justify-center rounded-full flex-shrink-0"
                    style={{ width: 32, height: 32, background: withAlpha(COLORS.primary, 10), color: COLORS.primary }}
                  >
                    <Icon size={16} />
                  </span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: COLORS.ink, flex: 1 }}>{item.label}</span>
                  <ChevronRight size={15} color={COLORS.inkSoft} />
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
