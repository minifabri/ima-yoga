"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowLeft, ArrowRight, Check, ChevronDown, ChevronUp, Repeat, SkipForward, StickyNote, Timer, Wind, X } from "lucide-react";
import { COLORS, withAlpha } from "@/app/admin/colors";
import { DrishtiEyeIcon } from "@/app/admin/DrishtiEyeIcon";
import { DRISHTI_LABELS, poseDisplayLargeImage } from "@/app/admin/poseDisplay";
import type { SheetItem, SheetSection } from "@/app/admin/sequenceSheet";
import type { PoseCatalogItem } from "@/app/admin/types";

type PracticeStep = {
  item: SheetItem;
  sectionLabel: string;
  // Valorizzato solo per le voci dentro un blocco "Ripeti ×N".
  // `end` è l'indice del primo passo dopo l'ultimo giro del blocco.
  block: { round: number; reps: number; end: number } | null;
};

// Appiattisce la scheda in una lista lineare di passi, uno per schermata. I
// blocchi "Ripeti ×N" vengono srotolati giro per giro: in pratica l'allievo
// deve solo andare avanti, senza dover tornare indietro a mano per ripetere.
function buildPracticeSteps(sheetSections: SheetSection[]): PracticeStep[] {
  const steps: PracticeStep[] = [];
  sheetSections.forEach((s) => {
    s.rows.forEach((r) => {
      if (r.kind === "item") {
        steps.push({ item: r.item, sectionLabel: s.label, block: null });
        return;
      }
      const reps = r.reps && r.reps > 0 ? r.reps : 1;
      const end = steps.length + reps * r.items.length;
      for (let round = 1; round <= reps; round++) {
        r.items.forEach((item) => steps.push({ item, sectionLabel: s.label, block: { round, reps, end } }));
      }
    });
  });
  return steps;
}

function DetailRow({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3" style={{ padding: "10px 0", borderBottom: `1px dashed ${COLORS.border}` }}>
      <div className="flex items-center justify-center flex-shrink-0" style={{ width: 22, height: 22, color: COLORS.primaryDark }}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div style={{ fontSize: 11, fontWeight: 700, color: COLORS.inkSoft, textTransform: "uppercase", letterSpacing: 0.3 }}>{label}</div>
        <div style={{ fontSize: 15, color: COLORS.ink, lineHeight: 1.45 }}>{children}</div>
      </div>
    </div>
  );
}

// Modalità "Pratica": una posizione alla volta a tutto schermo, senza timer —
// è chi pratica a decidere quando passare alla successiva (pulsanti, swipe o
// frecce della tastiera). Parte dalle stesse righe già formattate della
// scheda (SheetSection), quindi nomi, respiro, drishti e lati speculari sono
// identici a quelli della vista a elenco e del PDF.
export function SequencePracticeView({
  title,
  sheetSections,
  poseById,
  onClose,
}: {
  title: string;
  sheetSections: SheetSection[];
  poseById: Record<string, PoseCatalogItem>;
  onClose: () => void;
}) {
  const steps = useMemo(() => buildPracticeSteps(sheetSections), [sheetSections]);
  const [index, setIndex] = useState(0);
  // Resta com'è passando da una posizione all'altra: chi vuole leggere sempre
  // la descrizione la apre una volta sola, chi non la vuole non la rivede più.
  const [showDescription, setShowDescription] = useState(false);
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const last = steps.length - 1;
  const goPrev = useCallback(() => setIndex((i) => Math.max(0, i - 1)), []);
  const goNext = useCallback(() => setIndex((i) => Math.min(last, i + 1)), [last]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowRight") goNext();
      else if (e.key === "ArrowLeft") goPrev();
      else if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [goNext, goPrev, onClose]);

  // Senza timer lo schermo resterebbe fermo a lungo sulla stessa posizione e
  // il telefono andrebbe in standby a metà pratica: dove il browser lo
  // consente si tiene acceso lo schermo finché la modalità è aperta (il
  // blocco decade da solo quando la scheda va in background, quindi lo si
  // richiede di nuovo al rientro).
  useEffect(() => {
    if (typeof navigator === "undefined" || !("wakeLock" in navigator)) return;
    let sentinel: WakeLockSentinel | null = null;
    let cancelled = false;
    function request() {
      navigator.wakeLock
        .request("screen")
        .then((s) => {
          if (cancelled) s.release().catch(() => {});
          else sentinel = s;
        })
        .catch(() => {});
    }
    function onVisibility() {
      if (document.visibilityState === "visible") request();
    }
    request();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisibility);
      sentinel?.release().catch(() => {});
    };
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 });
  }, [index]);

  const step = steps[index];
  const next = index < last ? steps[index + 1] : null;

  function largeImageOf(item: SheetItem): string | null {
    const pose = item.poseId ? poseById[item.poseId] : undefined;
    if (!pose) return item.imageUrl;
    return poseDisplayLargeImage(pose, pose.parentPoseId ? poseById[pose.parentPoseId] : undefined) ?? item.imageUrl;
  }

  // Precarica la foto grande della prossima posizione, così il cambio è immediato.
  const nextImage = next ? largeImageOf(next.item) : null;
  useEffect(() => {
    if (nextImage) new Image().src = nextImage;
  }, [nextImage]);

  if (!step) return null;

  const pose = step.item.poseId ? poseById[step.item.poseId] : undefined;
  const parent = pose?.parentPoseId ? poseById[pose.parentPoseId] : undefined;
  const image = largeImageOf(step.item);
  const skipTo = step.block && step.block.end <= last ? step.block.end : null;
  const description = pose?.description || parent?.description || "";

  return createPortal(
    <div className="fixed inset-0 flex flex-col" style={{ background: COLORS.bg, zIndex: 60 }} role="dialog" aria-modal="true" aria-label={`Pratica: ${title}`}>
      <div className="flex items-center gap-3 px-4 py-3 flex-shrink-0">
        <button onClick={onClose} className="flex items-center justify-center rounded-full flex-shrink-0" style={{ width: 34, height: 34, color: COLORS.inkSoft, border: `1px solid ${COLORS.border}` }} aria-label="Esci dalla pratica">
          <X size={18} />
        </button>
        <div className="flex-1 min-w-0 truncate" style={{ fontSize: 13.5, fontWeight: 600, color: COLORS.inkSoft }}>
          {title}
        </div>
        <div className="flex-shrink-0" style={{ fontSize: 13, fontWeight: 600, color: COLORS.inkSoft, fontVariantNumeric: "tabular-nums" }}>
          {index + 1} / {steps.length}
        </div>
      </div>
      <div className="flex-shrink-0" style={{ height: 3, background: COLORS.subtle }}>
        <div style={{ height: "100%", width: `${((index + 1) / steps.length) * 100}%`, background: COLORS.primary, transition: "width 200ms ease" }} />
      </div>

      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto"
        onTouchStart={(e) => {
          touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        }}
        onTouchEnd={(e) => {
          const start = touchStart.current;
          touchStart.current = null;
          if (!start) return;
          const dx = e.changedTouches[0].clientX - start.x;
          const dy = e.changedTouches[0].clientY - start.y;
          // Solo swipe nettamente orizzontali: lo scorrimento verticale serve a leggere note e descrizione.
          if (Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
          if (dx < 0) goNext();
          else goPrev();
        }}
      >
        <div className="mx-auto px-5 pt-4 pb-6" style={{ maxWidth: 560 }}>
          <div className="flex items-center justify-between gap-2 flex-wrap mb-3">
            <div style={{ fontSize: 12, fontWeight: 700, color: COLORS.primaryDark, textTransform: "uppercase", letterSpacing: 0.3 }}>{step.sectionLabel}</div>
            {step.block && step.block.reps > 1 && (
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 px-2 py-1 rounded-full" style={{ fontSize: 11.5, fontWeight: 700, color: COLORS.primaryDark, background: withAlpha(COLORS.gold, 22) }}>
                  <Repeat size={12} /> Giro {step.block.round} di {step.block.reps}
                </div>
                {/* Scorciatoia per chi non vuole scorrere tutti i giri: salta alla prima posizione dopo il blocco. */}
                {skipTo !== null && (
                  <button
                    type="button"
                    onClick={() => setIndex(skipTo)}
                    className="flex items-center gap-1 px-2 py-1 rounded-full"
                    style={{ fontSize: 11.5, fontWeight: 600, color: COLORS.inkSoft, border: `1px solid ${COLORS.border}` }}
                  >
                    <SkipForward size={12} /> Salta il blocco
                  </button>
                )}
              </div>
            )}
          </div>

          {image && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={index}
              src={image}
              alt={step.item.text}
              style={{ width: "100%", maxHeight: "min(46vh, 440px)", aspectRatio: "1 / 1", objectFit: "contain", borderRadius: 16, background: COLORS.subtle, display: "block" }}
            />
          )}

          <div style={{ fontFamily: "var(--font-display)", fontSize: image ? 28 : 34, fontWeight: 600, color: COLORS.heading, lineHeight: 1.15, marginTop: image ? 16 : 32, textAlign: "center" }}>
            {step.item.text}
          </div>

          <div className="mt-4">
            {step.item.breath && (
              <DetailRow icon={<Wind size={17} />} label="Respiro">
                {step.item.breath}
              </DetailRow>
            )}
            {step.item.drishti && (
              <DetailRow icon={<DrishtiEyeIcon size={16} />} label="Drishti">
                {DRISHTI_LABELS[step.item.drishti].name} · {DRISHTI_LABELS[step.item.drishti].detail}
              </DetailRow>
            )}
            {step.item.meta && (
              <DetailRow icon={<Timer size={17} />} label="Tenuta">
                {step.item.meta}
              </DetailRow>
            )}
            {step.item.note && (
              <DetailRow icon={<StickyNote size={17} />} label="Note">
                {step.item.note}
              </DetailRow>
            )}
          </div>

          {description && (
            <div className="mt-3">
              <button
                type="button"
                onClick={() => setShowDescription((v) => !v)}
                className="flex items-center justify-between gap-2 w-full text-left"
                style={{ fontSize: 13, fontWeight: 600, color: COLORS.inkSoft, padding: "8px 0" }}
                aria-expanded={showDescription}
              >
                Descrizione della posizione
                {showDescription ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>
              {showDescription && <div style={{ fontSize: 14, lineHeight: 1.6, color: COLORS.ink, whiteSpace: "pre-line" }}>{description}</div>}
            </div>
          )}
        </div>
      </div>

      <div className="flex-shrink-0" style={{ borderTop: `1px solid ${COLORS.border}`, background: COLORS.card, paddingBottom: "env(safe-area-inset-bottom)" }}>
        <div className="mx-auto flex items-stretch justify-between gap-3 px-4 py-3" style={{ maxWidth: 560 }}>
          <button
            onClick={goPrev}
            disabled={index === 0}
            className="flex items-center justify-center rounded-xl flex-shrink-0 disabled:opacity-40"
            style={{ width: 52, minHeight: 60, border: `1px solid ${COLORS.border}`, color: COLORS.ink }}
            aria-label="Posizione precedente"
          >
            <ArrowLeft size={20} />
          </button>
          {next ? (
            <button
              onClick={goNext}
              className="flex items-center gap-3 rounded-xl text-left min-w-0"
              style={{ padding: "8px 12px 8px 8px", maxWidth: "75%", border: `1px solid ${withAlpha(COLORS.primary, 45)}`, background: withAlpha(COLORS.primary, 10) }}
              aria-label={`Prossima posizione: ${next.item.text}`}
            >
              {next.item.imageUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={next.item.imageUrl} alt="" width={44} height={44} style={{ width: 44, height: 44, borderRadius: 8, objectFit: "cover", background: COLORS.subtle, flexShrink: 0 }} />
              )}
              <div className="min-w-0">
                <div style={{ fontSize: 10.5, fontWeight: 700, color: COLORS.primaryDark, textTransform: "uppercase", letterSpacing: 0.3 }}>Prossima</div>
                <div style={{ fontFamily: "var(--font-display)", fontSize: 15, color: COLORS.heading, lineHeight: 1.2, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                  {next.item.text}
                </div>
              </div>
              <ArrowRight size={18} style={{ color: COLORS.primaryDark, flexShrink: 0 }} />
            </button>
          ) : (
            <button onClick={onClose} className="flex items-center gap-2 px-4 rounded-xl text-sm font-semibold text-white" style={{ background: COLORS.primary }}>
              <Check size={16} /> Fine pratica
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
