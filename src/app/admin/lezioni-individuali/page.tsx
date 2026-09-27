"use client";

import { IndividualClassesView } from "../IndividualClassesView";
import { useAdmin } from "../AdminShell";

export default function AdminLezioniIndividualiPage() {
  const { supabase, classes, levels, clients, settings, saveClassItem, deleteClassItem, upsertClient } = useAdmin();
  return (
    <IndividualClassesView
      supabase={supabase}
      classes={classes}
      levels={levels}
      clients={clients}
      settings={settings}
      saveClassItem={saveClassItem}
      deleteClassItem={deleteClassItem}
      upsertClient={upsertClient}
    />
  );
}
