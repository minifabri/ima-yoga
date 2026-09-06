import Image from "next/image";

export default function NotFound() {
  return (
    <main className="flex-1 flex items-center justify-center p-5" style={{ background: "var(--bg)" }}>
      <div
        className="w-full p-6 rounded-2xl text-center"
        style={{ maxWidth: 380, background: "var(--card)", border: "1px solid var(--border)" }}
      >
        <div className="mb-2 flex justify-center">
          <Image
            src="/courtesy/404-finestra.png"
            alt=""
            width={426}
            height={640}
            priority
            className="w-full h-auto"
            style={{ maxWidth: 190 }}
          />
        </div>
        <div style={{ fontFamily: "var(--font-display)", fontSize: 28, fontWeight: 500, color: "var(--heading)" }}>
          ima yoga
        </div>
        <div className="mt-3" style={{ fontSize: 14, color: "var(--ink)" }}>
          Ops, questa pagina ha raggiunto il Nirvana prima di te.
        </div>
      </div>
    </main>
  );
}
