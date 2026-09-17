import { COLORS } from "@/app/admin/colors";
import { WEEKDAYS, MONTHS } from "@/app/admin/utils";
import type { PublicClass } from "./types";

export function formatLune(amount: number): string {
  const rounded = Math.round(amount * 100) / 100;
  const label = Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(2);
  return `${label} lune`;
}

export function formatNoticeDate(iso: string): string {
  const d = new Date(iso);
  const opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" };
  if (d.getFullYear() !== new Date().getFullYear()) opts.year = "numeric";
  return d.toLocaleDateString("it-IT", opts);
}

export function isPastClass(dateStr: string, timeStr: string): boolean {
  const dt = new Date(`${dateStr}T${(timeStr || "00:00").padEnd(5, "0")}:00`);
  return dt.getTime() < Date.now();
}

export function availabilityLabel(c: PublicClass): { text: string; color: string } {
  if (c.myStatus === "booked") return { text: "Prenotata", color: COLORS.primaryDark };
  if (c.myStatus === "waitlist") return { text: "In lista d'attesa", color: COLORS.primaryDark };
  if (isPastClass(c.date, c.time)) return { text: "Lezione svolta", color: COLORS.inkSoft };
  if (!c.bookingsOpen) return { text: "Iscrizioni chiuse", color: COLORS.inkSoft };
  if (c.capacity <= 0) return { text: "Posti liberi", color: COLORS.success };
  const remaining = c.capacity - c.bookedCount;
  if (remaining <= 0) return { text: "Al completo", color: COLORS.danger };
  if (remaining === 1) return { text: "Ultimo posto libero", color: COLORS.gold };
  return { text: "Posti liberi", color: COLORS.success };
}

export function typeInitials(name?: string): string {
  if (!name) return "?";
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

export function canStillCancel(dateStr: string, timeStr: string): boolean {
  const dt = new Date(`${dateStr}T${(timeStr || "00:00").padEnd(5, "0")}:00`);
  return dt.getTime() - Date.now() >= 24 * 60 * 60 * 1000;
}

export function errorMessage(err: unknown): string | null {
  if (err && typeof err === "object" && "message" in err && typeof (err as { message: unknown }).message === "string") {
    return (err as { message: string }).message;
  }
  return null;
}

export function formatUpcomingDate(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  return `${WEEKDAYS[(new Date(y, m - 1, d).getDay() + 6) % 7]} ${d}`;
}

export function formatEventDate(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  return `${WEEKDAYS[(new Date(y, m - 1, d).getDay() + 6) % 7]} ${d} ${MONTHS[m - 1].slice(0, 3)}`;
}
