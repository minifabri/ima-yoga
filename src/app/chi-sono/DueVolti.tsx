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
          <p className="cover-overlay-paragraph">
            Insegno yoga e sono un ingegnere del software. I due volti raccontano due aspetti del mio lavoro e
            un’abitudine che riconosco in entrambi: scomporre qualcosa per capire come funziona, poi rimettere insieme
            le parti.
          </p>
          <p className="cover-overlay-paragraph">
            Nel codice seguo il filo di una funzione. In una sequenza osservo come un gesto prepara il successivo. È un
            modo di ragionare che porto con me anche sul tappetino.
          </p>
        </div>
      )}
    </div>
  );
}
