"use client";

import { useActionState } from "react";
import Link from "next/link";
import { requestPasswordReset, type ForgotPasswordState } from "@/app/actions";

const initialState: ForgotPasswordState = { error: null, sent: false };

export default function ForgotPasswordPage() {
  const [state, formAction, pending] = useActionState(requestPasswordReset, initialState);

  return (
    <main className="flex-1 flex items-center justify-center p-5" style={{ background: "var(--bg)" }}>
      <div
        className="w-full p-6 rounded-2xl"
        style={{ maxWidth: 380, background: "var(--card)", border: "1px solid var(--border)" }}
      >
        <div className="mb-6 text-center">
          <div style={{ fontFamily: "var(--font-display)", fontSize: 28, fontWeight: 500, color: "var(--heading)" }}>ima yoga</div>
          <div style={{ fontSize: 12.5, color: "var(--ink-soft)" }}>Recupera la password</div>
        </div>

        {state.sent ? (
          <div className="text-sm rounded-lg px-3 py-2 text-center" style={{ background: "var(--subtle)", color: "var(--primary-dark)" }}>
            Se l&apos;indirizzo è registrato, riceverai a breve un&apos;email con le istruzioni per reimpostare la password.
          </div>
        ) : (
          <form action={formAction} className="flex flex-col gap-3">
            <label className="block">
              <div style={{ fontSize: 11.5, fontWeight: 600, color: "var(--ink-soft)", marginBottom: 4 }}>Email</div>
              <input
                type="email"
                name="email"
                required
                autoComplete="email"
                style={{
                  width: "100%",
                  border: "1px solid var(--border)",
                  borderRadius: 9,
                  padding: "8px 10px",
                  fontSize: 13,
                  background: "var(--bg)",
                  color: "var(--ink)",
                  outline: "none",
                }}
              />
            </label>

            {state.error && (
              <div className="text-sm rounded-lg px-3 py-2" style={{ background: "color-mix(in srgb, var(--danger) 14%, transparent)", color: "var(--danger)" }}>
                {state.error}
              </div>
            )}

            <button
              type="submit"
              disabled={pending}
              className="mt-1 py-2.5 rounded-lg text-sm font-semibold text-white disabled:opacity-60"
              style={{ background: "var(--primary)" }}
            >
              {pending ? "Invio…" : "Invia istruzioni"}
            </button>
          </form>
        )}

        <div className="mt-4 text-center" style={{ fontSize: 12.5, color: "var(--ink-soft)" }}>
          <Link href="/login" style={{ color: "var(--primary-dark)", fontWeight: 600 }}>
            Torna al login
          </Link>
        </div>
      </div>
    </main>
  );
}
