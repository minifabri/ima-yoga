import Link from "next/link";
import { Lock } from "lucide-react";
import type { CoverSequence } from "./data";

// Sequenze "in vetrina" (RPC cover_sequences) nella sezione "Sequenze": solo
// un'anteprima (titolo, tipo, numero di posizioni, qualche miniatura). Il
// contenuto completo e il resto del catalogo restano per gli iscritti: il
// clic porta alla registrazione e, dopo, dritto alla sequenza.
export function CoverSequences({ sequences }: { sequences: CoverSequence[] }) {
  if (sequences.length === 0) return null;

  return (
    <div className="cover-sequences-block">
      <p className="cover-sequences-heading">Qualche anteprima</p>
      <ul className="cover-events cover-sequences">
        {sequences.map((s) => {
          const meta = [s.typeName, `${s.poseCount} ${s.poseCount === 1 ? "posizione" : "posizioni"}`].filter(Boolean).join(" · ");
          const next = `/area/sequenze/${s.id}`;
          return (
            <li key={s.id}>
              <Link href={`/signup?next=${encodeURIComponent(next)}`} className="cover-event cover-sequence">
                <span className="cover-sequence-thumbs" aria-hidden="true">
                  {s.thumbnails.length > 0 ? (
                    s.thumbnails.slice(0, 4).map((src) => (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img key={src} src={src} alt="" loading="lazy" className="cover-sequence-thumb" />
                    ))
                  ) : (
                    <span className="cover-sequence-thumb cover-sequence-thumb-empty" />
                  )}
                </span>
                <span className="cover-event-body">
                  <span className="cover-event-name">{s.name}</span>
                  <span className="cover-event-meta">{meta}</span>
                </span>
                <span className="cover-event-arrow" aria-label="Riservata agli iscritti" title="Riservata agli iscritti">
                  <Lock size={16} />
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
      <p className="cover-sequences-note">
        Le sequenze complete sono nell&apos;area riservata.{" "}
        <Link href="/login?next=/area/sequenze">Hai già un account? Accedi</Link>
      </p>
    </div>
  );
}
