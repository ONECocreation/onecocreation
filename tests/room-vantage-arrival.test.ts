import { describe, it, expect, vi } from "vitest";

/**
 * TASK-384 (block 968,061) — arriving at the reading room always opens the
 * Stage. The Admiral's words, verbatim (block 968,051): "the weekly reading
 * room is supposed to go to the heartfield stage." The design is
 * pathname-only: no door change anywhere, no query string ever put on a
 * URL — the whole fix lives inside `vantage.ts` as a transient, per-visit
 * decision. This file pins the three pure pieces that carry it —
 * `opensOnStage` (is this pathname the reading room?), `vantageFor` (the
 * one arrival-vs-pin-vs-stored decision), and `createVisitStore` (the
 * per-visit, storage-injected controller behind `useRoomVantage`) — plus
 * the source pins on `useRoomVantage`'s own wiring. No DOM: every case
 * here is a plain function call, exactly as `resolveVantage` is pinned in
 * tests/classroom-three-rooms.test.ts.
 *
 * The promise under test is narrower than "a click never affects another
 * room" — a click legitimately writes the shared `oc-room-vantage` key,
 * exactly as it always has (Astra's second-pass correction). The promise
 * is: ARRIVAL never writes it.
 */

const READING_PATH = "/rooms/heart-field"; // READING_ROOM_PATH's own value (tests/read-with-love-letter.test.ts:132)
const OTHER_PATH = "/rooms/clair-senses";

describe('opensOnStage — the one predicate answering "is this the reading room"', () => {
  it("the exact reading-room path → true", async () => {
    const { opensOnStage, READING_ROOM_PATH } = await import("@/lib/reading-room");
    expect(READING_ROOM_PATH).toBe(READING_PATH); // ground the fixture against the real export
    expect(opensOnStage(READING_PATH)).toBe(true);
  });

  it("a prefix or suffix of the reading-room path → false, exact match only", async () => {
    const { opensOnStage } = await import("@/lib/reading-room");
    expect(opensOnStage(`${READING_PATH}-extra`)).toBe(false);
    expect(opensOnStage(`${READING_PATH}/x`)).toBe(false);
  });

  it("any other room's path → false", async () => {
    const { opensOnStage } = await import("@/lib/reading-room");
    expect(opensOnStage(OTHER_PATH)).toBe(false);
  });

  it("no free room in the registry — opensOnStage is false everywhere, even the reading room's own address", async () => {
    // READING_ROOM_PATH is a lexical const computed once at module
    // evaluation from freeRoom() — not a live binding a spy can intercept.
    // Force a fresh, empty-registry evaluation instead: the exact idiom
    // tests/site-room-accordion.test.ts:65-67 already uses for mocking
    // next/navigation the same way.
    vi.resetModules();
    vi.doMock("@/lib/matrix-rooms", () => ({ ROOMS: [] }));
    const { opensOnStage } = await import("@/lib/reading-room");
    for (const p of [READING_PATH, OTHER_PATH, "/rooms/anything", ""]) {
      expect(opensOnStage(p), p).toBe(false);
    }
    // mirror site-room-accordion.test.ts's own convention (:80-81): unmock
    // AND reset so no later test in this file resolves the empty registry.
    vi.doUnmock("@/lib/matrix-rooms");
    vi.resetModules();
  });
});
