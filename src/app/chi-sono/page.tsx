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
          <p className="cover-overlay-kicker">Il mio modo di praticare</p>
          <h1 className="cover-overlay-title">Chi sono</h1>

          <p className="cover-overlay-paragraph">
            La filosofia è stata il mio primo incontro con lo yoga, più di dieci anni fa. La pratica fisica è arrivata
            dopo. Col tempo è diventata un modo per conoscere il corpo, capire dove incontra una resistenza e scoprire
            quali possibilità si aprono quando cambia il modo di muoversi.
          </p>
          <p className="cover-overlay-paragraph">
            Lo studio della forza e il calisthenics hanno dato forma al mio modo di insegnare. Mi interessa la forza per
            ciò che rende possibile: un appoggio più stabile, un passaggio più controllato, più libertà dentro un
            movimento.
          </p>
          <p className="cover-overlay-paragraph">
            Le mie lezioni si ispirano al Vinyasa Flow. Costruisco ogni sequenza intorno a un’intenzione e spesso torno
            sulla stessa asana per più lezioni. Una posizione offre molte cose da studiare. Possiamo cambiare un
            appoggio, lavorare sulla mobilità o soffermarci su una transizione. Il respiro mi accompagna anche nei
            passaggi più intensi e mi aiuta a osservare come cambia il movimento sotto sforzo.
          </p>

          <DueVolti />
        </div>
      </div>
    </div>
  );
}
