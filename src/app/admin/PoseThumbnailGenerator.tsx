"use client";

import { useRef, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { ImagePlus, Loader2, Upload } from "lucide-react";
import { COLORS } from "./colors";
import { uploadPoseThumbnail } from "./data";

const OUTPUT_SIZE = 240;
const BG_COLOR: [number, number, number] = [227, 219, 243]; // #e3dbf3, sfondo icone attuali
const FILL_COLOR: [number, number, number] = [107, 79, 160]; // #6b4fa0, viola icone attuali
const MARGIN = 0.08;
const MAX_WORKING_DIM = 900; // limita il lavoro per-pixel su foto molto grandi

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Immagine non leggibile"));
    img.src = URL.createObjectURL(file);
  });
}

// Isola il soggetto per contrasto di luminosità rispetto allo sfondo (campionato
// dai quattro angoli), lo ricolora in tinta unita e lo ricompone centrato su un
// canvas quadrato con gli stessi colori del set di icone esistente.
function renderSilhouette(source: HTMLImageElement, threshold: number, invert: boolean): HTMLCanvasElement | null {
  const scale = Math.min(1, MAX_WORKING_DIM / Math.max(source.width, source.height));
  const w = Math.round(source.width * scale);
  const h = Math.round(source.height * scale);

  const work = document.createElement("canvas");
  work.width = w;
  work.height = h;
  const wctx = work.getContext("2d")!;
  wctx.drawImage(source, 0, 0, w, h);
  const { data } = wctx.getImageData(0, 0, w, h);

  const lumAt = (x: number, y: number) => {
    const i = (y * w + x) * 4;
    return 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
  };
  const corners: [number, number][] = [
    [2, 2],
    [w - 3, 2],
    [2, h - 3],
    [w - 3, h - 3],
  ];
  const bgLum = corners.reduce((s, [x, y]) => s + lumAt(x, y), 0) / corners.length;

  const mask = new Uint8Array(w * h);
  let minX = w;
  let minY = h;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const lum = lumAt(x, y);
      const diff = lum - bgLum;
      const isSubject = invert ? diff > threshold : diff < -threshold;
      if (isSubject) {
        mask[y * w + x] = 1;
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < minX || maxY < minY) return null;

  const bw = maxX - minX + 1;
  const bh = maxY - minY + 1;
  const cropped = document.createElement("canvas");
  cropped.width = bw;
  cropped.height = bh;
  const cctx = cropped.getContext("2d")!;
  const cdata = cctx.createImageData(bw, bh);
  for (let y = 0; y < bh; y++) {
    for (let x = 0; x < bw; x++) {
      const srcIdx = (y + minY) * w + (x + minX);
      const ti = (y * bw + x) * 4;
      if (mask[srcIdx]) {
        cdata.data[ti] = FILL_COLOR[0];
        cdata.data[ti + 1] = FILL_COLOR[1];
        cdata.data[ti + 2] = FILL_COLOR[2];
        cdata.data[ti + 3] = 255;
      }
    }
  }
  cctx.putImageData(cdata, 0, 0);

  const out = document.createElement("canvas");
  out.width = OUTPUT_SIZE;
  out.height = OUTPUT_SIZE;
  const octx = out.getContext("2d")!;
  octx.fillStyle = `rgb(${BG_COLOR.join(",")})`;
  octx.fillRect(0, 0, OUTPUT_SIZE, OUTPUT_SIZE);
  const drawScale = (OUTPUT_SIZE * (1 - MARGIN * 2)) / Math.max(bw, bh);
  const outW = bw * drawScale;
  const outH = bh * drawScale;
  octx.drawImage(cropped, 0, 0, bw, bh, (OUTPUT_SIZE - outW) / 2, (OUTPUT_SIZE - outH) / 2, outW, outH);
  return out;
}

export function PoseThumbnailGenerator({
  supabase,
  poseSlug,
  onGenerated,
}: {
  supabase: SupabaseClient;
  poseSlug: string;
  onGenerated: (url: string) => void;
}) {
  const [sourceImg, setSourceImg] = useState<HTMLImageElement | null>(null);
  const [threshold, setThreshold] = useState(45);
  const [invert, setInvert] = useState(false);
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const previewRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function renderPreview(img: HTMLImageElement, th: number, inv: boolean) {
    const result = renderSilhouette(img, th, inv);
    const canvas = previewRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    ctx.clearRect(0, 0, OUTPUT_SIZE, OUTPUT_SIZE);
    if (!result) {
      setError("Nessun soggetto rilevato: prova a regolare la sensibilità o l'opzione sfondo scuro.");
      return;
    }
    setError("");
    ctx.drawImage(result, 0, 0);
  }

  async function handleFile(file: File) {
    setError("");
    try {
      const img = await loadImage(file);
      setSourceImg(img);
      requestAnimationFrame(() => renderPreview(img, threshold, invert));
    } catch {
      setError("Impossibile leggere il file immagine.");
    }
  }

  function handleThresholdChange(value: number) {
    setThreshold(value);
    if (sourceImg) renderPreview(sourceImg, value, invert);
  }

  function handleInvertChange(value: boolean) {
    setInvert(value);
    if (sourceImg) renderPreview(sourceImg, threshold, value);
  }

  async function handleConfirm() {
    const canvas = previewRef.current;
    if (!canvas || !sourceImg) return;
    setUploading(true);
    setError("");
    try {
      const blob: Blob | null = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
      if (!blob) throw new Error("Generazione immagine fallita");
      const url = await uploadPoseThumbnail(supabase, poseSlug || "posa", blob);
      onGenerated(url);
    } catch {
      setError("Errore durante il caricamento della thumbnail.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="p-3 rounded-lg" style={{ border: `1px dashed ${COLORS.border}` }}>
      <div className="flex items-center justify-between mb-2">
        <div style={{ fontSize: 11.5, fontWeight: 600, color: COLORS.inkSoft }}>Genera thumbnail da foto</div>
        <button
          onClick={() => fileInputRef.current?.click()}
          type="button"
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium"
          style={{ border: `1px solid ${COLORS.border}` }}
        >
          <ImagePlus size={13} /> Scegli foto
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleFile(f);
            e.target.value = "";
          }}
        />
      </div>

      {sourceImg && (
        <div className="flex items-start gap-3 flex-wrap">
          <div className="flex flex-col items-center gap-1">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={sourceImg.src} alt="Foto originale" style={{ width: 120, height: 120, objectFit: "contain", background: COLORS.subtle, borderRadius: 8 }} />
            <span style={{ fontSize: 10, color: COLORS.inkSoft }}>Foto originale</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <canvas ref={previewRef} width={OUTPUT_SIZE} height={OUTPUT_SIZE} style={{ width: 120, height: 120, borderRadius: 8 }} />
            <span style={{ fontSize: 10, color: COLORS.inkSoft }}>Anteprima thumbnail</span>
          </div>
          <div className="flex-1" style={{ minWidth: 160 }}>
            <label className="block mb-2">
              <div style={{ fontSize: 11, color: COLORS.inkSoft }} className="mb-1">
                Sensibilità ({threshold})
              </div>
              <input type="range" min={5} max={100} value={threshold} onChange={(e) => handleThresholdChange(Number(e.target.value))} style={{ width: "100%" }} />
            </label>
            <label className="flex items-center gap-1.5 mb-2" style={{ fontSize: 11.5, color: COLORS.ink }}>
              <input type="checkbox" checked={invert} onChange={(e) => handleInvertChange(e.target.checked)} />
              Sfondo scuro / soggetto chiaro
            </label>
            <button
              onClick={handleConfirm}
              disabled={uploading}
              type="button"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white disabled:opacity-60"
              style={{ background: COLORS.primary }}
            >
              {uploading ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />}
              {uploading ? "Caricamento…" : "Usa questa thumbnail"}
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="mt-2" style={{ fontSize: 11.5, color: COLORS.danger }}>
          {error}
        </div>
      )}
    </div>
  );
}
