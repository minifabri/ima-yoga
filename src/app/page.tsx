import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserAndProfile } from "@/lib/supabase/profile";
import { Cover } from "./cover/Cover";
import type { CoverEvent } from "./cover/data";

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

export default async function HomePage({ searchParams }: { searchParams: Promise<{ anteprima?: string }> }) {
  const { user, profile } = await getCurrentUserAndProfile();

  // L'admin loggata viene mandata dritta al gestionale; con ?anteprima=1
  // (il link "Copertina" nell'header admin) vede invece la home pubblica.
  const isAdmin = !!user && profile?.role === "admin";
  const adminPreview = isAdmin && (await searchParams).anteprima === "1";
  if (isAdmin && !adminPreview) redirect("/admin");
  if (user && profile?.role === "client") redirect("/area");

  const supabase = await createClient();
  const { data } = await supabase.rpc("cover_events");
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

  return <Cover events={events} adminPreview={adminPreview} />;
}
