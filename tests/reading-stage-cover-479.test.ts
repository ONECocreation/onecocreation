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
 * TASK-479 (block 968,624+, the Admiral's approved mockup, `t479/mockup.html`,
 * "good on the calls, let's build it"). The book-cover-over-the-mounted-room
 * markup, rendered pure (`renderToStaticMarkup`, no jsdom in this repo) for
 * both /reading top screens it applies to: `ReadingStage.tsx` (Parts 1/2)
 * and `ReadingStageDoor.tsx` (Parts 3/4).
 *
 * Sound path chosen (FEASIBILITY.md §4): NOT a fake "Tap for sound" button —
 * detecting a blocked cross-origin autoplay isn't reliably possible, and a
 * real button would intercept the very tap that's supposed to reach the
 * iframe. Instead: one honest, permanent, click-through line, "No sound?
 * Tap the screen.", under the cover text — true whether or not sound is
 * actually blocked (never a false "Sound is on" claim), sitting in the
 * normal (non-overlapping) controls strip below the media box; the real
 * click-through mechanism is `.kit-stage-cover`'s own `pointer-events:none`
 * on the picture layer that DOES sit over the iframe.
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
    wire: { decision: "open", reachable: true, room: ROOM } as Wire,
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

describe("ReadingStage — the cover overlay while showRoom && !hostVideoOn", () => {
  const html = renderStage(stageProps({ hostVideoOn: false }));

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

describe("ReadingStage — hostVideoOn true (or unset) never shows the cover over a live room", () => {
  it("explicit true: no cover markup at all", () => {
    const html = renderStage(stageProps({ hostVideoOn: true }));
    expect(html).not.toContain("kit-stage-cover");
    expect(html).not.toContain("Love is here. Her camera comes on in a moment.");
    expect(html).toContain("kit-stage-viewer");
  });

  it("unset (every caller before this lane, and any caller that never wires the reducer): fail-open default is video, byte-identical to before", () => {
    const html = renderStage(stageProps({}));
    expect(html).not.toContain("kit-stage-cover");
    expect(html).not.toContain("/images/reading-love-cover.jpg");
    expect(html).not.toContain("<button");
  });
});

describe("ReadingStage — the cover never rides when the room itself isn't showing", () => {
  it("hostVideoOn: false with showRoom false (not published) still shows the ordinary waiting picture, not the live-cover controls line", () => {
    const html = renderStage(stageProps({ phase: "closed", room: null, hostVideoOn: false }));
    expect(html).not.toContain("kit-stage-viewer");
    expect(html).not.toContain("Love is here. Her camera comes on in a moment.");
  });
});

describe("ReadingStageDoor — the cover overlay while showRoom && !hostVideoOn (Parts 3/4)", () => {
  const html = renderDoor(doorProps({ hostVideoOn: false }));

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

describe("ReadingStageDoor — hostVideoOn true (or unset) never shows the cover over a live room", () => {
  it("explicit true: no cover markup", () => {
    const html = renderDoor(doorProps({ hostVideoOn: true }));
    expect(html).not.toContain("kit-stage-cover");
    expect(html).toContain("kit-stage-viewer");
  });

  it("unset: byte-identical to before this lane (every pre-existing wire state test in tests/reading-stage-door-473.test.ts stays true)", () => {
    const html = renderDoor(doorProps({}));
    expect(html).not.toContain("kit-stage-cover");
    expect(html).not.toContain("/images/reading-love-cover.jpg");
  });

  it("CLOSED / not-open wires never carry the cover text, hostVideoOn value notwithstanding", () => {
    const html = renderDoor(doorProps({ wire: CLOSED, hostVideoOn: false }));
    expect(html).not.toContain("kit-stage-cover");
    expect(html).not.toContain("Love is here. Her camera comes on in a moment.");
  });
});

describe("TASK-479 fix (part b) — a rejoin also resets hostVideoOn, never leaving a stuck cover over a live host", () => {
  /**
   * The failure this closes: host mutes video (cover up) -> viewer hangs
   * up -> host turns video on -> viewer clicks back in. A FRESH JitsiRoom
   * mounts in its own fail-open state and syncs it once on boot (part a,
   * pinned in tests/host-video-reducer-479.test.ts), but the room string
   * itself never changes on a rejoin (same still-published room), so the
   * "reset on a fresh room" adjust-during-render guard never fires either.
   * `rejoin()`/`onRejoin()` must reset `hostVideoOn` themselves — source
   * pins (no jsdom in this repo; the default export's interactive state
   * isn't reachable through `renderToStaticMarkup`, the same reason this
   * file's own wiring checks throughout the codebase are source pins).
   */
  it("ReadingStage.tsx's rejoin() resets hostVideoOn to true, not just left to false", async () => {
    const src = await read(STAGE);
    const fn = src.match(/const rejoin = useCallback\(\(\) => \{[\s\S]*?\n {2}\}, \[\]\);/);
    expect(fn, "rejoin() not found").not.toBeNull();
    expect(fn![0]).toContain("setLeft(false)");
    expect(fn![0]).toContain("setHostVideoOn(true)");
  });

  it("ReadingStageDoor.tsx's onRejoin() resets hostVideoOn to true, not just left to false", async () => {
    const src = await read(DOOR);
    const fn = src.match(/const onRejoin = useCallback\(\(\) => \{[\s\S]*?\n {2}\}, \[\]\);/);
    expect(fn, "onRejoin() not found").not.toBeNull();
    expect(fn![0]).toContain("setLeft(false)");
    expect(fn![0]).toContain("setHostVideoOn(true)");
  });
});
