"use client";

import { SurveysView } from "../SurveysView";
import { useAdmin } from "../AdminShell";

export default function AdminSondaggiPage() {
  const { supabase, clients } = useAdmin();
  return <SurveysView supabase={supabase} clients={clients} />;
}
