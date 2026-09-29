"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { FlipHorizontal2, ImagePlus, Loader2, RotateCcw, Upload } from "lucide-react";
import { COLORS } from "./colors";
import { uploadPoseImage } from "./data";

// Le immagini del catalogo arrivano già illustrate (es. generate con
// ChatGPT nello stile della tavola): qui non c'è più alcuna elaborazione
// della figura, solo l'inquadratura nel quadrato. Da un'unica sorgente si
// producono due file: la miniatura per gli elenchi e la versione grande per
// il dettaglio della posa.
const THUMB_SIZE = 480;
const LARGE_SIZE = 1024;
const PREVIEW_SIZE = 240; // lato del canvas di anteprima (in CSS è 200px)
const DEFAULT_MARGIN = 0.04;

type Framing = { zoom: number; margin: number; flip: boolean; offsetX: number; offsetY: number };
const DEFAULT_FRAMING: Framing = { zoom: 1, margin: DEFAULT_MARGIN, flip: false, offsetX: 0, offsetY: 0 };

// Colore medio dei quattro angoli: le illustrazioni hanno uno sfondo pieno,
// quindi è quello da usare per riempire il quadrato quando la sorgente non è
// quadrata o viene rimpicciolita, senza lasciare bande di un altro colore.
function sampleBackground(img: HTMLImageElement): string {
  const c = document.createElement("canvas");
  c.width = img.naturalWidth;
  c.height = img.naturalHeight;
  const ctx = c.getContext("2d", { willReadFrequently: true })!;
  ctx.drawImage(img, 0, 0);
  const w = c.width - 1;
  const h = c.height - 1;
  const points = [
    [0, 0],
    [w, 0],
    [0, h],
    [w, h],
  ];
  let r = 0;
  let g = 0;
  let b = 0;
  for (const [x, y] of points) {
    const d = ctx.getImageData(x, y, 1, 1).data;
    r += d[0];
    g += d[1];
    b += d[2];
  }
  return `rgb(${Math.round(r / 4)},${Math.round(g / 4)},${Math.round(b / 4)})`;
}

// Disegna la sorgente contenuta nel quadrato `size`, con margine, zoom,
// spostamento (in frazioni del lato, così resta uguale a ogni risoluzione)
// e specchiatura orizzontale.
function renderFramed(img: HTMLImageElement, background: string, size: number, f: Framing): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, size, size);
  const avail = size * (1 - 2 * f.margin);
  const scale = Math.min(avail / img.naturalWidth, avail / img.naturalHeight) * f.zoom;
  const w = img.naturalWidth * scale;
  const h = img.naturalHeight * scale;
  const x = (size - w) / 2 + f.offsetX * size;
  const y = (size - h) / 2 + f.offsetY * size;
  ctx.imageSmoothingQuality = "high";
  ctx.save();
  if (f.flip) {
    ctx.translate(size, 0);
    ctx.scale(-1, 1);
  }
  ctx.drawImage(img, f.flip ? size - x - w : x, y, w, h);
  ctx.restore();
  return canvas;
}

// WebP pesa molto meno del PNG a parità di resa; i browser che non lo sanno
// codificare da canvas restituiscono un PNG, e l'upload si adegua al tipo.
function toBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("Codifica immagine fallita"))), "image/webp", 0.9);
  });
}

export type PoseImageUploaderHandle = {
  // Ricarica l'immagine già salvata per rifarne l'inquadratura, senza dover
  // ricaricare il file originale.
  loadExisting: () => void;
};

export const PoseImageUploader = forwardRef<
  PoseImageUploaderHandle,
  {
    supabase: SupabaseClient;
    poseSlug: string;
    // Sorgente per "Modifica inquadratura": la versione grande se c'è.
    existingImageUrl?: string | null;
    onUploaded: (urls: { imageUrl: string; imageLargeUrl: string }) => void;
  }
>(function PoseImageUploader({ supabase, poseSlug, existingImageUrl, onUploaded }, ref) {
  const [sourceImg, setSourceImg] = useState<HTMLImageElement | null>(null);
  const [background, setBackground] = useState("#fbf8f1");
  const [editingExisting, setEditingExisting] = useState(false);
  const [framing, setFraming] = useState<Framing>(DEFAULT_FRAMING);
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const previewRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragRef = useRef<{ x: number; y: number; offsetX: number; offsetY: number } | null>(null);

  useEffect(() => {
    const canvas = previewRef.current;
    if (!canvas || !sourceImg) return;
    const ctx = canvas.getContext("2d")!;
    ctx.clearRect(0, 0, PREVIEW_SIZE, PREVIEW_SIZE);
    ctx.drawImage(renderFramed(sourceImg, background, PREVIEW_SIZE, framing), 0, 0);
  }, [sourceImg, background, framing]);

  function applyImage(img: HTMLImageElement, existing: boolean) {
    try {
      setBackground(sampleBackground(img));
    } catch {
      // immagine remota senza CORS: resta lo sfondo crema di default
    }
    setEditingExisting(existing);
    setFraming(existing ? { ...DEFAULT_FRAMING, margin: 0 } : DEFAULT_FRAMING);
    setSourceImg(img);
    setError("");
  }

  function handleFile(file: File) {
    const img = new Image();
    img.onload = () => applyImage(img, false);
    img.onerror = () => setError("Impossibile leggere il file immagine.");
    img.src = URL.createObjectURL(file);
  }

  function loadExistingImage(url: string) {
    setError("");
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => applyImage(img, true);
    img.onerror = () => setError("Impossibile caricare l'immagine attuale per la modifica.");
    img.src = url;
  }

  useImperativeHandle(ref, () => ({
    loadExisting: () => {
      if (existingImageUrl) loadExistingImage(existingImageUrl);
    },
  }));

  // Trascinando sull'anteprima si sposta la figura nel quadrato.
  function handlePointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = { x: e.clientX, y: e.clientY, offsetX: framing.offsetX, offsetY: framing.offsetY };
  }
  function handlePointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    const start = dragRef.current;
    if (!start) return;
    const rect = e.currentTarget.getBoundingClientRect();
    setFraming((f) => ({
      ...f,
      offsetX: start.offsetX + (e.clientX - start.x) / rect.width,
      offsetY: start.offsetY + (e.clientY - start.y) / rect.height,
    }));
  }
  function handlePointerUp() {
    dragRef.current = null;
  }

  function reset() {
    setSourceImg(null);
    setEditingExisting(false);
    setError("");
  }

  async function handleConfirm() {
    if (!sourceImg) return;
    setUploading(true);
    setError("");
    try {
      const base = `${poseSlug || "posa"}-${Date.now()}`;
      const [thumbBlob, largeBlob] = await Promise.all([
        toBlob(renderFramed(sourceImg, background, THUMB_SIZE, framing)),
        toBlob(renderFramed(sourceImg, background, LARGE_SIZE, framing)),
      ]);
      const [imageUrl, imageLargeUrl] = await Promise.all([
        uploadPoseImage(supabase, base, thumbBlob),
        uploadPoseImage(supabase, `${base}-large`, largeBlob),
      ]);
      onUploaded({ imageUrl, imageLargeUrl });
      reset();
    } catch {
      setError("Errore durante il caricamento dell'immagine.");
    } finally {
      setUploading(false);
    }
  }

  const sliderLabel = { fontSize: 11, color: COLORS.inkSoft } as const;

  return (
    <div className="p-3 rounded-lg" style={{ border: `1px dashed ${COLORS.border}` }}>
      <div className="flex items-center justify-between gap-2 mb-1">
        <div style={{ fontSize: 11.5, fontWeight: 600, color: COLORS.inkSoft }}>{editingExisting ? "Modifica inquadratura" : "Carica immagine"}</div>
        <button
          onClick={() => fileInputRef.current?.click()}
          type="button"
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium"
          style={{ border: `1px solid ${COLORS.border}` }}
        >
          <ImagePlus size={13} /> Scegli immagine
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
      {!sourceImg && (
        <div style={{ fontSize: 10.5, color: COLORS.inkSoft }}>
          Immagine quadrata, idealmente 1024×1024. Vengono salvate una miniatura per gli elenchi e una versione grande per il dettaglio.
        </div>
      )}

      {sourceImg && (
        <div className="flex items-start gap-3 flex-wrap mt-2">
          <div className="flex flex-col items-center gap-1">
            <canvas
              ref={previewRef}
              width={PREVIEW_SIZE}
              height={PREVIEW_SIZE}
              style={{ width: 200, height: 200, borderRadius: 8, cursor: "grab", touchAction: "none", border: `1px solid ${COLORS.border}` }}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
            />
            <span style={{ fontSize: 10, color: COLORS.inkSoft }}>Trascina per spostare la figura</span>
          </div>
          <div className="flex-1 flex flex-col gap-2" style={{ minWidth: 170 }}>
            <label className="flex flex-col gap-0.5">
              <span style={sliderLabel}>Ingrandimento ({Math.round(framing.zoom * 100)}%)</span>
              <input
                type="range"
                min={50}
                max={250}
                step={5}
                value={Math.round(framing.zoom * 100)}
                onChange={(e) => setFraming((f) => ({ ...f, zoom: Number(e.target.value) / 100 }))}
                style={{ width: "100%" }}
              />
            </label>
            <label className="flex flex-col gap-0.5">
              <span style={sliderLabel}>Margine ({Math.round(framing.margin * 100)}%)</span>
              <input
                type="range"
                min={0}
                max={25}
                value={Math.round(framing.margin * 100)}
                onChange={(e) => setFraming((f) => ({ ...f, margin: Number(e.target.value) / 100 }))}
                style={{ width: "100%" }}
              />
            </label>
            <div className="flex items-center gap-3 flex-wrap">
              <button type="button" onClick={() => setFraming((f) => ({ ...f, flip: !f.flip }))} className="flex items-center gap-1 text-xs font-medium" style={{ color: framing.flip ? COLORS.primaryDark : COLORS.ink }}>
                <FlipHorizontal2 size={13} /> Specchia
              </button>
              <button
                type="button"
                onClick={() => setFraming(editingExisting ? { ...DEFAULT_FRAMING, margin: 0 } : DEFAULT_FRAMING)}
                className="flex items-center gap-1 text-xs font-medium"
                style={{ color: COLORS.ink }}
              >
                <RotateCcw size={13} /> Ripristina
              </button>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <button
                type="button"
                onClick={handleConfirm}
                disabled={uploading}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white"
                style={{ background: COLORS.primary, opacity: uploading ? 0.7 : 1 }}
              >
                {uploading ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />}
                {uploading ? "Caricamento…" : "Usa questa immagine"}
              </button>
              <button type="button" onClick={reset} disabled={uploading} className="px-3 py-1.5 rounded-lg text-xs font-medium" style={{ border: `1px solid ${COLORS.border}` }}>
                Annulla
              </button>
            </div>
          </div>
        </div>
      )}
      {error && <div style={{ fontSize: 11.5, color: COLORS.danger, marginTop: 6 }}>{error}</div>}
    </div>
  );
});
