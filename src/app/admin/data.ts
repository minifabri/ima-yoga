import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  AdminData,
  Announcement,
  ClassItem,
  ClassType,
  ClientItem,
  ClientNotice,
  EventBookingItem,
  EventItem,
  Expense,
  LedgerEntry,
  Level,
  NotificationItem,
  NotificationType,
  PackageItem,
  Settings,
  VisitorStats,
  WorkLogActorRole,
  WorkLogEntry,
} from "./types";

type DB = SupabaseClient;

const DEFAULT_SETTINGS: Settings = {
  time: "19:00",
  capacity: 5,
  singleClassPrice: 15,
  packageSize: 5,
  packagePrice: 65,
};

function mapClassType(row: {
  id: string;
  name: string;
  color: string;
  package_eligible: boolean;
  default_capacity: number | null;
  description: string | null;
}): ClassType {
  return {
    id: row.id,
    name: row.name,
    color: row.color,
    packageEligible: row.package_eligible,
    defaultCapacity: row.default_capacity,
    description: row.description ?? "",
  };
}

function mapPackage(row: {
  id: string;
  client_id: string;
  size: number;
  price: number;
  paid_amount: number;
  purchase_date: string;
  manual_adjustment: number;
}): PackageItem {
  return {
    id: row.id,
    clientId: row.client_id,
    size: row.size,
    price: Number(row.price),
    paidAmount: Number(row.paid_amount),
    date: row.purchase_date,
    manualAdjustment: row.manual_adjustment,
  };
}

function mapLedgerEntry(row: {
  id: string;
  client_id: string;
  kind: "debt" | "credit";
  amount: number;
  note: string | null;
  entry_date: string;
}): LedgerEntry {
  return {
    id: row.id,
    clientId: row.client_id,
    kind: row.kind,
    amount: Number(row.amount),
    note: row.note ?? "",
    date: row.entry_date,
  };
}

function mapClientNotice(row: {
  id: string;
  client_id: string;
  message: string;
  kind: "custom" | "package_assigned" | "welcome" | "waitlist_promoted";
  read: boolean;
  created_at: string;
  profiles: { full_name: string } | null;
}): ClientNotice {
  return {
    id: row.id,
    clientId: row.client_id,
    clientName: row.profiles?.full_name ?? "",
    message: row.message,
    kind: row.kind,
    read: row.read,
    createdAt: row.created_at,
  };
}

export function mapNotification(row: {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  entity_table: string | null;
  entity_id: string | null;
  read: boolean;
  created_at: string;
}): NotificationItem {
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    message: row.message,
    entityTable: row.entity_table,
    entityId: row.entity_id,
    read: row.read,
    createdAt: row.created_at,
  };
}

function mapExpense(row: { id: string; amount: number; note: string | null; expense_date: string }): Expense {
  return {
    id: row.id,
    amount: Number(row.amount),
    note: row.note ?? "",
    date: row.expense_date,
  };
}

type BookingRow = {
  class_id: string;
  client_id: string;
  status: "booked" | "waitlist";
  payment_status: "unpaid" | "paid" | "partial" | "package";
  payment_amount: number;
  price: number;
  package_id: string | null;
};

function mapClass(row: {
  id: string;
  class_date: string;
  class_time: string;
  type_id: string;
  level_id: string;
  capacity: number;
  notes: string | null;
  description: string | null;
  bookings_open: boolean;
  price_override: number | null;
  is_free: boolean;
  published: boolean;
  bookings: BookingRow[];
}): ClassItem {
  const bookings = row.bookings ?? [];
  const booked = bookings.filter((b) => b.status === "booked");
  const waitlist = bookings.filter((b) => b.status === "waitlist");
  const payments: ClassItem["payments"] = {};
  booked.forEach((b) => {
    payments[b.client_id] = {
      status: b.payment_status,
      amount: Number(b.payment_amount),
      price: Number(b.price),
      packageId: b.package_id ?? undefined,
    };
  });
  return {
    id: row.id,
    date: row.class_date,
    time: (row.class_time || "").slice(0, 5),
    typeId: row.type_id,
    levelId: row.level_id,
    capacity: row.capacity,
    notes: row.notes ?? "",
    description: row.description ?? "",
    bookingsOpen: row.bookings_open,
    priceOverride: row.price_override != null ? Number(row.price_override) : null,
    isFree: row.is_free,
    published: row.published,
    clientIds: booked.map((b) => b.client_id),
    waitlistIds: waitlist.map((b) => b.client_id),
    payments,
  };
}

export async function fetchAdminData(supabase: DB): Promise<AdminData> {
  const [
    typesRes,
    levelsRes,
    settingsRes,
    classesRes,
    clientsRes,
    packagesRes,
    ledgerRes,
    expensesRes,
    announcementsRes,
    clientNoticesRes,
    notificationsRes,
  ] = await Promise.all([
    supabase.from("class_types").select("*").order("created_at"),
    supabase.from("levels").select("*"),
    supabase.from("settings").select("*").eq("id", 1).maybeSingle(),
    supabase.from("classes").select("*, bookings(*)").order("class_date"),
    supabase.from("profiles").select("*").eq("role", "client").order("full_name"),
    supabase.from("packages").select("*"),
    supabase.from("ledger_entries").select("*"),
    supabase.from("expenses").select("*").order("expense_date", { ascending: false }),
    supabase.from("announcements").select("*").order("created_at", { ascending: false }),
    supabase.from("client_notices").select("*, profiles(full_name)").order("created_at", { ascending: false }),
    supabase.from("notifications").select("*").order("created_at", { ascending: false }).limit(50),
  ]);

  const settings: Settings = settingsRes.data
    ? {
        time: (settingsRes.data.default_time || "19:00").slice(0, 5),
        capacity: settingsRes.data.default_capacity,
        singleClassPrice: Number(settingsRes.data.single_class_price),
        packageSize: settingsRes.data.package_size,
        packagePrice: Number(settingsRes.data.package_price),
      }
    : DEFAULT_SETTINGS;

  return {
    classTypes: (typesRes.data ?? []).map(mapClassType),
    levels: (levelsRes.data ?? []).map((l) => ({ id: l.id, name: l.name })),
    settings,
    bookingsOpen: settingsRes.data?.bookings_open ?? true,
    classes: (classesRes.data ?? []).map(mapClass),
    clients: (clientsRes.data ?? []).map((p) => ({
      id: p.id,
      name: p.full_name,
      phone: p.phone ?? "",
      notes: p.notes ?? "",
      disabled: p.disabled,
      hasAccount: p.auth_user_id != null,
    })),
    packages: (packagesRes.data ?? []).map(mapPackage),
    ledger: (ledgerRes.data ?? []).map(mapLedgerEntry),
    expenses: (expensesRes.data ?? []).map(mapExpense),
    announcements: (announcementsRes.data ?? []).map((a) => ({ id: a.id, message: a.message, active: a.active })),
    clientNotices: (clientNoticesRes.data ?? []).map(mapClientNotice),
    notifications: (notificationsRes.data ?? []).map(mapNotification),
  };
}

// ---------------------------------------------------------
// Classes & bookings
// ---------------------------------------------------------
export async function saveClass(supabase: DB, item: ClassItem) {
  const { error: classErr } = await supabase.from("classes").upsert({
    id: item.id,
    class_date: item.date,
    class_time: item.time,
    type_id: item.typeId,
    level_id: item.levelId || null,
    capacity: item.capacity,
    notes: item.notes || null,
    description: item.description || null,
    bookings_open: item.bookingsOpen,
    price_override: item.priceOverride,
    is_free: item.isFree,
    published: item.published,
  });
  if (classErr) throw classErr;

  const allIds = [...item.clientIds, ...item.waitlistIds];
  const del = supabase.from("bookings").delete().eq("class_id", item.id);
  const { error: delErr } = allIds.length > 0 ? await del.not("client_id", "in", `(${allIds.join(",")})`) : await del;
  if (delErr) throw delErr;

  const rows = [
    ...item.clientIds.map((cid) => {
      const pay = item.payments[cid] || { status: "unpaid" as const, amount: 0, price: 0 };
      return {
        class_id: item.id,
        client_id: cid,
        status: "booked" as const,
        payment_status: pay.status,
        payment_amount: pay.amount,
        price: pay.price,
        package_id: pay.packageId ?? null,
      };
    }),
    ...item.waitlistIds.map((cid) => ({
      class_id: item.id,
      client_id: cid,
      status: "waitlist" as const,
      payment_status: "unpaid" as const,
      payment_amount: 0,
      price: item.payments[cid]?.price ?? 0,
      package_id: null,
    })),
  ];
  if (rows.length > 0) {
    const { error: upErr } = await supabase.from("bookings").upsert(rows, { onConflict: "class_id,client_id" });
    if (upErr) throw upErr;
  }
}

export async function deleteClass(supabase: DB, id: string) {
  const { error } = await supabase.from("classes").delete().eq("id", id);
  if (error) throw error;
}

export async function moveClass(supabase: DB, id: string, newDate: string) {
  const { error } = await supabase.from("classes").update({ class_date: newDate }).eq("id", id);
  if (error) throw error;
}

export async function markBookingPaid(supabase: DB, classId: string, clientId: string, price: number) {
  const { error } = await supabase
    .from("bookings")
    .update({ payment_status: "paid", payment_amount: price })
    .eq("class_id", classId)
    .eq("client_id", clientId);
  if (error) throw error;
}

// ---------------------------------------------------------
// Clients (profiles)
// ---------------------------------------------------------
export async function upsertClient(supabase: DB, client: ClientItem) {
  const { error } = await supabase
    .from("profiles")
    .upsert({ id: client.id, full_name: client.name, phone: client.phone || null, notes: client.notes || null });
  if (error) throw error;
}

export async function deleteClient(supabase: DB, id: string) {
  const { error } = await supabase.from("profiles").delete().eq("id", id);
  if (error) throw error;
}

export async function setClientDisabled(supabase: DB, clientId: string, disabled: boolean, cancelFuture: boolean) {
  const { error } = await supabase.rpc("admin_set_client_disabled", {
    p_client_id: clientId,
    p_disabled: disabled,
    p_cancel_future: cancelFuture,
  });
  if (error) throw error;
}

export type MergeClientsResult = {
  bookingsMoved: number;
  bookingsSkipped: number;
  packagesMoved: number;
  ledgerMoved: number;
};

// Fonde `removeId` (cliente creato a mano, senza account) dentro `keepId`
// (cliente con account collegato): sposta prenotazioni/pacchetti/saldi e
// poi elimina il profilo duplicato.
export async function mergeClients(supabase: DB, keepId: string, removeId: string): Promise<MergeClientsResult> {
  const { data, error } = await supabase.rpc("admin_merge_clients", { p_keep_id: keepId, p_remove_id: removeId });
  if (error) throw error;
  return {
    bookingsMoved: data?.bookings_moved ?? 0,
    bookingsSkipped: data?.bookings_skipped ?? 0,
    packagesMoved: data?.packages_moved ?? 0,
    ledgerMoved: data?.ledger_moved ?? 0,
  };
}

// ---------------------------------------------------------
// Class types & levels & settings
// ---------------------------------------------------------
export async function addClassType(supabase: DB, name: string, color: string): Promise<ClassType> {
  const { data, error } = await supabase
    .from("class_types")
    .insert({ name, color, package_eligible: true, default_capacity: null })
    .select()
    .single();
  if (error) throw error;
  return mapClassType(data);
}

export async function updateClassType(
  supabase: DB,
  id: string,
  patch: Partial<{ name: string; color: string; packageEligible: boolean; defaultCapacity: number | null; description: string }>
) {
  const dbPatch: Record<string, unknown> = {};
  if (patch.name !== undefined) dbPatch.name = patch.name;
  if (patch.color !== undefined) dbPatch.color = patch.color;
  if (patch.packageEligible !== undefined) dbPatch.package_eligible = patch.packageEligible;
  if (patch.defaultCapacity !== undefined) dbPatch.default_capacity = patch.defaultCapacity;
  if (patch.description !== undefined) dbPatch.description = patch.description || null;
  const { error } = await supabase.from("class_types").update(dbPatch).eq("id", id);
  if (error) throw error;
}

export async function deleteClassType(supabase: DB, id: string) {
  const { error } = await supabase.from("class_types").delete().eq("id", id);
  if (error) throw error;
}

export async function addLevel(supabase: DB, name: string): Promise<Level> {
  const { data, error } = await supabase.from("levels").insert({ name }).select().single();
  if (error) throw error;
  return { id: data.id, name: data.name };
}

export async function deleteLevel(supabase: DB, id: string) {
  const { error } = await supabase.from("levels").delete().eq("id", id);
  if (error) throw error;
}

export async function updateLevel(supabase: DB, id: string, name: string) {
  const { error } = await supabase.from("levels").update({ name }).eq("id", id);
  if (error) throw error;
}

export async function saveSettings(supabase: DB, s: Settings) {
  const { error } = await supabase
    .from("settings")
    .update({
      default_time: s.time,
      default_capacity: s.capacity,
      single_class_price: s.singleClassPrice,
      package_size: s.packageSize,
      package_price: s.packagePrice,
    })
    .eq("id", 1);
  if (error) throw error;
}

export async function setBookingsOpen(supabase: DB, open: boolean) {
  const { error } = await supabase.from("settings").update({ bookings_open: open }).eq("id", 1);
  if (error) throw error;
}

// ---------------------------------------------------------
// Packages
// ---------------------------------------------------------
export async function sellPackage(
  supabase: DB,
  args: { clientId: string; size: number; price: number; paidAmount: number; date: string; linkClassIds: string[] }
): Promise<PackageItem> {
  const { data, error } = await supabase
    .from("packages")
    .insert({
      client_id: args.clientId,
      size: args.size,
      price: args.price,
      paid_amount: args.paidAmount,
      purchase_date: args.date,
    })
    .select()
    .single();
  if (error) throw error;
  const pkg = mapPackage(data);

  await supabase
    .from("client_notices")
    .insert({
      client_id: args.clientId,
      message: `Ti è stato assegnato un nuovo pacchetto di ${args.size} lezioni.`,
      kind: "package_assigned",
    })
    .then(() => {}, () => {});

  if (args.linkClassIds.length > 0) {
    const { data: existing } = await supabase
      .from("bookings")
      .select("class_id, price")
      .eq("client_id", args.clientId)
      .in("class_id", args.linkClassIds);
    await Promise.all(
      (existing ?? []).map((b) =>
        supabase
          .from("bookings")
          .update({ payment_status: "package", package_id: pkg.id, payment_amount: b.price })
          .eq("class_id", b.class_id)
          .eq("client_id", args.clientId)
      )
    );
  }

  return pkg;
}

export async function updatePackage(
  supabase: DB,
  id: string,
  patch: Partial<{ date: string; manualAdjustment: number; paidAmount: number }>
) {
  const dbPatch: Record<string, unknown> = {};
  if (patch.date !== undefined) dbPatch.purchase_date = patch.date;
  if (patch.manualAdjustment !== undefined) dbPatch.manual_adjustment = patch.manualAdjustment;
  if (patch.paidAmount !== undefined) dbPatch.paid_amount = patch.paidAmount;
  const { error } = await supabase.from("packages").update(dbPatch).eq("id", id);
  if (error) throw error;
}

export async function deletePackage(supabase: DB, id: string) {
  const { error } = await supabase.from("packages").delete().eq("id", id);
  if (error) throw error;
}

// ---------------------------------------------------------
// Ledger
// ---------------------------------------------------------
export async function addLedgerEntry(
  supabase: DB,
  e: { clientId: string; kind: "debt" | "credit"; amount: number; note: string; date: string }
): Promise<LedgerEntry> {
  const { data, error } = await supabase
    .from("ledger_entries")
    .insert({ client_id: e.clientId, kind: e.kind, amount: e.amount, note: e.note || null, entry_date: e.date })
    .select()
    .single();
  if (error) throw error;
  return mapLedgerEntry(data);
}

export async function deleteLedgerEntry(supabase: DB, id: string) {
  const { error } = await supabase.from("ledger_entries").delete().eq("id", id);
  if (error) throw error;
}

// ---------------------------------------------------------
// Expenses
// ---------------------------------------------------------
export async function addExpense(supabase: DB, e: { amount: number; note: string; date: string }): Promise<Expense> {
  const { data, error } = await supabase
    .from("expenses")
    .insert({ amount: e.amount, note: e.note || null, expense_date: e.date })
    .select()
    .single();
  if (error) throw error;
  return mapExpense(data);
}

export async function deleteExpense(supabase: DB, id: string) {
  const { error } = await supabase.from("expenses").delete().eq("id", id);
  if (error) throw error;
}

// ---------------------------------------------------------
// Avvisi per i clienti
// ---------------------------------------------------------
export async function addAnnouncement(supabase: DB, message: string): Promise<Announcement> {
  const { data, error } = await supabase.from("announcements").insert({ message }).select().single();
  if (error) throw error;
  return { id: data.id, message: data.message, active: data.active };
}

export async function updateAnnouncement(supabase: DB, id: string, patch: Partial<{ message: string; active: boolean }>) {
  const { error } = await supabase.from("announcements").update(patch).eq("id", id);
  if (error) throw error;
}

export async function deleteAnnouncement(supabase: DB, id: string) {
  const { error } = await supabase.from("announcements").delete().eq("id", id);
  if (error) throw error;
}

// ---------------------------------------------------------
// Avvisi personali ai clienti
// ---------------------------------------------------------
export async function addPersonalNotices(supabase: DB, clientIds: string[], message: string): Promise<ClientNotice[]> {
  const { data, error } = await supabase
    .from("client_notices")
    .insert(clientIds.map((clientId) => ({ client_id: clientId, message, kind: "custom" as const })))
    .select("*, profiles(full_name)");
  if (error) throw error;
  return (data ?? []).map(mapClientNotice);
}

export async function deleteClientNotice(supabase: DB, id: string) {
  const { error } = await supabase.from("client_notices").delete().eq("id", id);
  if (error) throw error;
}

export async function fetchClientNotices(supabase: DB): Promise<ClientNotice[]> {
  const { data, error } = await supabase.from("client_notices").select("*, profiles(full_name)").order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(mapClientNotice);
}

// ---------------------------------------------------------
// Worklog (registro attività)
// ---------------------------------------------------------
function mapWorkLogEntry(row: {
  id: string;
  created_at: string;
  actor_role: WorkLogActorRole;
  actor_id: string | null;
  actor_name: string;
  action: string;
  entity_table: string;
  entity_id: string | null;
  description: string;
}): WorkLogEntry {
  return {
    id: row.id,
    createdAt: row.created_at,
    actorRole: row.actor_role,
    actorId: row.actor_id,
    actorName: row.actor_name,
    action: row.action,
    entityTable: row.entity_table,
    entityId: row.entity_id,
    description: row.description,
  };
}

const WORKLOG_PAGE_SIZE = 50;

export async function fetchWorkLog(
  supabase: DB,
  opts: { actorRole?: "admin" | "client"; actions?: string[]; search?: string; offset?: number } = {}
): Promise<{ entries: WorkLogEntry[]; hasMore: boolean }> {
  const offset = opts.offset ?? 0;
  let query = supabase.from("work_log").select("*").order("created_at", { ascending: false });
  if (opts.actorRole) query = query.eq("actor_role", opts.actorRole);
  if (opts.actions && opts.actions.length > 0) query = query.in("action", opts.actions);
  const term = opts.search?.trim();
  if (term) query = query.ilike("description", `%${term.replace(/[%_]/g, "")}%`);
  query = query.range(offset, offset + WORKLOG_PAGE_SIZE);

  const { data, error } = await query;
  if (error) throw error;
  const rows = data ?? [];
  const hasMore = rows.length > WORKLOG_PAGE_SIZE;
  return { entries: (hasMore ? rows.slice(0, WORKLOG_PAGE_SIZE) : rows).map(mapWorkLogEntry), hasMore };
}

export async function deleteWorkLogEntry(supabase: DB, id: string) {
  const { error } = await supabase.from("work_log").delete().eq("id", id);
  if (error) throw error;
}

// ---------------------------------------------------------
// Notifiche admin
// ---------------------------------------------------------
export async function markNotificationRead(supabase: DB, id: string) {
  const { error } = await supabase.from("notifications").update({ read: true }).eq("id", id);
  if (error) throw error;
}

export async function markAllNotificationsRead(supabase: DB) {
  const { error } = await supabase.from("notifications").update({ read: true }).eq("read", false);
  if (error) throw error;
}

// ---------------------------------------------------------
// Statistiche visitatori
// ---------------------------------------------------------
export async function fetchVisitorStats(supabase: DB, days: number): Promise<VisitorStats> {
  const { data, error } = await supabase.rpc("fetch_visitor_stats", { p_days: days });
  if (error) throw error;
  const d = (data ?? {}) as {
    by_path?: { path: string; views: number }[];
    daily?: { day: string; pageviews: number; signups: number }[];
    unique_visitors?: number;
    calendar_viewers?: number;
    calendar_conversions?: number;
  };
  return {
    byPath: d.by_path ?? [],
    daily: d.daily ?? [],
    uniqueVisitors: d.unique_visitors ?? 0,
    calendarViewers: d.calendar_viewers ?? 0,
    calendarConversions: d.calendar_conversions ?? 0,
  };
}

// ---------------------------------------------------------
// Eventi
// ---------------------------------------------------------
function mapEvent(row: {
  id: string;
  slug: string;
  name: string;
  description_html: string;
  image_light_url: string | null;
  image_dark_url: string | null;
  event_date: string;
  event_time: string;
  capacity: number;
  price: number;
  allow_plus_one: boolean;
  bookings_open: boolean;
  published: boolean;
}): EventItem {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    descriptionHtml: row.description_html,
    imageLightUrl: row.image_light_url,
    imageDarkUrl: row.image_dark_url,
    date: row.event_date,
    time: (row.event_time || "").slice(0, 5),
    capacity: row.capacity,
    price: Number(row.price),
    allowPlusOne: row.allow_plus_one,
    bookingsOpen: row.bookings_open,
    published: row.published,
  };
}

export async function fetchEvents(supabase: DB): Promise<EventItem[]> {
  const { data, error } = await supabase.from("events").select("*").order("event_date", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(mapEvent);
}

export async function saveEvent(
  supabase: DB,
  event: Omit<EventItem, "id"> & { id?: string }
): Promise<EventItem> {
  const payload = {
    slug: event.slug,
    name: event.name,
    description_html: event.descriptionHtml,
    image_light_url: event.imageLightUrl,
    image_dark_url: event.imageDarkUrl,
    event_date: event.date,
    event_time: event.time,
    capacity: event.capacity,
    price: event.price,
    allow_plus_one: event.allowPlusOne,
    bookings_open: event.bookingsOpen,
    published: event.published,
  };
  const query = event.id
    ? supabase.from("events").update(payload).eq("id", event.id).select().single()
    : supabase.from("events").insert(payload).select().single();
  const { data, error } = await query;
  if (error) throw error;
  return mapEvent(data);
}

export async function deleteEvent(supabase: DB, id: string) {
  const { error } = await supabase.from("events").delete().eq("id", id);
  if (error) throw error;
}

function mapEventBooking(row: {
  id: string;
  event_id: string;
  client_id: string | null;
  guest_full_name: string | null;
  guest_email: string | null;
  plus_one: boolean;
  plus_one_name: string | null;
  status: "booked" | "waitlist";
  payment_status: "unpaid" | "paid";
  price: number;
  created_at: string;
  profiles: { full_name: string } | null;
}): EventBookingItem {
  return {
    id: row.id,
    eventId: row.event_id,
    clientId: row.client_id,
    guestFullName: row.guest_full_name,
    guestEmail: row.guest_email,
    displayName: row.profiles?.full_name || row.guest_full_name || "—",
    plusOne: row.plus_one,
    plusOneName: row.plus_one_name,
    status: row.status,
    paymentStatus: row.payment_status,
    price: Number(row.price),
    createdAt: row.created_at,
  };
}

export async function fetchEventBookings(supabase: DB, eventId: string): Promise<EventBookingItem[]> {
  const { data, error } = await supabase
    .from("event_bookings")
    .select("*, profiles(full_name)")
    .eq("event_id", eventId)
    .order("created_at");
  if (error) throw error;
  return (data ?? []).map(mapEventBooking);
}

export async function markEventBookingPaid(supabase: DB, bookingId: string, paid: boolean) {
  const { error } = await supabase.from("event_bookings").update({ payment_status: paid ? "paid" : "unpaid" }).eq("id", bookingId);
  if (error) throw error;
}

export async function deleteEventBooking(supabase: DB, bookingId: string) {
  const { error } = await supabase.from("event_bookings").delete().eq("id", bookingId);
  if (error) throw error;
}

// Carica l'immagine su Supabase Storage (bucket pubblico "event-images",
// scrittura riservata all'admin via RLS) e restituisce l'URL pubblico.
export async function uploadEventImage(supabase: DB, eventSlug: string, variant: "light" | "dark", file: File): Promise<string> {
  const ext = file.name.split(".").pop() || "jpg";
  const path = `${eventSlug}/${variant}-${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from("event-images").upload(path, file, { upsert: true, cacheControl: "3600" });
  if (error) throw error;
  const { data } = supabase.storage.from("event-images").getPublicUrl(path);
  return data.publicUrl;
}
