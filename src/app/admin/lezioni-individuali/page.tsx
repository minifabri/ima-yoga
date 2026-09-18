"use client";

import { IndividualClassesView } from "../IndividualClassesView";
import { useAdmin } from "../AdminShell";

export default function AdminLezioniIndividualiPage() {
  const { supabase, classTypes, levels, clients, packagesWithUsage, settings, saveClassItem, upsertClient } = useAdmin();
  return (
    <IndividualClassesView
      supabase={supabase}
      classTypes={classTypes}
      levels={levels}
      clients={clients}
      packages={packagesWithUsage}
      settings={settings}
      saveClassItem={saveClassItem}
      upsertClient={upsertClient}
    />
  );
}
