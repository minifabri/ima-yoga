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
  published: boolean;
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
  kind: "custom" | "package_assigned" | "welcome" | "waitlist_promoted";
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
  actorEmail: string | null;
  action: string;
  entityTable: string;
  entityId: string | null;
  description: string;
  ipAddress: string | null;
  userAgent: string | null;
};

export type NotificationType = "registration" | "enrollment" | "cancellation" | "issue_report" | "interest";

export type NotificationItem = {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  entityTable: string | null;
  entityId: string | null;
  read: boolean;
  createdAt: string;
};

export type VisitorStats = {
  byPath: { path: string; views: number }[];
  daily: { day: string; pageviews: number; signups: number }[];
  uniqueVisitors: number;
  calendarViewers: number;
  calendarConversions: number;
};

export type EventItem = {
  id: string;
  slug: string;
  name: string;
  descriptionHtml: string;
  imageLightUrl: string | null;
  imageDarkUrl: string | null;
  imageFit: "contain" | "cover";
  date: string; // yyyy-mm-dd
  time: string; // HH:mm
  location: string;
  capacity: number; // 0 = nessun limite
  price: number;
  allowPlusOne: boolean;
  bookingsOpen: boolean;
  published: boolean;
  archived: boolean;
};

export type EventBookingItem = {
  id: string;
  eventId: string;
  clientId: string | null;
  guestFullName: string | null;
  guestEmail: string | null;
  displayName: string;
  plusOne: boolean;
  plusOneName: string | null;
  status: "booked" | "waitlist";
  paymentStatus: "unpaid" | "paid";
  price: number;
  createdAt: string;
};

export type BudgetLineItem = {
  id: string;
  name: string;
  amount: number;
  per: "person" | "total";
  freq: "day" | "once";
};

export type EventBudget = {
  id: string;
  eventId: string | null;
  name: string;
  days: number;
  ticketPrice: number;
  participants: number;
  items: BudgetLineItem[];
  createdAt: string;
  updatedAt: string;
};

export type PoseMacro = "asana" | "pranayama";

export type PoseCategory = {
  id: string;
  macro: PoseMacro;
  name: string;
  position: number;
};

export type PoseCatalogItem = {
  id: string;
  macro: PoseMacro;
  name: string;
  sanskritName: string;
  description: string;
  categoryId: string | null;
  tags: string[];
  imageUrl: string | null;
};

export type SectionKind =
  | "pranayama"
  | "preparazione"
  | "saluto_al_sole"
  | "pre_sequenza"
  | "sequenza"
  | "chiusura"
  | "custom";

export type SequenceTemplateSection = {
  id: string;
  templateId: string;
  kind: SectionKind;
  label: string;
  position: number;
  enabled: boolean;
};

export type SequenceTemplate = {
  id: string;
  classTypeId: string;
  sections: SequenceTemplateSection[];
};

export type HoldUnit = "seconds" | "minutes" | "breaths";

export type SequenceItem = {
  id: string;
  sectionId: string;
  blockId: string | null;
  poseId: string | null;
  customLabel: string;
  note: string;
  position: number;
  reps: number | null;
  holdValue: number | null;
  holdUnit: HoldUnit | null;
};

// Un blocco raggruppa alcune posizioni consecutive di una sezione per
// ripeterle insieme un certo numero di volte (es. "ripeti x3" un gruppetto
// di asana di preparazione) — solo ripetizioni, nessuna durata: la durata
// resta una proprietà della singola posizione.
export type SequenceItemBlock = {
  id: string;
  sectionId: string;
  reps: number | null;
  position: number;
};

export type SequenceSection = {
  id: string;
  sequenceId: string;
  kind: SectionKind;
  label: string;
  position: number;
  enabled: boolean;
  items: SequenceItem[];
  blocks: SequenceItemBlock[];
};

export type Sequence = {
  id: string;
  classTypeId: string;
  clientId: string | null;
  guestName: string;
  name: string;
  sections: SequenceSection[];
  createdAt: string;
  updatedAt: string;
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
  notifications: NotificationItem[];
};
