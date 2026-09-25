import { describe, it, expect } from "vitest";
import { promises as fs } from "fs";
import path from "path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ReadingStageBody, type ReadingStageBodyProps } from "@/components/reading/ReadingStage";

/**
 * TASK-463 (block 968,543) — /reading's buttons fit a phone.
 *
 * `.kit-btn` never wraps (kit.css, R-071, unconditional). The closed
 * state's "Go to the Heart Field" (TASK-457) shipped as the full-size
 * `kit-btn-main`: 406 px wide on production, inside a card whose clip box
 * is 316 px on a 360 px phone, so the ends of the words were cut off.
 * It is now the small kit button. The page's bottom button also loses
 * its "↑" (the no-arrow-buttons law, 968,357).
 */

function render(overrides: Partial<ReadingStageBodyProps>): string {
  return renderToStaticMarkup(
    createElement(ReadingStageBody, {
      phase: "closed",
      watching: false,
      failed: false,
      ended: false,
      room: null,
      playgroundOpen: false,
      /* TASK-466 (block 968,561): unlocked by default — this suite never
         renders the ended card (where the lock is read). */
      playgroundLock: { locked: false, floorName: "Test Tier" },
      jitsiDomain: "meet.example",
      nextWords: null,
      countdown: null,
      countdownWhen: null,
      left: false,
      onWatch: () => {},
      onTryAgain: () => {},
      onViewerEnded: () => {},
      ...overrides,
    }),
  );
}

describe("TASK-463 — the closed state's Heart Field link is the small kit button", () => {
  it("renders kit-btn kit-btn-main kit-btn-sm to /rooms/heart-field", () => {
    expect(render({})).toMatch(
      /<a class="kit-btn kit-btn-main kit-btn-sm" href="\/rooms\/heart-field">\s*Go to the Heart Field\s*<\/a>/,
    );
  });

  it("the live state's primary Watch Love live is the small button too, since TASK-464 (block 968,548)", () => {
    expect(render({ phase: "published", room: "shot-room" })).toMatch(
      /<a class="kit-btn kit-btn-main kit-btn-sm" href="\/rooms\/heart-field">\s*Watch Love live\s*<\/a>/,
    );
  });
});

describe("TASK-463 — no arrow on /reading's bottom button", () => {
  it('reads "Back to the reading" to #stage, with no arrow', async () => {
    const src = await fs.readFile(path.join(process.cwd(), "src/app/reading/page.tsx"), "utf8");
    expect(src).toMatch(/href="#stage">\s*Back to the reading\s*<\/a>/);
    expect(src).not.toContain("Back to the reading ↑");
  });
});
