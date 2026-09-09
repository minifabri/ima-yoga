import type { SectionKind } from "./types";

export const STANDARD_SECTION_KINDS: { kind: Exclude<SectionKind, "custom">; label: string }[] = [
  { kind: "pranayama", label: "Pranayama" },
  { kind: "preparazione", label: "Preparazione" },
  { kind: "saluto_al_sole", label: "Saluto al sole" },
  { kind: "pre_sequenza", label: "Pre-sequenza" },
  { kind: "sequenza", label: "Sequenza" },
  { kind: "chiusura", label: "Chiusura" },
];

export function defaultLabelForKind(kind: SectionKind): string {
  return STANDARD_SECTION_KINDS.find((s) => s.kind === kind)?.label ?? "Sezione personalizzata";
}
