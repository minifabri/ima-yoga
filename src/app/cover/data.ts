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
// L'ordine dell'array è anche l'ordine visivo (colonne, riga, cerchio):
// la prima voce è la carta "in rilievo" al centro nella disposizione a cerchio.
export type CardSection = {
  id: string;
  order: number;
  label: string; // testo breve sulla carta nel mazzo
  title: string; // titolo della sezione aperta
  kicker: string; // piccola etichetta sopra il titolo, nella sezione
  Icon: (props: { size?: number }) => ReactNode; // fallback se l'immagine manca
  image: string; // artwork reale della carta (fornito) — usato sia sul mazzo che nella sezione, tema scuro
  imageLight?: string; // variante per il tema chiaro — se assente, si usa `image` anche lì
  imageWidth: number;
  imageHeight: number;
  imageLightWidth?: number; // se assente, si usano imageWidth/imageHeight anche per la variante chiara
  imageLightHeight?: number;
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
    image: "/cards/lezioni.png",
    imageLight: "/cards/lezioni-light.png",
    imageWidth: 213,
    imageHeight: 391,
    imageLightWidth: 211,
    imageLightHeight: 407,
    intro: "Lezioni di yoga in piccoli gruppi e individuali.",
    paragraphs: [
      "Pratiche ispirate al Vinyasa, tra movimento, forza e consapevolezza.",
      "Ogni classe ha un focus diverso, per costruire la pratica nel tempo ed esplorarne aspetti e possibilità differenti.",
    ],
    cta: { label: "Scopri le classi", href: "/classi" },
  },
  {
    id: "chi-sono",
    order: 1,
    label: "Chi Sono",
    title: "Ciao, sono Fabrizia",
    kicker: "Chi sono",
    Icon: ChiSonoIcon,
    image: "/cards/chi_sono.png",
    imageLight: "/cards/chi_sono-light.png",
    imageWidth: 215,
    imageHeight: 388,
    imageLightWidth: 219,
    imageLightHeight: 409,
    intro: "Insegno yoga attraverso movimento, forza, respiro e consapevolezza.",
    paragraphs: [
      "La mia pratica nasce dal Vinyasa e incontra lo studio della forza e del movimento, senza perdere ciò che mi ha portata allo yoga più di dieci anni fa: la curiosità per quello che accade dentro, oltre la forma delle asana.",
    ],
    cta: { label: "La mia storia", href: "/chi-sono" },
  },
  {
    id: "meditazione",
    order: 2,
    label: "Meditazione",
    title: "Meditazione",
    kicker: "Presenza",
    Icon: MeditazioneIcon,
    image: "/cards/meditazione.png",
    imageLight: "/cards/meditazione-light.png",
    imageWidth: 220,
    imageHeight: 390,
    imageLightWidth: 221,
    imageLightHeight: 408,
    intro: "Pratiche guidate per rallentare, ascoltare e tornare al centro.",
    paragraphs: ["Meditazioni guidate, mindfulness e incontri a tema per calmare la mente e aprire il cuore. Torna al centro. Sempre."],
    cta: { label: "Scopri la meditazione", href: "/calendario" },
  },
  {
    id: "calendario",
    order: 3,
    label: "Calendario",
    title: "Calendario",
    kicker: "Prossimi appuntamenti",
    Icon: CalendarioIcon,
    image: "/cards/calendario.png",
    imageLight: "/cards/calendario-light.png",
    imageWidth: 215,
    imageHeight: 391,
    imageLightWidth: 216,
    imageLightHeight: 410,
    intro: "Scopri gli eventi e le pratiche in programma.",
    paragraphs: ["Lezioni, workshop, meditazioni e ritiri: il calendario completo, sempre aggiornato, con la possibilità di prenotare il tuo posto."],
    cta: { label: "Vai al calendario", href: "/calendario" },
  },
  {
    id: "contatti",
    order: 4,
    label: "Contatti",
    title: "Contatti",
    kicker: "Scrivimi",
    Icon: ContattiIcon,
    image: "/cards/contatti.png",
    imageLight: "/cards/contatti-light.png",
    imageWidth: 216,
    imageHeight: 392,
    imageLightWidth: 214,
    imageLightHeight: 410,
    intro: "Hai domande o vuoi collaborare con me?",
    paragraphs: ["Sono qui per te. Scrivimi per informazioni su orari, prezzi o per prenotare la tua prima lezione di prova."],
    cta: { label: "Scrivimi", href: "#contatti-form" },
  },
  {
    // Testi provvisori: dimmi di cosa si tratta davvero e li aggiorno.
    id: "eventi",
    order: 5,
    label: "Eventi",
    title: "Eventi",
    kicker: "Occasioni speciali",
    Icon: EventiIcon,
    image: "/cards/eventi.png",
    imageLight: "/cards/eventi-light.png",
    imageWidth: 215,
    imageHeight: 391,
    imageLightWidth: 213,
    imageLightHeight: 414,
    intro: "Incontri speciali, fuori dal calendario abituale.",
    paragraphs: ["Workshop a tema, eventi stagionali e serate speciali: le occasioni per praticare insieme in modo diverso."],
    cta: { label: "Scopri gli eventi", href: "/calendario" },
  },
];

export function getSection(id: string | null): CardSection | undefined {
  return CARD_SECTIONS.find((s) => s.id === id);
}

// Dati di contatto — placeholder facilmente sostituibili con quelli reali.
export const CONTACT = {
  email: "hello@imayoga.it",
  instagram: "@ima.yoga.space",
  instagramUrl: "https://instagram.com/ima.yoga.space",
  whatsappUrl: "https://wa.me/390000000000",
};
