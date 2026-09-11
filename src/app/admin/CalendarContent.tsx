"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { COLORS } from "./colors";
import { dateKey, genId } from "./utils";
import { Modal } from "./ui";
import { CalendarView } from "./CalendarView";
import { ClassFormModal } from "./ClassFormModal";
import * as db from "./data";
import { useAdmin } from "./AdminShell";
import type { ClassItem, EventItem } from "./types";

type ClassClipboard = {
  typeId: string;
  levelId: string;
  time: string;
  capacity: number;
  notes: string;
  description: string;
  bookingsOpen: boolean;
  priceOverride: number | null;
  isFree: boolean;
};
type ClassModalState = { mode: "new"; date: Date } | { mode: "edit"; classItem: ClassItem } | null;

function parseDateParam(value: string | null): Date | null {
  if (!value) return null;
  const [y, m, d] = value.split("-").map(Number);
  if (!y || !m) return null;
  return new Date(y, m - 1, d || 1);
}

export function CalendarContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const {
    supabase,
    classesByDay,
    typeById,
    levelById,
    classTypes,
    levels,
    clients,
    packagesWithUsage,
    recentClientIds,
    settings,
    classes,
    saveClassItem,
    deleteClassItem,
    moveClass,
    upsertClient,
    showToast,
  } = useAdmin();

  const [viewDate, setViewDate] = useState<Date>(() => parseDateParam(searchParams.get("data")) || new Date());
  const [events, setEvents] = useState<EventItem[]>([]);
  const [clipboard, setClipboard] = useState<ClassClipboard | null>(null);
  const [classModal, setClassModal] = useState<ClassModalState>(null);
  const [confirmDeleteClass, setConfirmDeleteClass] = useState<string | null>(null);

  useEffect(() => {
    db.fetchEvents(supabase).then(setEvents).catch(() => {});
  }, [supabase]);

  useEffect(() => {
    const monthKey = dateKey(viewDate);
    if (searchParams.get("data") === monthKey) return;
    const params = new URLSearchParams(searchParams.toString());
    params.set("data", monthKey);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewDate, pathname]);

  const monthEvents = useMemo(() => {
    return events
      .filter((e) => e.published && !e.archived)
      .filter((e) => {
        const [y, m] = e.date.split("-").map(Number);
        return y === viewDate.getFullYear() && m === viewDate.getMonth() + 1;
      })
      .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
  }, [events, viewDate]);

  function goToNextClass() {
    const todayStr = dateKey(new Date());
    const upcoming = [...classes].filter((c) => c.date >= todayStr).sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
    if (upcoming.length === 0) {
      showToast("Nessuna lezione futura in programma.");
      return;
    }
    const [y, m] = upcoming[0].date.split("-").map(Number);
    setViewDate(new Date(y, m - 1, 1));
  }

  function copyClass(item: ClassClipboard) {
    setClipboard(item);
    showToast("Classe copiata. Scegli un giorno vuoto e incolla.");
  }
  function pasteClass(dateStr: string) {
    if (!clipboard) return;
    const item: ClassItem = { id: genId(), date: dateStr, ...clipboard, published: false, clientIds: [], waitlistIds: [], payments: {} };
    saveClassItem(item);
    showToast("Classe incollata.");
  }

  return (
    <>
      <CalendarView
        viewDate={viewDate}
        setViewDate={setViewDate}
        classesByDay={classesByDay}
        typeById={typeById}
        levelById={levelById}
        clipboard={clipboard}
        monthEvents={monthEvents}
        onGoToNextClass={goToNextClass}
        onAddClass={(date) => setClassModal({ mode: "new", date })}
        onOpenClass={(classItem) => setClassModal({ mode: "edit", classItem })}
        onMoveClass={moveClass}
        onPasteClass={pasteClass}
        onOpenEvents={() => router.push("/admin/eventi")}
      />

      {classModal && (
        <ClassFormModal
          data={classModal}
          classTypes={classTypes}
          levels={levels}
          clients={clients}
          packages={packagesWithUsage}
          recentClientIds={recentClientIds}
          defaultTime={settings.time}
          defaultCapacity={settings.capacity}
          singleClassPrice={settings.singleClassPrice}
          onClose={() => setClassModal(null)}
          onSave={(item) => {
            saveClassItem(item);
            setClassModal(null);
          }}
          onDelete={(id) => setConfirmDeleteClass(id)}
          onAddClient={upsertClient}
          onOpenSettings={() => {
            setClassModal(null);
            router.push("/admin/impostazioni");
          }}
          onCopy={copyClass}
        />
      )}

      {confirmDeleteClass && (
        <Modal onClose={() => setConfirmDeleteClass(null)} width={360}>
          <div className="p-5">
            <div className="font-semibold mb-1">Eliminare questa classe?</div>
            <div style={{ fontSize: 13, color: COLORS.inkSoft }} className="mb-4">
              L&apos;azione non può essere annullata. Le prenotazioni associate andranno perse.
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setConfirmDeleteClass(null)} className="px-3 py-2 rounded-lg text-sm font-medium" style={{ border: `1px solid ${COLORS.border}` }}>
                Annulla
              </button>
              <button
                onClick={() => {
                  deleteClassItem(confirmDeleteClass);
                  setClassModal(null);
                  setConfirmDeleteClass(null);
                }}
                className="px-3 py-2 rounded-lg text-sm font-medium text-white"
                style={{ background: COLORS.danger }}
              >
                Elimina
              </button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
