export type PaymentStatus = "unpaid" | "paid" | "partial" | "package";

export type Payment = {
  status: PaymentStatus;
  amount: number;
  price: number;
  packageId?: string;
};

export type ClassItem = {
  id: string;
  date: string; // yyyy-mm-dd
  time: string; // HH:mm
  typeId: string;
  levelId: string;
  capacity: number;
  notes: string;
  description: string;
  bookingsOpen: boolean;
  priceOverride: number | null;
  isFree: boolean;
  clientIds: string[];
  waitlistIds: string[];
  payments: Record<string, Payment>;
};

export type ClientItem = {
  id: string;
  name: string;
  phone: string;
  notes: string;
  disabled: boolean;
  hasAccount: boolean;
};

export type ClassType = {
  id: string;
  name: string;
  color: string;
  packageEligible: boolean;
  defaultCapacity: number | null;
  description: string;
};

export type Level = {
  id: string;
  name: string;
};

export type Settings = {
  time: string;
  capacity: number;
  singleClassPrice: number;
  packageSize: number;
  packagePrice: number;
};

export type PackageItem = {
  id: string;
  clientId: string;
  size: number;
  price: number;
  paidAmount: number;
  date: string;
  manualAdjustment: number;
};

export type PackageWithUsage = PackageItem & {
  autoUsed: number;
  usedCount: number;
  reservedTotal: number;
  remaining: number;
};

export type LedgerEntry = {
  id: string;
  clientId: string;
  kind: "debt" | "credit";
  amount: number;
  note: string;
  date: string;
};

export type Expense = {
  id: string;
  amount: number;
  note: string;
  date: string;
};

export type Announcement = {
  id: string;
  message: string;
  active: boolean;
};

export type ClientNotice = {
  id: string;
  clientId: string;
  clientName: string;
  message: string;
  kind: "custom" | "package_assigned" | "welcome";
  read: boolean;
  createdAt: string;
};

export type WorkLogActorRole = "admin" | "client" | "system";

export type WorkLogEntry = {
  id: string;
  createdAt: string; // ISO
  actorRole: WorkLogActorRole;
  actorId: string | null;
  actorName: string;
  action: string;
  entityTable: string;
  entityId: string | null;
  description: string;
};

export type AdminData = {
  classTypes: ClassType[];
  levels: Level[];
  settings: Settings;
  bookingsOpen: boolean;
  classes: ClassItem[];
  clients: ClientItem[];
  packages: PackageItem[];
  ledger: LedgerEntry[];
  announcements: Announcement[];
  clientNotices: ClientNotice[];
  expenses: Expense[];
};
