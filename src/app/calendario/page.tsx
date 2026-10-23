import { redirect } from "next/navigation";
import { getCurrentUserAndProfile } from "@/lib/supabase/profile";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// Link da condividere per una classe: /calendario?classe=<id>&data=<AAAA-MM-GG>.
// Chi non ha fatto l'accesso passa dal login e torna qui; chi è dentro arriva
// al calendario con la scheda della classe già aperta.
export default async function CalendarioPubblicoPage({ searchParams }: PageProps<"/calendario">) {
  const params = await searchParams;
  const classe = typeof params.classe === "string" && UUID_RE.test(params.classe) ? params.classe : null;
  const data = typeof params.data === "string" && DATE_RE.test(params.data) ? params.data : null;
  const linked = classe && data ? `?${new URLSearchParams({ classe, data }).toString()}` : "";

  const { user, profile } = await getCurrentUserAndProfile();

  if (!user) redirect(`/login?next=${encodeURIComponent(`/calendario${linked}`)}`);

  if (profile?.role === "admin") redirect(linked ? `/admin/calendario?data=${data}` : "/admin/calendario");

  redirect(`/area/calendario${linked}`);
}
