"use client";

import { ExternalLink, Eye, Music } from "lucide-react";
import { normalizePlaylistUrl, playlistServiceName } from "@/lib/playlist";
import { inputStyle } from "./ui";
import { COLORS, withAlpha } from "./colors";

// Campo "Playlist" dei form classe / lezione individuale: una riga sola, con
// il bottone per aprirla al volo appena il link è valido.
export function PlaylistField({ value, onChange, audience }: { value: string; onChange: (value: string) => void; audience: string }) {
  const url = normalizePlaylistUrl(value);
  const invalid = value.trim() !== "" && !url;
  const service = url ? playlistServiceName(url) : null;

  return (
    <div className="mb-3">
      <div className="flex items-center gap-1.5 mb-1.5" style={{ fontSize: 11.5, fontWeight: 600, color: COLORS.primaryDark }}>
        <Music size={13} /> Playlist
      </div>
      <div className="flex items-center gap-1.5">
        <input
          type="url"
          inputMode="url"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Incolla il link (Spotify, YouTube, …)"
          style={{ ...inputStyle, borderColor: invalid ? COLORS.danger : COLORS.border }}
        />
        {url && (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 px-2.5 rounded-lg text-xs font-medium"
            style={{ height: 35, flexShrink: 0, color: COLORS.primaryDark, background: withAlpha(COLORS.primary, 12), border: `1px solid ${withAlpha(COLORS.primary, 30)}` }}
            title={service ? `Apri su ${service}` : "Apri la playlist"}
          >
            <ExternalLink size={13} /> Apri
          </a>
        )}
      </div>
      <div className="flex items-center gap-1 mt-1" style={{ fontSize: 10.5, color: invalid ? COLORS.danger : COLORS.primaryDark }}>
        {invalid ? (
          "Il link non sembra valido: non verrà salvato."
        ) : (
          <>
            <Eye size={11} /> Facoltativa — {audience}.
          </>
        )}
      </div>
    </div>
  );
}
