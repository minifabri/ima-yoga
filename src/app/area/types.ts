export type ClassType = {
  id: string;
  name: string;
  color: string;
  description: string;
};

export type Level = {
  id: string;
  name: string;
};

export type Announcement = {
  id: string;
  message: string;
};

export type ClientNotice = {
  id: string;
  message: string;
  kind: "custom" | "package_assigned";
};

export type PublicClass = {
  id: string;
  date: string; // yyyy-mm-dd
  time: string; // HH:mm
  typeId: string;
  levelId: string;
  capacity: number;
  description: string;
  bookingsOpen: boolean;
  isFree: boolean;
  bookedCount: number;
  waitlistCount: number;
  myStatus: "booked" | "waitlist" | null;
};

export type MyBooking = {
  id: string;
  classId: string;
  date: string;
  time: string;
  typeId: string;
  levelId: string;
  isFree: boolean;
  status: "booked" | "waitlist";
  paymentStatus: "unpaid" | "paid" | "partial" | "package";
  paymentAmount: number;
  price: number;
};

export type MyPackage = {
  id: string;
  size: number;
  price: number;
  paidAmount: number;
  date: string;
  used: number;
  remaining: number;
};

export type MyLedgerEntry = {
  id: string;
  kind: "debt" | "credit";
  amount: number;
  note: string;
  date: string;
};
