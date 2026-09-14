import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import path from "path";
import sharp from "sharp";
import { cartridge } from "@/brand/cartridge";
import { earthside } from "@/brand/cartridges/earthside";

/**
 * TASK-252 (0018.06.24 a₿) — the home page's "My Story" block wears
 * Love's new picture. The block (`About()`, src/components/sections.tsx)
 * and its designer twin (`homeContent`, src/lib/puck-seeds.ts) both read
 * `cartridge.portraits.headshot` — one derivation, so pinning the
 * cartridge field pins both renders. Pins:
 *
 *   1. the cartridge headshot (both the default LOVE cartridge and its
 *      EARTHSIDE twin, the same person's slot) points at Love's Sep 8
 *      selfie (love-2.webp), not the old 2:3 love-headshot.webp;
 *   2. the file on disk is square (a 2:3 portrait would reflow the
 *      two-column section the img now frames as a 1:1);
 *   3. the WELCOME_PHOTO_URL source pin — /welcome's hands slot is a
 *      DIFFERENT photo and stays null (this task does not fill it).
 */

const WELCOME_FLOW = path.join(process.cwd(), "src/components/welcome/WelcomeFlow.tsx");
const HEADSHOT = path.join(process.cwd(), "public/images/about/love-2.webp");

describe("TASK-252 — the home My Story picture", () => {
  it("the default (LOVE) cartridge headshot is love-2.webp", () => {
    expect(cartridge.portraits.headshot).toBe("/images/about/love-2.webp");
  });

  it("the EARTHSIDE cartridge headshot — the same person's slot — matches", () => {
    expect(earthside.portraits.headshot).toBe("/images/about/love-2.webp");
  });

  it("the headshot file on disk is square", async () => {
    const meta = await sharp(HEADSHOT).metadata();
    expect(meta.width).toBeDefined();
    expect(meta.height).toBeDefined();
    expect(meta.width).toBe(meta.height);
  });

  it("source pin — /welcome's hands slot is still null (a different photo, out of scope)", () => {
    const src = readFileSync(WELCOME_FLOW, "utf8");
    expect(src).toMatch(/const WELCOME_PHOTO_URL: string \| null = null;/);
  });
});
