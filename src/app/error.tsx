"use client";

import { useEffect } from "react";
import Image from "next/image";
import Link from "next/link";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="flex-1 flex items-center justify-center p-5" style={{ background: "var(--bg)" }}>
      <div
        className="w-full p-6 rounded-2xl text-center"
        style={{ maxWidth: 380, background: "var(--card)", border: "1px solid var(--border)" }}
      >
        <div className="mb-2 flex justify-center">
          <Image
            src="/courtesy/errore-geode.png"
            alt=""
            width={470}
            height={573}
            priority
            className="w-full h-auto"
            style={{ maxWidth: 190 }}
          />
        </div>
        <div style={{ fontFamily: "var(--font-display)", fontSize: 28, fontWeight: 500, color: "var(--heading)" }}>
          Qualcosa si è rotto, ma con stile
        </div>
        <div className="mt-3" style={{ fontSize: 14, color: "var(--ink)" }}>
          Riprova, l&apos;universo di solito si corregge da solo.
        </div>
        <div className="mt-5 flex gap-3 justify-center">
          <button
            type="button"
            onClick={() => reset()}
            className="py-2.5 px-5 rounded-lg text-sm font-semibold text-white"
            style={{ background: "var(--primary)" }}
          >
            Riprova
          </button>
          <Link
            href="/"
            className="py-2.5 px-5 rounded-lg text-sm font-semibold flex items-center"
            style={{ border: "1px solid var(--border)", color: "var(--ink)" }}
          >
            Home
          </Link>
        </div>
      </div>
    </main>
  );
}
