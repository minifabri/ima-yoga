// Playlist collegata a una classe: un semplice link (Spotify, YouTube, Apple
// Music, …) che si apre nell'app o nel sito del servizio.

// Ripulisce quello che l'admin incolla nel campo: aggiunge https:// se manca e
// scarta tutto ciò che non è un indirizzo web (il database accetta solo
// http/https — vedi il vincolo classes_playlist_url_http).
export function normalizePlaylistUrl(input: string): string | null {
  const raw = input.trim();
  if (!raw) return null;
  const withScheme = /^[a-z][a-z0-9+.-]*:/i.test(raw) ? raw : `https://${raw}`;
  try {
    const url = new URL(withScheme);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    if (!url.hostname.includes(".")) return null;
    return url.toString();
  } catch {
    return null;
  }
}

const SERVICES: [RegExp, string][] = [
  [/(^|\.)spotify\.(com|link)$/, "Spotify"],
  [/(^|\.)music\.youtube\.com$/, "YouTube Music"],
  [/(^|\.)(youtube\.com|youtu\.be)$/, "YouTube"],
  [/(^|\.)music\.apple\.com$/, "Apple Music"],
  [/(^|\.)soundcloud\.com$/, "SoundCloud"],
  [/(^|\.)music\.amazon\.[a-z.]+$/, "Amazon Music"],
  [/(^|\.)deezer\.(com|page\.link)$/, "Deezer"],
  [/(^|\.)tidal\.com$/, "Tidal"],
];

// Nome del servizio da mostrare accanto al link ("Spotify", "YouTube", …);
// null se non è tra quelli noti.
export function playlistServiceName(url: string): string | null {
  try {
    const host = new URL(url).hostname.toLowerCase();
    return SERVICES.find(([re]) => re.test(host))?.[1] ?? null;
  } catch {
    return null;
  }
}
