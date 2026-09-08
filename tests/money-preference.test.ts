import { describe, it, expect, beforeAll, afterEach, vi } from "vitest";

/**
 * TASK-186 (0018.06.18 a₿) — ONE CURRENCY AT A TIME: the money preference.
 * Pins, per spec:
 *
 *  1. priceWords — THE ONE DISPLAY LAW's own table: both denominations ×
 *     both preferences, a single denomination alone, dark-rail silence,
 *     the dash, NEVER "≈".
 *  2. the default — fiat when the card rail is live, else sats.
 *  3. the resolution — signed in wins over the cookie, the cookie over the
 *     default (resolvePrefer, pure).
 *  4. the toggle persists — savePrefer writes localStorage AND the
 *     `oc-money` cookie (the server-rendered price lines read it), and
 *     readPrefer finds it back.
 *  5. the member profile route — moneyPrefer is an ADDITIVE field: a PUT
 *     that never mentions it leaves the saved word standing; a valid word
 *     replaces; junk never wipes.
 *  6. the pay door's words + default RAIL follow the choice (railForPrefer
 *     × buyDoorLabel), both doors stay reachable.
 *  7. the basket's fiat total — derived line by line, silent the moment a
 *     line can't honestly carry it (cartTotalFiat).
 *  8. no "≈" survives on the packages page (source pin).
 *
 * Route tests ride a stubbed global fetch (a stateful fixture KV); every
 * credential below is a fixture string, never a real one.
 */

const KV_URL = "http://kv.fixture";
const kvStore = new Map<string, string>();

/** the fixture-KV fetch — module scope, because one block's unstubAllGlobals
 *  must be able to put it back (the profile-route pins run after it) */
const kvFetch = async (url: unknown, init?: RequestInit) => {
  const u = String(url);
  if (u === KV_URL) {
    const cmd = JSON.parse(String(init?.body)) as unknown[];
    const [op, key] = cmd.map(String);
    let result: unknown = null;
    if (op === "GET") result = kvStore.get(key) ?? null;
    else if (op === "SET") { kvStore.set(key, cmd[2] as string); result = "OK"; }
    return new Response(JSON.stringify({ result }), { status: 200 });
  }
  throw new Error(`unexpected fetch: ${u}`);
};

beforeAll(() => {
  process.env.KV_REST_API_URL = KV_URL;
  process.env.KV_REST_API_TOKEN = "fixture-kv-token";
  process.env.SEAT_SECRET = "test-seat-secret";

  vi.stubGlobal("fetch", kvFetch);
});

describe("priceWords — THE ONE DISPLAY LAW", () => {
  const BOTH = { btc: true, card: true };
  const both = { sats: 21000, fiat: { amount: 1100, currency: "USD" } };

  it("both exist, both rails live, fiat preferred: \"$11\", \"or 21,000 sats\"", async () => {
    const { priceWords } = await import("@/lib/money-words");
    expect(priceWords(both, BOTH, "fiat")).toEqual({ primary: "$11", secondary: "or 21,000 sats" });
  });

  it("both exist, both rails live, sats preferred: \"21,000 sats\", \"or $11\"", async () => {
    const { priceWords } = await import("@/lib/money-words");
    expect(priceWords(both, BOTH, "sats")).toEqual({ primary: "21,000 sats", secondary: "or $11" });
  });

  it("a single-denomination price shows alone, whichever way the preference leans", async () => {
    const { priceWords } = await import("@/lib/money-words");
    expect(priceWords({ sats: 21000 }, BOTH, "fiat")).toEqual({ primary: "21,000 sats", secondary: null });
    expect(priceWords({ fiat: { amount: 1100, currency: "USD" } }, BOTH, "sats"))
      .toEqual({ primary: "$11", secondary: null });
  });

  it("a dark rail's denomination stays silent — no \"or\" against a door that can't charge", async () => {
    const { priceWords } = await import("@/lib/money-words");
    expect(priceWords(both, { btc: false, card: true }, "sats")).toEqual({ primary: "$11", secondary: null });
    expect(priceWords(both, { btc: true, card: false }, "fiat")).toEqual({ primary: "21,000 sats", secondary: null });
  });

  it("nothing showable → the dash (derive-or-dash)", async () => {
    const { priceWords } = await import("@/lib/money-words");
    expect(priceWords({}, BOTH, "fiat")).toEqual({ primary: "—", secondary: null });
    expect(priceWords(both, { btc: false, card: false }, "sats")).toEqual({ primary: "—", secondary: null });
  });

  it("NEVER \"≈\" — no invented rate; both numbers are Love's own", async () => {
    const { priceWords } = await import("@/lib/money-words");
    for (const prefer of ["fiat", "sats"] as const) {
      for (const rails of [BOTH, { btc: true, card: false }, { btc: false, card: true }]) {
        const w = priceWords(both, rails, prefer);
        expect(w.primary).not.toContain("≈");
        expect(w.secondary ?? "").not.toContain("≈");
      }
    }
  });
});

describe("the default + the resolution — signed in wins", () => {
  it("the default is fiat when the card rail is live, else sats", async () => {
    const { defaultPreferOf } = await import("@/lib/money-words");
    expect(defaultPreferOf({ btc: true, card: true })).toBe("fiat");
    expect(defaultPreferOf({ btc: false, card: true })).toBe("fiat");
    expect(defaultPreferOf({ btc: true, card: false })).toBe("sats");
    expect(defaultPreferOf({ btc: false, card: false })).toBe("sats");
  });

  it("the member's saved word beats the cookie; the cookie beats the default", async () => {
    const { resolvePrefer } = await import("@/lib/money-preference");
    const BOTH = { btc: true, card: true };
    expect(resolvePrefer("sats", "fiat", BOTH)).toBe("sats");
    expect(resolvePrefer("fiat", "sats", BOTH)).toBe("fiat");
    expect(resolvePrefer(null, "sats", BOTH)).toBe("sats");
    expect(resolvePrefer(null, null, BOTH)).toBe("fiat");
    expect(resolvePrefer(null, null, { btc: true, card: false })).toBe("sats");
  });

  it("the cookie parse takes only the two honest words", async () => {
    const { preferFromCookieHeader } = await import("@/lib/money-preference");
    expect(preferFromCookieHeader("oc-theme=dark; oc-money=sats")).toBe("sats");
    expect(preferFromCookieHeader("oc-money=fiat; oc-cart=abc")).toBe("fiat");
    expect(preferFromCookieHeader("oc-money=doubloons")).toBeNull();
    expect(preferFromCookieHeader("oc-money=fiattt")).toBeNull();
    expect(preferFromCookieHeader(null)).toBeNull();
  });
});

describe("the toggle persists — localStorage AND the cookie", () => {
  afterEach(() => {
    // clear the browser stubs — then PUT THE KV FETCH BACK (it was stubbed
    // in beforeAll and the route pins below still need it)
    vi.unstubAllGlobals();
    vi.stubGlobal("fetch", kvFetch);
  });

  function stubBrowser() {
    const jar = new Map<string, string>();
    const doc = { cookie: "" };
    const win = {
      localStorage: {
        getItem: (k: string) => jar.get(k) ?? null,
        setItem: (k: string, v: string) => void jar.set(k, v),
      },
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => true,
    };
    vi.stubGlobal("window", win);
    vi.stubGlobal("document", doc);
    return { jar, doc };
  }

  it("one tap writes both stores, and the read finds the word back", async () => {
    const { savePrefer, readPrefer, MONEY_COOKIE } = await import("@/lib/money-preference");
    const { jar, doc } = stubBrowser();
    savePrefer("sats");
    expect(jar.get(MONEY_COOKIE)).toBe("sats");
    expect(doc.cookie).toContain("oc-money=sats");
    expect(readPrefer()).toBe("sats");
    savePrefer("fiat");
    expect(readPrefer()).toBe("fiat");
    expect(doc.cookie).toContain("oc-money=fiat");
  });

  it("a visitor carrying only the cookie still gets their words on the client surfaces", async () => {
    const { readPrefer } = await import("@/lib/money-preference");
    const { doc } = stubBrowser();
    doc.cookie = "oc-theme=dark; oc-money=sats";
    expect(readPrefer()).toBe("sats");
  });
});

describe("the member profile route — moneyPrefer, an additive field", () => {
  async function emailCookie(): Promise<string> {
    const { makeFrenToken } = await import("@/lib/fren-auth");
    return `pa-fren=${makeFrenToken("firefly@example.com", "email")}`;
  }

  const req = (method: string, body?: unknown, cookie?: string) =>
    new Request("http://localhost/api/member/profile", {
      method,
      headers: {
        ...(body ? { "Content-Type": "application/json" } : {}),
        ...(cookie ? { Cookie: cookie } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });

  it("a guest gets 401 — the profile is the member's own", async () => {
    const { GET } = await import("@/app/api/member/profile/route");
    const res = await GET(req("GET"));
    expect(res.status).toBe(401);
  });

  it("absent by default, set by PUT, kept by a PUT that never mentions it, junk never wipes", async () => {
    kvStore.delete("member:profile:firefly@example.com");
    const { GET, PUT } = await import("@/app/api/member/profile/route");
    const cookie = await emailCookie();

    // absent = never chose → null
    const first = await (await GET(req("GET", undefined, cookie))).json();
    expect(first.moneyPrefer).toBeNull();

    // a valid word is saved
    const put = await PUT(req("PUT", { moneyPrefer: "sats" }, cookie));
    expect(put.status).toBe(200);
    expect((await put.json()).moneyPrefer).toBe("sats");

    // a PUT about something else leaves the word standing (ADDITIVE)
    const other = await PUT(req("PUT", { displayName: "firefly" }, cookie));
    expect((await other.json()).moneyPrefer).toBe("sats");

    // junk never wipes the saved word
    const junk = await PUT(req("PUT", { moneyPrefer: "doubloons" }, cookie));
    expect((await junk.json()).moneyPrefer).toBe("sats");

    // and the GET reads it back — signed in wins over any cookie
    const last = await (await GET(req("GET", undefined, cookie))).json();
    expect(last.moneyPrefer).toBe("sats");
  });
});

describe("the pay door's words + default rail follow the choice", () => {
  it("fiat → the card door (PAY BY CARD $11); sats → the bitcoin door (GET IT ⚡ 11,111 sats)", async () => {
    const { railForPrefer, buyDoorLabel } = await import("@/components/store/BuyPanel");
    const both = { btcpay: true, square: true };
    const price = { sats: 11111, fiat: { amount: 1100, currency: "USD" } };

    const fiatRail = railForPrefer("fiat", both);
    expect(fiatRail).toBe("square");
    expect(buyDoorLabel(fiatRail, price)).toBe("PAY BY CARD $11");

    const satsRail = railForPrefer("sats", both);
    expect(satsRail).toBe("btcpay");
    expect(buyDoorLabel(satsRail, price)).toBe("GET IT ⚡ 11,111 sats");
  });

  it("a denomination whose rail can't sell it keeps the OTHER door — never a dead rail", async () => {
    const { railForPrefer } = await import("@/components/store/BuyPanel");
    expect(railForPrefer("fiat", { btcpay: true, square: false })).toBe("btcpay");
    expect(railForPrefer("sats", { btcpay: false, square: true })).toBe("square");
  });
});

describe("the basket's fiat total — derived, or silent", () => {
  const line = (over: Record<string, unknown>) => ({
    itemId: "x", qty: 1, title: "X", kind: "digital",
    sats: 11111, listSats: 11111, offerSats: null,
    fiat: { amount: 1100, currency: "USD" },
    giftTo: null, image: null, physical: false, gated: true, inPerson: false, slot: null,
    ...over,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  }) as any;

  it("sums unit fiat × qty across lines in one currency", async () => {
    const { cartTotalFiat } = await import("@/components/store/CartPanel");
    expect(cartTotalFiat([line({}), line({ itemId: "y", qty: 3, fiat: { amount: 2200, currency: "USD" } })]))
      .toEqual({ amount: 1100 + 6600, currency: "USD" });
  });

  it("an offer stands → no fiat total (the offer is a sats word — no fiat truth)", async () => {
    const { cartTotalFiat } = await import("@/components/store/CartPanel");
    expect(cartTotalFiat([line({ offerSats: 9000 })])).toBeNull();
  });

  it("a line without a fiat price → no fiat total (never a sum with a hole in it)", async () => {
    const { cartTotalFiat } = await import("@/components/store/CartPanel");
    expect(cartTotalFiat([line({}), line({ itemId: "z", fiat: null })])).toBeNull();
  });

  it("mixed currencies → silence, never a cross-currency sum", async () => {
    const { cartTotalFiat } = await import("@/components/store/CartPanel");
    expect(cartTotalFiat([line({}), line({ itemId: "y", fiat: { amount: 100, currency: "EUR" } })])).toBeNull();
  });
});

describe("the packages page — the ≈ is gone (source pin)", () => {
  it("no \"≈\" survives on the tier page's price lines, and they read through priceWords", async () => {
    const { promises: fs } = await import("fs");
    const path = await import("path");
    const src = await fs.readFile(path.join(process.cwd(), "src/app/packages/[slug]/page.tsx"), "utf8");
    expect(src).not.toContain("≈");
    expect(src).toContain("priceWords(");
  });
});
