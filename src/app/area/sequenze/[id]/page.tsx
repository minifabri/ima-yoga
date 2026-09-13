"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { COLORS } from "@/app/admin/colors";
import { useArea } from "../../AreaShell";
import { SequenceReadView } from "../../SequenceReadView";

export default function AreaSequenzaDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { sequences, poseCatalog, typeById, clientId, favoriteSequenceIds, toggleFavoriteSequence } = useArea();
  const sequence = sequences.find((s) => s.id === id);

  return (
    <div>
      <Link href="/area/sequenze" className="flex items-center gap-1.5 mb-4 text-sm font-medium" style={{ color: COLORS.inkSoft }}>
        <ArrowLeft size={15} /> Torna alle sequenze
      </Link>

      {sequence ? (
        <SequenceReadView
          sequence={sequence}
          type={typeById[sequence.classTypeId]}
          poseCatalog={poseCatalog}
          isAssigned={sequence.clientIds.includes(clientId)}
          isFavorite={favoriteSequenceIds.has(sequence.id)}
          onToggleFavorite={() => toggleFavoriteSequence(sequence.id)}
        />
      ) : (
        <div style={{ fontSize: 13.5, color: COLORS.inkSoft }}>
          Questa sequenza non è (più) disponibile per te.
        </div>
      )}
    </div>
  );
}
