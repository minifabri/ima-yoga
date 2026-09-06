import Link from "next/link";
import Image from "next/image";
import { ArrowLeft } from "lucide-react";
import { CosmicBackground } from "../cover/CosmicBackground";
import { InterestCallout } from "../cover/InterestCallout";
import { getSection } from "../cover/data";

const CLASSES = [
  {
    name: "Yoga Flow",
    description:
      "Una pratica fluida e dinamica in cui respiro e movimento si incontrano. Sequenze costruite intorno a un focus o a un'asana da esplorare e sviluppare nel tempo.",
  },
  {
    name: "Full Strength Flow",
    description:
      "Una pratica più intensa dedicata alla costruzione della forza, con elementi di preparazione fisica funzionali alle asana e al movimento.",
  },
  {
    name: "Flexibility Flow",
    description:
      "Mobilità e flessibilità attiva incontrano il flow. Un lavoro progressivo per ampliare il movimento senza perdere controllo, forza e ascolto.",
  },
  {
    name: "Slow Flow",
    description:
      "Un ritmo più lento, meno transizioni e più tempo dentro le posizioni. Una pratica per sentire, respirare e lasciare spazio alla consapevolezza.",
  },
  {
    name: "Yoga Foundation",
    description:
      "Un percorso dedicato a chi inizia o vuole tornare alle basi. Posizioni fondamentali, respiro e principi del movimento vengono esplorati con calma e progressione.",
  },
  {
    name: "Ashtanga",
    description:
      "Una pratica guidata ispirata alla Prima Serie dell'Ashtanga, per lavorare su continuità, respiro, forza e familiarità con la sequenza.",
  },
];

const MODES = [
  {
    name: "Piccoli gruppi",
    description:
      "Classi con pochi partecipanti, per mantenere l'energia della pratica condivisa senza perdere attenzione e cura individuale.",
  },
  {
    name: "Lezioni individuali",
    description:
      "Una pratica costruita intorno a te, ai tuoi obiettivi e al punto in cui ti trovi, con un percorso e una progressione personalizzati.",
  },
];

export default function ClassiPage() {
  const section = getSection("lezioni");

  return (
    <div className="static-page">
      <CosmicBackground variant="section" />

      <Link href="/#lezioni" className="static-page-back">
        <ArrowLeft size={15} /> Torna alle carte
      </Link>

      <div className="static-page-content">
        {section && (
          <div className="static-page-visual">
            <div
              className="cover-overlay-image-wrap"
              style={{ aspectRatio: `${section.imageWidth} / ${section.imageHeight}`, width: "min(200px, 50vw)" }}
            >
              <Image src={section.image} alt="" fill quality={95} unoptimized sizes="200px" className="cover-overlay-image" />
            </div>
          </div>
        )}

        <p className="cover-overlay-kicker">Pratica</p>
        <h1 className="cover-overlay-title">Una pratica, diversi modi di esplorarla.</h1>
        <p className="cover-overlay-paragraph">
          Le mie lezioni nascono da una base Vinyasa e integrano lavoro su forza, mobilità, respiro e consapevolezza.
        </p>
        <p className="cover-overlay-paragraph">
          Alcune classi sono più dinamiche, altre rallentano. Alcune lavorano sulla flessibilità o sulla forza, altre
          partono da un&apos;asana e costruiscono, passo dopo passo, gli strumenti per esplorarla.
        </p>
        <p className="cover-overlay-paragraph">
          Il filo conduttore rimane lo stesso: conoscere il proprio corpo, sviluppare una pratica solida e lasciare
          spazio anche a ciò che accade oltre la forma.
        </p>

        <h2 className="static-page-section-title">Le classi</h2>
        <div className="class-grid">
          {CLASSES.map((c) => (
            <div key={c.name} className="class-card">
              <h3>{c.name}</h3>
              <p>{c.description}</p>
            </div>
          ))}
        </div>

        <h2 className="static-page-section-title">Come si pratica</h2>
        <div className="practice-modes">
          {MODES.map((m) => (
            <div key={m.name} className="mode-card">
              <h3>{m.name}</h3>
              <p>{m.description}</p>
            </div>
          ))}
        </div>

        <InterestCallout source="classi" />

        <div className="static-page-closing">
          <Link href="/calendario" className="cover-cta-ghost">
            Vai al calendario <span aria-hidden="true">✦</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
