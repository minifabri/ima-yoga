"use client";

import { SequencesView } from "../SequencesView";
import { useAdmin } from "../AdminShell";

export default function AdminSequenzePage() {
  const { supabase, clients, classTypes } = useAdmin();
  return <SequencesView supabase={supabase} clients={clients} classTypes={classTypes} />;
}
