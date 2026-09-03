import { Moon } from "lucide-react";

export const metadata = {
  title: "ima yoga — a breve",
};

export default function ManutenzionePage() {
  return (
    <main className="flex-1 flex items-center justify-center p-5" style={{ background: "var(--bg)" }}>
      <div
        className="w-full p-6 rounded-2xl text-center"
        style={{ maxWidth: 380, background: "var(--card)", border: "1px solid var(--border)" }}
      >
        <div className="mb-4 flex justify-center">
          <Moon size={40} style={{ color: "var(--primary)" }} />
        </div>
        <div style={{ fontFamily: "var(--font-display)", fontSize: 28, fontWeight: 500, color: "var(--heading)" }}>
          ima yoga
        </div>
        <div className="mt-3" style={{ fontSize: 14, color: "var(--ink)" }}>
          Stiamo srotolando un nuovo tappetino dietro le quinte.
        </div>
        <div className="mt-1" style={{ fontSize: 12.5, color: "var(--ink-soft)" }}>
          Torna a trovarci tra poco — namasté.
        </div>
      </div>
    </main>
  );
}
