import type { SupabaseClient } from "@supabase/supabase-js";
import type { VisitorClass } from "./types";

type DB = SupabaseClient;

export async function fetchVisitorClasses(supabase: DB, from: string, to: string): Promise<VisitorClass[]> {
  const { data, error } = await supabase.rpc("public_calendar_preview", { p_from: from, p_to: to });
  if (error) throw error;
  return (data ?? []).map(
    (r: {
      id: string;
      class_date: string;
      class_time: string;
      type_name: string | null;
      type_color: string | null;
      level_name: string | null;
      description: string | null;
      is_free: boolean;
    }) => ({
      id: r.id,
      date: r.class_date,
      time: (r.class_time || "").slice(0, 5),
      typeName: r.type_name || "Classe",
      typeColor: r.type_color || "var(--primary)",
      levelName: r.level_name || "",
      description: r.description || "",
      isFree: r.is_free,
    })
  );
}
