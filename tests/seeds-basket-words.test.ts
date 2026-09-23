import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import path from "path";

/**
 * TASK-420 (block 968,203 a₿) — the seeds carry the basket's words: the
 * support-gifts residue T-411 named and did not own. A reseed of home,
 * /support or /cart used to bring the pre-411 lightning words (and the ⚡
 * glyph) back, and no pin caught it. These pins retire that drift:
 *
 *  1. No `lightning` (case-insensitive) in SEEDS.home / SEEDS.support /
 *     SEEDS.cart (flattened with JSON.stringify, the cart-puck.test.ts:96
 *     idiom), in src/lib/pwyc-letters.ts, or in cartCheckoutLine across its
 *     four rail states. Decision B scopes the word ban to exactly these
 *     surfaces — the terms/jewelry/media seeds stay (capability-pinned by
 *     their own lanes' tests; the follow-on copy lane is named in 420's
 *     Seams).
 *  2. cartCheckoutLine's four rail states are Astra §3's exact sentences
 *     (~/dev/briefings/ASTRA-card-gifts-968194.md:55-63 — "bitcoin" /
 *     "card" / "every item must support the rail you choose" / the
 *     neither-rail sentence; Cut note, block 968,196, SUPERSEDING the
 *     body's cart wording so T-422 never touches the file).
 *  3. The mirror can never drift: SEEDS.cart.content flattened contains
 *     cartCheckoutLine({ btc: true, card: true }) verbatim.
 *  4. DECISION C IS RULED (block 968,202 — the Admiral's word: "c ok to
 *     drop."): variant B, word + glyph. No ⚡ in SEEDS.support.content,
 *     SEEDS.cart.content, or the home band-6 source slice ("// 6 - tend
 *     the field" … "// 7 - the free meditation" — the source-slice idiom
 *     411's pin 5 uses). The two seed eyebrows become "Support This Work —
 *     Gently", matching the merged live kickers (support/page.tsx:86,
 *     sections.tsx:586). The glyph ban scopes to the gifts surfaces: the
 *     sats-mark ⚡ on price lines is the house money-mark idiom 411 never
 *     questioned. This pin succeeds 411's pin 2, which self-described
 *     "DECISION C IS RULED WORDS PENDING" — the words are no longer
 *     pending.
 *  5. BuyPanel's bitcoin-only sentence speaks on-chain (Amendment, block
 *     968,198): the source contains "Pay in bitcoin — it travels on-chain,
 *     straight to the artist's own wallet." and never again "quick as a
 *     breath on lightning".
 *  6. No "no cut taken" promise in the gifts seeds (Amendment, block
 *     968,211 — the Admiral: "ok to strike that no cut taken words").
 *     Square takes a card fee, so the promise is false for card gifts.
 *     Scope: SEEDS.home band 6 and SEEDS.support; the live copies in
 *     sections.tsx and support/page.tsx are T-422's.
 */

const ROOT = process.cwd();
const read = (rel: string) => readFileSync(path.join(ROOT, rel), "utf8");

const RAIL_STATES: { btc: boolean; card: boolean }[] = [
  { btc: true, card: true },
  { btc: true, card: false },
  { btc: false, card: true },
  { btc: false, card: false },
];

describe("TASK-420 — the seeds carry the basket's words (no lightning rides a reseed)", () => {
  it("1. no lightning word in the three seed contents, the pwyc letters, or cartCheckoutLine's four states", async () => {
    const { SEEDS } = await import("@/lib/puck-seeds");
    const { cartCheckoutLine } = await import("@/app/cart/page");
    for (const slug of ["home", "support", "cart"] as const) {
      const flat = JSON.stringify(SEEDS[slug].content);
      expect(flat.toLowerCase(), `SEEDS.${slug} carries a lightning word`).not.toContain("lightning");
    }
    const letters = read("src/lib/pwyc-letters.ts");
    expect(letters.toLowerCase(), "pwyc-letters.ts carries a lightning word").not.toContain("lightning");
    for (const rails of RAIL_STATES) {
      const line = cartCheckoutLine(rails);
      expect(line.toLowerCase(), `cartCheckoutLine(${JSON.stringify(rails)}) carries a lightning word`).not.toContain("lightning");
    }
  });

  it("2. cartCheckoutLine's four rail states are Astra §3's exact sentences", async () => {
    const { cartCheckoutLine } = await import("@/app/cart/page");
    const table: [{ btc: boolean; card: boolean }, string][] = [
      [{ btc: true, card: true }, "Checkout by bitcoin or card — every item must support the rail you choose."],
      [{ btc: true, card: false }, "Checkout by bitcoin — every item must support bitcoin."],
      [{ btc: false, card: true }, "Checkout by card — every item must support card."],
      [{ btc: false, card: false }, "Your basket is holding everything — checkout opens when a payment rail is available."],
    ];
    for (const [rails, want] of table) {
      expect(cartCheckoutLine(rails)).toBe(want);
    }
  });

  it("3. the cart seed's blurb mirrors the both-rails line verbatim", async () => {
    const { SEEDS } = await import("@/lib/puck-seeds");
    const { cartCheckoutLine } = await import("@/app/cart/page");
    const flat = JSON.stringify(SEEDS.cart.content);
    expect(flat).toContain(cartCheckoutLine({ btc: true, card: true }));
  });

  it("4. decision C (RULED block 968,202, variant B): no ⚡ on the gifts surfaces in the seeds", async () => {
    const { SEEDS } = await import("@/lib/puck-seeds");
    expect(JSON.stringify(SEEDS.support.content), "SEEDS.support carries the ⚡ glyph").not.toContain("⚡");
    expect(JSON.stringify(SEEDS.cart.content), "SEEDS.cart carries the ⚡ glyph").not.toContain("⚡");
    const seeds = read("src/lib/puck-seeds.ts");
    const band6 = seeds.slice(seeds.indexOf("// 6 - tend the field"), seeds.indexOf("// 7 - the free meditation"));
    expect(band6, "the home tend-the-field band carries the ⚡ glyph").not.toContain("⚡");
  });

  it("5. BuyPanel's bitcoin-only sentence speaks on-chain (amendment, block 968,198)", () => {
    const src = read("src/components/store/BuyPanel.tsx");
    expect(src).toContain("Pay in bitcoin — it travels on-chain, straight to the artist's own wallet.");
    expect(src).not.toContain("quick as a breath on lightning");
  });

  it("6. no \"no cut taken\" promise in the gifts seeds (amendment, block 968,211)", async () => {
    const { SEEDS } = await import("@/lib/puck-seeds");
    expect(JSON.stringify(SEEDS.support.content), "SEEDS.support promises no cut").not.toMatch(/no cut taken/);
    const seeds = read("src/lib/puck-seeds.ts");
    const band6 = seeds.slice(seeds.indexOf("// 6 - tend the field"), seeds.indexOf("// 7 - the free meditation"));
    expect(band6, "the home tend-the-field band promises no cut").not.toMatch(/no cut taken/);
  });
});
