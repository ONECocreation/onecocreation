import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { isolateCwd } from "./helpers/isolate-cwd";
import { cents, dollars } from "@/lib/money-words";
import {
  attachCharge,
  createOrder,
  getItem,
  listCategories,
  listItems,
  newOrderId,
  recordChargeEvent,
  upsertItem,
  validateItem,
  type OrderRecord,
  type StoreItem,
} from "@/lib/store";

/**
 * TASK-145 (0018.06.17 a₿) — the item editor Love knows (the ShinePages
 * shape). Pins for the additive model law in src/lib/store.ts:
 *
 *  1. dollars → cents round-trip — "33.33" → 3333, "11.1" → 1110 (the
 *     editor types dollars; price.fiat stores integer minor units).
 *  2. fiat saved and read back — category and inventory ride along.
 *  3. sale fiat validated — a sale is a price: same law, and an empty sale
 *     is no sale.
 *  4. a live item with ONLY a USD price is valid (one price is enough to
 *     go live; no invented sats↔USD rate either way).
 *  5. inventory counts down on a PAID (settled) order — the ONE sanctioned
 *     state flip spends stock exactly once (a retried settle is a no-op),
 *     blank = unlimited stays untouched, and 0 flips the item to soldout.
 *  6. categories are derived from the items — never a second document.
 *
 * The catalog/orders land in an isolated tmp cwd (tests/helpers/isolate-
 * cwd.ts) with every vault/blob env dark, so the dev file driver serves.
 */

const iso = isolateCwd("oc-task145-");

beforeAll(() => {
  delete process.env.VERCEL;
  delete process.env.REDIS_URL;
  delete process.env.KV_REST_API_URL;
  delete process.env.KV_REST_API_TOKEN;
  delete process.env.BLOB_READ_WRITE_TOKEN;
});

afterAll(() => iso.cleanup());

function makeItem(over: Partial<StoreItem>): StoreItem {
  return {
    id: "x",
    schemaVersion: 2,
    title: "X",
    blurb: "words",
    images: [],
    kind: "self",
    price: {},
    fulfillment: "self",
    status: "hidden",
    ...over,
  };
}

function makeOrder(id: string, lines: { itemId: string; qty: number }[]): OrderRecord {
  return {
    id,
    schemaVersion: 2,
    state: "created",
    lineItems: lines.map((l) => ({ itemId: l.itemId, title: l.itemId, qty: l.qty })),
    priceSnapshot: { amount: 100, currency: "SATS", at: new Date().toISOString() },
    adapterId: "fixture",
    chargeIds: [],
    createdAtMs: Date.now(),
    events: [],
  };
}

describe("dollars → cents — the editor's one conversion, both ways", () => {
  it('"33.33" → 3333 and "11.1" → 1110, and back to words', () => {
    expect(cents("33.33")).toBe(3333);
    expect(cents("11.1")).toBe(1110);
    expect(cents("55")).toBe(5500);
    expect(dollars(3333, "USD")).toBe("$33.33");
    expect(dollars(1110, "USD")).toBe("$11.10");
    expect(dollars(cents("33.33")!, "USD")).toBe("$33.33");
    expect(dollars(cents("55")!, "USD")).toBe("$55"); // whole-dollar words, no ".00"
  });

  it("junk is refused, never silently rounded", () => {
    expect(cents("")).toBeNull();
    expect(cents("33.333")).toBeNull();
    expect(cents("abc")).toBeNull();
    expect(cents("-5")).toBeNull();
  });
});

describe("the additive fields — saved and read back", () => {
  it("fiat + category + inventory survive a round trip through the catalog", async () => {
    await upsertItem(
      makeItem({
        id: "t145-meditation",
        price: { sats: 11111, fiat: { amount: 3333, currency: "USD" } },
        category: "meditation",
        inventory: 3,
      }),
    );
    const back = await getItem("t145-meditation");
    expect(back?.price.fiat).toEqual({ amount: 3333, currency: "USD" });
    expect(back?.price.sats).toBe(11111);
    expect(back?.category).toBe("meditation");
    expect(back?.inventory).toBe(3);
  });
});

describe("sale fiat validated — a sale is a price", () => {
  it("a sale in USD and/or sats is valid; an empty or crooked sale is not", () => {
    expect(validateItem(makeItem({ sale: { fiat: { amount: 1110, currency: "USD" } } }))).toEqual({ ok: true });
    expect(validateItem(makeItem({ sale: { sats: 9000, fiat: { amount: 1110, currency: "USD" } } })))
      .toEqual({ ok: true });
    expect(validateItem(makeItem({ sale: {} }))).toEqual({
      ok: false,
      reason: "a sale price (sats or USD) — or no sale at all",
    });
    expect(validateItem(makeItem({ sale: { fiat: { amount: 11.5, currency: "USD" } } }))).toEqual({
      ok: false,
      reason: "sale fiat as integer minor units + ISO-4217 code",
    });
    expect(validateItem(makeItem({ sale: { sats: 0 } }))).toEqual({
      ok: false,
      reason: "sale sats as a positive integer",
    });
  });

  it("category and inventory carry their own words", () => {
    expect(validateItem(makeItem({ category: "membership" }))).toEqual({ ok: true });
    expect(validateItem(makeItem({ inventory: 0 }))).toEqual({ ok: true });
    expect(validateItem(makeItem({ inventory: 2.5 }))).toEqual({
      ok: false,
      reason: "inventory as a whole number (0 or more), or blank for unlimited",
    });
    expect(validateItem(makeItem({ inventory: -1 }))).toEqual({
      ok: false,
      reason: "inventory as a whole number (0 or more), or blank for unlimited",
    });
  });
});

describe("one price is enough to go live", () => {
  it("a live item with ONLY a USD price is valid — no invented sats rate", () => {
    expect(
      validateItem(makeItem({ status: "live", price: { fiat: { amount: 5500, currency: "USD" } } })),
    ).toEqual({ ok: true });
  });

  it("a live item with no price at all is stopped, in words", () => {
    const v = validateItem(makeItem({ status: "live", price: {} }));
    expect(v.ok).toBe(false);
    if (!v.ok) expect(v.reason).toBe("at least one price (sats or fiat) before going live");
  });
});

describe("inventory counts down on a paid order — and only once", () => {
  it("a settled order spends stock; a retried settle never double-spends", async () => {
    await upsertItem(makeItem({ id: "t145-ware", status: "live", price: { sats: 100 }, inventory: 2 }));
    const orderId = newOrderId();
    await createOrder(makeOrder(orderId, [{ itemId: "t145-ware", qty: 1 }]));
    await attachCharge(orderId, "ch_1");
    await recordChargeEvent(orderId, { type: "settled", chargeId: "ch_1" });
    expect((await getItem("t145-ware"))?.inventory).toBe(1);
    // the same settle delivered again (a webhook retry) is a no-op
    await recordChargeEvent(orderId, { type: "settled", chargeId: "ch_1" });
    expect((await getItem("t145-ware"))?.inventory).toBe(1);
    // an unpaid order (charge created, never settled) spends nothing
    const openId = newOrderId();
    await createOrder(makeOrder(openId, [{ itemId: "t145-ware", qty: 1 }]));
    await attachCharge(openId, "ch_2");
    expect((await getItem("t145-ware"))?.inventory).toBe(1);
  });

  it("0 flips the item to soldout; blank = unlimited stays untouched", async () => {
    await upsertItem(makeItem({ id: "t145-last-one", status: "live", price: { sats: 100 }, inventory: 1 }));
    await upsertItem(makeItem({ id: "t145-endless", status: "live", price: { sats: 100 } }));
    const orderId = newOrderId();
    await createOrder(
      makeOrder(orderId, [
        { itemId: "t145-last-one", qty: 1 },
        { itemId: "t145-endless", qty: 5 },
      ]),
    );
    await attachCharge(orderId, "ch_3");
    await recordChargeEvent(orderId, { type: "settled", chargeId: "ch_3" });
    const last = await getItem("t145-last-one");
    expect(last?.inventory).toBe(0);
    expect(last?.status).toBe("soldout");
    const endless = await getItem("t145-endless");
    expect(endless?.inventory).toBeUndefined();
    expect(endless?.status).toBe("live");
  });
});

describe("categories are derived from the items", () => {
  it("the Categories view is the distinct words on the items, counted, alphabetized", async () => {
    await upsertItem(makeItem({ id: "t145-cat-a", category: "ware" }));
    await upsertItem(makeItem({ id: "t145-cat-b", category: "session" }));
    await upsertItem(makeItem({ id: "t145-cat-c", category: " ware " })); // stray spaces fold into the same word
    await upsertItem(makeItem({ id: "t145-cat-none" })); // no category — never a chip
    const cats = listCategories(await listItems({ includeHidden: true }));
    expect(cats).toEqual([
      { name: "meditation", count: 1 },
      { name: "session", count: 1 },
      { name: "ware", count: 2 },
    ]);
  });

  it("renaming a category IS renaming the word on its items — the derivation follows", async () => {
    for (const i of await listItems({ includeHidden: true })) {
      if (i.category?.trim() === "ware") await upsertItem({ ...i, category: "merch table" });
    }
    const cats = listCategories(await listItems({ includeHidden: true }));
    expect(cats).toEqual([
      { name: "meditation", count: 1 },
      { name: "merch table", count: 2 },
      { name: "session", count: 1 },
    ]);
  });
});
