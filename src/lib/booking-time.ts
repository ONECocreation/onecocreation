import type { Price } from "./store";

/**
 * Booking — the pure half: shapes, timezone arithmetic, slot materialization
 * and validation (spec: docs/booking-flow.md, steps 1–2).
 *
 * Deliberately DEPENDENCY-FREE — no storage driver, no blob, no fs. The time
 * math is the part most likely to be subtly wrong, so it stays importable and
 * testable on its own. Persistence lives next door in booking.ts.
 *
 * ⏰ THE TIMEZONE LAW (spec §1, the classic bug killed up front):
 * - Rules are stored as WALL CLOCK + IANA zone ("Tuesdays 09:00",
 *   "America/Los_Angeles"), never as UTC offsets — so "Tuesdays 9am" stays
 *   9am across a DST change instead of drifting an hour twice a year.
 * - Every materialized instant is UTC, and only UTC crosses a boundary.
 * - Rendering in the visitor's zone is the SURFACE's job (and it must show
 *   the artist's zone too). This module hands out UTC and the zone name; it
 *   never formats for a human.
 */

/* ── the shapes ─────────────────────────────────────────────────────────── */

/** How the meeting actually happens — a knob, never hardcoded (spec §5). */
export type MeetingRail =
  | { kind: "static"; url: string }
  | { kind: "jitsi"; domain: string }
  | { kind: "matrix"; roomId: string }
  | { kind: "orbee" }
  /* Love's mobile (RV) studio and every visiting artist: the meeting is a
     PLACE, not a link — checkout collects city/state/zip instead. The artist
     may pin the studio's current address/geotag; members copy it from /me. */
  | { kind: "inPerson"; address?: string; geo?: string };

export type PricingMode = "fixed" | "pwyc";

export interface Service {
  id: string;
  schemaVersion: 1;
  title: string;
  blurb: string;
  /** minutes of actual meeting */
  durationMin: number;
  /** minutes of gap AFTER — back-to-back 1:1s are cruel */
  bufferMin: number;
  price: Price;
  /** pwyc = give-what-you-can; a pwyc booking has identical standing (spec §4) */
  pricingMode: PricingMode;
  /** no "book me in five minutes" */
  minLeadHours: number;
  /** how far out the calendar opens */
  maxAdvanceDays: number;
  meetingRail: MeetingRail;
  /** IANA zone the artist's wall-clock rules are written in */
  artistTz: string;
  status: "live" | "hidden";
}

/** A recurring weekly window, in the ARTIST's wall clock. */
export interface AvailabilityRule {
  id: string;
  /** 0 = Sunday … 6 = Saturday */
  weekday: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  /** "HH:MM", artist wall clock */
  start: string;
  end: string;
  /** which services this window serves; empty = all of them */
  serviceIds: string[];
}

/**
 * A one-off exception. `blocked` removes time (a day off, or one slot the
 * artist just filled elsewhere — the manual answer to the Google-iCal lag,
 * spec §6). `extra` adds a window outside the weekly rules.
 */
export interface DateOverride {
  id: string;
  /** "YYYY-MM-DD" in the artist's zone */
  date: string;
  kind: "blocked" | "extra";
  /** absent on a `blocked` row = the whole day is gone */
  start?: string;
  end?: string;
  note?: string;
}

/**
 * A RETREAT (the Admiral's blessing, 0018.05.28): a block of days at a
 * place, sold by the seat. Its days become blocked overrides automatically
 * (regular session slots vanish); its seats are ordinary store items riding
 * the ordinary cart — the guest list IS the order book filtered to them.
 */
export interface Retreat {
  id: string;
  title: string;
  location: string;
  /** "YYYY-MM-DD" inclusive span, artist's zone */
  startDate: string;
  endDate: string;
  seats: number;
  priceSats: number;
  /** optional smaller amount that holds a seat; the rest settles by letter */
  depositSats?: number;
  blurb: string;
  status: "live" | "hidden";
  createdAtMs: number;
}

export interface BookingConfig {
  schemaVersion: 1;
  services: Service[];
  rules: AvailabilityRule[];
  overrides: DateOverride[];
  retreats?: Retreat[];
  /** the artist's external calendar (secret iCal address) — its events
   *  become busy windows subtracted from every slot board. Additive. */
  icalUrl?: string;
  /** SITE-WIDE default for the a₿|AD calendar slider (Love's Desk / the
   *  Classroom Four, loves-desk plan Lane CAL) — which date leads by
   *  default across the site's calendars. Per-user choice always lives in
   *  localStorage (`oc-cal-primary`) and wins once set; this only seeds
   *  first-time visitors. SEAM ONLY in this lane: no admin UI writes it
   *  yet (BookingConfig's existing readConfig/writeConfig plumbing is the
   *  intended path once one exists) — `src/components/calendar`'s prefs
   *  provider falls back to the honest constant default `"bft"` until
   *  something reads this field. Absent/undefined = "bft".
   */
  calendarDefault?: "bft" | "civil";
}

/**
 * Denver — onecocreation's clock (the captain, ~0018.05.03).
 *
 * NOTE the zone is `America/Denver`, not a fixed "MST". Denver keeps MST in
 * winter and MDT in summer; pinning the offset would put every session an
 * hour out for roughly eight months of the year. IANA names carry the DST
 * rules, fixed offsets don't — which is the whole reason rules are stored as
 * wall clock + zone.
 */
export const DEFAULT_TZ = "America/Denver";

const emptyConfig = (): BookingConfig => ({
  schemaVersion: 1,
  services: [],
  rules: [],
  overrides: [],
});

/* ── timezone arithmetic (no dependency; Intl does the work) ─────────────── */

/**
 * How far `tz` sits from UTC at a given instant, in ms. Positive east.
 * Formats the instant AS the zone sees it, reads that back as if it were
 * UTC, and takes the difference — the standard Intl trick, and the only
 * honest way to get a DST-correct offset without shipping a tz database.
 */
function zoneOffsetMs(instant: Date, tz: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(instant);
  const at: Record<string, string> = {};
  for (const p of parts) at[p.type] = p.value;
  const asIfUtc = Date.UTC(
    Number(at.year),
    Number(at.month) - 1,
    Number(at.day),
    // some ICU builds render midnight as "24" — fold it back
    Number(at.hour) % 24,
    Number(at.minute),
    Number(at.second),
  );
  return asIfUtc - instant.getTime();
}

/**
 * A wall clock in `tz` → the UTC instant it names.
 *
 * Two passes on purpose: the first guess uses the offset at the naive
 * timestamp, which is wrong within an hour of a DST boundary; re-reading
 * the offset AT the guessed instant corrects it. (Times inside a spring-
 * forward gap don't exist — they resolve forward, which is the sane
 * behaviour for "the artist typed 2:30am on the day the clocks moved".)
 */
export function wallClockToUtc(
  y: number,
  mo: number,
  d: number,
  hh: number,
  mm: number,
  tz: string,
): Date {
  const naive = Date.UTC(y, mo - 1, d, hh, mm);
  let ts = naive - zoneOffsetMs(new Date(naive), tz);
  ts = naive - zoneOffsetMs(new Date(ts), tz);
  return new Date(ts);
}

/** "YYYY-MM-DD" and weekday as `tz` sees a given instant. */
export function zonedDateParts(instant: Date, tz: string): { date: string; weekday: number } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hour12: false,
    weekday: "short",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(instant);
  const at: Record<string, string> = {};
  for (const p of parts) at[p.type] = p.value;
  const WEEKDAYS: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return { date: `${at.year}-${at.month}-${at.day}`, weekday: WEEKDAYS[at.weekday] ?? 0 };
}

/** Is this a real IANA zone on this runtime? */
export function isValidTz(tz: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

const HHMM = /^([01]\d|2[0-3]):([0-5]\d)$/;
const YMD = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

/** "HH:MM" → minutes past midnight. -1 when malformed. */
function toMinutes(hhmm: string): number {
  const m = HHMM.exec(hhmm);
  return m ? Number(m[1]) * 60 + Number(m[2]) : -1;
}

/* ── slot materialization ───────────────────────────────────────────────── */

export interface Slot {
  /** UTC instant, ISO — the only form that crosses a boundary */
  startUtc: string;
  endUtc: string;
  serviceId: string;
}

/**
 * The bookable slots for a service, materialized ON READ from the rules —
 * never a stored table, so the artist can change their Tuesday without a
 * migration (spec §1).
 *
 * Slots are cut at duration + buffer: a 60-minute session with a 15-minute
 * buffer starts every 75 minutes, and the tail of a window that can't fit a
 * whole session is simply not offered.
 *
 * What this does NOT know about: holds and existing bookings. Those live in
 * the private vault (step 3) and the caller subtracts them — keeping this
 * function pure means it stays testable and the public route can cache it.
 */
export function slotsFor(
  service: Service,
  rules: AvailabilityRule[],
  overrides: DateOverride[],
  opts?: { nowMs?: number; days?: number },
): Slot[] {
  const now = opts?.nowMs ?? Date.now();
  const tz = service.artistTz;
  const horizonDays = Math.min(opts?.days ?? service.maxAdvanceDays, service.maxAdvanceDays);
  const earliest = now + service.minLeadHours * 3600_000;
  const slots: Slot[] = [];

  const mine = (ids: string[]) => ids.length === 0 || ids.includes(service.id);

  // Walk the artist's calendar day by day, not the visitor's — the rules are
  // written in the artist's wall clock and that is the frame they live in.
  for (let dayOffset = 0; dayOffset <= horizonDays; dayOffset++) {
    const probe = new Date(now + dayOffset * 86_400_000);
    const { date, weekday } = zonedDateParts(probe, tz);

    const dayOverrides = overrides.filter((o) => o.date === date);
    // A whole-day block ends the day before any window is considered.
    if (dayOverrides.some((o) => o.kind === "blocked" && !o.start)) continue;

    const windows: { start: string; end: string }[] = [];
    for (const r of rules) {
      if (r.weekday === weekday && mine(r.serviceIds)) windows.push({ start: r.start, end: r.end });
    }
    for (const o of dayOverrides) {
      if (o.kind === "extra" && o.start && o.end) windows.push({ start: o.start, end: o.end });
    }
    if (windows.length === 0) continue;

    const partialBlocks = dayOverrides
      .filter((o) => o.kind === "blocked" && o.start && o.end)
      .map((o) => ({ from: toMinutes(o.start!), to: toMinutes(o.end!) }));

    const [yy, mm, dd] = date.split("-").map(Number);

    for (const w of windows) {
      const from = toMinutes(w.start);
      const to = toMinutes(w.end);
      if (from < 0 || to < 0 || to <= from) continue;

      /* THE FIVE SACRED TIMES (Love's word on the call, 0018.05.15):
         sessions begin at 10:10 · 11:11 · 12:12 · 2:22 · 3:33 on HER
         mountain clock — no other minute exists. Windows still rule:
         a time outside the working hours stays closed. */
      const SACRED = [10 * 60 + 10, 11 * 60 + 11, 12 * 60 + 12, 14 * 60 + 22, 15 * 60 + 33];
      for (const m of SACRED) {
        if (m < from || m + service.durationMin > to) continue;
        // a partial block kills any slot it touches at all
        const clashes = partialBlocks.some((b) => m < b.to && m + service.durationMin > b.from);
        if (clashes) continue;

        const startUtc = wallClockToUtc(yy, mm, dd, Math.floor(m / 60), m % 60, tz);
        if (startUtc.getTime() < earliest) continue;

        slots.push({
          startUtc: startUtc.toISOString(),
          endUtc: new Date(startUtc.getTime() + service.durationMin * 60_000).toISOString(),
          serviceId: service.id,
        });
      }
    }
  }

  // Day-walking can revisit a date across a DST shift; dedupe and sort so the
  // surface gets one clean ascending list.
  const seen = new Set<string>();
  return slots
    .filter((s) => (seen.has(s.startUtc) ? false : (seen.add(s.startUtc), true)))
    .sort((a, b) => a.startUtc.localeCompare(b.startUtc));
}

/* ── validation ─────────────────────────────────────────────────────────── */

type Check = { ok: true } | { ok: false; reason: string };

export function validateService(s: Service): Check {
  if (!s.title?.trim()) return { ok: false, reason: "a title" };
  if (!Number.isInteger(s.durationMin) || s.durationMin < 5 || s.durationMin > 8 * 60) {
    return { ok: false, reason: "a duration between 5 minutes and 8 hours" };
  }
  if (!Number.isInteger(s.bufferMin) || s.bufferMin < 0 || s.bufferMin > 240) {
    return { ok: false, reason: "a buffer between 0 and 240 minutes" };
  }
  if (!isValidTz(s.artistTz)) return { ok: false, reason: "a real IANA timezone" };
  if (!Number.isInteger(s.minLeadHours) || s.minLeadHours < 0 || s.minLeadHours > 24 * 30) {
    return { ok: false, reason: "a lead time between 0 hours and 30 days" };
  }
  if (!Number.isInteger(s.maxAdvanceDays) || s.maxAdvanceDays < 1 || s.maxAdvanceDays > 365) {
    return { ok: false, reason: "an advance window between 1 and 365 days" };
  }
  // Same validity rule as the shelf: a live thing needs a denomination —
  // EXCEPT pwyc, where the customer names the price and that is the point.
  if (s.status === "live" && s.pricingMode === "fixed" && s.price.sats == null && s.price.fiat == null) {
    return { ok: false, reason: "at least one price (sats or fiat) before going live" };
  }
  if (s.price.sats != null && (!Number.isInteger(s.price.sats) || s.price.sats <= 0)) {
    return { ok: false, reason: "sats as a positive integer" };
  }
  if (s.price.fiat && (!Number.isInteger(s.price.fiat.amount) || !/^[A-Z]{3}$/.test(s.price.fiat.currency))) {
    return { ok: false, reason: "fiat as integer minor units + ISO-4217 code" };
  }
  const rail = s.meetingRail;
  if (rail.kind === "static" && !/^https?:\/\//.test(rail.url ?? "")) {
    return { ok: false, reason: "a meeting URL starting with http(s)://" };
  }
  if (rail.kind === "jitsi" && !rail.domain?.trim()) return { ok: false, reason: "a jitsi domain" };
  if (rail.kind === "matrix" && !rail.roomId?.trim()) return { ok: false, reason: "a matrix room id" };
  return { ok: true };
}

export function validateRule(r: AvailabilityRule): Check {
  if (!Number.isInteger(r.weekday) || r.weekday < 0 || r.weekday > 6) {
    return { ok: false, reason: "a weekday from 0 (Sunday) to 6" };
  }
  const from = toMinutes(r.start);
  const to = toMinutes(r.end);
  if (from < 0 || to < 0) return { ok: false, reason: "times as HH:MM" };
  if (to <= from) return { ok: false, reason: "an end time after the start time" };
  return { ok: true };
}

export function validateRetreat(r: Retreat): Check {
  if (!r.title?.trim()) return { ok: false, reason: "a name" };
  if (!r.location?.trim()) return { ok: false, reason: "a location" };
  if (!YMD.test(r.startDate ?? "") || !YMD.test(r.endDate ?? "")) {
    return { ok: false, reason: "dates as YYYY-MM-DD" };
  }
  if (r.endDate < r.startDate) return { ok: false, reason: "an end date on or after the start" };
  const span = (Date.parse(`${r.endDate}T00:00:00Z`) - Date.parse(`${r.startDate}T00:00:00Z`)) / 86_400_000;
  if (span > 60) return { ok: false, reason: "a span of 60 days or fewer" };
  if (!Number.isInteger(r.seats) || r.seats < 1 || r.seats > 500) {
    return { ok: false, reason: "seats as a whole number (1–500)" };
  }
  if (!Number.isInteger(r.priceSats) || r.priceSats <= 0) {
    return { ok: false, reason: "a seat price in sats" };
  }
  if (r.depositSats != null && (!Number.isInteger(r.depositSats) || r.depositSats <= 0 || r.depositSats >= r.priceSats)) {
    return { ok: false, reason: "a deposit smaller than the seat price" };
  }
  return { ok: true };
}

export function validateOverride(o: DateOverride): Check {
  if (!YMD.test(o.date ?? "")) return { ok: false, reason: "a date as YYYY-MM-DD" };
  if (o.kind === "extra" && (!o.start || !o.end)) {
    return { ok: false, reason: "a start and end time on an extra window" };
  }
  if (o.start || o.end) {
    const from = toMinutes(o.start ?? "");
    const to = toMinutes(o.end ?? "");
    if (from < 0 || to < 0) return { ok: false, reason: "times as HH:MM" };
    if (to <= from) return { ok: false, reason: "an end time after the start time" };
  }
  return { ok: true };
}

