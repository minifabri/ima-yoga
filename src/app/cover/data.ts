import type { ReactNode } from "react";
import {
  ChiSonoIcon,
  LezioniIcon,
  MeditazioneIcon,
  CalendarioIcon,
  ContattiIcon,
  EventiIcon,
} from "./icons";

// Struttura dati delle carte: aggiungere o rimuovere una sezione significa
// aggiungere o rimuovere una voce qui, senza toccare il resto del sito.
// L'ordine dell'array è anche l'ordine visivo nella griglia 3×2 (riga per riga).
export type CardSection = {
  id: string;
  order: number;
  label: string; // testo breve sulla carta nel mazzo
  title: string; // titolo della sezione aperta
  kicker: string; // piccola etichetta sopra il titolo, nella sezione
  Icon: () => ReactNode; // icona al tratto della carta (icons.tsx)
  intro: string;
  paragraphs: string[];
  bullets?: string[];
  cta: { label: string; href: string };
};

export const CARD_SECTIONS: CardSection[] = [
  {
    id: "lezioni",
    order: 0,
    label: "Lezioni",
    title: "Lezioni",
    kicker: "Pratica",
    Icon: LezioniIcon,
    intro: "Lezioni di yoga in piccoli gruppi e individuali.",
    paragraphs: [
      "Pratiche ispirate al Vinyasa, tra movimento, forza e consapevolezza.",
      "Ogni classe ha un focus diverso, per costruire la pratica nel tempo ed esplorarne aspetti e possibilità differenti.",
    ],
    cta: { label: "Scopri le classi", href: "/classi" },
  },
  {
    id: "meditazione",
    order: 1,
    label: "Meditazione",
    title: "Meditazione",
    kicker: "Presenza",
    Icon: MeditazioneIcon,
    intro: "Pratiche guidate per rallentare, ascoltare e tornare al centro.",
    paragraphs: ["Meditazioni guidate, mindfulness e incontri a tema per calmare la mente e aprire il cuore. Torna al centro. Sempre."],
    cta: { label: "Scopri la meditazione", href: "/calendario" },
  },
  {
    id: "calendario",
    order: 2,
    label: "Calendario",
    title: "Calendario",
    kicker: "Prossimi appuntamenti",
    Icon: CalendarioIcon,
    intro: "Scopri gli eventi e le pratiche in programma.",
    paragraphs: ["Lezioni, workshop, meditazioni e ritiri: il calendario completo, sempre aggiornato, con la possibilità di prenotare il tuo posto."],
    cta: { label: "Vai al calendario", href: "/calendario" },
  },
  {
    id: "eventi",
    order: 3,
    label: "Eventi",
    title: "Eventi",
    kicker: "Occasioni speciali",
    Icon: EventiIcon,
    intro: "Incontri speciali, fuori dal calendario abituale.",
    paragraphs: ["Workshop a tema, eventi stagionali e serate speciali: le occasioni per praticare insieme in modo diverso."],
    // Sotto ai testi compare la lista dei prossimi eventi pubblici (CoverEvents);
    // quelli riservati agli iscritti si vedono dopo l'accesso, nel calendario.
    cta: { label: "Accedi per tutti gli eventi", href: "/login?next=/calendario" },
  },
  {
    id: "chi-sono",
    order: 4,
    label: "Chi sono",
    title: "Ciao, sono Fabrizia",
    kicker: "Chi sono",
    Icon: ChiSonoIcon,
    intro: "Insegno yoga attraverso movimento, forza, respiro e consapevolezza.",
    paragraphs: [
      "La mia pratica nasce dal Vinyasa e incontra lo studio della forza e del movimento, senza perdere ciò che mi ha portata allo yoga più di dieci anni fa: la curiosità per quello che accade dentro, oltre la forma delle asana.",
    ],
    cta: { label: "Il mio modo di praticare", href: "/chi-sono" },
  },
  {
    id: "contatti",
    order: 5,
    label: "Contatti",
    title: "Contatti",
    kicker: "Scrivimi",
    Icon: ContattiIcon,
    intro: "Hai domande o vuoi collaborare con me?",
    paragraphs: ["Scrivimi per informazioni su orari e lezioni, o per qualsiasi altra domanda."],
    cta: { label: "Scrivimi", href: "#contatti-form" },
  },
];

// Evento mostrato nella sezione "Eventi" della copertina (RPC cover_events).
// Destinazione dei link "Accedi" della copertina (login, o gestionale in anteprima admin).
export type CoverAccess = { href: string; label: string };

export type CoverEvent = {
  slug: string;
  name: string;
  date: string; // yyyy-mm-dd
  time: string; // HH:mm
  location: string;
  imageLightUrl: string | null;
  imageDarkUrl: string | null;
  bookingsOpen: boolean;
};

// Sequenza "in vetrina" mostrata nella sezione "Lezioni" (RPC cover_sequences):
// solo un'anteprima, il contenuto completo resta per gli iscritti.
export type CoverSequence = {
  id: string;
  name: string;
  description: string;
  typeName: string | null;
  typeColor: string | null;
  poseCount: number;
  thumbnails: string[];
};

export function getSection(id: string | null): CardSection | undefined {
  return CARD_SECTIONS.find((s) => s.id === id);
}

// Dati di contatto — placeholder facilmente sostituibili con quelli reali.
export const CONTACT = {
  email: "blasta.fb@gmail.com",
  instagram: "@ima.yo.ga",
  instagramUrl: "https://instagram.com/ima.yo.ga",
  whatsappUrl: "https://wa.me/393358290919",
  // Link PayPal.Me per le donazioni (es. "https://paypal.me/tuonome").
  // Vuoto = il riquadro "Sostieni Ima Yoga" della copertina resta nascosto.
  paypalUrl: "https://paypal.me/fabriziabinetti",
};
