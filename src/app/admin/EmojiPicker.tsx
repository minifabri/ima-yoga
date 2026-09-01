"use client";

import { useState, type RefObject } from "react";
import { Smile } from "lucide-react";
import { COLORS } from "./colors";

// Set curato in stile ima yoga (fiori, luna/sole, elementi calmi) invece di
// un selettore emoji generico con migliaia di voci.
const EMOJIS = [
  "🧘", "🧘‍♀️", "🙏", "✨", "🌙", "☀️", "🌸", "🌷",
  "🌺", "🌿", "🍃", "💜", "💛", "🤍", "⭐", "💫",
  "🌊", "🕊️", "🎁", "📦", "🎉", "👏", "❤️", "🔥",
];

export function EmojiPicker({
  targetRef,
  value,
  onChange,
}: {
  targetRef: RefObject<HTMLTextAreaElement | HTMLInputElement | null>;
  value: string;
  onChange: (next: string) => void;
}) {
  const [open, setOpen] = useState(false);

  function pick(emoji: string) {
    const el = targetRef.current;
    const start = el?.selectionStart ?? value.length;
    const end = el?.selectionEnd ?? value.length;
    onChange(value.slice(0, start) + emoji + value.slice(end));
    setOpen(false);
    requestAnimationFrame(() => {
      if (!el) return;
      const pos = start + emoji.length;
      el.focus();
      el.setSelectionRange(pos, pos);
    });
  }

  return (
    <div className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        title="Inserisci emoji"
        className="flex items-center justify-center rounded-lg"
        style={{ width: 34, height: 34, border: `1px solid ${COLORS.border}`, color: COLORS.inkSoft, flexShrink: 0 }}
      >
        <Smile size={15} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0" style={{ zIndex: 40 }} onClick={() => setOpen(false)} />
          <div
            className="absolute left-0 mt-1 p-2 rounded-xl grid grid-cols-6 gap-1"
            style={{ zIndex: 41, width: 216, background: COLORS.card, border: `1px solid ${COLORS.border}`, boxShadow: "0 8px 24px rgba(74,58,115,0.14)" }}
          >
            {EMOJIS.map((e) => (
              <button
                key={e}
                type="button"
                onClick={() => pick(e)}
                className="flex items-center justify-center rounded-lg"
                style={{ width: 30, height: 30, fontSize: 16 }}
              >
                {e}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
