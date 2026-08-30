import Link from "next/link";
import { ArrowLeft } from "lucide-react";

// Calendario pubblico in sola lettura (date/programma) — placeholder, dati reali da collegare.
export default function CalendarioPubblicoPage() {
  return (
    <main className="flex-1 flex flex-col items-center p-6" style={{ background: "var(--bg)" }}>
      <div className="w-full flex items-center" style={{ maxWidth: 640 }}>
        <Link href="/" className="inline-flex items-center gap-1 text-sm" style={{ color: "var(--ink-soft)" }}>
          <ArrowLeft size={15} /> Torna alla copertina
        </Link>
      </div>
      <div className="w-full text-center mt-16" style={{ maxWidth: 640 }}>
        <div style={{ fontFamily: "var(--font-display)", fontSize: 28, color: "var(--heading)" }}>Calendario</div>
        <p className="mt-3" style={{ fontSize: 13.5, color: "var(--ink-soft)" }}>
          Qui compariranno le prossime date e il programma delle classi, in sola visualizzazione. La prenotazione
          resta nell&apos;area riservata.
        </p>
      </div>
    </main>
  );
}
