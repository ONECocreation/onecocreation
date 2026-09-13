import { describe, it, expect } from "vitest";
import { BOARD_SAMPLE } from "@/lib/board-sample";

/**
 * TASK-216 (0018.06.23 a₿, #15 — "/style: the 'book a reading' centering
 * did not update"). NOT a CSS specificity fight: the Buttons block's align
 * renderer lives in the vendored @pacsarcade/puck-config (a dependency
 * repo — Seams, not OWNS), and it reads its prop honestly. The sample DATA
 * itself said `align: "left"` on the Buttons block carrying "Solid — book
 * a reading" / "Quiet — learn more" — the one line that diverged from the
 * ask. Root cause, not a stronger rule.
 */
describe("TASK-216 — the brand board's Buttons block (book a reading / learn more) is centered", () => {
  it("BOARD_SAMPLE's Buttons block renders with align: center", () => {
    const buttons = BOARD_SAMPLE.content.find(
      (b: { type?: string }) => b.type === "Buttons",
    ) as { props?: { align?: string; buttons?: { label: string }[] } } | undefined;
    expect(buttons, "no Buttons block found in BOARD_SAMPLE").toBeTruthy();
    expect(buttons?.props?.align).toBe("center");
  });

  it("that block is really the 'book a reading' row, not some other Buttons block", () => {
    const buttons = BOARD_SAMPLE.content.find(
      (b: { type?: string }) => b.type === "Buttons",
    ) as { props?: { buttons?: { label: string }[] } } | undefined;
    const labels = buttons?.props?.buttons?.map((b) => b.label) ?? [];
    expect(labels.some((l) => /book a reading/i.test(l))).toBe(true);
  });

  it("every other block on the specimen page stays left (untouched) — this was a one-line, targeted fix, not a blanket realignment", () => {
    const nonButtonBlocks = BOARD_SAMPLE.content.filter(
      (b: { type?: string }) => b.type !== "Buttons",
    ) as { props?: { align?: string } }[];
    for (const b of nonButtonBlocks) {
      if (b.props?.align !== undefined) expect(b.props.align).toBe("left");
    }
  });
});
