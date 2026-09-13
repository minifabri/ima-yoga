import type { Drishti, PoseCatalogItem } from "./types";

// Le nove drishti tradizionali, in questo ordine fisso (nasagrai → urdhva
// antara): elenco chiuso, non gestibile dall'interfaccia — un'eventuale
// decima drishti richiederebbe una nuova migrazione sul CHECK constraint.
export const DRISHTI_ORDER: Drishti[] = [
  "nasagrai",
  "ajna_chakra",
  "nabi_chakra",
  "hastagrai",
  "padhayoragrai",
  "parsva_destra",
  "parsva_sinistra",
  "angustha_ma_dyai",
  "urdhva_antara",
];

export const DRISHTI_LABELS: Record<Drishti, { name: string; detail: string }> = {
  nasagrai: { name: "Nasagrai", detail: "punta del naso" },
  ajna_chakra: { name: "Ajna chakra", detail: "fra le sopracciglia" },
  nabi_chakra: { name: "Nabi chakra", detail: "ombelico" },
  hastagrai: { name: "Hastagrai", detail: "mano" },
  padhayoragrai: { name: "Padhayoragrai", detail: "dita dei piedi" },
  parsva_destra: { name: "Parsva drishti", detail: "verso destra" },
  parsva_sinistra: { name: "Parsva drishti", detail: "verso sinistra" },
  angustha_ma_dyai: { name: "Angustha ma dyai", detail: "pollici" },
  urdhva_antara: { name: "Urdhva (antara) drishti", detail: "verso il cielo" },
};

function compose(base: string, label: string): string {
  if (base && label) return `${base} ${label}`;
  return base || label;
}

// Nome da mostrare per una posa: le varianti (parentPoseId non nullo) ereditano
// nome/nameIt/nameEn dal padre concatenati a variantLabel, a meno che non
// abbiano un proprio valore in quel campo — nel qual caso lo sovrascrive del
// tutto (utile per una variante con un nome comune diverso da quello del padre).
export function poseDisplayName(pose: PoseCatalogItem, parent: PoseCatalogItem | undefined): string {
  if (!pose.parentPoseId || !parent) return pose.name || pose.nameIt || "Senza nome";
  return pose.name || compose(parent.name, pose.variantLabel) || pose.nameIt || "Senza nome";
}

export function poseDisplayNameIt(pose: PoseCatalogItem, parent: PoseCatalogItem | undefined): string {
  if (!pose.parentPoseId || !parent) return pose.nameIt;
  return pose.nameIt || compose(parent.nameIt, pose.variantLabel);
}

export function poseDisplayNameEn(pose: PoseCatalogItem, parent: PoseCatalogItem | undefined): string {
  if (!pose.parentPoseId || !parent) return pose.nameEn;
  return pose.nameEn || compose(parent.nameEn, pose.variantLabel);
}

export function poseDisplayImage(pose: PoseCatalogItem, parent: PoseCatalogItem | undefined): string | null {
  return pose.imageUrl || parent?.imageUrl || null;
}

export function poseDisplayDrishti(pose: PoseCatalogItem, parent: PoseCatalogItem | undefined): Drishti | null {
  return pose.drishti || parent?.drishti || null;
}

// La drishti (punto di sguardo) ha senso come pratica solo in Ashtanga: le
// tipologie di classe sono testo libero configurabile dall'utente (nessun
// campo/codice fisso in class_types), quindi il confronto è per nome,
// case-insensitive. Usato per decidere se una voce di sequenza deve
// ereditare automaticamente la drishti della posa collegata — una scelta
// esplicita sulla singola voce resta sempre valida indipendentemente da
// questo, vedi drishtiOverride in types.ts.
export function isAshtangaClassType(className: string | null | undefined): boolean {
  return (className ?? "").trim().toLowerCase() === "ashtanga";
}
