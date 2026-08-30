import type { ReactNode } from "react";
import { Leaf, Sparkles, CalendarDays, Mail, ArrowRight } from "lucide-react";

// Contenuti placeholder: da sostituire con i testi reali di ima yoga.
export type CardSection = {
  id: string;
  label: string;
  icon: ReactNode;
  title: string;
  body: ReactNode;
  href?: string;
  cta?: string;
};

export const CARD_SECTIONS: CardSection[] = [
  {
    id: "cosa",
    label: "Cos'è",
    icon: <Leaf size={26} strokeWidth={1.5} />,
    title: "Cos'è ima yoga",
    body: (
      <>
        <p>
          ima yoga è uno spazio dedicato alla pratica: respiro, movimento consapevole e un po&apos; di silenzio
          ritagliato dalla settimana.
        </p>
        <p>
          Non c&apos;è una scuola unica da seguire alla lettera — si lavora sull&apos;ascolto del corpo e sulla
          costanza, più che sulla performance.
        </p>
      </>
    ),
  },
  {
    id: "corsi",
    label: "Corsi",
    icon: <Sparkles size={26} strokeWidth={1.5} />,
    title: "Corsi e tipologie",
    body: (
      <p>
        Le classi sono organizzate per tipologia e livello, dalle pratiche più dolci a quelle più dinamiche. I
        dettagli di ciascuna (durata, livello, focus) sono nel calendario.
      </p>
    ),
  },
  {
    id: "calendario",
    label: "Calendario",
    icon: <CalendarDays size={26} strokeWidth={1.5} />,
    title: "Calendario",
    body: <p>Le prossime date e il programma delle classi.</p>,
    href: "/calendario",
    cta: "Vai al calendario",
  },
  {
    id: "contatti",
    label: "Contatti",
    icon: <Mail size={26} strokeWidth={1.5} />,
    title: "Contatti",
    body: (
      <p>
        Scrivimi per informazioni su orari, prezzi o per una prima lezione di prova.
        <br />
        <span style={{ opacity: 0.8 }}>info@ima-yoga.it · @ima.yoga</span>
      </p>
    ),
  },
];

export { ArrowRight };
