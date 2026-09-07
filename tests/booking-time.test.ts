import { describe, expect, it } from "vitest";
import { slotsFor, type AvailabilityRule, type Service } from "@/lib/booking-time";

/**
 * TASK-122 (0018.06.16 a₿) — the five sacred times materialize on the
 * VISITOR's wall clock when `viewerTz` rides into slotsFor, while the
 * artist's availability window — converted — still gates. The legacy
 * artist-clock path stays the default and is pinned unchanged here.
 *
 * All fixtures are mid-June 2026 unless a test says otherwise: New York
 * keeps EDT (UTC-4) and Denver keeps MDT (UTC-6) then, so a visitor's
 * 11:11 is the artist's 09:11 — two hours behind, never a fixed offset.
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
  minLeadHours: 0,
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

/** "HH:MM" as `tz` sees the instant — the assertion's own eyes. */
function wallTime(iso: string, tz: string): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
  }).formatToParts(new Date(iso));
  const at: Record<string, string> = {};
  for (const p of parts) at[p.type] = p.value;
  return `${String(Number(at.hour) % 24).padStart(2, "0")}:${at.minute}`;
}

function onDate(slots: { startUtc: string }[], date: string, tz: string): string[] {
  return slots
    .filter((s) =>
      new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" })
        .format(new Date(s.startUtc)) === date)
    .map((s) => s.startUtc);
}

describe("slotsFor — the visitor's wall clock (TASK-122)", () => {
  it("a New York visitor sees 11:11 — which is 09:11 on Love's Denver clock", () => {
    const nowMs = Date.parse("2026-06-15T12:00:00Z"); // Monday
    const slots = slotsFor(service, everyday("08:00", "17:00"), [], {
      nowMs,
      viewerTz: "America/New_York",
    });

    const tuesday = onDate(slots, "2026-06-16", "America/New_York");
    // the five sacred instants, materialized in EDT (UTC-4)
    expect(tuesday).toEqual([
      "2026-06-16T14:10:00.000Z", // 10:10
      "2026-06-16T15:11:00.000Z", // 11:11
      "2026-06-16T16:12:00.000Z", // 12:12
      "2026-06-16T18:22:00.000Z", // 2:22
      "2026-06-16T19:33:00.000Z", // 3:33
    ]);
    // …and on the artist's clock that 11:11 arrives as 09:11
    const eleven = tuesday[1];
    expect(wallTime(eleven, "America/New_York")).toBe("11:11");
    expect(wallTime(eleven, "America/Denver")).toBe("09:11");
  });

  it("holds the visitor's wall clock across the March DST spring-forward", () => {
    const nowMs = Date.parse("2026-03-06T12:00:00Z"); // before the Mar 8 jump
    const slots = slotsFor(service, everyday("08:00", "17:00"), [], {
      nowMs,
      viewerTz: "America/New_York",
    });

    // Mar 7 is still EST (UTC-5): 11:11 = 16:11Z
    expect(onDate(slots, "2026-03-07", "America/New_York")).toContain("2026-03-07T16:11:00.000Z");
    // Mar 9 is already EDT (UTC-4): 11:11 = 15:11Z — the wall clock never moved
    expect(onDate(slots, "2026-03-09", "America/New_York")).toContain("2026-03-09T15:11:00.000Z");
    expect(wallTime("2026-03-07T16:11:00.000Z", "America/New_York")).toBe("11:11");
    expect(wallTime("2026-03-09T15:11:00.000Z", "America/New_York")).toBe("11:11");
  });

  it("the artist's availability window still gates, converted", () => {
    const nowMs = Date.parse("2026-06-15T12:00:00Z");
    // Love works 10:00–12:00 Denver. In New York hours that is 12:00–14:00,
    // so of the visitor's five sacred times only 12:12 (10:12–11:12 hers)
    // fits whole; 11:11 starts before her day and 2:22 after it.
    const slots = slotsFor(service, everyday("10:00", "12:00"), [], {
      nowMs,
      viewerTz: "America/New_York",
    });
    expect(onDate(slots, "2026-06-16", "America/New_York")).toEqual(["2026-06-16T16:12:00.000Z"]);

    // tighten her window to 10:00–11:00 Denver and the hour no longer fits —
    // the tail of a window that can't hold a whole session stays closed
    const tighter = slotsFor(service, everyday("10:00", "11:00"), [], {
      nowMs,
      viewerTz: "America/New_York",
    });
    expect(onDate(tighter, "2026-06-16", "America/New_York")).toEqual([]);
  });

  it("a blocked artist day closes the visitor's board too", () => {
    const nowMs = Date.parse("2026-06-15T12:00:00Z");
    const slots = slotsFor(service, everyday("08:00", "17:00"), [
      { id: "b1", date: "2026-06-16", kind: "blocked" },
    ], { nowMs, viewerTz: "America/New_York" });
    expect(onDate(slots, "2026-06-16", "America/New_York")).toEqual([]);
    expect(onDate(slots, "2026-06-17", "America/New_York")).toHaveLength(5);
  });
});

describe("slotsFor — the legacy artist-clock path (viewerTz omitted)", () => {
  it("materializes the sacred times on the artist's clock, unchanged", () => {
    const nowMs = Date.parse("2026-06-15T12:00:00Z");
    const slots = slotsFor(service, everyday("08:00", "17:00"), [], { nowMs });

    // MDT (UTC-6): 10:10 → 16:10Z … 3:33 → 21:33Z
    expect(onDate(slots, "2026-06-16", "America/Denver")).toEqual([
      "2026-06-16T16:10:00.000Z",
      "2026-06-16T17:11:00.000Z",
      "2026-06-16T18:12:00.000Z",
      "2026-06-16T20:22:00.000Z",
      "2026-06-16T21:33:00.000Z",
    ]);
    expect(wallTime("2026-06-16T17:11:00.000Z", "America/Denver")).toBe("11:11");
  });

  it("an invalid viewerTz falls back to the artist-clock path", () => {
    const nowMs = Date.parse("2026-06-15T12:00:00Z");
    const rules = everyday("08:00", "17:00");
    const legacy = slotsFor(service, rules, [], { nowMs });
    const bogus = slotsFor(service, rules, [], { nowMs, viewerTz: "Not/A_Zone" });
    expect(bogus).toEqual(legacy);
  });
});
