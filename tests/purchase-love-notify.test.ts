import { describe, it, expect, beforeAll, beforeEach, vi } from "vitest";

/**
 * TASK-518 (block 969,339, K131) — Love knows who bought. Every settled
 * purchase sends her ONE short letter at her notice address
 * (offerNotifyTo()), once per order, direct through sendMail like the
 * receipt, editable in the Letters room as `purchase-love-notify`, with
 * one /a switch (`features.purchaseLoveNotify`, default ON) to silence it.
 *
 * Pins, matching the brief's Build 2:
 *  1. THE MARKER — first settle sends once, a retried settle (webhook +
 *     reconcile racing, a re-flip) sends nothing more; the write-once key
 *     is `order:<id>:love-notified` (the order-receipt.ts idiom). A
 *     `fulfilled` order is the settled family and mails; `created` and
 *     `refunded` never do, and never claim the marker.
 *  2. THE SWITCH — a saved `purchaseLoveNotify: false` sends nothing AND
 *     claims no marker (the order's one send survives a flip OFF then ON);
 *     `defaultSiteConfig().features.purchaseLoveNotify === true` (the
 *     T-393 pin shape mirrored here so tests/feature-switches.test.ts
 *     stays untouched); a malformed stored config fails to the floor and
 *     SENDS (the OFF state requires a real saved false).
 *  3. CONTENT — the buyer email as given, a booking's customer name and a
 *     physical order's shipping name when present (the shipping ADDRESS
 *     never rides), the tier plus "for 7 days" on a one-week pass, the
 *     snapshot amount verbatim, the discount line when a code applied, a
 *     gift line naming its recipient, the mailto write-back anchor with
 *     no `mailto:https` mangling, and never card-shaped data (no
 *     chargeIds content, no long digit runs — there is none to leak,
 *     pinned so it stays so). A CR/LF in the typed email kills the
 *     write-back button, never the letter (the header-injection line).
 *  4. THE KEY — `purchase-love-notify` in EDITABLE_LETTERS at length 10,
 *     audience `members`, the default body carrying all five {{slots}}
 *     and no em dash (the house copy law).
 *  5. THE OVERRIDE — a saved override's subject and body send; an
 *     override that leaves {{amount}} out still carries the amount (the
 *     appended doctrine); no literal {{slot}} text ever reaches the html.
 *
 * Fixture idiom: receipt-door-458.test.ts's stateful KV behind a stubbed
 * global fetch (SET NX honored) + letters-one-render.test.ts's sendMail
 * capture mock. No rail env at all — the letter never touches a rail.
 */

const KV_URL = "http://kv.fixture.518";

const sentMail = vi.hoisted(() => [] as Array<{ persona: string; to: string; subject: string; html: string }>);

vi.mock("@/lib/mail", async (importActual) => {
  const actual = await importActual<typeof import("@/lib/mail")>();
  return {
    ...actual,
    sendMail: async (persona: string, mail: { to: string; subject: string; html: string }) => {
      sentMail.push({ persona, ...mail });
    },
  };
});

function item(over: Record<string, unknown>) {
  return {
    id: "x",
    schemaVersion: 2,
    title: "X",
    blurb: "words",
    images: [],
    price: {},
    status: "live",
    ...over,
  };
}

const CATALOG = {
  schemaVersion: 2,
  items: [
    // a permanent membership (tier A, open-ended)
    item({
      id: "weekly-intuitive",
      title: "Weekly Intuitive",
      kind: "package",
      fulfillment: "package",
      entitlementTier: "A",
      price: { fiat: { amount: 3300, currency: "USD" } },
    }),
    // the one-week taster pass on the same tier
    item({
      id: "taster-week",
      title: "One Week Pass",
      kind: "package",
      fulfillment: "package",
      entitlementTier: "A",
      entitlementDays: 7,
      price: { fiat: { amount: 1100, currency: "USD" } },
    }),
    // a ware — never a tier
    item({ id: "mug", title: "Mug", kind: "self", fulfillment: "self", price: { fiat: { amount: 2200, currency: "USD" } } }),
  ],
};

const kvStore = new Map<string, string>();
const kvSets = new Map<string, Set<string>>();

beforeAll(() => {
  delete process.env.VERCEL;
  delete process.env.REDIS_URL;
  delete process.env.BTCPAY_URL;
  delete process.env.BTCPAY_STORE_ID;
  delete process.env.BTCPAY_API_KEY;
  delete process.env.SQUARE_ACCESS_TOKEN;
  delete process.env.SQUARE_LOCATION_ID;
  delete process.env.OFFER_NOTIFY_EMAIL; // the letter knocks at love@ by default
  process.env.KV_REST_API_URL = KV_URL;
  process.env.KV_REST_API_TOKEN = "fixture-kv-token-518";
  process.env.SEAT_SECRET = "test-seat-secret-518";
  process.env.NEXT_PUBLIC_SITE_URL = "https://onecocreation.test";

  vi.stubGlobal("fetch", async (url: unknown, init?: RequestInit) => {
    const u = String(url);
    if (u === KV_URL) {
      const cmd = (JSON.parse(String(init?.body)) as unknown[]).map(String);
      const [op, ...args] = cmd;
      let result: unknown = null;
      if (op === "GET") result = kvStore.get(args[0]) ?? null;
      else if (op === "SET") {
        if (args[2] === "NX" && kvStore.has(args[0])) result = null;
        else {
          kvStore.set(args[0], args[1]);
          result = "OK";
        }
      } else if (op === "SADD") {
        const s = kvSets.get(args[0]) ?? new Set<string>();
        s.add(args[1]);
        kvSets.set(args[0], s);
        result = 1;
      } else if (op === "SMEMBERS") {
        result = Array.from(kvSets.get(args[0]) ?? []);
      } else {
        throw new Error(`fixture KV: unhandled op ${op}`);
      }
      return new Response(JSON.stringify({ result }), { status: 200 });
    }
    throw new Error(`unexpected fetch: ${u}`);
  });
});

beforeEach(() => {
  kvStore.clear();
  kvSets.clear();
  sentMail.length = 0;
  kvStore.set("store:catalog", JSON.stringify(CATALOG));
});

/** 24-hex order ids (safeOrderId's shape) unique per test */
let seq = 0;
function oid() {
  seq += 1;
  return `0518${String(seq).padStart(20, "0")}`;
}

/** a settled store order fixture (the one-week pass on the card rail) */
function orderFixture(over: Record<string, unknown> = {}) {
  return {
    id: oid(),
    schemaVersion: 2 as const,
    state: "settled" as const,
    lineItems: [{ itemId: "taster-week", title: "One Week Pass", qty: 1 }],
    priceSnapshot: { amount: 1100, currency: "USD", at: "2026-09-30T00:00:00.000Z" },
    adapterId: "square",
    chargeIds: [],
    entitlementSubject: "soul@example.com@email",
    contact: { email: "soul@example.com" },
    createdAtMs: Date.now(),
    settledAtMs: Date.now(),
    events: [],
    ...over,
  };
}

const sender = () => import("@/lib/purchase-love-notify");
const markerOf = (id: string) => `order:${id}:love-notified`;

describe("the marker — once per order, webhook retries safe", () => {
  it("the first settle sends one letter to Love; a retried settle sends nothing more", async () => {
    const { sendPurchaseLoveNotify } = await sender();
    const order = orderFixture();
    const first = await sendPurchaseLoveNotify(order as never);
    expect(first).toEqual({ sent: true });
    expect(sentMail).toHaveLength(1);
    expect(sentMail[0].to).toBe("love@onecocreation.com");
    expect(sentMail[0].persona).toBe("bookings"); // the receipt's own persona
    expect(kvStore.has(markerOf(order.id))).toBe(true);

    // the reconcile poll landing right behind the webhook
    const second = await sendPurchaseLoveNotify(order as never);
    expect(second).toEqual({ sent: false, reason: "already notified" });
    expect(sentMail).toHaveLength(1);
  });

  it("a fulfilled order is the settled family and mails (markFulfilled never re-mails — the marker)", async () => {
    const { sendPurchaseLoveNotify } = await sender();
    const order = orderFixture({ state: "fulfilled" });
    const res = await sendPurchaseLoveNotify(order as never);
    expect(res).toEqual({ sent: true });
    expect(sentMail).toHaveLength(1);
  });

  it("a created order never mails and claims no marker", async () => {
    const { sendPurchaseLoveNotify } = await sender();
    const order = orderFixture({ state: "created", settledAtMs: undefined });
    const res = await sendPurchaseLoveNotify(order as never);
    expect(res).toEqual({ sent: false, reason: "order is created" });
    expect(sentMail).toHaveLength(0);
    expect(kvStore.has(markerOf(order.id))).toBe(false);
  });

  it("a refunded order never mails and claims no marker", async () => {
    const { sendPurchaseLoveNotify } = await sender();
    const order = orderFixture({ state: "refunded" });
    const res = await sendPurchaseLoveNotify(order as never);
    expect(res).toEqual({ sent: false, reason: "order is refunded" });
    expect(sentMail).toHaveLength(0);
    expect(kvStore.has(markerOf(order.id))).toBe(false);
  });
});

describe("the switch — features.purchaseLoveNotify, default ON", () => {
  it("defaultSiteConfig() carries the switch ON (the T-393 pin shape, mirrored)", async () => {
    const { defaultSiteConfig } = await import("@/lib/site-config");
    expect(defaultSiteConfig().features.purchaseLoveNotify).toBe(true);
  });

  it("a saved OFF sends nothing AND claims no marker — the order's one send survives a flip OFF then ON", async () => {
    kvStore.set(
      "site:config:onecocreation",
      JSON.stringify({ features: { store: true, purchaseLoveNotify: false } }),
    );
    const { sendPurchaseLoveNotify } = await sender();
    const order = orderFixture();
    const off = await sendPurchaseLoveNotify(order as never);
    expect(off).toEqual({ sent: false, reason: "the switch is off" });
    expect(sentMail).toHaveLength(0);
    expect(kvStore.has(markerOf(order.id))).toBe(false); // the flip never burns an order's one send

    // back ON (the stored doc with the flag absent — bools() backfills true)
    kvStore.set("site:config:onecocreation", JSON.stringify({ features: { store: true } }));
    const on = await sendPurchaseLoveNotify(order as never);
    expect(on).toEqual({ sent: true });
    expect(sentMail).toHaveLength(1);
  });

  it("a malformed stored config fails to the floor and SENDS — OFF requires a real saved false", async () => {
    kvStore.set("site:config:onecocreation", "not json at all {{{");
    const { sendPurchaseLoveNotify } = await sender();
    const res = await sendPurchaseLoveNotify(orderFixture() as never);
    expect(res).toEqual({ sent: true });
    expect(sentMail).toHaveLength(1);
  });

  it("no stored config at all sends (the default is ON)", async () => {
    const { sendPurchaseLoveNotify } = await sender();
    const res = await sendPurchaseLoveNotify(orderFixture() as never);
    expect(res).toEqual({ sent: true });
  });
});

describe("the letter's content — derive-or-dash, never an invented word", () => {
  it("the default subject and the buyer's email as given", async () => {
    const { sendPurchaseLoveNotify } = await sender();
    await sendPurchaseLoveNotify(orderFixture() as never);
    expect(sentMail[0].subject).toBe("A purchase just settled");
    expect(sentMail[0].html).toContain("soul@example.com");
  });

  it("a booking order carries the customer's name, read through getBooking", async () => {
    const bookingId = "b518b518b518b518b518b518";
    kvStore.set(
      `booking:rec:${bookingId}`,
      JSON.stringify({
        id: bookingId,
        schemaVersion: 1,
        serviceId: "discovery",
        serviceTitle: "Discovery Call",
        startUtc: "2026-10-01T18:30:00.000Z",
        endUtc: "2026-10-01T19:00:00.000Z",
        artistTz: "America/Denver",
        state: "confirmed",
        orderId: "x",
        customer: { name: "Ana Light", email: "ana@example.com" },
        createdAtMs: 1,
      }),
    );
    const { sendPurchaseLoveNotify } = await sender();
    const order = orderFixture({
      bookingId,
      lineItems: [{ itemId: "mug", title: "Discovery Call", qty: 1, bookingId }],
      contact: { email: "ana@example.com" },
    });
    await sendPurchaseLoveNotify(order as never);
    expect(sentMail[0].html).toContain("Ana Light");
    expect(sentMail[0].html).toContain("ana@example.com");
  });

  it("a physical order carries the shipping NAME, never the shipping address", async () => {
    const { sendPurchaseLoveNotify } = await sender();
    const order = orderFixture({
      lineItems: [{ itemId: "mug", title: "Mug", qty: 1 }],
      shipping: { name: "Bob Stone", address: "1 Secret Lane, Nowhere" },
    });
    await sendPurchaseLoveNotify(order as never);
    expect(sentMail[0].html).toContain("Bob Stone");
    expect(sentMail[0].html).not.toContain("Secret Lane");
  });

  it("a one-week pass names the tier and says 'for 7 days'", async () => {
    const { sendPurchaseLoveNotify } = await sender();
    await sendPurchaseLoveNotify(orderFixture() as never);
    expect(sentMail[0].html).toContain("Weekly Intuitive"); // tier A's name, from TIERS
    expect(sentMail[0].html).toContain("for 7 days");
  });

  it("a permanent membership says open-ended, never an invented date", async () => {
    const { sendPurchaseLoveNotify } = await sender();
    const order = orderFixture({ lineItems: [{ itemId: "weekly-intuitive", title: "Weekly Intuitive", qty: 1 }] });
    await sendPurchaseLoveNotify(order as never);
    expect(sentMail[0].html).toContain("Weekly Intuitive");
    expect(sentMail[0].html).toContain("open-ended");
    expect(sentMail[0].html).not.toContain("for 7 days");
  });

  it("a ware-only order says no tier rides, never a guessed one", async () => {
    const { sendPurchaseLoveNotify } = await sender();
    const order = orderFixture({ lineItems: [{ itemId: "mug", title: "Mug", qty: 1 }] });
    await sendPurchaseLoveNotify(order as never);
    expect(sentMail[0].html).not.toContain("Weekly Intuitive");
    expect(sentMail[0].html).not.toContain("{{tier}}");
  });

  it("the amount is the charged snapshot, verbatim — sats and fiat", async () => {
    const { sendPurchaseLoveNotify } = await sender();
    await sendPurchaseLoveNotify(
      orderFixture({ priceSnapshot: { amount: 2100, currency: "SATS", at: "2026-09-30T00:00:00.000Z" } }) as never,
    );
    expect(sentMail[0].html).toContain("2,100 sats");

    sentMail.length = 0;
    await sendPurchaseLoveNotify(
      orderFixture({ priceSnapshot: { amount: 3300, currency: "USD", at: "2026-09-30T00:00:00.000Z" } }) as never,
    );
    expect(sentMail[0].html).toContain("3300 USD");
  });

  it("a 100%-code order says the code brought it to 0 and names the full price", async () => {
    const { sendPurchaseLoveNotify } = await sender();
    const order = orderFixture({
      priceSnapshot: { amount: 0, currency: "USD", at: "2026-09-30T00:00:00.000Z" },
      discount: { code: "FREEWEEK", originalAmount: 1100 },
    });
    await sendPurchaseLoveNotify(order as never);
    expect(sentMail[0].html).toContain("FREEWEEK");
    expect(sentMail[0].html).toContain("1100 USD");
  });

  it("a gift line names its recipient", async () => {
    const { sendPurchaseLoveNotify } = await sender();
    const order = orderFixture({
      lineItems: [{ itemId: "mug", title: "Mug", qty: 1, giftTo: "fren@example.com" }],
    });
    await sendPurchaseLoveNotify(order as never);
    expect(sentMail[0].html).toContain("fren@example.com");
    expect(sentMail[0].html).toMatch(/gift/i);
  });

  it("the write-back door is a mailto anchor, never mangled through the site origin", async () => {
    const { sendPurchaseLoveNotify } = await sender();
    await sendPurchaseLoveNotify(orderFixture() as never);
    const html = sentMail[0].html;
    expect(html).toContain('href="mailto:soul@example.com');
    expect(html).not.toContain("mailto:https");
    expect(html).not.toContain("onecocreation.test/mailto");
  });

  it("a @tag order with no email gets a plain line naming the tag, never a button", async () => {
    const { sendPurchaseLoveNotify } = await sender();
    const order = orderFixture({
      contact: undefined,
      entitlementSubject: "fren@onecocreation",
    });
    await sendPurchaseLoveNotify(order as never);
    const html = sentMail[0].html;
    expect(html).not.toContain("mailto:");
    expect(html).toContain("fren");
  });

  it("a CR/LF in the typed email kills the write-back button, never the letter (header injection)", async () => {
    const { sendPurchaseLoveNotify } = await sender();
    const order = orderFixture({
      contact: { email: "evil@example.com\r\nBCC: target@elsewhere.test" },
    });
    const res = await sendPurchaseLoveNotify(order as never);
    expect(res).toEqual({ sent: true }); // the letter still lands
    expect(sentMail[0].html).not.toContain("mailto:"); // but no injectable href rides
  });

  it("never card-shaped: no chargeIds content, no long digit runs, no payment payload", async () => {
    const { sendPurchaseLoveNotify } = await sender();
    const order = orderFixture({ chargeIds: ["ch_topsecret_518_fixture"] });
    await sendPurchaseLoveNotify(order as never);
    const html = sentMail[0].html;
    expect(html).not.toContain("ch_topsecret_518_fixture");
    expect(html).not.toContain("chargeIds");
    expect(html).not.toMatch(/\b\d{12,19}\b/); // no card-shaped digit run (there is none to leak — pinned so it stays so)
  });
});

describe("the key — purchase-love-notify joins the letters system", () => {
  it("EDITABLE_LETTERS carries it at length 10 (TASK-518 added the tenth)", async () => {
    const { EDITABLE_LETTERS } = await import("@/lib/letters");
    expect(EDITABLE_LETTERS).toContain("purchase-love-notify");
    expect(EDITABLE_LETTERS).toHaveLength(10);
  });

  it("its audience is members — one-soul mail, never the open feed", async () => {
    const { DEFAULT_AUDIENCE } = await import("@/lib/letters");
    expect(DEFAULT_AUDIENCE["purchase-love-notify"]).toBe("members");
  });

  it("the default body carries all five slots and no em dash (the house copy law)", async () => {
    const { LETTER_DEFAULTS } = await import("@/lib/letters");
    const tpl = LETTER_DEFAULTS["purchase-love-notify"];
    expect(tpl).toBeDefined();
    for (const slot of ["{{who}}", "{{lines}}", "{{tier}}", "{{amount}}", "{{writeback}}"]) {
      expect(tpl!.body).toContain(slot);
    }
    expect(tpl!.subject).not.toContain("—");
    expect(tpl!.body).not.toContain("—");
  });
});

describe("the override — Love's words win, the facts can never be edited away", () => {
  it("a saved override's subject and body send", async () => {
    kvStore.set(
      "letters:tpl:purchase-love-notify",
      JSON.stringify({ subject: "Love, a sale!", body: "Her own words here.\n\n{{who}}" }),
    );
    const { sendPurchaseLoveNotify } = await sender();
    await sendPurchaseLoveNotify(orderFixture() as never);
    expect(sentMail[0].subject).toBe("Love, a sale!");
    expect(sentMail[0].html).toContain("Her own words here.");
  });

  it("an override that leaves {{amount}} out still carries the amount (the appended doctrine)", async () => {
    kvStore.set(
      "letters:tpl:purchase-love-notify",
      JSON.stringify({ subject: "sold", body: "Someone bought something.\n\n{{who}}" }),
    );
    const { sendPurchaseLoveNotify } = await sender();
    await sendPurchaseLoveNotify(orderFixture() as never);
    const html = sentMail[0].html;
    expect(html).toContain("1100 USD");
    expect(html.indexOf("1100 USD")).toBeGreaterThan(html.indexOf("Someone bought something."));
  });

  it("no literal {{slot}} text ever reaches the sent html", async () => {
    const { sendPurchaseLoveNotify } = await sender();
    await sendPurchaseLoveNotify(orderFixture() as never);
    expect(sentMail[0].html).not.toMatch(/\{\{[a-z]+\}\}/);
  });
});
