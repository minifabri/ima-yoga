"use client";

import { Suspense, useActionState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { login, type ActionState } from "@/app/actions";
import { createClient } from "@/lib/supabase/client";
import { trackPageView } from "@/lib/track";
import { PeekCalendarLink } from "./PeekCalendarLink";

const initialState: ActionState = { error: null };

function AccountDeletedBanner() {
  const searchParams = useSearchParams();
  if (searchParams.get("account_deleted") !== "1") return null;
  return (
    <div
      className="text-sm rounded-lg px-3 py-2 mb-3"
      style={{ background: "color-mix(in srgb, var(--success) 14%, transparent)", color: "var(--success)" }}
    >
      Il tuo account è stato eliminato. Namasté.
    </div>
  );
}

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(login, initialState);
  const supabase = useMemo(() => createClient(), []);
  useEffect(() => {
    trackPageView(supabase, "/login");
  }, [supabase]);

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
          <div style={{ fontSize: 12.5, color: "var(--ink-soft)" }}>Accedi al tuo account</div>
        </div>

        <Suspense fallback={null}>
          <AccountDeletedBanner />
        </Suspense>

        <form action={formAction} className="flex flex-col gap-3">
          <Field label="Email">
            <input type="email" name="email" required autoComplete="email" style={inputStyle} />
          </Field>
          <Field label="Password">
            <input type="password" name="password" required autoComplete="current-password" style={inputStyle} />
          </Field>
          <div className="text-right -mt-1">
            <Link href="/forgot-password" style={{ fontSize: 11.5, color: "var(--ink-soft)" }}>
              Password dimenticata?
            </Link>
          </div>

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
            {pending ? "Accesso…" : "Accedi"}
          </button>
        </form>

        <div className="mt-4 text-center" style={{ fontSize: 12.5, color: "var(--ink-soft)" }}>
          Non hai un account?{" "}
          <Link href="/signup" style={{ color: "var(--primary-dark)", fontWeight: 600 }}>
            Registrati
          </Link>
        </div>

        <div className="mt-3 pt-3 text-center" style={{ borderTop: "1px solid var(--border)" }}>
          <PeekCalendarLink />
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
