"use client";

import { useSyncExternalStore } from "react";
import { COLORS } from "./colors";

const STORAGE_KEY = "ima-yoga-theme";
type Theme = "light" | "dark";

const listeners = new Set<() => void>();

function subscribe(callback: () => void) {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

function getSnapshot(): Theme {
  return document.documentElement.getAttribute("data-theme") === "light" ? "light" : "dark";
}

function getServerSnapshot(): Theme {
  return "dark";
}

function applyTheme(theme: Theme) {
  document.documentElement.setAttribute("data-theme", theme);
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // localStorage non disponibile (es. modalità privata): il tema non persiste, poco male
  }
  listeners.forEach((l) => l());
}

// Luna: la stessa mezzaluna + scintilla dorata del logo "ima yoga", in miniatura.
function MoonMark({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none">
      <path d="M12.6 5a5.4 5.4 0 1 0 0 10 4.3 4.3 0 0 1 0-10z" stroke={COLORS.heading} strokeWidth="1.2" strokeLinejoin="round" />
      <g className="theme-toggle-spark" style={{ transformOrigin: "15.5px 4.3px" }}>
        <path d="M15.5 2.3 L16 3.7 L17.4 4.3 L16 4.9 L15.5 6.3 L15 4.9 L13.6 4.3 L15 3.7 Z" fill={COLORS.gold} />
      </g>
    </svg>
  );
}

// Sole: un piccolo fiore dorato — petali morbidi invece di raggi a filo, per
// non somigliare a una lampadina. Stesso accento viola della luna sul bordo.
function SunMark({ size }: { size: number }) {
  const petals = [0, 60, 120, 180, 240, 300];
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none">
      <g className="theme-toggle-spark" style={{ transformOrigin: "10px 10px" }}>
        {petals.map((deg) => (
          <path key={deg} d="M10 5.6c-1.35 0-2.1-1.55-2.1-3.5S8.65.9 10 .9s2.1 1.15 2.1 3.5-.75 3.2-2.1 3.2z" fill={COLORS.gold} transform={`rotate(${deg} 10 10)`} />
        ))}
      </g>
      <circle cx="10" cy="10" r="3.1" fill={COLORS.gold} stroke={COLORS.heading} strokeWidth="0.9" />
    </svg>
  );
}

export function ThemeToggle({ size = 36 }: { size?: number }) {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  function toggle() {
    applyTheme(theme === "dark" ? "light" : "dark");
  }

  return (
    <button
      type="button"
      onClick={toggle}
      title={theme === "dark" ? "Passa al tema chiaro" : "Passa al tema scuro"}
      aria-label={theme === "dark" ? "Passa al tema chiaro" : "Passa al tema scuro"}
      className="flex items-center justify-center rounded-lg flex-shrink-0"
      style={{ width: size, height: size, border: `1px solid ${COLORS.border}` }}
    >
      <style>{`
        @keyframes theme-toggle-breathe { 0%,100%{ transform: scale(1); opacity:.6 } 50%{ transform: scale(1.3); opacity:1 } }
        .theme-toggle-spark { animation: theme-toggle-breathe 4s ease-in-out infinite; }
      `}</style>
      {theme === "dark" ? <MoonMark size={17} /> : <SunMark size={17} />}
    </button>
  );
}
