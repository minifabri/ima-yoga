"use client";

import { useState } from "react";

export function DueVolti() {
  const [open, setOpen] = useState(false);

  return (
    <div className="due-volti">
      <button type="button" className="due-volti-toggle" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
        Perché due volti? <span className="due-volti-toggle-icon" aria-hidden="true">{open ? "–" : "+"}</span>
      </button>

      {open && (
        <div className="due-volti-reveal">
          <p className="cover-overlay-intro">Due mondi, la stessa persona.</p>
          <p className="cover-overlay-paragraph">
            Insegno yoga, ma sono anche un&apos;ingegnera software. Due mondi che possono sembrare molto lontani: da
            una parte il corpo, il respiro, la percezione; dall&apos;altra logica, sistemi e tecnologia.
          </p>
          <p className="cover-overlay-paragraph">
            Ho scelto due volti per raccontare proprio questa convivenza. Non tanto una dualità, quanto due modi
            diversi di osservare, capire e costruire.
          </p>
          <p className="cover-overlay-paragraph">
            In fondo, anche il mio modo di insegnare nasce un po&apos; da qui: mi piace scomporre, capire come
            funzionano le cose e poi rimetterle insieme. Succede con il codice, ma anche quando costruiamo
            un&apos;asana, una sequenza o una pratica.
          </p>
          <p className="cover-overlay-paragraph">E forse non è poi così strano che yoga significhi proprio unione.</p>
        </div>
      )}
    </div>
  );
}
