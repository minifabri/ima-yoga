"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { X, AtSign, MessageCircle, Mail } from "lucide-react";
import type { CardSection } from "./data";
import { CONTACT } from "./data";
import { CosmicBackground } from "./CosmicBackground";
import { ContactForm } from "./ContactForm";
import { useTheme } from "./hooks";

const isInternal = (href: string) => href.startsWith("/");

export function SectionOverlay({
  section,
  phase,
  onClose,
}: {
  section: CardSection;
  phase: "opening" | "open" | "closing";
  onClose: () => void;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const theme = useTheme();
  const image = theme === "light" ? (section.imageLight ?? section.image) : section.image;

  useEffect(() => {
    closeRef.current?.focus();
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key !== "Tab" || !dialogRef.current) return;
      const focusables = dialogRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input, textarea, [tabindex]:not([tabindex="-1"])',
      );
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className={`cover-overlay cover-overlay-${phase}`}
      role="dialog"
      aria-modal="true"
      aria-labelledby={`section-title-${section.id}`}
      ref={dialogRef}
    >
      <CosmicBackground variant="section" />

      <button type="button" className="cover-overlay-close" onClick={onClose} aria-label="Chiudi sezione" ref={closeRef}>
        <X size={18} />
      </button>

      <div className="cover-overlay-panel">
        <div className="cover-overlay-grid">
          <div className="cover-overlay-visual">
            <div className="cover-overlay-image-wrap" style={{ aspectRatio: `${section.imageWidth} / ${section.imageHeight}` }}>
              <Image src={image} alt="" fill quality={95} unoptimized sizes="(min-width: 900px) 40vw, 90vw" className="cover-overlay-image" />
            </div>
          </div>

          <div className="cover-overlay-content">
            <p className="cover-overlay-kicker">{section.kicker}</p>
            <h2 id={`section-title-${section.id}`} className="cover-overlay-title">
              {section.title}
            </h2>
            <p className="cover-overlay-intro">{section.intro}</p>
            {section.paragraphs.map((p, i) => (
              <p key={i} className="cover-overlay-paragraph">
                {p}
              </p>
            ))}

            {section.bullets && (
              <ul className="cover-overlay-bullets">
                {section.bullets.map((b) => (
                  <li key={b}>{b}</li>
                ))}
              </ul>
            )}

            {section.id === "contatti" && (
              <>
                <ContactForm />
                <div className="cover-overlay-socials">
                  <a href={CONTACT.instagramUrl} className="cover-social" aria-label="Instagram">
                    <AtSign size={16} />
                  </a>
                  <a href={CONTACT.whatsappUrl} className="cover-social" aria-label="WhatsApp">
                    <MessageCircle size={16} />
                  </a>
                  <a href={`mailto:${CONTACT.email}`} className="cover-social" aria-label="Email">
                    <Mail size={16} />
                  </a>
                </div>
              </>
            )}

            {section.id !== "contatti" &&
              (isInternal(section.cta.href) ? (
                <Link href={section.cta.href} className="cover-cta-ghost">
                  {section.cta.label} <span aria-hidden="true">✦</span>
                </Link>
              ) : (
                <a href={section.cta.href} className="cover-cta-ghost">
                  {section.cta.label} <span aria-hidden="true">✦</span>
                </a>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
}
