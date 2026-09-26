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
 * state's "Go to the Heart Field" shipped as the full-size `kit-btn-main`:
 * 406 px wide on production, inside a card whose clip box is 316 px on a
 * 360 px phone, so the ends of the words were cut off — it became the
 * small kit button.
 *
 * TASK-471 (block 968,624) retires that door entirely (Stage 1 mounts in
 * place now; the closed state carries no button at all). This suite's own
 * surviving pin is the one that never depended on Heart Field: every
 * button /reading's stage still shows is the small kit button, and the
 * page's bottom button carries no arrow (968,357).
 */

function render(overrides: Partial<ReadingStageBodyProps>): string {
  return renderToStaticMarkup(
    createElement(ReadingStageBody, {
      phase: "closed",
      signedIn: true,
      room: null,
      playgroundOpen: false,
      playgroundLock: { locked: false, floorName: "Test Tier" },
      jitsiDomain: "meet.example",
      nextWords: null,
      countdown: null,
      countdownWhen: null,
      left: false,
      ended: false,
      onRoomEnded: () => {},
      onRejoin: () => {},
      ...overrides,
    }),
  );
}

describe("TASK-463/471 — the stage's buttons are the small kit button, never full size", () => {
  it("closed: no button at all (the Heart Field door is retired — TASK-471)", () => {
    const html = render({});
    expect(html).not.toContain("<a ");
    expect(html).not.toContain("<button");
  });

  it("published, signed out: the one button (Sign me up) is kit-btn-sm", () => {
    const html = render({ phase: "published", signedIn: false, room: "shot-room" });
    expect(html).toMatch(/<a class="kit-btn kit-btn-main kit-btn-sm" href="#sign-up">\s*Sign me up\s*<\/a>/);
  });

  it("left-while-published: the one button (Back to the reading) is kit-btn-sm", () => {
    const html = render({ phase: "published", left: true });
    expect(html).toMatch(/<button[^>]*class="kit-btn kit-btn-main kit-btn-sm"[^>]*>\s*Back to the reading\s*<\/button>/);
  });
});

describe("TASK-463 — no arrow on /reading's bottom button", () => {
  it('reads "Back to the reading" to #stage, with no arrow', async () => {
    const src = await fs.readFile(path.join(process.cwd(), "src/app/reading/page.tsx"), "utf8");
    expect(src).toMatch(/href="#stage">\s*Back to the reading\s*<\/a>/);
    expect(src).not.toContain("Back to the reading ↑");
  });
});
