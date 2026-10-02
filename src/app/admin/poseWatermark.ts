import type { SupabaseClient } from "@supabase/supabase-js";
import { deletePoseThumbnail, savePose, uploadPoseImage, uploadPoseOriginal } from "./data";
import type { PoseCatalogItem } from "./types";

// Il watermark è dentro i pixel della versione grande pubblicata: così resta
// sia nello screenshot sia nel file scaricato. L'originale pulito sta nel
// bucket privato "pose-originals" (solo admin) e serve per rifare
// l'inquadratura senza sovrapporre un secondo watermark.
const WATERMARK_TEXT = "ima yoga";
// I file già col watermark si riconoscono dal nome, senza interrogare lo storage.
export const WATERMARKED_SUFFIX = "-wm";

function watermarkFont(px: number): string {
  const family = getComputedStyle(document.documentElement).getPropertyValue("--font-display").trim() || "serif";
  return `500 ${px}px ${family}`;
}

// Il font del sito va caricato prima di disegnare su canvas, altrimenti la
// scritta esce nel serif di ripiego.
export async function loadWatermarkFont(): Promise<void> {
  try {
    await document.fonts.load(watermarkFont(40), WATERMARK_TEXT);
  } catch {
    // resta il serif di ripiego
  }
}

// Scritta ripetuta in diagonale su tutto il quadrato, a file sfalsate: passa
// sopra la figura, quindi non si toglie ritagliando un angolo. Doppia
// passata chiara + scura perché resti leggibile su qualunque sfondo.
export function drawWatermark(canvas: HTMLCanvasElement): void {
  const size = canvas.width;
  const ctx = canvas.getContext("2d")!;
  const fontPx = size * 0.042;
  const stepX = size * 0.36;
  const stepY = size * 0.2;
  ctx.save();
  ctx.font = watermarkFont(fontPx);
  ctx.letterSpacing = `${fontPx * 0.12}px`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.translate(size / 2, size / 2);
  ctx.rotate(-Math.PI / 6);
  for (let row = -5; row <= 5; row++) {
    const shift = row % 2 === 0 ? 0 : stepX / 2;
    for (let col = -4; col <= 4; col++) {
      const x = col * stepX + shift;
      const y = row * stepY;
      ctx.fillStyle = "rgba(255,255,255,0.16)";
      ctx.fillText(WATERMARK_TEXT, x + fontPx * 0.03, y + fontPx * 0.03);
      ctx.fillStyle = "rgba(74,58,115,0.13)";
      ctx.fillText(WATERMARK_TEXT, x, y);
    }
  }
  ctx.restore();
}

export function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("Codifica immagine fallita"))), "image/webp", 0.9);
  });
}

// Immagini grandi caricate prima che esistesse il watermark: file nel bucket
// pubblico senza il suffisso nel nome.
export function needsWatermark(pose: PoseCatalogItem): boolean {
  const url = pose.imageLargeUrl;
  if (!url || !url.includes("/pose-thumbnails/")) return false;
  return !new RegExp(`${WATERMARKED_SUFFIX}\\.\\w+$`).test(url);
}

// Mette in regola una di quelle immagini: l'originale pulito passa nel bucket
// privato, al suo posto viene pubblicata la versione col watermark (con un
// nome nuovo, così la cache non continua a servire quella pulita) e il vecchio
// file pubblico viene eliminato.
export async function watermarkExistingPose(supabase: SupabaseClient, pose: PoseCatalogItem): Promise<PoseCatalogItem> {
  const oldUrl = pose.imageLargeUrl!;
  const res = await fetch(oldUrl);
  if (!res.ok) throw new Error(`Download fallito (${res.status})`);
  const cleanBlob = await res.blob();
  const bitmap = await createImageBitmap(cleanBlob);
  const canvas = document.createElement("canvas");
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0);
  drawWatermark(canvas);
  const base = oldUrl.slice(oldUrl.lastIndexOf("/") + 1).replace(/\.\w+$/, "");
  const newUrl = await uploadPoseImage(supabase, `${base}${WATERMARKED_SUFFIX}`, await canvasToBlob(canvas));
  await uploadPoseOriginal(supabase, newUrl, cleanBlob);
  const saved = await savePose(supabase, { ...pose, imageLargeUrl: newUrl });
  await deletePoseThumbnail(supabase, oldUrl);
  return saved;
}
