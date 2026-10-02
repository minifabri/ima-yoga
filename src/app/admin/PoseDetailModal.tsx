"use client";

import { useEffect, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { X } from "lucide-react";
import { COLORS } from "./colors";
import { DRISHTI_LABELS, poseDisplayDrishti, poseDisplayLargeImage, poseDisplayName, poseDisplayNameEn, poseDisplayNameIt } from "./poseDisplay";
import { DrishtiEyeIcon } from "./DrishtiEyeIcon";
import { downloadPoseOriginal } from "./data";
import type { PoseCatalogItem } from "./types";

// Dettaglio di sola lettura di una posa, condiviso tra area allievo e admin:
// a differenza della modale di modifica (PoseEditModal), niente campi
// editabili, solo i dati utili a chi pratica (nomi, drishti, descrizione) e
// l'immagine nella versione grande — negli elenchi resta la miniatura.
// La versione grande pubblica ha il watermark: è quella che vede l'allievo.
// In admin si passa `originalsFrom` per mostrare invece l'originale pulito
// dal bucket privato (se non c'è, resta l'immagine pubblica).
export function PoseDetailModal({
  pose,
  parent,
  originalsFrom,
  onClose,
}: {
  pose: PoseCatalogItem;
  parent: PoseCatalogItem | undefined;
  originalsFrom?: SupabaseClient;
  onClose: () => void;
}) {
  const publicImage = poseDisplayLargeImage(pose, parent);
  // undefined = originale ancora in caricamento: nel frattempo non si mostra
  // la versione col watermark, per non vederla lampeggiare.
  const [original, setOriginal] = useState<{ for: string; url: string | null } | undefined>(undefined);
  useEffect(() => {
    if (!originalsFrom || !publicImage) return;
    let cancelled = false;
    let objectUrl: string | null = null;
    downloadPoseOriginal(originalsFrom, publicImage).then((blob) => {
      if (cancelled) return;
      objectUrl = blob ? URL.createObjectURL(blob) : null;
      setOriginal({ for: publicImage, url: objectUrl });
    });
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [originalsFrom, publicImage]);
  const loadingOriginal = Boolean(originalsFrom && publicImage) && original?.for !== publicImage;
  const image = originalsFrom && original?.for === publicImage ? original.url || publicImage : publicImage;
  const names = [poseDisplayNameIt(pose, parent), poseDisplayNameEn(pose, parent)].filter(Boolean).join(" · ");
  const drishti = poseDisplayDrishti(pose, parent);

  return (
    <div
      className="fixed inset-0 flex items-center justify-center p-4"
      style={{ background: "rgba(74,58,115,0.35)", zIndex: 60 }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="relative w-full p-5"
        style={{ maxWidth: 420, maxHeight: "90vh", overflowY: "auto", background: COLORS.card, borderRadius: 18, boxShadow: "0 16px 44px rgba(74,58,115,0.16)" }}
      >
        <button
          onClick={onClose}
          className="absolute flex items-center justify-center rounded-full"
          style={{ top: 12, right: 12, width: 30, height: 30, color: COLORS.inkSoft, background: COLORS.card, zIndex: 1 }}
          aria-label="Chiudi"
        >
          <X size={18} />
        </button>
        {image && loadingOriginal && <div style={{ width: "100%", aspectRatio: "1 / 1", borderRadius: 12, background: COLORS.subtle, marginBottom: 14 }} />}
        {image && !loadingOriginal && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={image}
            alt={poseDisplayName(pose, parent)}
            style={{ width: "100%", aspectRatio: "1 / 1", objectFit: "contain", borderRadius: 12, background: COLORS.subtle, marginBottom: 14, display: "block" }}
          />
        )}
        {pose.parentPoseId && parent && (
          <div style={{ fontSize: 12, color: COLORS.inkSoft, marginBottom: 3 }}>
            Variante di <span style={{ color: COLORS.ink, fontWeight: 600 }}>{poseDisplayName(parent, undefined)}</span>
          </div>
        )}
        <div style={{ fontFamily: "var(--font-display)", fontSize: 19, fontWeight: 600, color: COLORS.heading, lineHeight: 1.2, paddingRight: image ? 0 : 28 }}>
          {poseDisplayName(pose, parent)}
        </div>
        {names && <div style={{ fontSize: 12.5, color: COLORS.inkSoft, marginTop: 3 }}>{names}</div>}
        {drishti && (
          <div className="flex items-center gap-1.5" style={{ fontSize: 12.5, fontWeight: 600, color: COLORS.primaryDark, marginTop: 8 }}>
            <DrishtiEyeIcon size={12} /> {DRISHTI_LABELS[drishti].name} · {DRISHTI_LABELS[drishti].detail}
          </div>
        )}
        {pose.description && <div style={{ fontSize: 13, lineHeight: 1.55, color: COLORS.ink, marginTop: 12 }}>{pose.description}</div>}
      </div>
    </div>
  );
}
