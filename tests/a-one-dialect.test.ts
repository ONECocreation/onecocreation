import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

/**
 * TASK-234 — /a wears one dialect. Three dialects used to coexist under the
 * console: the house glass grammar (glassCard/SectionHead/field + the .btn
 * family), raw Tailwind neutral/yellow/cyan classes (the letters + people +
 * landing pages), and the retired .btn-pill. This test reads the six page
 * sources this lane owns as plain text and pins the three source-level laws
 * the brief set: no .btn-pill, no raw neutral-/yellow-/cyan- utility
 * classes, no var(--serif) leak — plus a byte-for-byte pin on the money and
 * store amount lines, so a later edit can't quietly reintroduce a serif or
 * touch a money-path line while "just" restyling.
 */

const SIX_PAGES = [
  "src/app/a/page.tsx",
  "src/app/a/letters/page.tsx",
  "src/app/a/letters/[key]/page.tsx",
  "src/app/a/people/page.tsx",
  "src/app/a/briefs/page.tsx",
  "src/app/a/money/page.tsx",
] as const;

const STORE_PAGE = "src/app/a/store/page.tsx";

const RAW_COLOUR = /neutral-|yellow-|cyan-/;

describe("the six /a pages speak one dialect", () => {
  for (const p of SIX_PAGES) {
    const src = readFileSync(p, "utf8");

    it(`${p} carries zero .btn-pill`, () => {
      expect(src).not.toContain("btn-pill");
    });

    it(`${p} carries zero raw neutral-/yellow-/cyan- classes`, () => {
      expect(src).not.toMatch(RAW_COLOUR);
    });

    it(`${p} carries zero var(--serif)`, () => {
      expect(src).not.toContain("var(--serif)");
    });
  }

  it("store/page.tsx (the one owned line) also carries zero var(--serif)", () => {
    expect(readFileSync(STORE_PAGE, "utf8")).not.toContain("var(--serif)");
  });
});

describe("money-path lines stay byte-identical (chrome only)", () => {
  it("money/page.tsx: orderSats() and its dollars() fallback are untouched", () => {
    const src = readFileSync("src/app/a/money/page.tsx", "utf8");
    expect(src).toContain("function orderSats(o: OrderRecord): string {");
    expect(src).toContain(
      '    : dollars(o.priceSnapshot.amount, o.priceSnapshot.currency);',
    );
    expect(src).toContain("{orderSats(o)}");
    expect(src).toContain('{orderSats(detail)}{detail.priceSnapshot.currency === "SATS" ? " sats" : ""}');
  });

  it("store/page.tsx: priceWords()/dollars() and its one owned call site are untouched", () => {
    const src = readFileSync(STORE_PAGE, "utf8");
    expect(src).toContain("function priceWords(item: StoreItem): string {");
    expect(src).toContain(
      "  const fiat = item.price.fiat ? dollars(item.price.fiat.amount, item.price.fiat.currency) : null;",
    );
    expect(src).toContain("{priceWords(item)}");
  });

  it("store/page.tsx: the sale-price helper (saleWords/dollars) is untouched", () => {
    const src = readFileSync(STORE_PAGE, "utf8");
    expect(src).toContain(
      "  const fiat = sale.fiat ? dollars(sale.fiat.amount, sale.fiat.currency) : null;",
    );
  });
});

describe("one root padding", () => {
  const expectP6 = [
    "src/app/a/letters/page.tsx",
    "src/app/a/letters/[key]/page.tsx",
    "src/app/a/people/page.tsx",
    "src/app/a/money/page.tsx",
  ];
  for (const p of expectP6) {
    it(`${p} root wrapper carries p-6`, () => {
      expect(readFileSync(p, "utf8")).toMatch(/className="p-6 text-sm"/);
    });
  }

  it("src/app/a/briefs/page.tsx root wrapper carries p-6", () => {
    expect(readFileSync("src/app/a/briefs/page.tsx", "utf8")).toContain('className="min-h-screen p-6"');
  });

  it("src/app/a/page.tsx site-chrome root wrapper carries p-6", () => {
    expect(readFileSync("src/app/a/page.tsx", "utf8")).toContain('<div className="p-6">');
  });
});
