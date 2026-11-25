import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserAndProfile } from "@/lib/supabase/profile";
import { Cover } from "./cover/Cover";
import type { CoverEvent, CoverSequence } from "./cover/data";

type CoverEventRow = {
  slug: string;
  name: string;
  event_date: string;
  event_time: string;
  location: string | null;
  image_light_url: string | null;
  image_dark_url: string | null;
  bookings_open: boolean;
};

type CoverSequenceRow = {
  id: string;
  name: string;
  description: string | null;
  type_name: string | null;
  type_color: string | null;
  pose_count: number;
  thumbnails: string[] | null;
};

export default async function HomePage({ searchParams }: { searchParams: Promise<{ anteprima?: string }> }) {
  const { user, profile } = await getCurrentUserAndProfile();

  // L'admin loggata viene mandata dritta al gestionale; con ?anteprima=1
  // (il link "Copertina" nell'header admin) vede invece la home pubblica.
  const isAdmin = !!user && profile?.role === "admin";
  const adminPreview = isAdmin && (await searchParams).anteprima === "1";
  if (isAdmin && !adminPreview) redirect("/admin");
  if (user && profile?.role === "client") redirect("/area");

  const supabase = await createClient();
  const [{ data }, { data: seqData }] = await Promise.all([supabase.rpc("cover_events"), supabase.rpc("cover_sequences")]);
  const rows = (data ?? []) as CoverEventRow[];
  const events: CoverEvent[] = rows.map((e) => ({
    slug: e.slug,
    name: e.name,
    date: e.event_date,
    time: (e.event_time || "").slice(0, 5),
    location: e.location || "",
    imageLightUrl: e.image_light_url,
    imageDarkUrl: e.image_dark_url,
    bookingsOpen: e.bookings_open,
  }));

  const sequences: CoverSequence[] = ((seqData ?? []) as CoverSequenceRow[]).map((s) => ({
    id: s.id,
    name: s.name || "Sequenza",
    description: s.description ?? "",
    typeName: s.type_name,
    typeColor: s.type_color,
    poseCount: Number(s.pose_count),
    thumbnails: s.thumbnails ?? [],
  }));

  return <Cover events={events} sequences={sequences} adminPreview={adminPreview} />;
}
