"use client";

import { useEffect, useRef, useState, useSyncExternalStore, type RefObject } from "react";

function subscribeReducedMotion(callback: () => void) {
  const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
  mql.addEventListener("change", callback);
  return () => mql.removeEventListener("change", callback);
}
function getReducedMotionSnapshot() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
function getReducedMotionServerSnapshot() {
  return false;
}

export function useReducedMotion(): boolean {
  return useSyncExternalStore(subscribeReducedMotion, getReducedMotionSnapshot, getReducedMotionServerSnapshot);
}

// Tema corrente (letto dall'attributo data-theme su <html>, cambiato dal
// ThemeToggle): usato per scegliere la variante chiara delle carte.
function subscribeTheme(callback: () => void) {
  const observer = new MutationObserver(callback);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  return () => observer.disconnect();
}
function getThemeSnapshot(): "light" | "dark" {
  return document.documentElement.getAttribute("data-theme") === "light" ? "light" : "dark";
}
function getThemeServerSnapshot(): "light" | "dark" {
  return "dark";
}

export function useTheme(): "light" | "dark" {
  return useSyncExternalStore(subscribeTheme, getThemeSnapshot, getThemeServerSnapshot);
}

// Avanzamento (0..1) dello scroll attraverso l'elemento indicato: 0 quando il
// suo bordo superiore raggiunge la cima del viewport, 1 quando il suo bordo
// inferiore la raggiunge. Guida la transizione "figura che sale e sparisce,
// carte che si raccolgono" mentre la sezione resta agganciata (position: sticky).
export function useScrollProgress(ref: RefObject<HTMLElement | null>) {
  const [progress, setProgress] = useState(0);
  const ticking = useRef(false);

  useEffect(() => {
    function update() {
      ticking.current = false;
      const el = ref.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const total = rect.height - window.innerHeight;
      const raw = total > 0 ? -rect.top / total : 0;
      setProgress(Math.min(1, Math.max(0, raw)));
    }
    function onScroll() {
      if (ticking.current) return;
      ticking.current = true;
      requestAnimationFrame(update);
    }
    requestAnimationFrame(update);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [ref]);

  return progress;
}
