export type PublicEventData = {
  id: string;
  slug: string;
  name: string;
  descriptionHtml: string;
  imageLightUrl: string | null;
  imageDarkUrl: string | null;
  date: string; // yyyy-mm-dd
  time: string; // HH:mm
  capacity: number; // 0 = nessun limite
  price: number; // a persona
  allowPlusOne: boolean;
  bookingsOpen: boolean;
  published: boolean;
  bookedSeats: number;
  waitlistCount: number;
  myStatus: "booked" | "waitlist" | null;
  myPlusOne: boolean | null;
  myPlusOneName: string | null;
};
