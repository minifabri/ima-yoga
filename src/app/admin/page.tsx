"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { Calendar as CalendarIcon, Users, Wallet, PiggyBank, Bell, History, BarChart3, Settings as SettingsIcon, Ticket, Calculator, Route, BookOpen } from "lucide-react";
import { COLORS } from "./colors";
import { dateKey } from "./utils";
import { MobileHub, type UpcomingClassPreview } from "./MobileHub";
import type { MoreMenuItem } from "./MoreMenu";
import { CalendarContent } from "./CalendarContent";
import { useAdmin } from "./AdminShell";
import { ADMIN_ROUTE_BY_KEY } from "./routes";

// Voci della hub mobile: le principali come bottoni grandi, le rimanenti
// nella fila scorrevole "Altro" (vedi MobileHub.tsx).
const mobileHubPrimaryItems: MoreMenuItem[] = [
  { key: "calendar", label: "Calendario", icon: CalendarIcon },
  { key: "clients", label: "Clienti", icon: Users },
  { key: "payments", label: "Pagamenti", icon: Wallet },
  { key: "events", label: "Eventi", icon: Ticket },
  { key: "notices", label: "Avvisi", icon: Bell },
  { key: "settings", label: "Impostazioni", icon: SettingsIcon },
];
const mobileHubSecondaryItems: MoreMenuItem[] = [
  { key: "earnings", label: "Guadagni", icon: PiggyBank },
  { key: "tools", label: "Strumenti", icon: Calculator },
  { key: "sequences", label: "Sequenze", icon: Route },
  { key: "pose-catalog", label: "Catalogo", icon: BookOpen },
  { key: "worklog", label: "Registro", icon: History },
  { key: "stats", label: "Statistiche", icon: BarChart3 },
];

export default function AdminHomePage() {
  const router = useRouter();
  const { classes, typeById, levelById, notifications, markNotificationRead, markAllNotificationsRead } = useAdmin();

  const upcomingClasses: UpcomingClassPreview[] = useMemo(() => {
    const todayStr = dateKey(new Date());
    return [...classes]
      .filter((c) => c.date >= todayStr)
      .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time))
      .slice(0, 4)
      .map((c) => ({
        id: c.id,
        date: c.date,
        time: c.time,
        typeName: typeById[c.typeId]?.name || "Classe",
        typeColor: typeById[c.typeId]?.color || COLORS.primary,
        levelName: levelById[c.levelId]?.name || "",
        capacity: c.capacity,
        booked: c.clientIds.length,
        waiting: c.waitlistIds.length,
      }));
  }, [classes, typeById, levelById]);

  return (
    <>
      <div className="hidden md:block">
        <CalendarContent />
      </div>
      <div className="md:hidden">
        <MobileHub
          primaryItems={mobileHubPrimaryItems}
          secondaryItems={mobileHubSecondaryItems}
          onSelect={(key) => router.push(ADMIN_ROUTE_BY_KEY[key])}
          notifications={notifications}
          onMarkNotificationRead={markNotificationRead}
          onMarkAllNotificationsRead={markAllNotificationsRead}
          upcomingClasses={upcomingClasses}
          onOpenClassDate={(dateStr) => router.push(`/admin/calendario?data=${dateStr}`)}
          onGoToCalendar={() => router.push("/admin/calendario")}
        />
      </div>
    </>
  );
}
