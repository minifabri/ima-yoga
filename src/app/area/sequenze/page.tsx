"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Bookmark, ChevronRight, Route } from "lucide-react";
import { COLORS } from "@/app/admin/colors";
import { Badge } from "@/app/admin/ui";
import { formatNoticeDate } from "../helpers";
import { useArea } from "../AreaShell";

export default function AreaSequenzePage() {
  const { sequences, clientId, typeById, favoriteSequenceIds, toggleFavoriteSequence } = useArea();
  const [tab, setTab] = useState<"mine" | "catalog">("mine");

  const mine = useMemo(
    () => sequences.filter((s) => s.clientIds.includes(clientId) || favoriteSequenceIds.has(s.id)),
    [sequences, clientId, favoriteSequenceIds]
  );
  // A differenza dell'assegnazione, salvare una sequenza pubblica non la
  // toglie dal catalogo: resta visibile a tutti, semplicemente compare anche
  // tra le tue (come un "mi piace", non come una rimozione dalla vetrina).
  const catalog = useMemo(() => sequences.filter((s) => s.isPublic && !s.clientIds.includes(clientId)), [sequences, clientId]);

  const list = tab === "mine" ? mine : catalog;

  return (
    <div>
      <div style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 600, color: COLORS.heading }} className="mb-4">
        Sequenze
      </div>

      <div className="inline-flex rounded-lg overflow-hidden mb-2" style={{ border: `1px solid ${COLORS.border}` }}>
        <button
          onClick={() => setTab("mine")}
          className="px-3 py-2 text-sm font-medium"
          style={{ background: tab === "mine" ? COLORS.primary : "transparent", color: tab === "mine" ? "#fff" : COLORS.ink }}
        >
          Le mie sequenze
        </button>
        <button
          onClick={() => setTab("catalog")}
          className="px-3 py-2 text-sm font-medium"
          style={{ background: tab === "catalog" ? COLORS.primary : "transparent", color: tab === "catalog" ? "#fff" : COLORS.ink }}
        >
          Catalogo
        </button>
      </div>

      <div className="mb-4" style={{ fontSize: 12, color: COLORS.inkSoft }}>
        {tab === "mine"
          ? "Le sequenze che ti sono state assegnate dalla tua insegnante, più quelle che hai salvato dal catalogo."
          : "Le sequenze che la tua insegnante ha reso visibili a tutti gli allievi."}
      </div>

      {list.length === 0 ? (
        <div className="flex flex-col items-center justify-center text-center py-14" style={{ color: COLORS.inkSoft }}>
          <Route size={28} className="mb-2" />
          <div style={{ fontSize: 13.5, maxWidth: 280 }}>
            {tab === "mine"
              ? "Non ti è stata ancora assegnata nessuna sequenza, e non ne hai salvata nessuna dal catalogo."
              : "Nessuna sequenza pubblica per ora. Qui appariranno quelle che la tua insegnante decide di condividere con tutti gli allievi."}
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {list.map((s) => {
            const activeCount = s.sections.filter((sec) => sec.enabled).reduce((sum, sec) => sum + sec.items.length, 0);
            const type = typeById[s.classTypeId];
            const assigned = s.clientIds.includes(clientId);
            const favorite = favoriteSequenceIds.has(s.id);
            return (
              <Link
                key={s.id}
                href={`/area/sequenze/${s.id}`}
                className="flex items-center gap-3 p-3.5 rounded-xl"
                style={{ background: COLORS.card, border: `1px solid ${COLORS.border}` }}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap mb-1">
                    <span style={{ fontSize: 14, fontWeight: 600 }}>{s.name || "Sequenza senza nome"}</span>
                    {type && <Badge color={type.color}>{type.name}</Badge>}
                    {tab === "mine" && (assigned ? <Badge color={COLORS.gold}>Assegnata</Badge> : <Badge color={COLORS.primary}>Salvata</Badge>)}
                  </div>
                  <div style={{ fontSize: 12, color: COLORS.inkSoft }}>
                    {activeCount} posizioni · aggiornata il {formatNoticeDate(s.updatedAt)}
                  </div>
                </div>
                {!assigned && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      toggleFavoriteSequence(s.id);
                    }}
                    title={favorite ? "Rimuovi dai salvati" : "Salva tra le mie sequenze"}
                    className="flex items-center justify-center rounded-lg flex-shrink-0"
                    style={{ width: 32, height: 32, color: favorite ? COLORS.primary : COLORS.inkSoft }}
                  >
                    <Bookmark size={16} fill={favorite ? COLORS.primary : "none"} />
                  </button>
                )}
                <ChevronRight size={16} color={COLORS.inkSoft} style={{ flexShrink: 0 }} />
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
