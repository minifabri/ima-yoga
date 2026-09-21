"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { Logo } from "./Logo";
import { ThemeToggle } from "../admin/ThemeToggle";
import { CARD_SECTIONS } from "./data";

type NavLink = { label: string; kind: "href"; href: string } | { label: string; kind: "section"; sectionId: string };

const NAV_LINKS: NavLink[] = [
  { label: "Home", kind: "href", href: "#top" },
  { label: "Lezioni", kind: "href", href: "/classi" },
  { label: "Calendario", kind: "href", href: "/calendario" },
  { label: "Contatti", kind: "section", sectionId: "contatti" },
];

export function Header({ onOpenSection }: { onOpenSection: (id: string) => void }) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="cover-header">
      <Logo />

      <nav className="cover-nav" aria-label="Sezioni principali">
        {NAV_LINKS.map((link) =>
          link.kind === "section" ? (
            <button
              key={link.label}
              type="button"
              className="cover-nav-link"
              onClick={() => onOpenSection(link.sectionId)}
            >
              {link.label}
            </button>
          ) : (
            <a key={link.label} href={link.href} className="cover-nav-link">
              {link.label}
            </a>
          )
        )}
      </nav>

      <div className="cover-header-actions">
        <Link href="/login" className="cover-nav-link cover-nav-login">
          Accedi
        </Link>
        <ThemeToggle size={34} />
        <button
          type="button"
          className="cover-menu-btn"
          aria-label={menuOpen ? "Chiudi menu" : "Apri menu"}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((v) => !v)}
        >
          {menuOpen ? <X size={18} /> : <Menu size={18} />}
        </button>
      </div>

      {menuOpen && (
        <div className="cover-mobile-menu" role="dialog" aria-modal="true" aria-label="Menu">
          {NAV_LINKS.map((link) =>
            link.kind === "section" ? (
              <button
                key={link.label}
                type="button"
                className="cover-mobile-link"
                onClick={() => {
                  setMenuOpen(false);
                  onOpenSection(link.sectionId);
                }}
              >
                {link.label}
              </button>
            ) : (
              <a key={link.label} href={link.href} className="cover-mobile-link" onClick={() => setMenuOpen(false)}>
                {link.label}
              </a>
            )
          )}
          <div className="cover-mobile-divider" />
          {CARD_SECTIONS.map((s) => (
            <button
              key={s.id}
              type="button"
              className="cover-mobile-link"
              onClick={() => {
                setMenuOpen(false);
                onOpenSection(s.id);
              }}
            >
              {s.label}
            </button>
          ))}
        </div>
      )}
    </header>
  );
}
