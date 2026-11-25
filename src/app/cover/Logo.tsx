import Link from "next/link";
import { LogoMark } from "../admin/Logo";

// Logo della copertina: la mezzaluna dell'area riservata accanto alla scritta
// "ima yoga". Il simbolo è lo stesso componente, così cambia ovunque insieme.
export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/" className="cover-logo" aria-label="ima yoga — home">
      <span className="cover-logo-mark">
        <LogoMark size={compact ? 30 : 38} />
      </span>
      <span className="cover-logo-word">ima yoga</span>
    </Link>
  );
}
