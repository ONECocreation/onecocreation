import { describe, it, expect } from "vitest";
import { initialPlaylistState, reduce } from "@/components/about/about-playlist-machine";

/**
 * TASK-215 (0018.06.23 a₿, Love's call #23) — "opens on hover, not click";
 * "cycles the videos, plays through once and does not restart". The state
 * machine's contract, pinned at the model (the door-machine.ts pattern):
 *
 *  1. it opens on the first video by default (parity with the old
 *     details-open-by-default look);
 *  2. a hover jumps straight to that entry — no click, no toggle;
 *  3. the idle timer's "advance" event walks the list forward, one entry
 *     at a time;
 *  4. reaching the end marks the pass DONE and holds on the LAST entry —
 *     it never wraps back to the first;
 *  5. once done, every further hover AND every further advance is a
 *     no-op — the pass played through once and does not restart.
 */
describe("the About playlist's state machine (TASK-215)", () => {
  it("opens on the first video, not done", () => {
    expect(initialPlaylistState).toEqual({ index: 0, done: false });
  });

  it("hover opens on hover — jumps straight to the hovered entry, no click needed", () => {
    const s = reduce(initialPlaylistState, { type: "hover", index: 2 }, 4);
    expect(s).toEqual({ index: 2, done: false });
  });

  it("hovering the already-open entry is a no-op (referential no-op, not just value)", () => {
    const s = reduce(initialPlaylistState, { type: "hover", index: 0 }, 4);
    expect(s).toBe(initialPlaylistState);
  });

  it("hover ignores an out-of-range index", () => {
    expect(reduce(initialPlaylistState, { type: "hover", index: -1 }, 4)).toBe(initialPlaylistState);
    expect(reduce(initialPlaylistState, { type: "hover", index: 9 }, 4)).toBe(initialPlaylistState);
  });

  it("advance cycles forward one entry at a time", () => {
    let s = initialPlaylistState;
    s = reduce(s, { type: "advance" }, 3);
    expect(s).toEqual({ index: 1, done: false });
    s = reduce(s, { type: "advance" }, 3);
    expect(s).toEqual({ index: 2, done: false });
  });

  it("plays through once — the final advance marks done and HOLDS on the last video, never wraps", () => {
    let s = initialPlaylistState;
    for (let i = 0; i < 5; i++) s = reduce(s, { type: "advance" }, 3);
    expect(s).toEqual({ index: 2, done: true }); // held on the LAST index, not wrapped to 0
  });

  it("does not restart — once done, hover is a no-op even on a different entry", () => {
    const done = { index: 2, done: true };
    expect(reduce(done, { type: "hover", index: 0 }, 3)).toBe(done);
    expect(reduce(done, { type: "advance" }, 3)).toBe(done);
  });

  it("a single-video playlist never advances past itself — done on the first tick, no wrap", () => {
    const s = reduce(initialPlaylistState, { type: "advance" }, 1);
    expect(s).toEqual({ index: 0, done: true });
  });

  it("count 0 is inert — never throws, never moves", () => {
    expect(reduce(initialPlaylistState, { type: "advance" }, 0)).toBe(initialPlaylistState);
    expect(reduce(initialPlaylistState, { type: "hover", index: 0 }, 0)).toBe(initialPlaylistState);
  });
});
