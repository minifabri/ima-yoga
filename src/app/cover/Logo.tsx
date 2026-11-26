import Link from "next/link";
import { LogoMark } from "../admin/Logo";

// Logo della copertina: la mezzaluna dell'area riservata accanto alla scritta
// "ima yoga". Il simbolo è lo stesso componente, così cambia ovunque insieme.
// Porta sempre alla home; in copertina `onHome` chiude anche la sezione aperta
// e torna in cima (un link a "/" da "/#classi" da solo non farebbe nulla).
export function Logo({
  compact = false,
  href = "/",
  onHome,
}: {
  compact?: boolean;
  href?: string;
  onHome?: () => void;
}) {
  return (
    <Link
      href={href}
      className="cover-logo"
      aria-label="ima yoga — home"
      onClick={
        onHome
          ? (e) => {
              if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
              e.preventDefault();
              onHome();
            }
          : undefined
      }
    >
      <span className="cover-logo-mark">
        <LogoMark size={compact ? 30 : 38} />
      </span>
      <span className="cover-logo-word">ima yoga</span>
    </Link>
  );
}
