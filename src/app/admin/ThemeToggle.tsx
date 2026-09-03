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

// Riutilizzabile ovunque serva sapere il tema corrente (es. per scegliere
// quale variante chiara/scura di un'immagine mostrare), senza dover
// duplicare la sottoscrizione fatta qui sotto da ThemeToggle.
export function useTheme(): Theme {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
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

// Sole: raggi sottili ad ago, stesso linguaggio minimale della luna (cerchio +
// accenti a punta), per non somigliare a un fiore.
function SunMark({ size }: { size: number }) {
  const rays = [0, 45, 90, 135, 180, 225, 270, 315];
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none">
      <g className="theme-toggle-spark" style={{ transformOrigin: "10px 10px" }} stroke={COLORS.gold} strokeWidth="1.5" strokeLinecap="round">
        {rays.map((deg) => (
          <line key={deg} x1="10" y1="3.6" x2="10" y2="5.7" transform={`rotate(${deg} 10 10)`} />
        ))}
      </g>
      <circle cx="10" cy="10" r="3.3" fill={COLORS.gold} stroke={COLORS.heading} strokeWidth="0.9" />
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
