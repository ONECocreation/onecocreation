import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import path from "path";
import sharp from "sharp";

/**
 * TASK-238 (0018.06.23 a₿ · block ~966,895) — Love's new picture in the
 * middle About slot (`public/images/about/love-2.webp`). Pins:
 *
 *  · the file on disk is a SQUARE, ≥ 800 px a side (the 190 px frame in
 *    house.css cover-crops it, so a square source never crops her face
 *    off-centre the way a portrait or landscape source would);
 *  · both branches that name the middle slot — the hand-built JSX page
 *    and the designer seed — still say "love-2.webp" (grep, no invention;
 *    a code-path change here would mean the frame moved, not the photo).
 */

const ABOUT_PAGE = path.join(process.cwd(), "src/app/about/page.tsx");
const PUCK_SEEDS = path.join(process.cwd(), "src/lib/puck-seeds.ts");
const LOVE_2 = path.join(process.cwd(), "public/images/about/love-2.webp");

describe("TASK-238 — the About middle picture", () => {
  it("love-2.webp is square and at least 800px a side", async () => {
    const meta = await sharp(LOVE_2).metadata();
    expect(meta.width).toBeDefined();
    expect(meta.height).toBeDefined();
    expect(meta.width).toBe(meta.height);
    expect(meta.width!).toBeGreaterThanOrEqual(800);
  });

  it("the hand-built JSX page still names love-2 in the three-face row", () => {
    const src = readFileSync(ABOUT_PAGE, "utf8");
    expect(src).toMatch(/\["love-1"\s*,\s*"love-2"\s*,\s*"love-3"\]/);
  });

  it("the designer seed still names love-2.webp in its gallery block", () => {
    const src = readFileSync(PUCK_SEEDS, "utf8");
    expect(src).toContain("/images/about/love-2.webp");
  });
});
