"use client";

import { ToolsView } from "../ToolsView";
import { useAdmin } from "../AdminShell";

export default function AdminStrumentiPage() {
  const { supabase } = useAdmin();
  return <ToolsView supabase={supabase} />;
}
