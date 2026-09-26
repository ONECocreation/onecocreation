import { describe, it, expect } from "vitest";
import {
  defaultReadingPart,
  latestOpenPart,
  openDoorNotice,
  CLOSED_FLAGS,
  type PartDoorInfo,
  type OpenFlags,
} from "@/lib/reading-parts";

/**
 * TASK-473 (block 968,624, the Admiral's flow ruling) — the pure math
 * behind the agenda's default selection and the "next room is open"
 * notice. No fetch, no Date.now() inside either function; every clock
 * read is the caller's own (the house's own purity rule).
 */

const DOORS: PartDoorInfo[] = [
  { part: 1, title: "The Housewarming", startsAtMs: 1_000, open: false, openedAtMs: null },
  { part: 2, title: "The Reading", startsAtMs: 2_000, open: false, openedAtMs: null },
  { part: 3, title: "The book talk", startsAtMs: 3_000, open: false, openedAtMs: null },
  { part: 4, title: "The Q&A", startsAtMs: 4_000, open: false, openedAtMs: null },
];

describe("defaultReadingPart — the part whose door is open (the latest opened), else the next part by time", () => {
  it("nothing open: the soonest upcoming part wins", () => {
    expect(defaultReadingPart(DOORS, 500)).toBe(1); // before everything
    expect(defaultReadingPart(DOORS, 1_500)).toBe(2); // part 1 already started
    expect(defaultReadingPart(DOORS, 3_500)).toBe(4);
  });

  it("everything already passed today: falls back to the day's own first part (next week's cycle)", () => {
    expect(defaultReadingPart(DOORS, 9_999)).toBe(1);
  });

  it("one door open: that part wins outright, regardless of time", () => {
    const doors = DOORS.map((d) => (d.part === 3 ? { ...d, open: true, openedAtMs: 5_000 } : d));
    expect(defaultReadingPart(doors, 500)).toBe(3);
  });

  it("two doors open: the LATEST opened wins (by openedAtMs), never the earlier one", () => {
    const doors = DOORS.map((d) => {
      if (d.part === 1) return { ...d, open: true, openedAtMs: 10_000 };
      if (d.part === 3) return { ...d, open: true, openedAtMs: 20_000 };
      return d;
    });
    expect(defaultReadingPart(doors, 500)).toBe(3);
  });

  it("parts 1 and 2 share Stage 1's one door — both open together with the same openedAtMs never conflicts with a real tie-break", () => {
    const doors = DOORS.map((d) => (d.part <= 2 ? { ...d, open: true, openedAtMs: 7_000 } : d));
    // the reduce picks whichever member of the tie it meets — either free
    // part is an honest answer since they share one room; just prove it
    // returns ONE of them, never crashes, never picks a closed part.
    expect([1, 2]).toContain(defaultReadingPart(doors, 500));
  });
});

describe("latestOpenPart / openDoorNotice — the courtesy line, never gating", () => {
  it("nothing open: no notice", () => {
    expect(latestOpenPart(CLOSED_FLAGS)).toBeNull();
    expect(openDoorNotice(CLOSED_FLAGS, 1)).toBeNull();
  });

  it("the highest-numbered open part wins (Love opens parts in order through the day)", () => {
    const flags: OpenFlags = { part1: true, part2: true, part3: true, part4: false };
    expect(latestOpenPart(flags)).toBe(3);
  });

  it("a notice names the open part, but only when it ISN'T the one already selected (fix round, block 968,624: returns {part, title} — the CALLER builds the words + a real pick link, never a finished string)", () => {
    const flags: OpenFlags = { part1: false, part2: false, part3: true, part4: false };
    expect(openDoorNotice(flags, 1)).toEqual({ part: 3, title: "The book talk" });
    expect(openDoorNotice(flags, 3)).toBeNull(); // already looking at it
  });

  it("never names a room, never carries an em dash of its own", () => {
    const flags: OpenFlags = { part1: false, part2: false, part3: false, part4: true };
    const notice = openDoorNotice(flags, 1);
    expect(notice).not.toBeNull();
    expect(notice!.title).not.toContain("—");
    expect(notice!.title).not.toMatch(/oc-[0-9a-f]{16}/);
  });
});
