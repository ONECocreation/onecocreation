import { describe, it, expect } from "vitest";
import { promises as fs } from "fs";
import path from "path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ReadingStageBody, type ReadingStageBodyProps } from "@/components/reading/ReadingStage";

/**
 * TASK-464 (block 968,548) — the Admiral's two answers on /reading:
 *
 * 1. the Playground banner's kicker drops "Stage 2 · " — it now reads
 *    "The Playground" alone.
 * 2. the published "Watch Love live" link was the small kit button.
 *
 * TASK-471 (block 968,624) retires the Heart Field link entirely (Stage 1
 * mounts in place). TASK-473 (block 968,624) retires the banner ITSELF
 * (its job is now the agenda's own single notice line,
 * `ReadingDayOpenNotice`) — this file's surviving pin is the
 * ONE-SIZE-BUTTON discipline, re-proven against the current shape's own
 * controls; the banner-kicker pin is kept only as the retirement's own
 * record.
 */

const read = (rel: string) => fs.readFile(path.join(process.cwd(), rel), "utf8");

const STAGE = "src/components/reading/ReadingStage.tsx";
const ROOM = "oc-0123456789abcdef";
const DOMAIN = "meet.reading-stage-fixture.invalid";

function bodyProps(overrides: Partial<ReadingStageBodyProps>): ReadingStageBodyProps {
  return {
    phase: "closed",
    signedIn: true,
    room: null,
    playgroundLock: { locked: false, floorName: "Test Tier" },
    jitsiDomain: DOMAIN,
    nextWords: null,
    countdown: null,
    countdownWhen: null,
    left: false,
    ended: false,
    onRoomEnded: () => {},
    onRejoin: () => {},
    partLabel: null,
    ...overrides,
  };
}

function render(p: ReadingStageBodyProps): string {
  return renderToStaticMarkup(createElement(ReadingStageBody, p));
}

describe("TASK-464's own banner kicker is retired along with the whole banner (TASK-473, block 968,624)", () => {
  it("rendered: no kicker, no banner, in any state", () => {
    const html = render(bodyProps({}));
    expect(html).not.toContain('<p class="kicker">The Playground</p>');
    expect(html).not.toContain("Stage 2 · the Playground");
  });

  it("source: neither the old nor the retired kicker string survives in ReadingStage.tsx", async () => {
    const src = await read(STAGE);
    expect(src).not.toContain("Stage 2 · the Playground");
    expect(src).not.toContain('<p className="kicker">The Playground</p>');
  });
});

describe("TASK-464/471 — every surviving button on the card is the small kit button", () => {
  it("published, signed out: Sign me up is kit-btn-sm", () => {
    const html = render(bodyProps({ phase: "published", signedIn: false, room: ROOM }));
    expect(html).toMatch(/<a class="kit-btn kit-btn-main kit-btn-sm" href="#sign-up">\s*Sign me up\s*<\/a>/);
  });

  it("left-while-published: Back to the reading is kit-btn-sm", () => {
    const html = render(bodyProps({ phase: "published", left: true }));
    expect(html).toMatch(/<button[^>]*class="kit-btn kit-btn-main kit-btn-sm"[^>]*>\s*Back to the reading\s*<\/button>/);
  });

  it("ended, published underneath: Watch the Book Talk is kit-btn-sm, picks Part 3 in-page (never /reading/playground)", () => {
    const html = render(bodyProps({ phase: "published", ended: true, nextWords: "Wednesday, September 30" }));
    expect(html).toContain("Watch the Book Talk");
    // fix round (block 968,624): the shining/second class now depends on
    // the shared selection (outside any Provider this file's own bare
    // render defaults to Part 1 selected, so Part 3's own pick reads
    // kit-btn-second — still one house button size, kit-btn-sm)
    expect(html).toMatch(/<a class="kit-btn kit-btn-(main|second) kit-btn-sm" href="#stage">/);
    expect(html).not.toContain("/reading/playground");
  });
});

describe("TASK-464 — no arrow or emoji on any /reading button label", () => {
  // the fleet's emoji range (chrome-trio.test.ts's own pin)
  const EMOJI = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u;
  const cases: Array<Partial<ReadingStageBodyProps>> = [
    { phase: "closed" },
    { phase: "published", signedIn: true, room: ROOM },
    { phase: "published", signedIn: false, room: ROOM },
    { phase: "published", ended: true, nextWords: "Wednesday, September 30" },
    { phase: "published", left: true },
  ];

  it('no rendered body across these phases contains "→" or an emoji', () => {
    for (const over of cases) {
      const html = render(bodyProps(over));
      expect(html).not.toContain("→");
      expect(html).not.toMatch(EMOJI);
    }
  });
});
