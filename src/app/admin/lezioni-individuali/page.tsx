"use client";

import { IndividualClassesView } from "../IndividualClassesView";
import { useAdmin } from "../AdminShell";

export default function AdminLezioniIndividualiPage() {
  const { supabase, classes, classTypes, levels, clients, packagesWithUsage, settings, saveClassItem, deleteClassItem, upsertClient } = useAdmin();
  return (
    <IndividualClassesView
      supabase={supabase}
      classes={classes}
      classTypes={classTypes}
      levels={levels}
      clients={clients}
      packages={packagesWithUsage}
      settings={settings}
      saveClassItem={saveClassItem}
      deleteClassItem={deleteClassItem}
      upsertClient={upsertClient}
    />
  );
}
