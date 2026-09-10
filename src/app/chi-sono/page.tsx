import Link from "next/link";
import Image from "next/image";
import { ArrowLeft } from "lucide-react";
import { CosmicBackground } from "../cover/CosmicBackground";
import { getSection } from "../cover/data";
import { DueVolti } from "./DueVolti";

export default function ChiSonoPage() {
  const section = getSection("chi-sono");

  return (
    <div className="static-page">
      <CosmicBackground variant="section" />

      <Link href="/#chi-sono" className="static-page-back">
        <ArrowLeft size={15} /> Indietro
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

        <p className="cover-overlay-kicker">La mia storia</p>
        <h1 className="cover-overlay-title">Il mio modo di praticare</h1>

        <p className="cover-overlay-paragraph">
          Mi sono avvicinata allo yoga più di dieci anni fa, e curiosamente non è stato il movimento ad attirarmi per
          primo. È stata la filosofia.
        </p>
        <p className="cover-overlay-paragraph">
          Solo dopo è arrivata la pratica fisica, diventata nel tempo uno spazio di ricerca sempre più importante: un
          modo per conoscere il corpo, osservarne i limiti, costruire possibilità nuove e, soprattutto, imparare ad
          ascoltarlo.
        </p>
        <p className="cover-overlay-paragraph">
          Negli anni il mio percorso ha incontrato anche lo studio della forza e il calisthenics. Da qui nasce una
          parte importante del mio modo di insegnare: credo che la forza non sia qualcosa di separato dallo yoga, ma
          uno degli strumenti che possiamo utilizzare per muoverci con maggiore consapevolezza, controllo e libertà.
        </p>
        <p className="cover-overlay-paragraph">
          Le mie lezioni sono principalmente ispirate al Vinyasa Flow. Mi piace costruire sequenze con
          un&apos;intenzione precisa e spesso lavorare nel tempo intorno a un&apos;asana, non tanto come traguardo da
          raggiungere, quanto come occasione per capire quali strumenti servono per arrivarci: forza, mobilità,
          coordinazione, equilibrio, respiro.
        </p>
        <p className="cover-overlay-paragraph">Ma per me la pratica non finisce nella parte fisica.</p>
        <p className="cover-overlay-paragraph">
          Respiro, meditazione, attenzione e consapevolezza del corpo fanno parte dello stesso percorso. Per questo
          cerco di creare pratiche che tengano insieme questi aspetti: abbastanza fisiche da permetterci di esplorare
          ciò che il corpo può fare, abbastanza lente da permetterci di accorgerci di ciò che sta succedendo mentre lo
          facciamo.
        </p>
        <p className="cover-overlay-paragraph">
          Lo yoga che insegno nasce proprio da questo incontro: movimento e ascolto, forza e morbidezza, ricerca e
          presenza.
        </p>

        <DueVolti />
      </div>
    </div>
  );
}
