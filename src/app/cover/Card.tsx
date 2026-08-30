"use client";

import type { CSSProperties } from "react";
import Link from "next/link";
import { X } from "lucide-react";
import { ArrowRight, type CardSection } from "./cardSections";
import { CardBackOrnament } from "./ornament";

type CardStatus = "closed" | "active" | "flipped";

export function Card({
  section,
  status,
  fanStyle,
  onTap,
  onClose,
}: {
  section: CardSection;
  status: CardStatus;
  fanStyle?: CSSProperties;
  onTap: () => void;
  onClose: () => void;
}) {
  const flipped = status === "flipped";
  const lifted = status === "active" || status === "flipped";

  return (
    <div
      className={`cover-card${lifted ? " is-lifted" : ""}${flipped ? " is-flipped" : ""}`}
      style={{ width: 200, height: 288, ...fanStyle }}
    >
      <div className="cover-card-scene">
        <div className={`cover-card-inner${flipped ? " is-flipped" : ""}`}>
          <button
            type="button"
            className="cover-card-face cover-card-face-front"
            style={{ pointerEvents: flipped ? "none" : "auto" }}
            tabIndex={flipped ? -1 : 0}
            aria-hidden={flipped}
            aria-expanded={flipped}
            aria-label={`Apri la sezione ${section.label}`}
            onClick={onTap}
          >
            <CardBackOrnament />
            <span className="cover-card-plate">
              <span className="cover-card-icon" style={{ color: "var(--primary-dark)" }}>
                {section.icon}
              </span>
              <span style={{ fontFamily: "var(--font-display)", color: "var(--heading)", fontSize: 18, fontWeight: 500 }}>
                {section.label}
              </span>
            </span>
          </button>

          <div
            className="cover-card-face cover-card-face-back"
            style={{ pointerEvents: flipped ? "auto" : "none" }}
            aria-hidden={!flipped}
          >
            <button
              type="button"
              className="cover-card-close"
              tabIndex={flipped ? 0 : -1}
              aria-label="Chiudi"
              onClick={onClose}
            >
              <X size={15} />
            </button>
            <div style={{ fontFamily: "var(--font-display)", color: "var(--heading)", fontSize: 17, fontWeight: 500 }}>
              {section.title}
            </div>
            <div className="cover-card-body" style={{ color: "var(--ink-soft)", fontSize: 12.5, lineHeight: 1.5 }}>
              {section.body}
            </div>
            {section.href && (
              <Link
                href={section.href}
                tabIndex={flipped ? 0 : -1}
                className="cover-card-cta"
                style={{ color: "var(--primary)" }}
              >
                {section.cta ?? "Scopri di più"} <ArrowRight size={13} />
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
