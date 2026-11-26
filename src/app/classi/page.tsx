import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { InterestCallout } from "../cover/InterestCallout";
import { getSection } from "../cover/data";
import { ClassList } from "../cover/ClassList";
import { SectionCard } from "../cover/SectionCard";
import { Logo } from "../cover/Logo";

export default function ClassiPage() {
  const section = getSection("classi");

  return (
    <div className="static-page cover-theme">
      <div className="cover-overlay-top">
        <Logo />
        <Link href="/#classi" className="static-page-back">
          <ArrowLeft size={15} /> Indietro
        </Link>
      </div>

      <div className="static-page-grid">
        <div className="static-page-visual">{section && <SectionCard section={section} large />}</div>

        <div className="static-page-content">
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

          <ClassList />

          <InterestCallout source="classi" />

          <div className="static-page-closing">
            <Link href="/calendario" className="cover-btn">
              Vai al calendario
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
