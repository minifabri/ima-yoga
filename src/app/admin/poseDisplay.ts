import type { PoseCatalogItem } from "./types";

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
