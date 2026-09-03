export const WEEKDAYS = ["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"];
export const MONTHS = [
  "Gennaio",
  "Febbraio",
  "Marzo",
  "Aprile",
  "Maggio",
  "Giugno",
  "Luglio",
  "Agosto",
  "Settembre",
  "Ottobre",
  "Novembre",
  "Dicembre",
];

export const PALETTE = [
  { name: "Viola principale", hex: "#8E72C7" },
  { name: "Viola profondo", hex: "#4A3A73" },
  { name: "Lilla chiaro", hex: "#C9B8E0" },
  { name: "Oro soft", hex: "#D6B36A" },
  { name: "Oro intenso", hex: "#B8923B" },
  { name: "Malva", hex: "#A98CA3" },
  { name: "Corallo tenue", hex: "#C98977" },
  { name: "Blu notte", hex: "#4A5A73" },
  { name: "Blu polvere", hex: "#7C93AA" },
  { name: "Salvia polvere", hex: "#8B9A82" },
  { name: "Terra dorata", hex: "#B08968" },
  { name: "Ardesia", hex: "#6B6B7A" },
];

export function genId(): string {
  return crypto.randomUUID();
}

// Trasforma il nome di un evento nello slug usato nell'URL pubblico
// (imayoga.app/eventi/<slug>): minuscolo, senza accenti né simboli.
export function slugify(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// Prezzo effettivo di una classe: gratuita > prezzo personalizzato > prezzo di default.
export function classEffectivePrice(cls: { isFree: boolean; priceOverride: number | null }, defaultPrice: number): number {
  if (cls.isFree) return 0;
  return cls.priceOverride ?? defaultPrice;
}

export function dateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export function getCalendarDays(viewDate: Date): Date[] {
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const first = new Date(year, month, 1);
  const startOffset = (first.getDay() + 6) % 7; // Monday = 0
  const start = new Date(year, month, 1 - startOffset);
  const days: Date[] = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    days.push(d);
  }
  return days;
}
