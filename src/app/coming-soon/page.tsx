import Image from "next/image";

export const metadata = {
  title: "ima yoga: presto",
};

export default function ComingSoonPage() {
  return (
    <main className="flex-1 flex items-center justify-center p-5" style={{ background: "var(--bg)" }}>
      <div
        className="w-full p-6 rounded-2xl text-center"
        style={{ maxWidth: 380, background: "var(--card)", border: "1px solid var(--border)" }}
      >
        <div className="mb-2 flex justify-center">
          <Image
            src="/courtesy/coming-soon-sfera.png"
            alt=""
            width={640}
            height={585}
            priority
            className="w-full h-auto"
            style={{ maxWidth: 200 }}
          />
        </div>
        <div style={{ fontFamily: "var(--font-display)", fontSize: 28, fontWeight: 500, color: "var(--heading)" }}>
          ima yoga
        </div>
        <div className="mt-3" style={{ fontSize: 14, color: "var(--ink)" }}>
          La sfera di cristallo vede qualcosa di bello in arrivo.
        </div>
        <div className="mt-1" style={{ fontSize: 12.5, color: "var(--ink-soft)" }}>
          Ancora un po&apos; di pazienza cosmica.
        </div>
      </div>
    </main>
  );
}
