import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getSection } from "../cover/data";
import { SectionCard } from "../cover/SectionCard";
import { Logo } from "../cover/Logo";
import { DueVolti } from "./DueVolti";

export default function ChiSonoPage() {
  const section = getSection("chi-sono");

  return (
    <div className="static-page cover-theme">
      <div className="cover-overlay-top">
        <Logo />
        <Link href="/#chi-sono" className="static-page-back">
          <ArrowLeft size={15} /> Indietro
        </Link>
      </div>

      <div className="static-page-grid">
        <div className="static-page-visual">{section && <SectionCard section={section} large />}</div>

        <div className="static-page-content">
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
            raggiungere, quanto come occasione per capire quali strumenti servono per arrivarci.
          </p>
          <p className="cover-overlay-paragraph">
            In questo lavoro il respiro e l&apos;attenzione restano sempre il punto di riferimento. Anche quando la
            pratica diventa intensa, quello che mi interessa non è semplicemente riuscire a fare qualcosa, ma osservare
            come ci muoviamo, dove troviamo resistenza e cosa cambia quando impariamo a usare il corpo in modo diverso.
          </p>
          <p className="cover-overlay-paragraph">
            È questo il tipo di pratica che cerco di costruire nelle mie lezioni: un luogo in cui sperimentare,
            sviluppare forza e mobilità, ma anche imparare ad ascoltare quello che succede mentre ci muoviamo.
          </p>

          <DueVolti />
        </div>
      </div>
    </div>
  );
}
