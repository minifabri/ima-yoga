"use client";

import { SettingsView } from "../SettingsView";
import { useAdmin } from "../AdminShell";

export default function AdminImpostazioniPage() {
  const {
    classTypes,
    levels,
    classes,
    settings,
    addClassType,
    updateClassType,
    removeType,
    addLevel,
    removeLevel,
    updateLevel,
    saveDefaults,
    bookingsOpen,
    bookingsTogglePending,
    toggleBookingsOpen,
  } = useAdmin();

  return (
    <SettingsView
      classTypes={classTypes}
      levels={levels}
      classes={classes}
      defaults={settings}
      onAddType={addClassType}
      onUpdateType={updateClassType}
      onRemoveType={removeType}
      onAddLevel={addLevel}
      onRemoveLevel={removeLevel}
      onUpdateLevel={updateLevel}
      onSaveDefaults={saveDefaults}
      bookingsOpen={bookingsOpen}
      bookingsTogglePending={bookingsTogglePending}
      onToggleBookingsOpen={toggleBookingsOpen}
    />
  );
}
