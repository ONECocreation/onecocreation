import { describe, expect, it } from "vitest";
import { slotsFor, visibleMonths, type AvailabilityRule, type Service } from "@/lib/booking-time";

/**
 * TASK-151 — the vanishing-calendar bug (kimi's brief, cut from Love's call:
 * picking New York in "times shown in" made the whole calendar disappear).
 *
 * THE FINDING: `slotsFor` never throws and never returns anything wrong for
 * New York — it's the SURFACE that broke. A narrow artist window can
 * legitimately convert to zero slots for a given viewer zone (none of the
 * five sacred numbers survive the shift), and SlotPicker used to react to
 * a zero-slot board by unmounting the entire calendar (`days.length === 0
 * ? <p>no times</p> : <the grid>`), which is what read as "disappeared" on
 * the call. The fix is `visibleMonths` — it always hands the calendar a
 * real month to open on, slot data or none, so the grid itself never goes
 * away; only the copy in the day panel changes. These tests pin both
 * halves: the narrow-window zero is real (not a crash), and the calendar's
 * own month list is never empty because of it.
 */

const service: Service = {
  id: "discovery-call",
  schemaVersion: 1,
  title: "Discovery call",
  blurb: "",
  durationMin: 60,
  bufferMin: 15,
  price: { sats: 21000 },
  pricingMode: "fixed",
  minLeadHours: 1,
  maxAdvanceDays: 14,
  meetingRail: { kind: "static", url: "https://meet.example.com/love" },
  artistTz: "America/Denver",
  status: "live",
};

/** The same HH:MM window every day of the week, for every service. */
function everyday(start: string, end: string): AvailabilityRule[] {
  return ([0, 1, 2, 3, 4, 5, 6] as const).map((weekday, i) => ({
    id: `r${i}`,
    weekday,
    start,
    end,
    serviceIds: [],
  }));
}

/** en-CA "YYYY-MM-DD" as SlotPicker's own `dayKey` groups by. */
function dayKey(iso: string, tz: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(iso));
}

describe("the vanishing-calendar bug (TASK-151)", () => {
  it("THE FINDING: a narrow Denver window (11:00–12:15) keeps 11:11 for Denver but drops all five sacred numbers for New York", () => {
    const nowMs = Date.parse("2026-06-15T12:00:00Z"); // Monday, mid-June (both zones on summer DST)
    const narrow = everyday("11:00", "12:15");

    const denver = slotsFor(service, narrow, [], { nowMs, viewerTz: "America/Denver" });
    const newYork = slotsFor(service, narrow, [], { nowMs, viewerTz: "America/New_York" });

    expect(denver.length).toBeGreaterThan(0);
    expect(newYork).toEqual([]); // genuinely zero — not a crash, not NaN, just zero
  });

  it("the same narrow window returns a real, non-throwing (if often empty) board for LA, London and Sydney too", () => {
    const nowMs = Date.parse("2026-06-15T12:00:00Z");
    const narrow = everyday("11:00", "12:15");
    for (const tz of ["America/Los_Angeles", "Europe/London", "Australia/Sydney"]) {
      expect(() => slotsFor(service, narrow, [], { nowMs, viewerTz: tz })).not.toThrow();
    }
  });

  it("visibleMonths falls back to today's month + next when there are no slot days at all — the grid never has nothing to show", () => {
    const nowMs = Date.parse("2026-06-15T12:00:00Z"); // June, viewer's frame
    const months = visibleMonths(nowMs, "America/New_York", []);
    expect(months).toEqual(["2026-06", "2026-07"]);
    expect(months.length).toBeGreaterThan(0);
  });

  it("visibleMonths' fallback rolls the year at a December boundary", () => {
    const nowMs = Date.parse("2026-12-20T12:00:00Z");
    expect(visibleMonths(nowMs, "UTC", [])).toEqual(["2026-12", "2027-01"]);
  });

  it("visibleMonths prefers real slot months, sorted, once there is any data", () => {
    const months = visibleMonths(Date.now(), "America/New_York", [
      "2026-07-14",
      "2026-06-30",
      "2026-07-02",
    ]);
    expect(months).toEqual(["2026-06", "2026-07"]);
  });

  it("end to end: New York's empty narrow-window board still resolves to non-empty visibleMonths (the exact call reproduction, pinned)", () => {
    const nowMs = Date.parse("2026-06-15T12:00:00Z");
    const narrow = everyday("11:00", "12:15");
    const slots = slotsFor(service, narrow, [], { nowMs, viewerTz: "America/New_York" });
    const dayKeys = slots.map((s) => dayKey(s.startUtc, "America/New_York"));
    expect(dayKeys).toEqual([]); // the empty board Love saw
    const months = visibleMonths(nowMs, "America/New_York", dayKeys);
    expect(months.length).toBeGreaterThan(0); // the calendar still has somewhere to open
  });

  it("a US zip's zone (Eastern, via a New York zip) hits the same narrow-window zero as the dropdown pick — same cause, same fix applies", () => {
    // us-zip-tz.ts maps 10001 (NYC) to America/New_York — SlotPicker's zip
    // field is just a second door to the same viewerTz, not a separate bug.
    const nowMs = Date.parse("2026-06-15T12:00:00Z");
    const narrow = everyday("11:00", "12:15");
    const viaZipZone = slotsFor(service, narrow, [], { nowMs, viewerTz: "America/New_York" });
    expect(viaZipZone).toEqual([]);
  });

  it("everyday wide-open windows keep working for New York — TASK-122's own pin, unmoved", () => {
    const nowMs = Date.parse("2026-06-15T12:00:00Z");
    const wide = everyday("08:00", "17:00");
    const slots = slotsFor(service, wide, [], { nowMs, viewerTz: "America/New_York" });
    expect(slots.length).toBeGreaterThan(0);
  });
});
