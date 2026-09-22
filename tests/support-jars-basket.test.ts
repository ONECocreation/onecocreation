import { describe, it, expect } from "vitest";
import { existsSync, readFileSync } from "fs";
import path from "path";
import { JARS, JAR_ITEMS } from "@/components/TipJar";

/**
 * TASK-411 (block 968,170 a₿) — /support gifts become an order with a
 * receipt, bitcoin on-chain only. The three tip jars stop minting BTCPay
 * invoices via /api/tip and become three store items gifted through the
 * normal basket as pay-what-you-can offer lines (the basket route's own
 * floor: 111 sats). These pins retire the old rail and pin the new one:
 *
 *  1. api/tip/route.ts does not exist — the retirement is pinned, not
 *     tombstoned (404's (b) idiom: no tombstone comment under src/; this
 *     pin IS the witness).
 *  2. No `lightning` (case-insensitive) and no ⚡ in TipJar.tsx or
 *     support/page.tsx. DECISION C IS RULED WORDS PENDING: the lean built
 *     here removes the glyph WITH the words (both kickers + the Give
 *     button). If the Admiral rules the ⚡ is decoration, this pin narrows
 *     to the word only — drop the `⚡` assertion and let both kickers stay
 *     byte-identical.
 *  3. TipJar posts to /api/cart and never to /api/tip (source pin).
 *  4. The three jar itemIds appear in TipJar's map AND the titles match
 *     the JARS table's words — the receipt-naming truth (checkout's
 *     basketDescription joins line titles; the jar item's title IS the
 *     gift's name on the receipt). AMENDMENT 1 (SUPERSEDING build 1's
 *     ids): the store desk has no id field and api/admin/store/route.ts:56
 *     derives the id from the title, so the ids are the DERIVED ones —
 *     tip-love / tip-one-cocreation / gifts-of-gratitude (confirmed by
 *     reading the desk's create path, src/app/a/store/page.tsx).
 *  5. No `style={{` growth in TipJar.tsx: the preset-pill buttons carry
 *     className with `btn` (they moved from inline styles to the site's
 *     existing `.btn btn-sm` — btn-gold selected / btn-ghost unselected,
 *     BuyPanel.tsx:414/:432 precedent; no CSS file opened). Base count of
 *     `style={{` literals in TipJar.tsx is 9 at block 968,170 (main
 *     d4caffe); the count must never GROW past that.
 */

const ROOT = process.cwd();
const TIPJAR = path.join(ROOT, "src", "components", "TipJar.tsx");
const SUPPORT = path.join(ROOT, "src", "app", "support", "page.tsx");

describe("TASK-411 — the support jars ride the basket", () => {
  it("1. src/app/api/tip/route.ts does not exist (retired, not tombstoned)", () => {
    expect(existsSync(path.join(ROOT, "src", "app", "api", "tip", "route.ts"))).toBe(false);
  });

  it("2. no lightning word and no ⚡ in TipJar.tsx or support/page.tsx (decision C — ruled words pending)", () => {
    for (const file of [TIPJAR, SUPPORT]) {
      const src = readFileSync(file, "utf8");
      expect(src.toLowerCase(), `${file} carries a lightning word`).not.toContain("lightning");
      expect(src, `${file} carries the ⚡ glyph`).not.toContain("⚡");
    }
  });

  it("3. TipJar posts to /api/cart and never to /api/tip", () => {
    const src = readFileSync(TIPJAR, "utf8");
    expect(src).toContain('"/api/cart"');
    expect(src).not.toContain('"/api/tip"');
  });

  it("4. the three jar itemIds (AMENDMENT 1's derived ids) map to the JARS table's own words", () => {
    expect(JAR_ITEMS).toEqual({
      love: "tip-love",
      onecocreation: "tip-one-cocreation",
      payforward: "gifts-of-gratitude",
    });
    const titles = JARS.map((j) => [j.key, j.title] as const);
    expect(titles).toEqual([
      ["love", "Tip Love"],
      ["onecocreation", "Tip One Cocreation"],
      ["payforward", "Gifts of Gratitude"],
    ]);
    // every jar key carries a shelf item id and every mapped id belongs to a jar key
    for (const j of JARS) expect(JAR_ITEMS[j.key], `jar ${j.key} has no shelf item id`).toBeTruthy();
  });

  it("5. the preset pills carry .btn classes and TipJar's style={{ count does not grow (base 9 @ block 968,170)", () => {
    const src = readFileSync(TIPJAR, "utf8");
    const presetBlock = src.slice(src.indexOf("PRESETS.map"), src.indexOf("))}", src.indexOf("PRESETS.map")));
    expect(presetBlock).toContain("className");
    expect(presetBlock).toContain("btn");
    expect(presetBlock).not.toContain("style={{");
    const styleCount = (src.match(/style=\{\{/g) ?? []).length;
    expect(styleCount).toBeLessThanOrEqual(9); // base count 9 at block 968,170 (main d4caffe)
  });
});
