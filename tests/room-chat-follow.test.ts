import { describe, it, expect } from "vitest";
import { promises as fs } from "fs";
import path from "path";

/**
 * TASK-380 (0018.07.02+ a₿ · block 968,047, the Admiral's production walk,
 * item D4: "the reading room button should link to the top of the page not
 * bottom of chat. focus on video for them.") — RoomView no longer drags the
 * PAGE down or steals keyboard focus on mount; it only ever scrolls its OWN
 * messages pane, and only when the follow decision below says to.
 *
 * RoomView talks straight to the homeserver behind client-only effects, so
 * its "open" render never happens under `renderToStaticMarkup` (no fetch,
 * no session, no effect runs) — and vitest.config.ts's `environment` is
 * "node" (no jsdom), so no test in this suite could exercise a real
 * `useEffect` or DOM scroll/focus call even if it tried. The follow
 * decision is exported as two pure functions off RoomView.tsx for exactly
 * that reason (the pattern tests/chat-reactions.test.ts already uses for
 * parseTimelineChunk, reactionSendPath, canReact, …) — these pins exercise
 * the real logic the component's effects call, not a re-implementation of
 * it. The two source pins below (idiom: tests/classroom-stage.test.ts:134-
 * 139, tests/room-doors.test.ts:147-150, both a direct read of a component
 * file) are a tripwire, not proof of behaviour — the proof is Number One's
 * browser acceptance (see the brief).
 */

describe("isNearBottom — the messages pane's own distance check", () => {
  it("is near the bottom when the remaining distance is within the threshold", async () => {
    const { isNearBottom } = await import("@/components/rooms/RoomView");
    // scrollHeight 1000, clientHeight 400, scrollTop 590 → 10px of history left below, threshold 20
    expect(isNearBottom(590, 400, 1000, 20)).toBe(true);
  });

  it("is not near the bottom when well up in history", async () => {
    const { isNearBottom } = await import("@/components/rooms/RoomView");
    // scrollHeight 1000, clientHeight 400, scrollTop 100 → 500px left, threshold 20
    expect(isNearBottom(100, 400, 1000, 20)).toBe(false);
  });

  it("the threshold boundary: exactly at the threshold counts, one pixel past does not", async () => {
    const { isNearBottom } = await import("@/components/rooms/RoomView");
    // scrollHeight 1000, clientHeight 400, scrollTop 580 → exactly 20px left
    expect(isNearBottom(580, 400, 1000, 20)).toBe(true);
    // scrollTop 579 → 21px left, one pixel past the threshold
    expect(isNearBottom(579, 400, 1000, 20)).toBe(false);
  });

  it("a pane too short to need scrolling at all is always near the bottom", async () => {
    const { isNearBottom } = await import("@/components/rooms/RoomView");
    // scrollHeight 200 < clientHeight 260 (the pane's own minHeight) — nothing to scroll past
    expect(isNearBottom(0, 260, 200, 120)).toBe(true);
  });
});

describe("shouldFollow — the pure follow decision", () => {
  it("a first population always follows, even scrolled-up state from a stale ref", async () => {
    const { shouldFollow } = await import("@/components/rooms/RoomView");
    expect(shouldFollow({ firstPopulation: true, wasNearBottom: false, ownSend: false })).toBe(true);
  });

  it("someone else's message follows when the reader was near the bottom", async () => {
    const { shouldFollow } = await import("@/components/rooms/RoomView");
    expect(shouldFollow({ firstPopulation: false, wasNearBottom: true, ownSend: false })).toBe(true);
  });

  it("a reader scrolled up in history is never yanked down by someone else's message", async () => {
    const { shouldFollow } = await import("@/components/rooms/RoomView");
    expect(shouldFollow({ firstPopulation: false, wasNearBottom: false, ownSend: false })).toBe(false);
  });

  it("the reader's own successful send always follows, even from history", async () => {
    const { shouldFollow } = await import("@/components/rooms/RoomView");
    expect(shouldFollow({ firstPopulation: false, wasNearBottom: false, ownSend: true })).toBe(true);
  });
});

describe("source pins — RoomView never touches the window or steals focus", () => {
  it("no scrollIntoView anywhere in RoomView.tsx — the messages pane scrolls its own box only, never the window", async () => {
    const src = await fs.readFile(path.join(process.cwd(), "src/components/rooms/RoomView.tsx"), "utf8");
    expect(src).not.toContain("scrollIntoView(");
  });

  it("no autoFocus anywhere in RoomView.tsx — the composer never steals the keyboard on mount", async () => {
    const src = await fs.readFile(path.join(process.cwd(), "src/components/rooms/RoomView.tsx"), "utf8");
    expect(src).not.toContain("autoFocus");
  });
});
