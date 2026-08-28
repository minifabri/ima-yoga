"use client";

import { useActionState } from "react";
import Link from "next/link";
import { signup, type ActionState } from "@/app/actions";

const initialState: ActionState = { error: null };

export default function SignupPage() {
  const [state, formAction, pending] = useActionState(signup, initialState);

  return (
    <main className="flex-1 flex items-center justify-center p-5" style={{ background: "var(--bg)" }}>
      <div
        className="w-full p-6 rounded-2xl"
        style={{ maxWidth: 380, background: "var(--card)", border: "1px solid var(--border)" }}
      >
        <div className="mb-6 text-center">
          <div
            style={{ fontFamily: "var(--font-display)", fontSize: 28, fontWeight: 500, color: "var(--heading)" }}
          >
            ima yoga
          </div>
          <div style={{ fontSize: 12.5, color: "var(--ink-soft)" }}>Crea il tuo account</div>
        </div>

        <form action={formAction} className="flex flex-col gap-3">
          <Field label="Nome e cognome">
            <input type="text" name="full_name" required autoComplete="name" style={inputStyle} />
          </Field>
          <Field label="Telefono (facoltativo)">
            <input type="tel" name="phone" autoComplete="tel" style={inputStyle} />
          </Field>
          <Field label="Email">
            <input type="email" name="email" required autoComplete="email" style={inputStyle} />
          </Field>
          <Field label="Password">
            <input
              type="password"
              name="password"
              required
              minLength={6}
              autoComplete="new-password"
              style={inputStyle}
            />
          </Field>

          {state.error && (
            <div className="text-sm rounded-lg px-3 py-2" style={{ background: "#F6E7E2", color: "var(--danger)" }}>
              {state.error}
            </div>
          )}

          <button
            type="submit"
            disabled={pending}
            className="mt-1 py-2.5 rounded-lg text-sm font-semibold text-white disabled:opacity-60"
            style={{ background: "var(--primary)" }}
          >
            {pending ? "Creazione account…" : "Registrati"}
          </button>
        </form>

        <div className="mt-4 text-center" style={{ fontSize: 12.5, color: "var(--ink-soft)" }}>
          Hai già un account?{" "}
          <Link href="/login" style={{ color: "var(--primary-dark)", fontWeight: 600 }}>
            Accedi
          </Link>
        </div>
      </div>
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div style={{ fontSize: 11.5, fontWeight: 600, color: "var(--ink-soft)", marginBottom: 4 }}>{label}</div>
      {children}
    </label>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  border: "1px solid var(--border)",
  borderRadius: 9,
  padding: "8px 10px",
  fontSize: 13,
  background: "var(--bg)",
  color: "var(--ink)",
  outline: "none",
};
