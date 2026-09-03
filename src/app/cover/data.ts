import type { ReactNode } from "react";
import {
  ChiSonoIcon,
  LezioniIcon,
  MeditazioneIcon,
  RitiriIcon,
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
    imageWidth: 877,
    imageHeight: 1516,
    intro: "Lezioni di yoga per tutti i livelli, in presenza e online.",
    paragraphs: [
      "Fluide o dinamiche, per rafforzare o per ascoltare: ogni pratica è pensata per ritrovare te stessa, un respiro alla volta.",
    ],
    bullets: ["Yoga Foundation", "Yoga Flow", "Slow Flow", "Ashtanga", "Lezioni individuali", "Piccoli gruppi"],
    cta: { label: "Scopri le lezioni", href: "/calendario" },
  },
  {
    id: "chi-sono",
    order: 1,
    label: "Chi Sono",
    title: "Chi sono",
    kicker: "La mia storia",
    Icon: ChiSonoIcon,
    image: "/cards/chi_sono.png",
    imageLight: "/cards/chi_sono-light.png",
    imageWidth: 877,
    imageHeight: 1516,
    intro: "Mi chiamo Fabrizia.",
    paragraphs: [
      "Sono insegnante di yoga certificata e praticante da oltre dieci anni.",
      "Creo spazi sicuri e accoglienti dove ritrovare equilibrio, ascolto e presenza — attraverso il movimento, il respiro e la pratica.",
    ],
    cta: { label: "La mia storia", href: "#chi-sono" },
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
    imageWidth: 877,
    imageHeight: 1516,
    intro: "Pratiche guidate per rallentare, ascoltare e tornare al centro.",
    paragraphs: ["Meditazioni guidate, mindfulness e incontri a tema per calmare la mente e aprire il cuore. Torna al centro. Sempre."],
    cta: { label: "Scopri la meditazione", href: "/calendario" },
  },
  {
    id: "ritiri",
    order: 3,
    label: "Ritiri",
    title: "Ritiri",
    kicker: "Esperienze",
    Icon: RitiriIcon,
    image: "/cards/ritiri.png",
    imageLight: "/cards/ritiri-light.png",
    imageWidth: 877,
    imageHeight: 1516,
    intro: "Esperienze immersive nella natura per ritrovare te stessa.",
    paragraphs: [
      "Yoga, natura e condivisione, lontano dal caos quotidiano — per rallentare, respirare e riconnetterti con ciò che conta.",
    ],
    cta: { label: "Scopri i ritiri", href: "#contatti" },
  },
  {
    id: "calendario",
    order: 4,
    label: "Calendario",
    title: "Calendario",
    kicker: "Prossimi appuntamenti",
    Icon: CalendarioIcon,
    image: "/cards/calendario.png",
    imageLight: "/cards/calendario-light.png",
    imageWidth: 877,
    imageHeight: 1516,
    intro: "Scopri gli eventi e le pratiche in programma.",
    paragraphs: ["Lezioni, workshop, meditazioni e ritiri: il calendario completo, sempre aggiornato, con la possibilità di prenotare il tuo posto."],
    cta: { label: "Vai al calendario", href: "/calendario" },
  },
  {
    id: "contatti",
    order: 5,
    label: "Contatti",
    title: "Contatti",
    kicker: "Scrivimi",
    Icon: ContattiIcon,
    image: "/cards/contatti.png",
    imageLight: "/cards/contatti-light.png",
    imageWidth: 877,
    imageHeight: 1516,
    intro: "Hai domande o vuoi collaborare con me?",
    paragraphs: ["Sono qui per te. Scrivimi per informazioni su orari, prezzi o per prenotare la tua prima lezione di prova."],
    cta: { label: "Scrivimi", href: "#contatti-form" },
  },
  {
    // Testi provvisori: dimmi di cosa si tratta davvero e li aggiorno.
    id: "eventi",
    order: 6,
    label: "Eventi",
    title: "Eventi",
    kicker: "Occasioni speciali",
    Icon: EventiIcon,
    image: "/cards/eventi.png",
    imageLight: "/cards/eventi-light.png",
    imageWidth: 877,
    imageHeight: 1516,
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
