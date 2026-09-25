import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import path from "path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

/**
 * TASK-459 (block 968,543) — no bitcoin words on the card path, no dead
 * "make an offer" opener. Bitcoin is OFF on the site (card only, via
 * Square); four sentences on the card path used to say otherwise, and the
 * basket's pay-what-you-can opener used to offer a door
 * `/api/cart/checkout:110-118` refuses for a card checkout (a sats offer
 * has no fiat truth). These pins retire both:
 *
 *  1. None of "Paid in bitcoin, straight to the artist." / "paid in
 *     bitcoin" (metadata + the store/memberships copy), "Pay monthly in
 *     dollars or in bitcoin" (the packages lead), "pay in bitcoin (or
 *     dollars)" (the gate-works note), or "no cut taken" (the support
 *     promise — false once Square takes its fee) remain in this lane's
 *     owned files: src/app/store/page.tsx, src/app/store/memberships/
 *     page.tsx, src/components/sections.tsx, src/app/support/page.tsx.
 *  2. The same four sentences are gone from the matching puck-seeds.ts
 *     entries (SEEDS.home, SEEDS.packages incl. its root description,
 *     SEEDS.store incl. its root description) — a reseed must not bring
 *     bitcoin words back. SEEDS.retreats is explicitly NOT this lane
 *     (ruled after Saturday) and is asserted UNCHANGED — it still carries
 *     "paid in bitcoin", proving this suite never widened past its scope.
 *  3. CartPanel's "pay what you can — make an offer" opener (and its
 *     input+offer editing state) render only when `rails.btc` is true; a
 *     line that already carries an offer still gets "remove offer — pay
 *     the listed price" on ANY rail, so nobody gets stuck holding an offer
 *     a card checkout would refuse.
 *  4. A static render of the basket with `rails={btc:false,card:true}`
 *     never shows "make an offer" (CartPanel fetches its lines in a
 *     `useEffect`, which a static/server render never runs — this pass
 *     always lands on the "opening the basket…" placeholder; pin 3's
 *     source-level checks are the ones that actually exercise the branch
 *     logic. Documented as a deliberate limitation, not a gap: see the
 *     register's Obstacles).
 */

const ROOT = process.cwd();
const read = (rel: string) => readFileSync(path.join(ROOT, rel), "utf8");

const FORBIDDEN = {
  paidInBitcoin: /paid in bitcoin/i,
  payMonthly: /pay monthly in dollars or in bitcoin/i,
  payInBitcoinOrDollars: /pay in bitcoin \(or dollars\)/i,
  noCutTaken: /no cut taken/i,
} as const;

describe("TASK-459 — the four bitcoin/no-cut sentences are gone from the live card path", () => {
  it("store/page.tsx: no \"paid in bitcoin\" anywhere (metadata description + the lead paragraph)", () => {
    const src = read("src/app/store/page.tsx");
    expect(src).not.toMatch(FORBIDDEN.paidInBitcoin);
    // the sentence isn't just deleted into nothing — "straight to the
    // artist" survives as its own honest close
    expect(src).toMatch(/straight to the artist/i);
  });

  it("store/memberships/page.tsx: no \"paid in bitcoin\" in the metadata description", () => {
    const src = read("src/app/store/memberships/page.tsx");
    expect(src).not.toMatch(FORBIDDEN.paidInBitcoin);
  });

  it("sections.tsx: no \"pay monthly … or in bitcoin\", no \"pay in bitcoin (or dollars)\", no \"no cut taken\"", () => {
    const src = read("src/components/sections.tsx");
    expect(src).not.toMatch(FORBIDDEN.payMonthly);
    expect(src).not.toMatch(FORBIDDEN.payInBitcoinOrDollars);
    expect(src).not.toMatch(FORBIDDEN.noCutTaken);
    // the gate-works note keeps its own label and the rest of its sentence
    expect(src).toMatch(/How the gate works:/);
    expect(src).toMatch(/your package opens automatically/);
    // PACKAGE_DOORS_WORDS still closes the packages lead
    expect(src).toMatch(/Your package opens its doors\./);
  });

  it("sections.tsx + SEEDS.home: the sessions line says \"pay\", never \"pay in sats or dollars\" (review catch, block 968,543)", async () => {
    const src = read("src/components/sections.tsx");
    expect(src).not.toMatch(/pay in sats or dollars/i);
    expect(src).toContain("choose a real open time → pay → confirmed with a calendar file");
    const { SEEDS } = await import("@/lib/puck-seeds");
    const flat = JSON.stringify(SEEDS.home);
    expect(flat).not.toMatch(/pay in sats or dollars/i);
    expect(flat).toContain("choose a real open time → pay → confirmed with a calendar file");
  });

  it("support/page.tsx: no \"no cut taken\", the jar sentence stays grammatical", () => {
    const src = read("src/app/support/page.tsx");
    expect(src).not.toMatch(FORBIDDEN.noCutTaken);
    expect(src).toMatch(/A gift lands with Love\.\s*Choose the jar it fills\./);
  });
});

describe("TASK-459 — puck-seeds.ts carries the same new words (a reseed can't bring the old ones back)", () => {
  it("SEEDS.home: no \"pay monthly … or in bitcoin\", no \"pay in bitcoin (or dollars)\"", async () => {
    const { SEEDS } = await import("@/lib/puck-seeds");
    const flat = JSON.stringify(SEEDS.home);
    expect(flat).not.toMatch(FORBIDDEN.payMonthly);
    expect(flat).not.toMatch(FORBIDDEN.payInBitcoinOrDollars);
  });

  it("SEEDS.packages: no \"pay monthly … or in bitcoin\" / \"pay in bitcoin (or dollars)\" in the content OR the root description", async () => {
    const { SEEDS } = await import("@/lib/puck-seeds");
    const flat = JSON.stringify(SEEDS.packages);
    expect(flat).not.toMatch(FORBIDDEN.payMonthly);
    expect(flat).not.toMatch(FORBIDDEN.payInBitcoinOrDollars);
  });

  it("SEEDS.store: no \"paid in bitcoin\" in the content OR the root description", async () => {
    const { SEEDS } = await import("@/lib/puck-seeds");
    const flat = JSON.stringify(SEEDS.store);
    expect(flat).not.toMatch(FORBIDDEN.paidInBitcoin);
  });

  it("SEEDS.support / SEEDS.home stay clear of \"no cut taken\" (T-420's own pin, unweakened)", async () => {
    const { SEEDS } = await import("@/lib/puck-seeds");
    expect(JSON.stringify(SEEDS.support)).not.toMatch(FORBIDDEN.noCutTaken);
    expect(JSON.stringify(SEEDS.home)).not.toMatch(FORBIDDEN.noCutTaken);
  });

  it("scope guard: SEEDS.retreats is NOT this lane — still carries \"paid in bitcoin\", untouched", async () => {
    const { SEEDS } = await import("@/lib/puck-seeds");
    expect(JSON.stringify(SEEDS.retreats)).toMatch(FORBIDDEN.paidInBitcoin);
  });
});

describe("TASK-459 — CartPanel's pay-what-you-can opener is gated on rails.btc; the remove-offer path is not", () => {
  it("the editing state (input + offer button) only opens when rails.btc is true", () => {
    const src = read("src/components/store/CartPanel.tsx");
    expect(src).toMatch(/offerOpen === lineKey\(l\) && rails\.btc \?/);
  });

  it("the \"make an offer\" opener button only renders when rails.btc is true", () => {
    const src = read("src/components/store/CartPanel.tsx");
    // the opener sits behind its own rails.btc check, distinct from the
    // editing-state check above (a separate ternary arm)
    const offerBlock = src.slice(src.indexOf("pay what you can — every line may carry an offer"));
    expect(offerBlock).toMatch(/rails\.btc \?[\s\S]{0,200}pay what you can — make an offer/);
  });

  it("the \"remove offer — pay the listed price\" path is NOT gated on rails.btc — it survives on any rail", () => {
    const src = read("src/components/store/CartPanel.tsx");
    expect(src).toMatch(/l\.offerSats != null \?[\s\S]{0,120}remove offer — pay the listed price/);
    // and that branch's own condition names no rail
    const branch = (src.match(/l\.offerSats != null \?[\s\S]{0,120}remove offer — pay the listed price/) ?? [""])[0];
    expect(branch).not.toMatch(/rails\.btc/);
  });

  it("a static render of the basket with rails={btc:false,card:true} never shows \"make an offer\" (loading-state pass; see Obstacles)", async () => {
    const CartPanel = (await import("@/components/store/CartPanel")).default;
    const html = renderToStaticMarkup(createElement(CartPanel, { rails: { btc: false, card: true } }));
    expect(html).not.toContain("make an offer");
  });

  it("a static render with rails={btc:true,card:true} (the default) still mounts without throwing", async () => {
    const CartPanel = (await import("@/components/store/CartPanel")).default;
    expect(() => renderToStaticMarkup(createElement(CartPanel, { rails: { btc: true, card: true } }))).not.toThrow();
  });
});
