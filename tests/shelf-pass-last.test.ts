import { describe, it, expect } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import fs from "node:fs";
import path from "node:path";
import type { StoreItem } from "@/lib/store";
import ShelfSection, { shelfGroups, isTasterPass, type ShelfGroupWithItems } from "@/components/store/ShelfSection";
import { STORE_SECTIONS } from "@/lib/store-sections";

/**
 * TASK-441 (block 968,222 — the Admiral: "can we have the weekly chronicles
 * 1 week pass at the bottom, and when the 4th item wrapps in teh store
 * please put it in the center middle of the row so it looks better"). The
 * rename, the package kind, the 7 days and the prices are DATA, already
 * live on production — this lane is the order and the centring only:
 *
 *  1. tasters (packages carrying entitlementDays, the one-week passes) sort
 *     AFTER the tiers; the price law (effectiveAmount ascending — the tiers
 *     climb left to right, Admiral 0018.05.15) holds inside each band;
 *  2. isTasterPass: a package with days → true; a package without days or
 *     with 0 → false; a non-package carrying days → false;
 *  3. the meditations section's price order is unchanged;
 *  4. the shelf grid carries `grid-lone-center` exactly when the last row
 *     of a 3-column grid would hold ONE card (count >= 4, count % 3 === 1,
 *     no bundle in the section — a bundle spans the whole row, so child
 *     counts no longer map to rows);
 *  5. the CSS pin: `.grid-3.grid-lone-center>:last-child{grid-column:2}`
 *     lives INSIDE house.css's existing `@media(min-width:760px)` block and
 *     nowhere outside it (opt-in by class — every other .grid-3 untouched).
 */

function item(over: Partial<StoreItem>): StoreItem {
  return {
    id: "x",
    schemaVersion: 2,
    title: "X",
    blurb: "words",
    images: [],
    kind: "package",
    price: {},
    fulfillment: "package",
    status: "live",
    ...over,
  };
}

/** production's four memberships, as a signed-out GET /api/store/catalog
 *  shows them at block 968,222 (prices in sats ride the gold rail) */
const PRODUCTION_PACKAGES = [
  item({ id: "weekly-intuitive", title: "Weekly Intuitive", price: { sats: 33000 } }),
  item({ id: "observer", title: "Observer", price: { sats: 55000 } }),
  item({ id: "evening-star", title: "Evening Star", price: { sats: 111000 } }),
  item({ id: "weekly-one-week", title: "Weekly Chronicles — One Week Pass", price: { sats: 11111 }, entitlementTier: "A", entitlementDays: 7 }),
];

function membershipsOrder(groups: ShelfGroupWithItems[]): string[] {
  return groups.find((g) => g.anchor === "memberships")!.items.map((i) => i.id);
}

describe("shelfGroups — tasters sit after the tiers, price law holds inside each band", () => {
  it("production's four packages: the $11 one-week pass sits LAST, the monthly tiers climb left to right", () => {
    expect(membershipsOrder(shelfGroups(PRODUCTION_PACKAGES))).toEqual([
      "weekly-intuitive",
      "observer",
      "evening-star",
      "weekly-one-week",
    ]);
  });

  it("two tasters plus two tiers: tiers by price first, then the passes by price among themselves", () => {
    const groups = shelfGroups([
      item({ id: "tier-b", price: { sats: 55000 } }),
      item({ id: "pass-22", price: { sats: 22000 }, entitlementDays: 7 }),
      item({ id: "tier-a", price: { sats: 33000 } }),
      item({ id: "pass-11", price: { sats: 11111 }, entitlementDays: 7 }),
    ]);
    expect(membershipsOrder(groups)).toEqual(["tier-a", "tier-b", "pass-11", "pass-22"]);
  });
});

describe("isTasterPass — a package carrying entitlementDays, nothing else", () => {
  it("a package with days → true", () => {
    expect(isTasterPass(item({ kind: "package", entitlementDays: 7 }))).toBe(true);
  });

  it("a package without days, or with 0 → false", () => {
    expect(isTasterPass(item({ kind: "package" }))).toBe(false);
    expect(isTasterPass(item({ kind: "package", entitlementDays: 0 }))).toBe(false);
  });

  it("a digital item carrying entitlementDays → false (days only name a taster ON a package)", () => {
    expect(isTasterPass(item({ kind: "digital", fulfillment: "digital", entitlementDays: 7 }))).toBe(false);
  });
});

describe("the meditations section — order unchanged (digital items sort by price exactly as before)", () => {
  it("matches the price-only sort, even with a digital item carrying a stray entitlementDays", () => {
    const digitals = [
      item({ id: "worthy", kind: "digital", fulfillment: "digital", price: { sats: 21000 } }),
      item({ id: "wakeup", kind: "digital", fulfillment: "digital", price: { sats: 11111 } }),
      item({ id: "stray-days", kind: "digital", fulfillment: "digital", price: { sats: 5000 }, entitlementDays: 7 }),
    ];
    const groups = shelfGroups(digitals);
    const meditations = groups.find((g) => g.anchor === "meditations")!.items.map((i) => i.id);
    const priceOnly = [...digitals]
      .sort((a, b) => (a.price.sats ?? 0) - (b.price.sats ?? 0))
      .map((i) => i.id);
    expect(meditations).toEqual(priceOnly);
    expect(meditations).toEqual(["stray-days", "wakeup", "worthy"]);
  });
});

describe("the shelf grid — a lone card on the last row sits in the middle", () => {
  const memberships = STORE_SECTIONS.find((s) => s.anchor === "memberships")!;
  const rails = { btc: true, card: true };

  function gridHtml(items: StoreItem[]): string {
    const group: ShelfGroupWithItems = { ...memberships, items };
    return renderToStaticMarkup(createElement(ShelfSection, { group, rails }));
  }

  function packages(n: number, over: Partial<StoreItem> = {}): StoreItem[] {
    return Array.from({ length: n }, (_, i) =>
      item({ id: `p${i}`, price: { sats: (i + 1) * 11111 }, ...over }));
  }

  it("4 packages → the grid carries grid-lone-center (row 2 holds ONE card, centred)", () => {
    expect(gridHtml(packages(4))).toContain('class="grid grid-3 grid-lone-center"');
  });

  it("3 packages → no grid-lone-center (one full row, nothing wraps)", () => {
    const html = gridHtml(packages(3));
    expect(html).toContain('class="grid grid-3"');
    expect(html).not.toContain("grid-lone-center");
  });

  it("5 packages → no grid-lone-center (the pair case keeps today's left-aligned pair)", () => {
    expect(gridHtml(packages(5))).not.toContain("grid-lone-center");
  });

  it("7 packages → grid-lone-center again (rows of 3, 3 and a lone 1)", () => {
    expect(gridHtml(packages(7))).toContain('class="grid grid-3 grid-lone-center"');
  });

  it("4 packages with one bundle word → no grid-lone-center (a bundle spans the whole row; counts no longer map to rows)", () => {
    expect(gridHtml(packages(4, { bundle: "hair together" }))).not.toContain("grid-lone-center");
  });
});

describe("the CSS pin — one rule, inside the existing 760px block and nowhere outside", () => {
  const RULE = ".grid-3.grid-lone-center>:last-child{grid-column:2}";

  it("house.css carries the rule exactly once, inside @media(min-width:760px)", () => {
    const css = fs.readFileSync(path.join(process.cwd(), "src", "app", "house.css"), "utf8");
    expect(css.split(RULE).length - 1).toBe(1);
    const line = css.split("\n").find((l) => l.includes(RULE))!;
    const at = line.indexOf(RULE);
    expect(line.slice(0, at)).toContain("@media(min-width:760px){");
    expect(line.slice(at + RULE.length)).toContain("}");
  });
});
