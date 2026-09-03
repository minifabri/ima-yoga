import Link from "next/link";
import { Flower2 } from "lucide-react";

export default function NotFound() {
  return (
    <main className="flex-1 flex items-center justify-center p-5" style={{ background: "var(--bg)" }}>
      <div
        className="w-full p-6 rounded-2xl text-center"
        style={{ maxWidth: 380, background: "var(--card)", border: "1px solid var(--border)" }}
      >
        <div className="mb-4 flex justify-center">
          <Flower2 size={40} style={{ color: "var(--primary)" }} />
        </div>
        <div style={{ fontFamily: "var(--font-display)", fontSize: 28, fontWeight: 500, color: "var(--heading)" }}>
          404
        </div>
        <div className="mt-3" style={{ fontSize: 14, color: "var(--ink)" }}>
          Ops, questa pagina ha raggiunto il Nirvana prima di te.
        </div>
        <div className="mt-1" style={{ fontSize: 12.5, color: "var(--ink-soft)" }}>
          Torna al tappetino: ripartiamo da qui.
        </div>
        <Link
          href="/"
          className="mt-5 inline-block py-2.5 px-6 rounded-lg text-sm font-semibold text-white"
          style={{ background: "var(--primary)" }}
        >
          Torna alla home
        </Link>
      </div>
    </main>
  );
}
