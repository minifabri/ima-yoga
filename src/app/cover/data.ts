import type { ReactNode } from "react";
import { ChiSonoIcon, LezioniIcon, MeditazioneIcon, SequenzeIcon, ContattiIcon, EventiIcon } from "./icons";

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
    id: "classi",
    order: 0,
    label: "Classi",
    title: "Una pratica, diversi modi di esplorarla.",
    kicker: "Pratica",
    Icon: LezioniIcon,
    intro: "Lezioni di yoga in piccoli gruppi e individuali, ispirate al Vinyasa.",
    paragraphs: ["Ogni classe ha un focus diverso, per costruire la pratica nel tempo ed esplorarne aspetti e possibilità differenti."],
    // Sotto ai testi compare l'elenco delle classi con la descrizione (ClassList).
    cta: { label: "Vai al calendario", href: "/calendario" },
  },
  {
    id: "sequenze",
    order: 1,
    label: "Sequenze",
    title: "Sequenze",
    kicker: "Da praticare a casa",
    Icon: SequenzeIcon,
    intro: "Le sequenze delle lezioni, posizione per posizione.",
    paragraphs: ["Per ripassare quello che abbiamo fatto insieme, ricordare l'ordine delle posizioni e praticare in autonomia."],
    // Sotto ai testi compare l'anteprima delle sequenze in vetrina (CoverSequences).
    cta: { label: "Registrati per vederle tutte", href: "/signup?next=/area/sequenze" },
  },
  {
    id: "meditazione",
    order: 2,
    label: "Meditazione",
    title: "Meditazione",
    kicker: "Presenza",
    Icon: MeditazioneIcon,
    intro: "Pratiche guidate per rallentare, ascoltare e tornare al centro.",
    paragraphs: ["Meditazioni guidate, mindfulness e incontri a tema per calmare la mente e aprire il cuore. Torna al centro. Sempre."],
    cta: { label: "Scopri la meditazione", href: "/calendario" },
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
export type CoverAccess = { href: string; label: string; home: string };

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

// Sequenza "in vetrina" mostrata nella sezione "Sequenze" (RPC cover_sequences):
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

// Vecchi indirizzi delle sezioni (link già condivisi): /#lezioni ora apre "Classi".
const SECTION_ALIASES: Record<string, string> = { lezioni: "classi" };

export function getSection(id: string | null): CardSection | undefined {
  const key = id ? (SECTION_ALIASES[id] ?? id) : id;
  return CARD_SECTIONS.find((s) => s.id === key);
}

// Le classi, con la loro descrizione: usate nella sezione "Classi" della
// copertina e nella pagina /classi.
export const CLASSES = [
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

export const PRACTICE_MODES = [
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
