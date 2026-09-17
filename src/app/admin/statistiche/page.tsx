"use client";

import { StatsView } from "../StatsView";
import { useAdmin } from "../AdminShell";

export default function AdminStatistichePage() {
  const { supabase } = useAdmin();
  return <StatsView supabase={supabase} />;
}
