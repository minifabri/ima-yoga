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
            Insegno yoga e sono un&apos;ingegnera software. Corpo e tecnologia, percezione e logica: mondi
            apparentemente lontani che, nel mio modo di essere, finiscono spesso per incontrarsi.
          </p>
          <p className="cover-overlay-paragraph">
            I due volti raccontano proprio questo: non una dualità, ma due modi diversi di osservare, capire e
            costruire.
          </p>
          <p className="cover-overlay-paragraph">
            Forse anche il mio modo di insegnare nasce da qui. Mi piace scomporre, capire come funzionano le cose e
            poi rimetterle insieme. Succede con il codice, ma anche quando costruiamo un&apos;asana, una sequenza o
            un&apos;intera pratica.
          </p>
          <p className="cover-overlay-paragraph">E forse non è poi così strano che yoga significhi proprio unione.</p>
        </div>
      )}
    </div>
  );
}
