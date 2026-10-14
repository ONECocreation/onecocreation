import { describe, it, expect } from "vitest";
import { promises as fs } from "fs";
import path from "path";
import { SEEDS, applyEmojiLineToPuck, applyLionToPuck } from "@/lib/puck-seeds";
import { config } from "@/lib/puck-config";

/**
 * TASK-611 (L18) - the published /memberships page ignored the T-560 fix
 * because it only lived in the fallback JSX. The route now runs the
 * published document through applyEmojiLineToPuck.
 */
const RUN = "🌈 💕 🦁";
type B = { type: string; props: Record<string, unknown> };
const flat = (list: unknown[]): B[] =>
  (list as B[]).flatMap((b) => [b, ...Object.values(b.props).flatMap((v) => (Array.isArray(v) ? flat(v) : []))]);

const live = (text: string) => ({
  root: { props: { title: "Memberships" } },
  content: [
    { type: "Band", props: { id: "mb-band", content: [
      { type: "Text", props: { id: "mb-3", text: "Before", align: "left" } },
      { type: "Text", props: { id: "mb-4", text, align: "left", style: { color: "ink" } } },
      { type: "Text", props: { id: "mb-5", text: "After", align: "left" } },
    ] } },
  ],
});

describe("applyEmojiLineToPuck (TASK-611)", () => {
  it("moves the seed's trailing glyphs onto an EmojiLine right after the paragraph", () => {
    const out = applyEmojiLineToPuck(SEEDS.memberships as { content: unknown[] });
    const all = flat(out.content);
    const i = all.findIndex((b) => b.type === "Text" && String(b.props.text).includes("heart connection with you"));
    expect(String(all[i].props.text)).not.toMatch(/[🌈💕🦁]/u);
    expect(String(all[i].props.text).endsWith("with you")).toBe(true);
    expect(all[i + 1].type).toBe("EmojiLine");
    expect(all[i + 1].props.text).toBe(RUN);
  });

  it("handles the live shape, glyphs glued or spaced, and keeps order", () => {
    for (const tail of ["🌈💕🦁", " 🌈 💕 🦁", " 🌈💕 🦁 "]) {
      const out = applyEmojiLineToPuck(live(`ready for this heart connection with you${tail}`));
      const slot = (out.content[0].props.content as B[]);
      expect(slot.map((b) => b.props.id)).toEqual(["mb-3", "mb-4", "mb-4-emoji-line", "mb-5"]);
      expect(slot[1].props.text).toBe("ready for this heart connection with you");
      expect(slot[2]).toEqual({ type: "EmojiLine", props: { id: "mb-4-emoji-line", text: RUN } });
      expect(slot[1].props.style).toEqual({ color: "ink" });
    }
  });

  it("is idempotent: a second pass changes nothing, same object back", () => {
    const once = applyEmojiLineToPuck(live(`with you 🌈💕🦁`));
    expect(applyEmojiLineToPuck(once)).toBe(once);
    expect(flat(once.content).filter((b) => b.type === "EmojiLine")).toHaveLength(1);
  });

  it("does nothing when the glyphs are absent or already on their own line", () => {
    const none = live("with you");
    expect(applyEmojiLineToPuck(none)).toBe(none);
    const own = live(RUN);
    expect(applyEmojiLineToPuck(own)).toBe(own);
    const mid = live("with 🌈💕🦁 you");
    expect(applyEmojiLineToPuck(mid)).toBe(mid);
    const empty = { content: [] as unknown[] };
    expect(applyEmojiLineToPuck(empty)).toBe(empty);
  });

  it("composes with the lion ground and the block is registered in the config", () => {
    const out = applyLionToPuck(applyEmojiLineToPuck(SEEDS.memberships as { content: unknown[] }));
    expect(flat(out.content).some((b) => b.type === "EmojiLine")).toBe(true);
    const comp = (config.components as Record<string, { render: (p: unknown) => unknown }>).EmojiLine;
    expect(comp).toBeTruthy();
  });

  it("the route calls the transform and the block carries the /book class", async () => {
    const page = await fs.readFile(path.join(process.cwd(), "src/app/memberships/page.tsx"), "utf8");
    expect(page).toContain("applyLionToPuck(applyEmojiLineToPuck(puck as Data))");
    const blk = await fs.readFile(path.join(process.cwd(), "src/lib/puck-blocks/emoji-line.tsx"), "utf8");
    expect(blk).toContain('className="constellation constellation-lg"');
  });
});
