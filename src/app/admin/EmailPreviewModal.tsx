"use client";

import { X, Mail } from "lucide-react";
import { Modal } from "./ui";
import { COLORS } from "./colors";

// L'iframe isola l'HTML della mail dagli stili dell'app: è l'unico modo per
// vedere il template davvero come lo vedrà chi lo riceve (senza il CSS di
// Tailwind o i font dell'admin a interferire).
export function EmailPreviewModal({ subject, html, onClose }: { subject: string; html: string; onClose: () => void }) {
  const doc = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head><body style="margin:0;">${html}</body></html>`;

  return (
    <Modal onClose={onClose} width={520}>
      <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: `1px solid ${COLORS.border}` }}>
        <div className="flex items-center gap-1.5" style={{ fontFamily: "var(--font-display)", fontSize: 17, fontWeight: 600, color: COLORS.heading }}>
          <Mail size={16} /> Anteprima email
        </div>
        <button onClick={onClose} className="flex items-center justify-center" style={{ width: 36, height: 36 }}>
          <X size={18} />
        </button>
      </div>
      <div className="px-5 pt-3" style={{ fontSize: 12, color: COLORS.inkSoft }}>
        Oggetto: <span style={{ color: COLORS.ink, fontWeight: 600 }}>{subject}</span>
      </div>
      <div className="p-4" style={{ flex: 1, overflow: "hidden" }}>
        <iframe
          title="Anteprima email"
          srcDoc={doc}
          sandbox=""
          style={{ width: "100%", height: 480, border: `1px solid ${COLORS.border}`, borderRadius: 12, background: "#fff" }}
        />
      </div>
      <div className="px-5 pb-4" style={{ fontSize: 11, color: COLORS.inkSoft }}>
        Dati di esempio — nome, titolo e link reali verranno usati all&apos;invio.
      </div>
    </Modal>
  );
}
