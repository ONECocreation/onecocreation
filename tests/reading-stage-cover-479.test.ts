import { describe, it, expect } from "vitest";
import { promises as fs } from "fs";
import path from "path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ReadingStageBody, type ReadingStageBodyProps } from "@/components/reading/ReadingStage";
import { ReadingStageDoorBody, CLOSED, type ReadingStageDoorBodyProps, type Wire } from "@/components/reading/ReadingStageDoor";

const read = (rel: string) => fs.readFile(path.join(process.cwd(), rel), "utf8");
const STAGE = "src/components/reading/ReadingStage.tsx";
const DOOR = "src/components/reading/ReadingStageDoor.tsx";

/**
 * TASK-479 (block 968,624+) shipped the book-cover-over-the-mounted-room
 * markup, rendered pure (`renderToStaticMarkup`, no jsdom in this repo) for
 * both /reading top screens it applies to: `ReadingStage.tsx` (Parts 1/2)
 * and `ReadingStageDoor.tsx` (Parts 3/4) — driven, at the time, by
 * JitsiRoom's own `onHostVideo`/`hostVideoReducer` signal (a guess from
 * Jitsi participant events).
 *
 * TASK-487 (block 968,624+, the Admiral's ruling, option C) RE-TRUES this
 * whole file: THE SITE SWITCH REPLACES THE JITSI-EVENT GUESS. The cover is
 * now driven by `cameraShown` (the door's own polled `camera` field —
 * "shown"/"hidden"), never `hostVideoOn`/`onHostVideo`. The markup itself
 * (the cover picture, chip, slim controls line, "No sound? Tap the
 * screen.") is UNCHANGED — only the signal that decides `coverUp` moved.
 * `onHostVideo` is retired from these two files' `<JitsiRoom>` mounts
 * (their own docblocks say so); JitsiRoom's reducer CODE itself is
 * untouched (see `tests/host-video-reducer-479.test.ts`, which still pins
 * it).
 *
 * Sound path (FEASIBILITY.md §4, unaffected by this lane): NOT a fake "Tap
 * for sound" button — detecting a blocked cross-origin autoplay isn't
 * reliably possible, and a real button would intercept the very tap
 * that's supposed to reach the iframe. Instead: one honest, permanent,
 * click-through line, "No sound? Tap the screen.", under the cover text.
 */

const ROOM = "oc-0123456789abcdef";
const DOMAIN = "meet.reading-stage-cover-fixture.invalid";

function stageProps(overrides: Partial<ReadingStageBodyProps>): ReadingStageBodyProps {
  return {
    phase: "published",
    signedIn: true,
    room: ROOM,
    playgroundLock: { locked: false, floorName: "Test Tier" },
    jitsiDomain: DOMAIN,
    nextWords: null,
    countdown: null,
    countdownWhen: null,
    left: false,
    ended: false,
    onRoomEnded: () => {},
    onRejoin: () => {},
    partLabel: "1:11 PM MDT · The Reading",
    ...overrides,
  };
}

function renderStage(p: ReadingStageBodyProps): string {
  return renderToStaticMarkup(createElement(ReadingStageBody, p));
}

function doorProps(overrides: Partial<ReadingStageDoorBodyProps>): ReadingStageDoorBodyProps {
  return {
    wire: { decision: "open", reachable: true, room: ROOM, camera: "shown" } as Wire,
    jitsiDomain: DOMAIN,
    whenWords: null,
    label: "the Book Talk",
    partLabel: "2:22 PM MDT · The Book Talk",
    notOwned: createElement("p", null, "NOT-OWNED-FIXTURE"),
    left: false,
    onEnded: () => {},
    onRejoin: () => {},
    ...overrides,
  };
}

function renderDoor(p: ReadingStageDoorBodyProps): string {
  return renderToStaticMarkup(createElement(ReadingStageDoorBody, p));
}

const NO_EM_DASH = /—/;
const NO_ARROWS_OR_EMOJI = /[←-⇿➔➡\u{1F300}-\u{1FAFF}☀-➿]/u;

describe("ReadingStage — the cover overlay while showRoom && !cameraShown (TASK-487)", () => {
  const html = renderStage(stageProps({ cameraShown: false }));

  it("the room stays mounted underneath (kit-stage-viewer present) — audio never stops", () => {
    expect(html).toContain("kit-stage-viewer");
  });

  it("the cover picture, the chip, and the slim controls line all render", () => {
    expect(html).toContain("kit-stage-cover");
    expect(html).toContain("/images/reading-love-cover.jpg");
    expect(html).toContain("kit-stage-chip");
    expect(html).toContain("Live · 1:11 PM MDT · The Reading");
    expect(html).toContain("Love is here. Her camera comes on in a moment.");
    expect(html).toContain("No sound? Tap the screen.");
  });

  it("the media box carries the same waiting/cover modifier classes the pre-live book art uses (phone aspect-ratio reuse)", () => {
    expect(html).toMatch(/class="kit-stage-media kit-stage-waiting kit-stage-waiting--cover"/);
  });

  it("no fake button: no interactive control at all while the cover is up", () => {
    expect(html).not.toContain("<button");
    expect(html).not.toContain("Tap for sound");
  });

  it("copy laws: no em dash, no arrows, no emoji", () => {
    expect(html).not.toMatch(NO_EM_DASH);
    expect(html).not.toMatch(NO_ARROWS_OR_EMOJI);
  });
});

describe("ReadingStage — cameraShown true (or unset) never shows the cover over a live room", () => {
  it("explicit true (the site switch says shown): no cover markup at all", () => {
    const html = renderStage(stageProps({ cameraShown: true }));
    expect(html).not.toContain("kit-stage-cover");
    expect(html).not.toContain("Love is here. Her camera comes on in a moment.");
    expect(html).toContain("kit-stage-viewer");
  });

  it("unset (every caller that never wires the prop): fails CLOSED — the cover stays up, never a guessed video", () => {
    const html = renderStage(stageProps({}));
    expect(html).toContain("kit-stage-cover");
    expect(html).not.toContain("<button");
  });
});

describe("ReadingStage — the cover never rides when the room itself isn't showing", () => {
  it("cameraShown: false with showRoom false (not published) still shows the ordinary waiting picture, not the live-cover controls line", () => {
    const html = renderStage(stageProps({ phase: "closed", room: null, cameraShown: false }));
    expect(html).not.toContain("kit-stage-viewer");
    expect(html).not.toContain("Love is here. Her camera comes on in a moment.");
  });
});

describe("ReadingStageDoor — the cover overlay while showRoom && !cameraShown (Parts 3/4, TASK-487)", () => {
  const html = renderDoor(doorProps({ cameraShown: false }));

  it("the room stays mounted underneath; the cover, chip and slim controls line all render", () => {
    expect(html).toContain("kit-stage-viewer");
    expect(html).toContain("kit-stage-cover");
    expect(html).toContain("/images/reading-love-cover.jpg");
    expect(html).toContain("Live · 2:22 PM MDT · The Book Talk");
    expect(html).toContain("Love is here. Her camera comes on in a moment.");
    expect(html).toContain("No sound? Tap the screen.");
  });

  it("no fake button while the cover is up", () => {
    expect(html).not.toContain("<button");
    expect(html).not.toContain("Tap for sound");
  });

  it("copy laws: no em dash, no arrows, no emoji", () => {
    expect(html).not.toMatch(NO_EM_DASH);
    expect(html).not.toMatch(NO_ARROWS_OR_EMOJI);
  });
});

describe("ReadingStageDoor — cameraShown true (or unset) never shows the cover over a live room", () => {
  it("explicit true: no cover markup", () => {
    const html = renderDoor(doorProps({ cameraShown: true }));
    expect(html).not.toContain("kit-stage-cover");
    expect(html).toContain("kit-stage-viewer");
  });

  it("unset: fails CLOSED — the cover stays up over an otherwise-open door", () => {
    const html = renderDoor(doorProps({}));
    expect(html).toContain("kit-stage-cover");
  });

  it("CLOSED / not-open wires never carry the cover text, cameraShown value notwithstanding", () => {
    const html = renderDoor(doorProps({ wire: CLOSED, cameraShown: false }));
    expect(html).not.toContain("kit-stage-cover");
    expect(html).not.toContain("Love is here. Her camera comes on in a moment.");
  });
});

describe("TASK-487 — onHostVideo is retired from both mounts; the reducer's CODE stays untouched", () => {
  /* neither file's LIVE code declares/reads/sets a `hostVideoOn` value
     any more (no `useState`, no prop, no JSX attribute) — the docblocks
     DO still name it in prose, by design (this codebase's own precedent:
     ReadingStage.tsx's own history already names other retired concepts,
     e.g. JitsiViewer, by name in comments; the CODE never uses them). */
  const NO_LIVE_HOST_VIDEO_ON = [/useState\(true\)/, /hostVideoOn=\{/, /hostVideoOn:\s*boolean/, /setHostVideoOn/];

  it("ReadingStage.tsx no longer passes onHostVideo to JitsiRoom, and says so in a comment", async () => {
    const src = await read(STAGE);
    expect(src).not.toContain("onHostVideo={");
    expect(src).toMatch(/onHostVideo is deliberately NOT passed/);
    for (const re of NO_LIVE_HOST_VIDEO_ON) expect(src).not.toMatch(re);
  });

  it("ReadingStageDoor.tsx no longer passes onHostVideo to JitsiRoom, and says so in a comment", async () => {
    const src = await read(DOOR);
    expect(src).not.toContain("onHostVideo={");
    expect(src).toMatch(/onHostVideo deliberately NOT passed/);
    for (const re of NO_LIVE_HOST_VIDEO_ON) expect(src).not.toMatch(re);
  });

  it("JitsiRoom.tsx's own hostVideoReducer/onHostVideo plumbing is left in place — this lane only stops USING it here", async () => {
    const src = await read("src/components/booking/JitsiRoom.tsx");
    expect(src).toContain("export function hostVideoReducer");
    expect(src).toContain("onHostVideo");
  });
});

describe("rejoin()/onRejoin() — TASK-487: no host-video state left to reset any more", () => {
  /**
   * TASK-479's rejoin fix reset `hostVideoOn` because JitsiRoom's own
   * per-mount reducer could resync to a stale value the parent hadn't
   * heard about yet. TASK-487 removed that whole state: `cameraShown` now
   * comes from the door's own polled truth (set on every poll and on the
   * hangup's own re-check), never from a per-mount reducer — so a rejoin
   * has nothing stale to clear. Source pins (no jsdom in this repo).
   */
  it("ReadingStage.tsx's rejoin() is just setLeft(false) now — no camera-state reset call", async () => {
    const src = await read(STAGE);
    const fn = src.match(/const rejoin = useCallback\(\(\) => \{[\s\S]*?\n {2}\}, \[\]\);/);
    expect(fn, "rejoin() not found").not.toBeNull();
    expect(fn![0]).toContain("setLeft(false)");
    expect(fn![0]).not.toContain("setHostVideoOn");
    expect(fn![0]).not.toContain("setCameraShown");
  });

  it("ReadingStageDoor.tsx's onRejoin() is just setLeft(false) now — no camera-state reset call", async () => {
    const src = await read(DOOR);
    const fn = src.match(/const onRejoin = useCallback\(\(\) => setLeft\(false\), \[\]\);/);
    expect(fn, "onRejoin() not found").not.toBeNull();
  });
});
