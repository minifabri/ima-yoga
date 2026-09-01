import Image from "next/image";
import Link from "next/link";

// Logo ufficiale ima yoga (public/images/ima-logo.svg) + wordmark in serif.
// Non ricreare il simbolo via CSS: è l'asset di brand fornito.
export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/" className="cover-logo" aria-label="ima yoga — home">
      <Image src="/images/ima-logo.svg" alt="" width={34} height={34} priority className="cover-logo-mark" />
      {!compact && (
        <span className="cover-logo-word">
          IMA <span className="cover-logo-word-thin">YOGA</span>
        </span>
      )}
    </Link>
  );
}
