import type { SupabaseClient } from "@supabase/supabase-js";
import type { Announcement, ClassType, ClientNotice, Level, MyBooking, MyEventBooking, MyLedgerEntry, MyPackage, PublicClass, PublicEvent } from "./types";

type DB = SupabaseClient;

export async function fetchClassTypes(supabase: DB): Promise<ClassType[]> {
  const { data } = await supabase.from("class_types").select("id, name, color, description").order("created_at");
  return (data ?? []).map((t) => ({ id: t.id, name: t.name, color: t.color, description: t.description ?? "" }));
}

export async function fetchLevels(supabase: DB): Promise<Level[]> {
  const { data } = await supabase.from("levels").select("id, name");
  return data ?? [];
}

export async function fetchBookingsOpen(supabase: DB): Promise<boolean> {
  const { data } = await supabase.from("settings").select("bookings_open").eq("id", 1).maybeSingle();
  return data?.bookings_open ?? true;
}

export async function fetchActiveAnnouncements(supabase: DB): Promise<Announcement[]> {
  const { data } = await supabase.from("announcements").select("id, message").eq("active", true).order("created_at", { ascending: false });
  return data ?? [];
}

export async function fetchMyNotices(supabase: DB): Promise<ClientNotice[]> {
  const { data } = await supabase
    .from("client_notices")
    .select("id, message, kind, created_at, read")
    .order("created_at", { ascending: false })
    .limit(30);
  return (data ?? []).map((n) => ({ id: n.id, message: n.message, kind: n.kind, createdAt: n.created_at, read: n.read }));
}

export async function markNoticeRead(supabase: DB, id: string): Promise<void> {
  await supabase.from("client_notices").update({ read: true }).eq("id", id);
}

export async function markAllNoticesRead(supabase: DB): Promise<void> {
  await supabase.from("client_notices").update({ read: true }).eq("read", false);
}

export async function deleteMyNotice(supabase: DB, id: string): Promise<void> {
  await supabase.from("client_notices").delete().eq("id", id);
}

export async function fetchPublicClasses(supabase: DB, from: string, to: string): Promise<PublicClass[]> {
  const { data, error } = await supabase.rpc("public_classes", { p_from: from, p_to: to });
  if (error) throw error;
  return (data ?? []).map(
    (r: {
      id: string;
      class_date: string;
      class_time: string;
      type_id: string;
      level_id: string;
      capacity: number;
      description: string | null;
      bookings_open: boolean;
      is_free: boolean;
      booked_count: number;
      waitlist_count: number;
      my_status: "booked" | "waitlist" | null;
    }) => ({
      id: r.id,
      date: r.class_date,
      time: (r.class_time || "").slice(0, 5),
      typeId: r.type_id,
      levelId: r.level_id,
      capacity: r.capacity,
      description: r.description ?? "",
      bookingsOpen: r.bookings_open,
      isFree: r.is_free,
      bookedCount: Number(r.booked_count),
      waitlistCount: Number(r.waitlist_count),
      myStatus: r.my_status,
    })
  );
}

export async function fetchPublicEvents(supabase: DB, from: string, to: string): Promise<PublicEvent[]> {
  const { data, error } = await supabase.rpc("public_events", { p_from: from, p_to: to });
  if (error) throw error;
  return (data ?? []).map((r: { slug: string; name: string; event_date: string; event_time: string; location: string }) => ({
    slug: r.slug,
    name: r.name,
    date: r.event_date,
    time: (r.event_time || "").slice(0, 5),
    location: r.location,
  }));
}

type BookingRow = {
  id: string;
  class_id: string;
  status: "booked" | "waitlist";
  payment_status: "unpaid" | "paid" | "partial" | "package";
  payment_amount: number;
  price: number;
  package_id: string | null;
  classes: { class_date: string; class_time: string; type_id: string; level_id: string; is_free: boolean } | null;
};

export async function fetchMyBookings(supabase: DB): Promise<MyBooking[]> {
  const { data, error } = await supabase
    .from("bookings")
    .select("id, class_id, status, payment_status, payment_amount, price, package_id, classes(class_date, class_time, type_id, level_id, is_free)")
    .order("class_date", { foreignTable: "classes" });
  if (error) throw error;
  return ((data ?? []) as unknown as BookingRow[])
    .filter((b) => b.classes)
    .map((b) => ({
      id: b.id,
      classId: b.class_id,
      date: b.classes!.class_date,
      time: (b.classes!.class_time || "").slice(0, 5),
      typeId: b.classes!.type_id,
      levelId: b.classes!.level_id,
      isFree: b.classes!.is_free,
      status: b.status,
      paymentStatus: b.payment_status,
      paymentAmount: Number(b.payment_amount),
      price: Number(b.price),
    }));
}

type EventBookingRow = {
  id: string;
  status: "booked" | "waitlist";
  payment_status: "unpaid" | "paid";
  price: number;
  plus_one: boolean;
  plus_one_name: string | null;
  events: { id: string; name: string; slug: string; event_date: string; event_time: string } | null;
};

export async function fetchMyEventBookings(supabase: DB): Promise<MyEventBooking[]> {
  const { data, error } = await supabase
    .from("event_bookings")
    .select("id, status, payment_status, price, plus_one, plus_one_name, events(id, name, slug, event_date, event_time)")
    .order("event_date", { foreignTable: "events" });
  if (error) throw error;
  return ((data ?? []) as unknown as EventBookingRow[])
    .filter((b) => b.events)
    .map((b) => ({
      id: b.id,
      eventId: b.events!.id,
      eventName: b.events!.name,
      eventSlug: b.events!.slug,
      date: b.events!.event_date,
      time: (b.events!.event_time || "").slice(0, 5),
      status: b.status,
      paymentStatus: b.payment_status,
      price: Number(b.price),
      plusOne: b.plus_one,
      plusOneName: b.plus_one_name,
    }));
}

export async function cancelMyEventBooking(supabase: DB, eventId: string): Promise<void> {
  const { error } = await supabase.rpc("cancel_event_booking", { p_event_id: eventId });
  if (error) throw error;
}

export async function fetchMyRawBookingsForPackages(
  supabase: DB
): Promise<{ packageId: string | null; date: string; status: "booked" | "waitlist" }[]> {
  const { data, error } = await supabase.from("bookings").select("package_id, status, classes(class_date)");
  if (error) throw error;
  return ((data ?? []) as unknown as { package_id: string | null; status: "booked" | "waitlist"; classes: { class_date: string } | null }[])
    .filter((b) => b.classes)
    .map((b) => ({ packageId: b.package_id, date: b.classes!.class_date, status: b.status }));
}

export async function fetchMyPackages(supabase: DB): Promise<MyPackage[]> {
  const { data, error } = await supabase.from("packages").select("*").order("purchase_date", { ascending: false });
  if (error) throw error;
  const bookings = await fetchMyRawBookingsForPackages(supabase);
  const todayKey = new Date().toISOString().slice(0, 10);

  return (data ?? []).map((p) => {
    const linked = bookings.filter((b) => b.packageId === p.id);
    const reserved = linked.length;
    const used = linked.filter((b) => b.date <= todayKey).length;
    const adj = p.manual_adjustment || 0;
    const usedCount = Math.min(p.size, Math.max(0, used + adj));
    const reservedTotal = Math.min(p.size, Math.max(0, reserved + adj));
    return {
      id: p.id,
      size: p.size,
      price: Number(p.price),
      paidAmount: Number(p.paid_amount),
      date: p.purchase_date,
      used: usedCount,
      remaining: Math.max(0, p.size - reservedTotal),
    };
  });
}

export async function fetchMyLedger(supabase: DB): Promise<MyLedgerEntry[]> {
  const { data, error } = await supabase.from("ledger_entries").select("*").order("entry_date", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((e) => ({
    id: e.id,
    kind: e.kind,
    amount: Number(e.amount),
    note: e.note ?? "",
    date: e.entry_date,
  }));
}

export async function bookClass(supabase: DB, classId: string): Promise<"booked" | "waitlist"> {
  const { data, error } = await supabase.rpc("book_class", { p_class_id: classId });
  if (error) throw error;
  return data as "booked" | "waitlist";
}

export async function cancelBooking(supabase: DB, classId: string): Promise<void> {
  const { error } = await supabase.rpc("cancel_booking", { p_class_id: classId });
  if (error) throw error;
}

export async function submitIssueReport(supabase: DB, message: string): Promise<void> {
  const { error } = await supabase.rpc("submit_issue_report", { p_message: message });
  if (error) throw error;
}
