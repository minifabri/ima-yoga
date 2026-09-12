"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { Eraser, FlipHorizontal2, ImagePlus, Loader2, RotateCcw, Upload } from "lucide-react";
import { COLORS } from "./colors";
import { uploadPoseThumbnail } from "./data";

const OUTPUT_SIZE = 240;
const BG_COLOR: [number, number, number] = [227, 219, 243]; // #e3dbf3, sfondo icone attuali
const FILL_COLOR: [number, number, number] = [107, 79, 160]; // #6b4fa0, viola icone attuali
const DEFAULT_MARGIN = 0.08;
const MAX_WORKING_DIM = 900; // limita il lavoro per-pixel su foto molto grandi
const DEFAULT_BRUSH_SIZE = 24; // diametro in pixel del canvas (spazio OUTPUT_SIZE)

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Immagine non leggibile"));
    img.src = URL.createObjectURL(file);
  });
}

// Tiene solo la "macchia" connessa più grande della maschera e scarta il
// resto come rumore (ombre, sfondi non uniformi che superano la soglia solo
// a chiazze isolate) — altrimenti quei pixel sparsi allargano il ritaglio e
// sporcano la silhouette finale.
function largestConnectedComponent(mask: Uint8Array<ArrayBufferLike>, w: number, h: number): Uint8Array<ArrayBufferLike> {
  const visited = new Uint8Array(w * h);
  const stack: number[] = [];
  let best: number[] | null = null;

  for (let start = 0; start < mask.length; start++) {
    if (!mask[start] || visited[start]) continue;
    const component: number[] = [];
    stack.length = 0;
    stack.push(start);
    visited[start] = 1;
    while (stack.length) {
      const idx = stack.pop()!;
      component.push(idx);
      const x = idx % w;
      const y = (idx / w) | 0;
      if (x > 0 && mask[idx - 1] && !visited[idx - 1]) {
        visited[idx - 1] = 1;
        stack.push(idx - 1);
      }
      if (x < w - 1 && mask[idx + 1] && !visited[idx + 1]) {
        visited[idx + 1] = 1;
        stack.push(idx + 1);
      }
      if (y > 0 && mask[idx - w] && !visited[idx - w]) {
        visited[idx - w] = 1;
        stack.push(idx - w);
      }
      if (y < h - 1 && mask[idx + w] && !visited[idx + w]) {
        visited[idx + w] = 1;
        stack.push(idx + w);
      }
    }
    if (!best || component.length > best.length) best = component;
  }

  const filtered = new Uint8Array(w * h);
  if (best) for (const idx of best) filtered[idx] = 1;
  return filtered;
}

// Compone un canvas quadrato con lo sfondo del set di icone, disegnando
// `draw` (già proporzionata) centrata con il margine indicato ed eventuale
// ribaltamento orizzontale.
function compose(draw: (ctx: CanvasRenderingContext2D, size: number) => void): HTMLCanvasElement {
  const out = document.createElement("canvas");
  out.width = OUTPUT_SIZE;
  out.height = OUTPUT_SIZE;
  const ctx = out.getContext("2d")!;
  ctx.fillStyle = `rgb(${BG_COLOR.join(",")})`;
  ctx.fillRect(0, 0, OUTPUT_SIZE, OUTPUT_SIZE);
  draw(ctx, OUTPUT_SIZE);
  return out;
}

// Isola il soggetto per contrasto di luminosità rispetto allo sfondo (campionato
// dai quattro angoli), scarta il rumore isolato, lo ricolora in tinta unita e
// lo ricompone centrato su un canvas quadrato con gli stessi colori del set
// di icone esistente.
function renderSilhouette(source: HTMLImageElement, threshold: number, invert: boolean, flip: boolean, margin: number): HTMLCanvasElement | null {
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

  let mask: Uint8Array<ArrayBufferLike> = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const diff = lumAt(x, y) - bgLum;
      const isSubject = invert ? diff > threshold : diff < -threshold;
      if (isSubject) mask[y * w + x] = 1;
    }
  }
  mask = largestConnectedComponent(mask, w, h);

  let minX = w;
  let minY = h;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (!mask[y * w + x]) continue;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
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

  return compose((octx, size) => {
    const drawScale = (size * (1 - margin * 2)) / Math.max(bw, bh);
    const outW = bw * drawScale;
    const outH = bh * drawScale;
    octx.save();
    if (flip) {
      octx.translate(size, 0);
      octx.scale(-1, 1);
    }
    octx.drawImage(cropped, 0, 0, bw, bh, (size - outW) / 2, (size - outH) / 2, outW, outH);
    octx.restore();
  });
}

// Nessuna elaborazione: la foto originale contenuta nel quadrato, per quando
// lo sfondo è troppo complesso perché l'estrazione automatica funzioni bene.
function renderOriginal(source: HTMLImageElement, flip: boolean, margin: number): HTMLCanvasElement {
  return compose((octx, size) => {
    const drawScale = (size * (1 - margin * 2)) / Math.max(source.width, source.height);
    const outW = source.width * drawScale;
    const outH = source.height * drawScale;
    octx.save();
    if (flip) {
      octx.translate(size, 0);
      octx.scale(-1, 1);
    }
    octx.drawImage(source, 0, 0, source.width, source.height, (size - outW) / 2, (size - outH) / 2, outW, outH);
    octx.restore();
  });
}

export type PoseThumbnailGeneratorHandle = {
  // Ricarica la thumbnail già salvata come sorgente, per ripassarci la gomma
  // o stringere il ritaglio, senza dover ripartire da una nuova foto.
  loadExisting: () => void;
};

export const PoseThumbnailGenerator = forwardRef<
  PoseThumbnailGeneratorHandle,
  {
    supabase: SupabaseClient;
    poseSlug: string;
    existingImageUrl?: string | null;
    onGenerated: (url: string) => void;
  }
>(function PoseThumbnailGenerator({ supabase, poseSlug, existingImageUrl, onGenerated }, ref) {
  const [sourceImg, setSourceImg] = useState<HTMLImageElement | null>(null);
  const [editingExisting, setEditingExisting] = useState(false);
  const [threshold, setThreshold] = useState(45);
  const [invert, setInvert] = useState(false);
  const [flip, setFlip] = useState(false);
  const [margin, setMargin] = useState(DEFAULT_MARGIN);
  const [useOriginal, setUseOriginal] = useState(false);
  const [brushSize, setBrushSize] = useState(DEFAULT_BRUSH_SIZE);
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const previewRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isErasingRef = useRef(false);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);
  const brushSizeRef = useRef(brushSize);
  useEffect(() => {
    brushSizeRef.current = brushSize;
  }, [brushSize]);

  function renderPreview(img: HTMLImageElement, opts: { th: number; inv: boolean; fl: boolean; mg: number; orig: boolean }) {
    const result = opts.orig ? renderOriginal(img, opts.fl, opts.mg) : renderSilhouette(img, opts.th, opts.inv, opts.fl, opts.mg);
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

  function currentOpts(patch: Partial<{ th: number; inv: boolean; fl: boolean; mg: number; orig: boolean }> = {}) {
    return { th: threshold, inv: invert, fl: flip, mg: margin, orig: useOriginal, ...patch };
  }

  // Converte le coordinate del puntatore (pixel dello schermo) in coordinate
  // del canvas (spazio OUTPUT_SIZE), tenendo conto del ridimensionamento CSS.
  function getCanvasPoint(e: React.PointerEvent<HTMLCanvasElement>): { x: number; y: number } {
    const canvas = e.currentTarget;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY };
  }

  // Dipinge un cerchio del colore di sfondo: è la "gomma" per ripulire a mano
  // elementi indesiderati (tappetino, pianta) rimasti nella silhouette.
  function eraseAt(x: number, y: number) {
    const ctx = previewRef.current?.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = `rgb(${BG_COLOR.join(",")})`;
    ctx.beginPath();
    ctx.arc(x, y, brushSizeRef.current / 2, 0, Math.PI * 2);
    ctx.fill();
  }

  // Interpola tra due punti per non lasciare "buchi" nel tratto quando il
  // puntatore si muove più veloce del campionamento degli eventi.
  function eraseSegment(from: { x: number; y: number }, to: { x: number; y: number }) {
    const dist = Math.hypot(to.x - from.x, to.y - from.y);
    const steps = Math.max(1, Math.ceil(dist / (brushSizeRef.current / 3)));
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      eraseAt(from.x + (to.x - from.x) * t, from.y + (to.y - from.y) * t);
    }
  }

  function handleEraseStart(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!sourceImg || uploading) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    isErasingRef.current = true;
    const point = getCanvasPoint(e);
    lastPointRef.current = point;
    eraseAt(point.x, point.y);
  }

  function handleEraseMove(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!isErasingRef.current) return;
    const point = getCanvasPoint(e);
    if (lastPointRef.current) eraseSegment(lastPointRef.current, point);
    else eraseAt(point.x, point.y);
    lastPointRef.current = point;
  }

  function handleEraseEnd() {
    isErasingRef.current = false;
    lastPointRef.current = null;
  }

  async function handleFile(file: File) {
    setError("");
    try {
      const img = await loadImage(file);
      setEditingExisting(false);
      setSourceImg(img);
      requestAnimationFrame(() => renderPreview(img, currentOpts()));
    } catch {
      setError("Impossibile leggere il file immagine.");
    }
  }

  // Ricarica la thumbnail già salvata come sorgente: parte "così com'è" (è già
  // un'immagine composta, non una foto grezza) e margine zero per mostrarla
  // fedele all'originale — da lì si può usare la gomma o stringere il
  // ritaglio deselezionando l'opzione per ingrandire il soggetto.
  function loadExistingImage(url: string) {
    setError("");
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      setEditingExisting(true);
      setSourceImg(img);
      setThreshold(45);
      setInvert(false);
      setFlip(false);
      setMargin(0);
      setUseOriginal(true);
      requestAnimationFrame(() => renderPreview(img, { th: 45, inv: false, fl: false, mg: 0, orig: true }));
    };
    img.onerror = () => setError("Impossibile caricare la thumbnail attuale per la modifica.");
    img.src = url;
  }

  useImperativeHandle(ref, () => ({
    loadExisting: () => {
      if (existingImageUrl) loadExistingImage(existingImageUrl);
    },
  }));

  function update(patch: Partial<{ th: number; inv: boolean; fl: boolean; mg: number; orig: boolean }>) {
    if (patch.th !== undefined) setThreshold(patch.th);
    if (patch.inv !== undefined) setInvert(patch.inv);
    if (patch.fl !== undefined) setFlip(patch.fl);
    if (patch.mg !== undefined) setMargin(patch.mg);
    if (patch.orig !== undefined) setUseOriginal(patch.orig);
    if (sourceImg) renderPreview(sourceImg, currentOpts(patch));
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
        <div style={{ fontSize: 11.5, fontWeight: 600, color: COLORS.inkSoft }}>{editingExisting ? "Modifica thumbnail" : "Genera thumbnail da foto"}</div>
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
            <img
              src={sourceImg.src}
              alt={editingExisting ? "Thumbnail attuale" : "Foto originale"}
              style={{ width: 120, height: 120, objectFit: "contain", background: COLORS.subtle, borderRadius: 8 }}
            />
            <span style={{ fontSize: 10, color: COLORS.inkSoft }}>{editingExisting ? "Thumbnail attuale" : "Foto originale"}</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <canvas
              ref={previewRef}
              width={OUTPUT_SIZE}
              height={OUTPUT_SIZE}
              style={{ width: 120, height: 120, borderRadius: 8, cursor: "crosshair", touchAction: "none" }}
              onPointerDown={handleEraseStart}
              onPointerMove={handleEraseMove}
              onPointerUp={handleEraseEnd}
              onPointerLeave={handleEraseEnd}
              onPointerCancel={handleEraseEnd}
            />
            <span style={{ fontSize: 10, color: COLORS.inkSoft }}>Anteprima thumbnail</span>
          </div>
          <div className="flex-1" style={{ minWidth: 170 }}>
            <label className="flex items-center gap-1.5 mb-2" style={{ fontSize: 11.5, color: COLORS.ink }}>
              <input type="checkbox" checked={useOriginal} onChange={(e) => update({ orig: e.target.checked })} />
              Usa la foto così com'è (niente elaborazione automatica)
            </label>
            {editingExisting && useOriginal && (
              <div style={{ fontSize: 10.5, color: COLORS.inkSoft }} className="mb-2">
                Deseleziona per ritagliare automaticamente intorno al soggetto e ingrandirlo.
              </div>
            )}

            {!useOriginal && (
              <>
                <label className="block mb-2">
                  <div style={{ fontSize: 11, color: COLORS.inkSoft }} className="mb-1">
                    Sensibilità ({threshold})
                  </div>
                  <input type="range" min={5} max={100} value={threshold} onChange={(e) => update({ th: Number(e.target.value) })} style={{ width: "100%" }} />
                </label>
                <label className="flex items-center gap-1.5 mb-2" style={{ fontSize: 11.5, color: COLORS.ink }}>
                  <input type="checkbox" checked={invert} onChange={(e) => update({ inv: e.target.checked })} />
                  Sfondo scuro / soggetto chiaro
                </label>
              </>
            )}

            <label className="block mb-2">
              <div style={{ fontSize: 11, color: COLORS.inkSoft }} className="mb-1">
                Margine ({Math.round(margin * 100)}%)
              </div>
              <input type="range" min={0} max={25} value={Math.round(margin * 100)} onChange={(e) => update({ mg: Number(e.target.value) / 100 })} style={{ width: "100%" }} />
            </label>

            <label className="flex items-center gap-1.5 mb-2" style={{ fontSize: 11.5, color: COLORS.ink }}>
              <input type="checkbox" checked={flip} onChange={(e) => update({ fl: e.target.checked })} />
              <FlipHorizontal2 size={13} /> Rifletti orizzontalmente
            </label>

            <div className="mb-2 pt-2" style={{ borderTop: `1px solid ${COLORS.border}` }}>
              <div className="flex items-center gap-1.5 mb-1" style={{ fontSize: 11.5, fontWeight: 600, color: COLORS.ink }}>
                <Eraser size={13} /> Gomma
              </div>
              <div style={{ fontSize: 10.5, color: COLORS.inkSoft }} className="mb-1.5">
                Trascina sull&apos;anteprima per cancellare a mano elementi indesiderati (tappetino, pianta…).
              </div>
              <label className="block mb-1.5">
                <div style={{ fontSize: 11, color: COLORS.inkSoft }} className="mb-1">
                  Dimensione gomma ({brushSize})
                </div>
                <input type="range" min={6} max={60} value={brushSize} onChange={(e) => setBrushSize(Number(e.target.value))} style={{ width: "100%" }} />
              </label>
              <button
                onClick={() => sourceImg && renderPreview(sourceImg, currentOpts())}
                type="button"
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium"
                style={{ border: `1px solid ${COLORS.border}` }}
              >
                <RotateCcw size={12} /> Ripristina
              </button>
            </div>

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
});
