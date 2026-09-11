"use client";

import { EventsView } from "../EventsView";
import { useAdmin } from "../AdminShell";

export default function AdminEventiPage() {
  const { supabase } = useAdmin();
  return <EventsView supabase={supabase} />;
}
