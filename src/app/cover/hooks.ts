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

// Parallax leggerissimo legato al puntatore: ritorna uno scostamento -1..1 su
// entrambi gli assi. Disattivato su touch/mobile e con reduced-motion.
export function usePointerParallax(enabled: boolean) {
  const [pos, setPos] = useState({ x: 0, y: 0 });
  useEffect(() => {
    if (!enabled) return;
    function onMove(e: PointerEvent) {
      if (e.pointerType !== "mouse") return;
      const x = (e.clientX / window.innerWidth) * 2 - 1;
      const y = (e.clientY / window.innerHeight) * 2 - 1;
      setPos({ x, y });
    }
    window.addEventListener("pointermove", onMove);
    return () => window.removeEventListener("pointermove", onMove);
  }, [enabled]);
  return pos;
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
