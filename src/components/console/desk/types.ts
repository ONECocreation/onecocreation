/**
 * Love's Desk's own local shapes — deliberately re-declared (not imported
 * from booking-time.ts) the same way AdminWeekGrid's Chip/Override already
 * were: this is what /api/admin/calendar hands back over the wire, and the
 * house's convention is that a client screen types its OWN feed shape
 * rather than importing the server-only lib types.
 */

export interface BookingChip {
  bookingId: string;
  orderId?: string;
  title: string;
  customer: string;
  customerEmail?: string;
  meetingUrl?: string;
  notes?: string;
  startUtc: string;
  endUtc?: string;
  /** both clocks (TASK-125): the artist's zone stamped at booking time, and
      the visitor's when the slot was chosen in her frame — marks.ts reads
      these to say "booked at 11:11 America/New_York" */
  artistTz?: string;
  visitorTz?: string;
  state: string;
  needsFulfil: boolean;
}

export interface OverrideRow {
  id: string;
  date: string;
  kind: "blocked" | "extra";
  start?: string;
  end?: string;
  note?: string;
}

export interface DeskFeed {
  rules: { weekday: number; start: string; end: string }[];
  overrides: OverrideRow[];
  bookings: BookingChip[];
  busy?: { startMs: number; endMs: number }[];
}

export interface DeskRoom {
  slug: string;
  title: string;
  kind: "class" | "community";
}
