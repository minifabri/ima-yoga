"use client";

import Link from "next/link";
import { PeekEyesIcon } from "@/app/admin/PeekEyesIcon";

export function PeekCalendarLink() {
  return (
    <Link href="/calendario" className="inline-flex items-center gap-1.5" style={{ fontSize: 12, color: "var(--ink-soft)" }}>
      <PeekEyesIcon />
      Sbircia il calendario senza accedere
    </Link>
  );
}
