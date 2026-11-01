import { describe, it, expect } from "vitest";
import { promises as fs } from "fs";
import path from "path";

/**
 * TASK-641 (K185 item 4) — the Admiral's pin on oc-t603-build-1
 * (`04-respond-t603b-dawn-1440.png`): "the top and bottom feel cut off.
 * it's like the modal is not properly sitting in the box."
 *
 * The crop he marked was the PRE-PORTAL state: rendered inside the room's
 * glass card, the fixed overlay was trapped by the card's backdrop filter
 * and clipped at the card's edges. T-603's follow-up (a288c1b6) moved the
 * window to a document.body portal, which is on main — these pins keep it
 * there, and keep the Sheet's viewport cap that guarantees the box can
 * never outgrow the screen:
 *
 *  · QuestionsPanel renders the respond window through the shared Sheet
 *    inside createPortal(..., document.body) — never inline in the card;
 *  · Sheet's scrim stays fixed inset:0 with padding, and the sheet keeps
 *    maxHeight 86vh + overflowY auto, so over-long content scrolls INSIDE
 *    the box instead of the box bleeding past the viewport.
 *
 * Source pins, the repo's own idiom (reading-go-door.test.ts's shape);
 * this repo runs no jsdom.
 */

const ROOT = process.cwd();
const read = (rel: string) => fs.readFile(path.join(ROOT, rel), "utf8");

describe("T-641: the respond window sits whole in its box", () => {
  it("the Read and respond window is portaled to document.body, never trapped in the card", async () => {
    const src = await read("src/components/qa/QuestionsPanel.tsx");
    expect(src).toContain('import Sheet from "@/components/Sheet"');
    expect(src).toContain("createPortal(");
    expect(src).toContain("document.body");
  });

  it("the Sheet caps the box inside the viewport and scrolls overflow inside", async () => {
    const src = await read("src/components/Sheet.tsx");
    expect(src).toContain('position: "fixed"');
    expect(src).toContain("inset: 0");
    expect(src).toContain('maxHeight: "86vh"');
    expect(src).toContain('overflowY: "auto"');
  });
});
