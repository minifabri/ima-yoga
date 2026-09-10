import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  AdminData,
  Announcement,
  BudgetLineItem,
  ClassItem,
  ClassType,
  ClientItem,
  ClientNotice,
  EventBookingItem,
  EventBudget,
  EventItem,
  Expense,
  HoldUnit,
  LedgerEntry,
  Level,
  NotificationItem,
  NotificationType,
  PackageItem,
  PoseCatalogItem,
  PoseCategory,
  PoseMacro,
  Sequence,
  SequenceTemplate,
  SequenceTemplateSection,
  SectionKind,
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
  actor_email: string | null;
  action: string;
  entity_table: string;
  entity_id: string | null;
  description: string;
  ip_address: string | null;
  user_agent: string | null;
}): WorkLogEntry {
  return {
    id: row.id,
    createdAt: row.created_at,
    actorRole: row.actor_role,
    actorId: row.actor_id,
    actorName: row.actor_name,
    actorEmail: row.actor_email,
    action: row.action,
    entityTable: row.entity_table,
    entityId: row.entity_id,
    description: row.description,
    ipAddress: row.ip_address,
    userAgent: row.user_agent,
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
  if (term) {
    const escaped = term.replace(/[%_]/g, "");
    query = query.or(`description.ilike.%${escaped}%,actor_email.ilike.%${escaped}%,actor_name.ilike.%${escaped}%`);
  }
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
  image_fit: "contain" | "cover";
  event_date: string;
  event_time: string;
  location: string | null;
  capacity: number;
  price: number;
  allow_plus_one: boolean;
  bookings_open: boolean;
  published: boolean;
  archived: boolean;
}): EventItem {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    descriptionHtml: row.description_html,
    imageLightUrl: row.image_light_url,
    imageDarkUrl: row.image_dark_url,
    imageFit: row.image_fit,
    date: row.event_date,
    time: (row.event_time || "").slice(0, 5),
    location: row.location ?? "",
    capacity: row.capacity,
    price: Number(row.price),
    allowPlusOne: row.allow_plus_one,
    bookingsOpen: row.bookings_open,
    published: row.published,
    archived: row.archived,
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
    image_fit: event.imageFit,
    event_date: event.date,
    event_time: event.time,
    location: event.location || null,
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

export async function setEventBookingsOpen(supabase: DB, id: string, bookingsOpen: boolean) {
  const { error } = await supabase.from("events").update({ bookings_open: bookingsOpen }).eq("id", id);
  if (error) throw error;
}

// Un evento archiviato mantiene tutto lo storico (prenotazioni, pagamenti)
// ma sparisce dalla pagina pubblica per chiunque — a differenza di
// deleteEvent, che cancella tutto per sempre.
export async function setEventArchived(supabase: DB, id: string, archived: boolean) {
  const { error } = await supabase.from("events").update({ archived }).eq("id", id);
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

// Tutte le prenotazioni di tutti gli eventi (usato per calcolare gli incassi in EarningsView).
export async function fetchAllEventBookings(supabase: DB): Promise<EventBookingItem[]> {
  const { data, error } = await supabase.from("event_bookings").select("*, profiles(full_name)").order("created_at");
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

// Carica la thumbnail generata (silhouette) su Supabase Storage (bucket
// pubblico "pose-thumbnails", scrittura riservata all'admin via RLS).
export async function uploadPoseThumbnail(supabase: DB, poseSlug: string, blob: Blob): Promise<string> {
  const path = `${poseSlug}-${Date.now()}.png`;
  const { error } = await supabase.storage.from("pose-thumbnails").upload(path, blob, { upsert: true, cacheControl: "3600", contentType: "image/png" });
  if (error) throw error;
  const { data } = supabase.storage.from("pose-thumbnails").getPublicUrl(path);
  return data.publicUrl;
}

// Rimuove un file dal bucket "pose-thumbnails" dato il suo URL pubblico
// (chiamare SOLO quando l'immagine è quella caricata dalla posizione stessa,
// mai per un'immagine ereditata da un padre — quel file resta suo). Se l'URL
// non appartiene a questo bucket (es. percorso/URL esterno inserito a mano)
// non fa nulla.
export async function deletePoseThumbnail(supabase: DB, url: string): Promise<void> {
  const marker = "/pose-thumbnails/";
  const idx = url.indexOf(marker);
  if (idx === -1) return;
  const path = url.slice(idx + marker.length);
  const { error } = await supabase.storage.from("pose-thumbnails").remove([path]);
  if (error) throw error;
}

function mapEventBudget(row: {
  id: string;
  event_id: string | null;
  name: string;
  days: number;
  ticket_price: number;
  participants: number;
  items: BudgetLineItem[];
  created_at: string;
  updated_at: string;
}): EventBudget {
  return {
    id: row.id,
    eventId: row.event_id,
    name: row.name,
    days: row.days,
    ticketPrice: Number(row.ticket_price),
    participants: row.participants,
    items: row.items || [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function fetchEventBudgets(supabase: DB): Promise<EventBudget[]> {
  const { data, error } = await supabase.from("event_budgets").select("*").order("updated_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(mapEventBudget);
}

// Un conto collegato a un evento è unico: se ne esiste già uno per
// quell'evento e non stiamo passando un id specifico, lo aggiorna invece
// di crearne un secondo.
export async function saveEventBudget(
  supabase: DB,
  budget: Omit<EventBudget, "id" | "createdAt" | "updatedAt"> & { id?: string }
): Promise<EventBudget> {
  const payload = {
    event_id: budget.eventId,
    name: budget.name,
    days: budget.days,
    ticket_price: budget.ticketPrice,
    participants: budget.participants,
    items: budget.items,
  };

  let targetId = budget.id;
  if (!targetId && budget.eventId) {
    const { data: existing } = await supabase.from("event_budgets").select("id").eq("event_id", budget.eventId).maybeSingle();
    if (existing) targetId = existing.id;
  }

  const query = targetId
    ? supabase.from("event_budgets").update(payload).eq("id", targetId).select().single()
    : supabase.from("event_budgets").insert(payload).select().single();
  const { data, error } = await query;
  if (error) throw error;
  return mapEventBudget(data);
}

export async function deleteEventBudget(supabase: DB, id: string) {
  const { error } = await supabase.from("event_budgets").delete().eq("id", id);
  if (error) throw error;
}

// ---- catalogo posizioni ----
function mapPoseCategory(row: { id: string; macro: PoseMacro; name: string; position: number }): PoseCategory {
  return { id: row.id, macro: row.macro, name: row.name, position: row.position };
}

export async function fetchPoseCategories(supabase: DB): Promise<PoseCategory[]> {
  const { data, error } = await supabase.from("pose_categories").select("*").order("macro").order("position");
  if (error) throw error;
  return (data ?? []).map(mapPoseCategory);
}

export async function savePoseCategory(
  supabase: DB,
  category: Omit<PoseCategory, "id"> & { id?: string }
): Promise<PoseCategory> {
  const payload = { macro: category.macro, name: category.name, position: category.position };
  const query = category.id
    ? supabase.from("pose_categories").update(payload).eq("id", category.id).select().single()
    : supabase.from("pose_categories").insert(payload).select().single();
  const { data, error } = await query;
  if (error) throw error;
  return mapPoseCategory(data);
}

export async function deletePoseCategory(supabase: DB, id: string) {
  const { error } = await supabase.from("pose_categories").delete().eq("id", id);
  if (error) throw error;
}

function mapPoseCatalogItem(row: {
  id: string;
  macro: PoseMacro;
  name: string | null;
  name_it: string | null;
  name_en: string | null;
  description: string | null;
  category_id: string | null;
  tags: string[] | null;
  image_url: string | null;
  parent_pose_id: string | null;
  variant_label: string | null;
}): PoseCatalogItem {
  return {
    id: row.id,
    macro: row.macro,
    name: row.name || "",
    nameIt: row.name_it || "",
    nameEn: row.name_en || "",
    description: row.description || "",
    categoryId: row.category_id,
    tags: row.tags || [],
    imageUrl: row.image_url,
    parentPoseId: row.parent_pose_id,
    variantLabel: row.variant_label || "",
  };
}

export async function fetchPoseCatalog(supabase: DB): Promise<PoseCatalogItem[]> {
  const { data, error } = await supabase.from("poses").select("*").order("name");
  if (error) throw error;
  return (data ?? []).map(mapPoseCatalogItem);
}

export async function savePose(
  supabase: DB,
  pose: Omit<PoseCatalogItem, "id"> & { id?: string }
): Promise<PoseCatalogItem> {
  const payload = {
    macro: pose.macro,
    name: pose.name || null,
    name_it: pose.nameIt || null,
    name_en: pose.nameEn || null,
    description: pose.description || null,
    category_id: pose.categoryId,
    tags: pose.tags,
    image_url: pose.imageUrl,
    parent_pose_id: pose.parentPoseId,
    variant_label: pose.variantLabel || "",
  };
  const query = pose.id
    ? supabase.from("poses").update(payload).eq("id", pose.id).select().single()
    : supabase.from("poses").insert(payload).select().single();
  const { data, error } = await query;
  if (error) throw error;
  return mapPoseCatalogItem(data);
}

export async function deletePose(supabase: DB, id: string) {
  const { error } = await supabase.from("poses").delete().eq("id", id);
  if (error) throw error;
}

// Inserimento massivo (import CSV): una singola insert con più righe.
export async function bulkInsertPoses(
  supabase: DB,
  poses: Omit<PoseCatalogItem, "id">[]
): Promise<PoseCatalogItem[]> {
  const payload = poses.map((p) => ({
    macro: p.macro,
    name: p.name || null,
    name_it: p.nameIt || null,
    name_en: p.nameEn || null,
    description: p.description || null,
    category_id: p.categoryId,
    tags: p.tags,
    image_url: p.imageUrl,
    parent_pose_id: p.parentPoseId,
    variant_label: p.variantLabel || "",
  }));
  const { data, error } = await supabase.from("poses").insert(payload).select();
  if (error) throw error;
  return (data ?? []).map(mapPoseCatalogItem);
}

// ---- template di sezioni per tipo di classe ----
type TemplateSectionRow = {
  id: string;
  template_id: string;
  kind: SectionKind;
  label: string;
  position: number;
  enabled: boolean;
};

function mapTemplateSection(s: TemplateSectionRow): SequenceTemplateSection {
  return { id: s.id, templateId: s.template_id, kind: s.kind, label: s.label, position: s.position, enabled: s.enabled };
}

function mapSequenceTemplate(row: { id: string; class_type_id: string; sequence_template_sections: TemplateSectionRow[] }): SequenceTemplate {
  return {
    id: row.id,
    classTypeId: row.class_type_id,
    sections: (row.sequence_template_sections || []).slice().sort((a, b) => a.position - b.position).map(mapTemplateSection),
  };
}

export async function fetchSequenceTemplate(supabase: DB, classTypeId: string): Promise<SequenceTemplate | null> {
  const { data, error } = await supabase
    .from("sequence_templates")
    .select("*, sequence_template_sections(*)")
    .eq("class_type_id", classTypeId)
    .maybeSingle();
  if (error) throw error;
  return data ? mapSequenceTemplate(data) : null;
}

export async function saveSequenceTemplateSections(
  supabase: DB,
  templateId: string,
  sections: { kind: SectionKind; label: string; position: number; enabled: boolean }[]
): Promise<SequenceTemplateSection[]> {
  const { error: delError } = await supabase.from("sequence_template_sections").delete().eq("template_id", templateId);
  if (delError) throw delError;
  const payload = sections.map((s) => ({ template_id: templateId, kind: s.kind, label: s.label, position: s.position, enabled: s.enabled }));
  const { data, error } = await supabase.from("sequence_template_sections").insert(payload).select();
  if (error) throw error;
  return (data ?? []).slice().sort((a, b) => a.position - b.position).map(mapTemplateSection);
}

// ---- sequenze ----
type SequenceRow = {
  id: string;
  class_type_id: string;
  guest_name: string | null;
  name: string;
  created_at: string;
  updated_at: string;
  sequence_clients: { client_id: string }[];
  sequence_sections: {
    id: string;
    sequence_id: string;
    kind: SectionKind;
    label: string;
    position: number;
    enabled: boolean;
    sequence_items: {
      id: string;
      section_id: string;
      block_id: string | null;
      pose_id: string | null;
      custom_label: string | null;
      note: string | null;
      position: number;
      reps: number | null;
      hold_value: number | null;
      hold_unit: HoldUnit | null;
    }[];
    sequence_item_blocks: {
      id: string;
      section_id: string;
      reps: number | null;
      position: number;
    }[];
  }[];
};

function mapSequence(row: SequenceRow): Sequence {
  return {
    id: row.id,
    classTypeId: row.class_type_id,
    clientIds: (row.sequence_clients || []).map((sc) => sc.client_id),
    guestName: row.guest_name || "",
    name: row.name,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    sections: (row.sequence_sections || [])
      .slice()
      .sort((a, b) => a.position - b.position)
      .map((s) => ({
        id: s.id,
        sequenceId: s.sequence_id,
        kind: s.kind,
        label: s.label,
        position: s.position,
        enabled: s.enabled,
        items: (s.sequence_items || [])
          .slice()
          .sort((a, b) => a.position - b.position)
          .map((it) => ({
            id: it.id,
            sectionId: it.section_id,
            blockId: it.block_id,
            poseId: it.pose_id,
            customLabel: it.custom_label || "",
            note: it.note || "",
            position: it.position,
            reps: it.reps,
            holdValue: it.hold_value,
            holdUnit: it.hold_unit,
          })),
        blocks: (s.sequence_item_blocks || [])
          .slice()
          .sort((a, b) => a.position - b.position)
          .map((b) => ({ id: b.id, sectionId: b.section_id, reps: b.reps, position: b.position })),
      })),
  };
}

const SEQUENCE_SELECT = "*, sequence_clients(client_id), sequence_sections(*, sequence_items(*), sequence_item_blocks(*))";

export async function fetchSequences(supabase: DB): Promise<Sequence[]> {
  const { data, error } = await supabase.from("sequences").select(SEQUENCE_SELECT).order("updated_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(mapSequence);
}

export async function fetchSequence(supabase: DB, id: string): Promise<Sequence> {
  const { data, error } = await supabase.from("sequences").select(SEQUENCE_SELECT).eq("id", id).single();
  if (error) throw error;
  return mapSequence(data);
}

// Salva l'intera sequenza sostituendo sempre sezioni e items con lo stato
// corrente dell'editor: più semplice e sicuro di un diff incrementale, dato
// il volume ridotto di righe coinvolte in una sequenza.
export async function saveSequence(
  supabase: DB,
  sequence: {
    id?: string;
    classTypeId: string;
    clientIds: string[];
    guestName: string;
    name: string;
    sections: {
      kind: SectionKind;
      label: string;
      position: number;
      enabled: boolean;
      blocks: { tempId: string; reps: number | null; position: number }[];
      items: {
        blockTempId: string | null;
        poseId: string | null;
        customLabel: string;
        note: string;
        position: number;
        reps: number | null;
        holdValue: number | null;
        holdUnit: HoldUnit | null;
      }[];
    }[];
  }
): Promise<Sequence> {
  const payload = {
    class_type_id: sequence.classTypeId,
    guest_name: sequence.guestName || null,
    name: sequence.name,
  };

  // Le relazioni con gli allievi vanno sincronizzate prima della query di
  // insert/update sulla riga `sequences`: il trigger di audit che logga la
  // modifica legge sequence_clients per il nome, quindi deve già riflettere
  // lo stato nuovo quando quel trigger scatta.
  if (sequence.id) {
    const { error: delSectionsError } = await supabase.from("sequence_sections").delete().eq("sequence_id", sequence.id);
    if (delSectionsError) throw delSectionsError;
    const { error: delClientsError } = await supabase.from("sequence_clients").delete().eq("sequence_id", sequence.id);
    if (delClientsError) throw delClientsError;
    if (sequence.clientIds.length > 0) {
      const { error: clientsError } = await supabase
        .from("sequence_clients")
        .insert(sequence.clientIds.map((clientId) => ({ sequence_id: sequence.id, client_id: clientId })));
      if (clientsError) throw clientsError;
    }
  }

  const query = sequence.id
    ? supabase.from("sequences").update(payload).eq("id", sequence.id).select().single()
    : supabase.from("sequences").insert(payload).select().single();
  const { data: seqRow, error: seqError } = await query;
  if (seqError) throw seqError;

  if (!sequence.id && sequence.clientIds.length > 0) {
    const { error: clientsError } = await supabase
      .from("sequence_clients")
      .insert(sequence.clientIds.map((clientId) => ({ sequence_id: seqRow.id, client_id: clientId })));
    if (clientsError) throw clientsError;
  }

  for (const section of sequence.sections) {
    const { data: sectionRow, error: sectionError } = await supabase
      .from("sequence_sections")
      .insert({ sequence_id: seqRow.id, kind: section.kind, label: section.label, position: section.position, enabled: section.enabled })
      .select()
      .single();
    if (sectionError) throw sectionError;

    const blockIdByTemp = new Map<string, string>();
    for (const b of section.blocks) {
      const { data: blockRow, error: blockError } = await supabase
        .from("sequence_item_blocks")
        .insert({ section_id: sectionRow.id, reps: b.reps, position: b.position })
        .select()
        .single();
      if (blockError) throw blockError;
      blockIdByTemp.set(b.tempId, blockRow.id);
    }

    if (section.items.length > 0) {
      const { error: itemsError } = await supabase.from("sequence_items").insert(
        section.items.map((it) => ({
          section_id: sectionRow.id,
          block_id: it.blockTempId ? (blockIdByTemp.get(it.blockTempId) ?? null) : null,
          pose_id: it.poseId,
          custom_label: it.customLabel || null,
          note: it.note || "",
          position: it.position,
          reps: it.reps,
          hold_value: it.holdValue,
          hold_unit: it.holdUnit,
        }))
      );
      if (itemsError) throw itemsError;
    }
  }

  return fetchSequence(supabase, seqRow.id);
}

export async function deleteSequence(supabase: DB, id: string) {
  const { error } = await supabase.from("sequences").delete().eq("id", id);
  if (error) throw error;
}
