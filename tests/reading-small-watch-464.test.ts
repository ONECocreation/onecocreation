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
 *    "The Playground" alone. The h2 "Want an encore?", the body line and
 *    the "Go to the Playground" button are unchanged.
 * 2. the published "Watch Love live" link is now the small kit button,
 *    `kit-btn kit-btn-main kit-btn-sm` — at full size it bled 3 px past
 *    its card on a 360 px phone (the T-463 register). "Watch again"
 *    (ended-while-published, left-while-published) and "Try again" stay
 *    full size: their labels are short and fit.
 */

const read = (rel: string) => fs.readFile(path.join(process.cwd(), rel), "utf8");

const STAGE = "src/components/reading/ReadingStage.tsx";
const ROOM = "oc-0123456789abcdef";
const DOMAIN = "meet.reading-stage-fixture.invalid";

function bodyProps(overrides: Partial<ReadingStageBodyProps>): ReadingStageBodyProps {
  return {
    phase: "closed",
    watching: false,
    failed: false,
    ended: false,
    room: null,
    playgroundOpen: false,
    jitsiDomain: DOMAIN,
    nextWords: null,
    countdown: null,
    countdownWhen: null,
    left: false,
    onWatch: () => {},
    onTryAgain: () => {},
    onViewerEnded: () => {},
    ...overrides,
  };
}

function render(p: ReadingStageBodyProps): string {
  return renderToStaticMarkup(createElement(ReadingStageBody, p));
}

describe("TASK-464 — published Watch Love live is the small kit button", () => {
  it('renders exactly one <a class="kit-btn kit-btn-main kit-btn-sm" href="/rooms/heart-field">Watch Love live</a>', () => {
    const html = render(bodyProps({ phase: "published", room: ROOM }));
    expect(html).toMatch(
      /<a class="kit-btn kit-btn-main kit-btn-sm" href="\/rooms\/heart-field">\s*Watch Love live\s*<\/a>/,
    );
    // exactly one kit-btn-main on this phase, and it's the one above
    expect(html.split("kit-btn-main").length - 1).toBe(1);
  });
});

describe('TASK-464 — the Playground banner kicker drops "Stage 2 · "', () => {
  it('rendered: playgroundOpen true -> <p class="kicker">The Playground</p>, never the old kicker string', () => {
    const html = render(bodyProps({ phase: "closed", playgroundOpen: true }));
    expect(html).toContain('<p class="kicker">The Playground</p>');
    expect(html).not.toContain("Stage 2 · the Playground");
  });

  it("source: the old kicker string is gone; the new one is the exact JSX line", async () => {
    const src = await read(STAGE);
    expect(src).not.toContain("Stage 2 · the Playground");
    expect(src).toContain('<p className="kicker">The Playground</p>');
  });
});

describe("TASK-464 — Watch again keeps its full-size button (ended and left), untouched by this lane", () => {
  it("published, ended-while-published: Watch again is kit-btn kit-btn-main, no kit-btn-sm", () => {
    const html = render(bodyProps({ phase: "published", ended: true, nextWords: "Wednesday, September 30" }));
    expect(html).toMatch(/<a class="kit-btn kit-btn-main" href="\/rooms\/heart-field">\s*Watch again\s*<\/a>/);
    expect(html).not.toContain("kit-btn-sm");
  });

  it("published, left-while-published: Watch again is kit-btn kit-btn-main, no kit-btn-sm", () => {
    const html = render(bodyProps({ phase: "published", left: true }));
    expect(html).toMatch(/<a class="kit-btn kit-btn-main" href="\/rooms\/heart-field">\s*Watch again\s*<\/a>/);
    expect(html).not.toContain("kit-btn-sm");
  });
});

describe("TASK-464 — no arrow or emoji on any /reading button label", () => {
  // the fleet's emoji range (chrome-trio.test.ts's own pin)
  const EMOJI = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u;
  const cases: Array<Partial<ReadingStageBodyProps>> = [
    { phase: "closed" },
    { phase: "closed", playgroundOpen: true },
    { phase: "published", room: ROOM },
    { phase: "published", room: ROOM, playgroundOpen: true },
    { phase: "published", failed: true },
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
