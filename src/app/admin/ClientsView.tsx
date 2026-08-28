"use client";

import { useMemo, useState } from "react";
import { Search, Plus, Clock, Trash2 } from "lucide-react";
import { Badge, inputStyle } from "./ui";
import { COLORS } from "./colors";
import type { ClassItem, ClassType, ClientItem } from "./types";

export function ClientsView({
  clients,
  classes,
  typeById,
  onUpsert,
  onDelete,
}: {
  clients: ClientItem[];
  classes: ClassItem[];
  typeById: Record<string, ClassType>;
  onUpsert: (client: ClientItem) => void;
  onDelete: (id: string) => void;
}) {
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");

  const bookingsByClient = useMemo(() => {
    const map: Record<string, ClassItem[]> = {};
    for (const c of classes) {
      for (const cid of c.clientIds || []) {
        (map[cid] = map[cid] || []).push(c);
      }
    }
    Object.values(map).forEach((list) => list.sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time)));
    return map;
  }, [classes]);

  const filtered = clients.filter((c) => c.name.toLowerCase().includes(search.toLowerCase())).sort((a, b) => a.name.localeCompare(b.name));

  function addClient() {
    const name = newName.trim();
    if (!name) return;
    onUpsert({ id: crypto.randomUUID(), name, phone: newPhone.trim(), notes: "" });
    setNewName("");
    setNewPhone("");
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <div className="flex items-center gap-2 flex-1" style={{ ...inputStyle, padding: "8px 12px" }}>
          <Search size={15} color={COLORS.inkSoft} />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cerca cliente…" style={{ border: "none", outline: "none", fontSize: 13, flex: 1, background: "transparent" }} />
        </div>
      </div>

      <div className="flex items-center gap-2 mb-4 p-3 rounded-xl" style={{ background: COLORS.card, border: `1px solid ${COLORS.border}` }}>
        <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Nome nuovo cliente" style={{ ...inputStyle, flex: 2 }} onKeyDown={(e) => e.key === "Enter" && addClient()} />
        <input value={newPhone} onChange={(e) => setNewPhone(e.target.value)} placeholder="Telefono (facoltativo)" style={{ ...inputStyle, flex: 1 }} onKeyDown={(e) => e.key === "Enter" && addClient()} />
        <button onClick={addClient} className="px-3.5 py-2 rounded-lg text-sm font-semibold text-white flex items-center gap-1 whitespace-nowrap" style={{ background: COLORS.primary }}>
          <Plus size={14} /> Aggiungi
        </button>
      </div>

      <div className="flex flex-col gap-2">
        {filtered.map((c) => {
          const bookings = bookingsByClient[c.id] || [];
          const isOpen = expandedId === c.id;
          return (
            <div key={c.id} className="rounded-xl overflow-hidden" style={{ background: COLORS.card, border: `1px solid ${COLORS.border}` }}>
              <button onClick={() => setExpandedId(isOpen ? null : c.id)} className="w-full flex items-center justify-between px-4 py-3 text-left">
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{c.name}</div>
                  {c.phone && <div style={{ fontSize: 12, color: COLORS.inkSoft }}>{c.phone}</div>}
                </div>
                <Badge color={COLORS.primaryDark}>{bookings.length} classi</Badge>
              </button>
              {isOpen && (
                <div className="px-4 pb-3" style={{ borderTop: `1px solid ${COLORS.border}` }}>
                  <div className="pt-3 flex flex-col gap-1.5">
                    {bookings.length === 0 && <div style={{ fontSize: 12, color: COLORS.inkSoft }}>Nessuna classe prenotata.</div>}
                    {bookings.map((b) => (
                      <div key={b.id} className="flex items-center gap-2" style={{ fontSize: 12.5 }}>
                        <Clock size={12} color={COLORS.inkSoft} />
                        {b.date} {b.time && `· ${b.time}`} — {typeById[b.typeId]?.name || "Classe"}
                      </div>
                    ))}
                  </div>
                  <button onClick={() => onDelete(c.id)} className="mt-3 flex items-center gap-1.5 text-xs font-medium" style={{ color: COLORS.danger }}>
                    <Trash2 size={12} /> Elimina cliente
                  </button>
                </div>
              )}
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div className="text-center py-10" style={{ fontSize: 13, color: COLORS.inkSoft }}>
            Nessun cliente trovato. Aggiungine uno qui sopra.
          </div>
        )}
      </div>
    </div>
  );
}
