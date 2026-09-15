"use client";

import { EventsView } from "../EventsView";
import { useAdmin } from "../AdminShell";

export default function AdminEventiPage() {
  const { supabase, clients } = useAdmin();
  return <EventsView supabase={supabase} clients={clients} />;
}
