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

// Scambia i riferimenti di lato (dx/sx, destra/sinistra...) in un testo, per
// la "duplica specchiando" delle sezioni sequenza. Un solo passaggio di regex
// con mappa nel callback: evita il bug classico del doppio scambio (dx->sx
// seguito da un secondo replace che risostituisce sx->dx).
const SIDE_SWAP_MAP: Record<string, string> = {
  dx: "sx",
  sx: "dx",
  destra: "sinistra",
  sinistra: "destra",
  destro: "sinistro",
  sinistro: "destro",
};

export function swapSides(text: string): string {
  return text.replace(/\b(dx|sx|destra|sinistra|destro|sinistro)\b/gi, (match) => {
    const replaced = SIDE_SWAP_MAP[match.toLowerCase()];
    if (!replaced) return match;
    if (match === match.toUpperCase()) return replaced.toUpperCase();
    if (match[0] === match[0].toUpperCase()) return replaced[0].toUpperCase() + replaced.slice(1);
    return replaced;
  });
}

export function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

// Una classe è "passata" quando data+ora sono già trascorse rispetto ad
// adesso: usato per attenuarne la visualizzazione nei calendari, senza
// impedirne la modifica.
export function isPastClass(dateStr: string, timeStr: string): boolean {
  const dt = new Date(`${dateStr}T${(timeStr || "00:00").padEnd(5, "0")}:00`);
  return dt.getTime() < Date.now();
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

// Le lezioni non si pagano in denaro vero: gli importi sono espressi in "lune".
export function formatLune(amount: number): string {
  const rounded = Math.round(amount * 100) / 100;
  const label = Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(2);
  return `${label} lune`;
}

export function formatLuneRounded(amount: number): string {
  return formatLune(Math.round(amount));
}

// Quanto resta da pagare per una prenotazione (0 se saldata, coperta da
// pacchetto o regalata).
export function owedAmount(pay: { status: string; amount: number; price: number }): number {
  if (pay.status !== "unpaid" && pay.status !== "partial") return 0;
  return Math.max(0, (pay.price || 0) - (pay.amount || 0));
}

// Giorni interi trascorsi dalla data di una lezione (0 = oggi).
export function daysSince(dateStr: string): number {
  const [y, m, d] = dateStr.split("-").map(Number);
  const then = new Date(y, m - 1, d).getTime();
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  return Math.max(0, Math.round((today - then) / 86400000));
}

// Pagamenti arretrati: lezioni già svolte che risultano ancora da saldare.
export function overdueClassPayments(
  classes: { date: string; time: string; payments: Record<string, { status: string; amount: number; price: number }> }[]
): { clientCount: number; total: number } {
  const clients = new Set<string>();
  let total = 0;
  for (const c of classes) {
    if (!isPastClass(c.date, c.time)) continue;
    for (const [clientId, pay] of Object.entries(c.payments || {})) {
      const owed = owedAmount(pay);
      if (owed > 0) {
        clients.add(clientId);
        total += owed;
      }
    }
  }
  return { clientCount: clients.size, total };
}
