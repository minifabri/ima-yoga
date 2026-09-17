"use client";

import { WorklogView } from "../WorklogView";
import { useAdmin } from "../AdminShell";

export default function AdminRegistroPage() {
  const { supabase } = useAdmin();
  return <WorklogView supabase={supabase} />;
}
