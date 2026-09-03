import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserAndProfile } from "@/lib/supabase/profile";
import { EventPublicView } from "./EventPublicView";
import type { PublicEventData } from "./types";

type EventRpcRow = {
  id: string;
  slug: string;
  name: string;
  description_html: string;
  image_light_url: string | null;
  image_dark_url: string | null;
  image_fit: "contain" | "cover";
  event_date: string;
  event_time: string;
  location: string | null;
  capacity: number;
  price: number;
  allow_plus_one: boolean;
  bookings_open: boolean;
  published: boolean;
  booked_seats: number;
  waitlist_count: number;
  my_status: "booked" | "waitlist" | null;
  my_plus_one: boolean | null;
  my_plus_one_name: string | null;
};

export default async function EventPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createClient();
  const { data } = await supabase.rpc("public_event", { p_slug: slug }).maybeSingle<EventRpcRow>();

  if (!data) {
    return (
      <main className="flex-1 flex items-center justify-center p-5" style={{ background: "var(--bg)" }}>
        <div
          className="w-full p-6 rounded-2xl text-center"
          style={{ maxWidth: 380, background: "var(--card)", border: "1px solid var(--border)" }}
        >
          <div className="mb-2 flex justify-center">
            <Image
              src="/courtesy/evento-candela.png"
              alt=""
              width={426}
              height={640}
              className="w-full h-auto"
              style={{ maxWidth: 150 }}
            />
          </div>
          <div style={{ fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 600, color: "var(--heading)" }} className="mb-2">
            Evento non trovato
          </div>
          <div style={{ fontSize: 13.5, color: "var(--ink-soft)" }}>
            La sfera di cristallo non lo vede: non esiste, non è ancora stato pubblicato, oppure è già tornato all&apos;universo.
          </div>
        </div>
      </main>
    );
  }

  const { user, profile } = await getCurrentUserAndProfile();

  const event: PublicEventData = {
    id: data.id,
    slug: data.slug,
    name: data.name,
    descriptionHtml: data.description_html,
    imageLightUrl: data.image_light_url,
    imageDarkUrl: data.image_dark_url,
    imageFit: data.image_fit,
    date: data.event_date,
    time: (data.event_time || "").slice(0, 5),
    location: data.location || "",
    capacity: data.capacity,
    price: Number(data.price),
    allowPlusOne: data.allow_plus_one,
    bookingsOpen: data.bookings_open,
    published: data.published,
    bookedSeats: data.booked_seats,
    waitlistCount: Number(data.waitlist_count),
    myStatus: data.my_status,
    myPlusOne: data.my_plus_one,
    myPlusOneName: data.my_plus_one_name,
  };

  return (
    <EventPublicView
      event={event}
      loggedIn={!!user}
      isClientProfile={!!profile && profile.role === "client"}
      clientFullName={profile?.full_name || ""}
      clientEmail={user?.email || ""}
    />
  );
}
