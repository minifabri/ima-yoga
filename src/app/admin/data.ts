import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  AdminData,
  ClassItem,
  ClassType,
  ClientItem,
  LedgerEntry,
  Level,
  PackageItem,
  Settings,
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
    clientIds: booked.map((b) => b.client_id),
    waitlistIds: waitlist.map((b) => b.client_id),
    payments,
  };
}

export async function fetchAdminData(supabase: DB): Promise<AdminData> {
  const [typesRes, levelsRes, settingsRes, classesRes, clientsRes, packagesRes, ledgerRes] = await Promise.all([
    supabase.from("class_types").select("*").order("created_at"),
    supabase.from("levels").select("*"),
    supabase.from("settings").select("*").eq("id", 1).maybeSingle(),
    supabase.from("classes").select("*, bookings(*)").order("class_date"),
    supabase.from("profiles").select("*").eq("role", "client").order("full_name"),
    supabase.from("packages").select("*"),
    supabase.from("ledger_entries").select("*"),
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
