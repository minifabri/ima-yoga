"use client";

// Stessa sottoscrizione di ThemeToggle (non una MutationObserver separata):
// la notifica è sincrona all'attributo data-theme, così le immagini degli
// eventi cambiano variante insieme allo sfondo.
export { useTheme } from "../admin/ThemeToggle";
