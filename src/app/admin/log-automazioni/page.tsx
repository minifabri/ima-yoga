"use client";

import { JobLogsView } from "../JobLogsView";
import { useAdmin } from "../AdminShell";

export default function AdminLogAutomazioniPage() {
  const { supabase } = useAdmin();
  return <JobLogsView supabase={supabase} />;
}
