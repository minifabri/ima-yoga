"use client";

import { PoseCatalogView } from "../PoseCatalogView";
import { useAdmin } from "../AdminShell";

export default function AdminCatalogoPage() {
  const { supabase } = useAdmin();
  return <PoseCatalogView supabase={supabase} />;
}
