"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { signInWithGoogle } from "@/app/actions";

const buttonStyle: React.CSSProperties = {
  width: "100%",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
  border: "1px solid var(--border)",
  background: "var(--card)",
  color: "var(--ink)",
};

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 18 18" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.9c1.7-1.57 2.7-3.88 2.7-6.62Z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.9-2.26c-.8.54-1.84.86-3.06.86-2.35 0-4.34-1.59-5.05-3.72H.94v2.33A9 9 0 0 0 9 18Z"
      />
      <path fill="#FBBC05" d="M3.95 10.7A5.4 5.4 0 0 1 3.67 9c0-.59.1-1.17.28-1.7V4.97H.94A9 9 0 0 0 0 9c0 1.45.35 2.83.94 4.03l3.01-2.33Z" />
      <path
        fill="#EA4335"
        d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C12.95.99 11.43.34 9 .34a9 9 0 0 0-8.06 4.97l3.01 2.33C4.66 5.5 6.65 3.58 9 3.58Z"
      />
    </svg>
  );
}

function GoogleForm({ label }: { label: string }) {
  const searchParams = useSearchParams();
  const next = searchParams.get("next");
  return (
    <form action={signInWithGoogle}>
      {next && <input type="hidden" name="next" value={next} />}
      <button type="submit" className="py-2.5 rounded-lg text-sm font-semibold" style={buttonStyle}>
        <GoogleIcon />
        {label}
      </button>
    </form>
  );
}

export function GoogleSignInButton({ label }: { label: string }) {
  return (
    <Suspense
      fallback={
        <button type="button" disabled className="py-2.5 rounded-lg text-sm font-semibold opacity-60" style={buttonStyle}>
          <GoogleIcon />
          {label}
        </button>
      }
    >
      <GoogleForm label={label} />
    </Suspense>
  );
}
