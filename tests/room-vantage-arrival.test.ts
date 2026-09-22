import { describe, it, expect, vi } from "vitest";
import type { StorageLike } from "@/components/rooms/vantage";

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

describe("vantageFor — the one arrival-vs-pin-vs-stored decision", () => {
  it("reading room, no pin → stage, regardless of stored", async () => {
    const { vantageFor } = await import("@/components/rooms/vantage");
    expect(vantageFor({ pathname: READING_PATH, stored: "circle", pinned: null })).toBe("stage");
    expect(vantageFor({ pathname: READING_PATH, stored: "lesson", pinned: null })).toBe("stage");
  });

  it("reading room, a pin for THIS pathname → the pinned vantage, not stored (the pick stands even when it never persisted)", async () => {
    const { vantageFor } = await import("@/components/rooms/vantage");
    expect(
      vantageFor({ pathname: READING_PATH, stored: "lesson", pinned: { pathname: READING_PATH, vantage: "circle" } }),
    ).toBe("circle");
  });

  it("reading room, a pin for a DIFFERENT pathname (stale, not yet cleared) → still stage — only an EQUAL pin ever applies", async () => {
    const { vantageFor } = await import("@/components/rooms/vantage");
    expect(
      vantageFor({ pathname: READING_PATH, stored: "circle", pinned: { pathname: OTHER_PATH, vantage: "lesson" } }),
    ).toBe("stage");
  });

  it("any other room, no matching pin → always stored, unchanged (every other room is untouched)", async () => {
    const { vantageFor } = await import("@/components/rooms/vantage");
    expect(vantageFor({ pathname: OTHER_PATH, stored: "circle", pinned: null })).toBe("circle");
    expect(
      vantageFor({ pathname: OTHER_PATH, stored: "lesson", pinned: { pathname: READING_PATH, vantage: "stage" } }),
    ).toBe("lesson");
  });

  it("any other room WITH a pin that matches IT → the pinned vantage (the private-mode fix is general, not reading-room-only)", async () => {
    const { vantageFor } = await import("@/components/rooms/vantage");
    expect(
      vantageFor({ pathname: OTHER_PATH, stored: "circle", pinned: { pathname: OTHER_PATH, vantage: "lesson" } }),
    ).toBe("lesson");
  });
});

/** A minimal StorageLike double — a plain variable behind get/set, `set`
 *  spy-observable and swappable to throw on demand (Safari private
 *  browsing's own failure mode, matching the file's existing `catch {}`
 *  shape around every real localStorage call). */
function fakeStorage() {
  let value: string | null = null;
  let throwing = false;
  const set = vi.fn((v: string) => {
    if (throwing) throw new Error("quota exceeded — private mode");
    value = v;
  });
  const storage: StorageLike = { get: () => value, set };
  return { storage, set, setThrows: (next: boolean) => { throwing = next; } };
}

describe("createVisitStore — the pure, storage-injected controller behind useRoomVantage", () => {
  it("two owners on the reading room: one departs, the OTHER's claim keeps the pick's pin alive (not stage)", async () => {
    const { createVisitStore } = await import("@/components/rooms/vantage");
    const { storage } = fakeStorage();
    const store = createVisitStore(storage);
    store.arrive(READING_PATH);
    store.arrive(READING_PATH); // ClassroomView's own call + VantageSwitcher's, same room
    store.pick(READING_PATH, "circle");
    store.depart(READING_PATH); // one instance leaves
    expect(store.resolve(READING_PATH)).toBe("circle"); // still the pin, not stage
  });

  it("the LAST owner departs — the pin clears; the reading room resolves to stage again", async () => {
    const { createVisitStore } = await import("@/components/rooms/vantage");
    const { storage } = fakeStorage();
    const store = createVisitStore(storage);
    store.arrive(READING_PATH);
    store.arrive(READING_PATH);
    store.pick(READING_PATH, "circle");
    store.depart(READING_PATH);
    expect(store.resolve(READING_PATH)).toBe("circle"); // one owner still standing
    store.depart(READING_PATH); // the LAST one leaves
    expect(store.resolve(READING_PATH)).toBe("stage");
  });

  it("a fresh arrive after full departure, with no new pick — still stage, never a leftover pin", async () => {
    const { createVisitStore } = await import("@/components/rooms/vantage");
    const { storage } = fakeStorage();
    const store = createVisitStore(storage);
    store.arrive(READING_PATH);
    store.pick(READING_PATH, "circle");
    store.depart(READING_PATH); // the only owner leaves — pin clears
    store.arrive(READING_PATH); // a fresh visit, re-entering
    expect(store.resolve(READING_PATH)).toBe("stage");
  });

  it("a depart for a pathname with no matching pin never disturbs the CURRENT pin of a different pathname", async () => {
    const { createVisitStore } = await import("@/components/rooms/vantage");
    const { storage } = fakeStorage();
    const store = createVisitStore(storage);
    store.arrive(READING_PATH);
    store.pick(READING_PATH, "circle");
    store.depart(OTHER_PATH); // a pathname that was never arrived here — a stale/unrelated depart
    expect(store.resolve(READING_PATH)).toBe("circle"); // the real pin, untouched — not "stage"
  });

  it("storage.set throws (private mode) — pick still pins the click; resolve reflects it immediately; the throw never escapes pick", async () => {
    const { createVisitStore } = await import("@/components/rooms/vantage");
    const { storage, setThrows } = fakeStorage();
    const store = createVisitStore(storage);
    setThrows(true);
    store.arrive(OTHER_PATH);
    expect(() => store.pick(OTHER_PATH, "lesson")).not.toThrow();
    expect(store.resolve(OTHER_PATH)).toBe("lesson");
  });

  it("arrival alone never writes storage — the set spy sees zero calls", async () => {
    const { createVisitStore } = await import("@/components/rooms/vantage");
    const { storage, set } = fakeStorage();
    const store = createVisitStore(storage);
    store.arrive(READING_PATH);
    store.resolve(READING_PATH);
    store.depart(READING_PATH);
    expect(set).not.toHaveBeenCalled();
  });
});
