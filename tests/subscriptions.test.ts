/* eslint-disable @typescript-eslint/no-explicit-any -- the fake Square speaks loose JSON */
import { describe, it, expect, beforeAll, afterAll, afterEach, beforeEach, vi } from "vitest";
import crypto from "crypto";
import { isolateCwd } from "./helpers/isolate-cwd";

/**
 * T-541a: the server core of real monthly memberships (Square Subscriptions
 * API), against a stateful fake Square. Pins: identity binding, dedupe and
 * replay, out-of-order events, max() expiry, grace, cancel semantics,
 * upgrade difference math, feature OFF, no client-supplied price, strict
 * Origin, refund scoping.
 */

const { cleanup } = isolateCwd("oc-sub-");
process.env.SEAT_SECRET = "test-seat-secret-541a";
process.env.SQUARE_ACCESS_TOKEN = "sandbox-token-never-logged";
process.env.SQUARE_LOCATION_ID = "LOC1";
process.env.SQUARE_ENVIRONMENT = "sandbox";
process.env.SQUARE_WEBHOOK_SIGNATURE_KEY = "whsec-test";
process.env.SQUARE_WEBHOOK_URL = "https://example.test/api/store/webhook/square";
delete process.env.KV_REST_API_URL;
delete process.env.KV_REST_API_TOKEN;
delete process.env.REDIS_URL;

let operatorOk = false;
vi.mock("@/lib/operator-auth", () => ({
  operatorFromCookieHeader: () => (operatorOk ? { email: "op@example.org" } : null),
}));

// T-556: the join and upgrade routes now ask whether the membership is open (its store item
// is live). These tests are about Square and identity, not the shelf, so every tier is open
// here; tests/tier-open-556.test.ts pins the closed cases.
vi.mock("@/lib/tier-open", () => ({ tierOpenForJoin: async () => true }));

import { makeMemberToken } from "@/lib/member-auth";
import { saveSiteConfig } from "@/lib/site-config";
import { getEntitlement, grantTier } from "@/lib/entitlement";
import {
  addMonths, deriveSubscription, endOfDayMs, startOfDayMs, GRACE_MS, getRecordForSubject, getRecord,
  savePlanMap, refresh, subscriptionBlocksPurchase, upgradeDifferenceCents, todayIn, SUB_TZ, type SubRecord,
} from "@/lib/subscriptions";
import { strictSameOrigin } from "@/lib/origin-strict";
import { POST as subscribePOST, GET as subscriptionGET } from "@/app/api/member/subscription/route";
import { POST as cancelPOST } from "@/app/api/member/subscription/cancel/route";
import { POST as undoPOST } from "@/app/api/member/subscription/undo-cancel/route";
import { POST as upgradePOST } from "@/app/api/member/subscription/upgrade/route";
import { GET as plansGET, POST as plansPOST } from "@/app/api/admin/store/subscription-plans/route";
import { GET as reconcileGET } from "@/app/api/subscriptions/reconcile/route";
import { POST as webhookPOST } from "@/app/api/store/webhook/square/route";

/* ── fake Square ────────────────────────────────────────────────────────── */

const VAR = { A: "VARIATION_A_STD", B: "VARIATION_B_STD", C: "VARIATION_C_STD", AFREE: "VARIATION_A_FREE" };

interface FakeSub { id: string; customer_id: string; card_id: string; plan_variation_id: string; start_date: string; charged_through_date?: string; canceled_date?: string; status: string; version: number; timezone: string; actions: unknown[] }

class FakeSquare {
  calls: { method: string; path: string; body: any }[] = [];
  subs = new Map<string, FakeSub>();
  customers: { id: string; reference_id: string }[] = [];
  invoices: any[] = [];
  paymentStatus = "COMPLETED";
  n = 0;
  reset() { this.calls = []; this.subs.clear(); this.customers = []; this.invoices = []; this.paymentStatus = "COMPLETED"; }
  count(method: string, re: RegExp) { return this.calls.filter((c) => c.method === method && re.test(c.path)).length; }
  find(method: string, re: RegExp) { return this.calls.filter((c) => c.method === method && re.test(c.path)); }
  sub(id: string) { return this.subs.get(id)!; }
  handle(method: string, path: string, body: any): { status: number; json: any } {
    this.calls.push({ method, path, body });
    const ok = (json: any) => ({ status: 200, json });
    let m: RegExpMatchArray | null;
    if ((m = path.match(/^\/v2\/catalog\/object\/(.+)$/))) {
      const id = m[1];
      if (id.startsWith("VARIATION_")) return ok({ object: { id, type: "SUBSCRIPTION_PLAN_VARIATION", subscription_plan_variation_data: { subscription_plan_id: "PLAN1", phases: id === VAR.AFREE ? [{ ordinal: 0, pricing: { type: "RELATIVE", discount_ids: ["DISC100"] } }, { ordinal: 1, pricing: { type: "RELATIVE" } }] : [{ ordinal: 0, pricing: { type: "RELATIVE" } }] } } });
      if (id === "PLAN1") return ok({ object: { id, subscription_plan_data: { eligible_item_ids: ["ITEM1"] } } });
      if (id === "ITEM1") return ok({ object: { id, item_data: { variations: [{ id: "ITEMVAR1" }] } } });
    }
    if (method === "POST" && path === "/v2/catalog/search") {
      return ok({ objects: [{ id: "PLAN1", subscription_plan_data: { name: "Plan", eligible_item_ids: ["ITEM1"], subscription_plan_variations: Object.values(VAR).map((id) => ({ id, subscription_plan_variation_data: { name: id, phases: [{ ordinal: 0, cadence: "MONTHLY", pricing: { type: "RELATIVE" } }] } })) } }], related_objects: [{ id: "ITEM1", item_data: { variations: [{ item_variation_data: { price_money: { amount: 3300 } } }] } }] });
    }
    if (method === "POST" && path === "/v2/orders") return ok({ order: { id: `ORDER${++this.n}` } });
    if (method === "POST" && path === "/v2/customers/search") return ok({ customers: this.customers.filter((c) => c.reference_id === body.query.filter.reference_id.exact) });
    if (method === "POST" && path === "/v2/customers") { const c = { id: `CUST${++this.n}`, reference_id: body.reference_id }; this.customers.push(c); return ok({ customer: c }); }
    if (method === "GET" && (m = path.match(/^\/v2\/customers\/(.+)$/))) { const c = this.customers.find((x) => x.id === m![1]); return c ? ok({ customer: c }) : { status: 404, json: {} }; }
    if (method === "POST" && path === "/v2/cards") return ok({ card: { id: `ccof:CARD${++this.n}` } });
    if (method === "POST" && path === "/v2/subscriptions") {
      const id = `00000000-0000-4000-8000-${String(++this.n).padStart(12, "0")}`;
      const sub: FakeSub = { id, customer_id: body.customer_id, card_id: body.card_id, plan_variation_id: body.plan_variation_id, start_date: body.start_date, charged_through_date: addMonths(body.start_date, 1), status: "ACTIVE", version: 1, timezone: body.timezone, actions: [] };
      this.subs.set(id, sub);
      return ok({ subscription: sub });
    }
    if ((m = path.match(/^\/v2\/subscriptions\/([^/?]+)\/cancel$/))) {
      const s = this.subs.get(m[1]); if (!s) return { status: 404, json: {} };
      s.canceled_date = s.charged_through_date; s.actions = [{ type: "CANCEL", effective_date: s.canceled_date }];
      return ok({ subscription: s });
    }
    if ((m = path.match(/^\/v2\/subscriptions\/([^/?]+)\/swap-plan$/))) {
      const s = this.subs.get(m[1])!; s.actions = [...s.actions, { type: "SWAP_PLAN", new_plan_variation_id: body.new_plan_variation_id }];
      return ok({ subscription: s });
    }
    if (method === "PUT" && (m = path.match(/^\/v2\/subscriptions\/([^/?]+)$/))) {
      const s = this.subs.get(m[1])!; delete s.canceled_date; s.actions = s.actions.filter((a: any) => a.type !== "CANCEL");
      return ok({ subscription: s });
    }
    if (method === "GET" && (m = path.match(/^\/v2\/subscriptions\/([^/?]+)/))) {
      const s = this.subs.get(m[1]); return s ? ok({ subscription: s }) : { status: 404, json: { errors: [{ code: "NOT_FOUND" }] } };
    }
    if (method === "POST" && path === "/v2/payments") return this.paymentStatus === "COMPLETED" ? ok({ payment: { id: "PAY1", status: "COMPLETED" } }) : { status: 402, json: { errors: [{ code: "CARD_DECLINED" }] } };
    if (method === "POST" && path === "/v2/invoices/search") return ok({ invoices: this.invoices });
    if (method === "GET" && (m = path.match(/^\/v2\/invoices\/(.+)$/))) { const i = this.invoices.find((x) => x.id === m![1]); return ok({ invoice: i }); }
    return { status: 404, json: { errors: [{ code: "NOT_FOUND", detail: `${method} ${path}` }] } };
  }
}
const square = new FakeSquare();

beforeAll(() => {
  vi.stubGlobal("fetch", async (url: string | URL, init?: RequestInit) => {
    const u = new URL(String(url));
    if (!u.hostname.startsWith("connect.squareupsandbox.com")) throw new Error(`unexpected host ${u.hostname}`);
    const r = square.handle(init?.method ?? "GET", u.pathname + u.search, init?.body ? JSON.parse(String(init.body)) : undefined);
    return new Response(JSON.stringify(r.json), { status: r.status });
  });
});
afterAll(() => { vi.unstubAllGlobals(); cleanup(); });

/* ── helpers ────────────────────────────────────────────────────────────── */

const HOST = "example.test";
const who = (name: string) => ({ handle: `${name}@example.org`, space: "email", subject: `${name}@example.org@email` });
const cookieFor = (name: string) => { const w = who(name); return `pa-fren=${makeMemberToken(w.handle, w.space)}`; };
function req(path: string, name: string | null, body?: unknown, opts: { origin?: string | null; method?: string } = {}) {
  const headers: Record<string, string> = { host: HOST, "content-type": "application/json" };
  if (name) headers.cookie = cookieFor(name);
  if (opts.origin !== null && body !== undefined) headers.origin = opts.origin ?? `https://${HOST}`;
  return new Request(`https://${HOST}${path}`, { method: opts.method ?? (body === undefined ? "GET" : "POST"), headers, body: body === undefined ? undefined : JSON.stringify(body) });
}
const j = async (r: Response) => ({ status: r.status, body: (await r.json()) as any });
const subscribeAs = (name: string, extra: Record<string, unknown> = {}) => subscribePOST(req("/api/member/subscription", name, { tier: "A", variant: "standard", cardToken: "cnon:card-nonce-ok", ...extra }));

async function freshSetup() {
  square.reset();
  await saveSiteConfig({ features: { subscriptions: true } });
  await savePlanMap({ tiers: { A: { standard: VAR.A, A: VAR.AFREE }, B: { standard: VAR.B }, C: { standard: VAR.C } } });
  // clear KV between tests: new distinct members each test, so only the map/config are shared
}

let seq = 0;
const fresh = () => `m${++seq}x${Date.now().toString(36)}`;

/* ── pure pieces ────────────────────────────────────────────────────────── */

describe("pure: dates, derive, difference", () => {
  it("upgrade difference is the list-price difference: $55 - $33 = $22", () => {
    expect(upgradeDifferenceCents("A", "B")).toBe(2200);
    expect(upgradeDifferenceCents("A", "C")).toBe(7800);
    expect(upgradeDifferenceCents("B", "C")).toBe(5600);
  });

  it("end of a Los Angeles day is a real instant in that zone", () => {
    expect(endOfDayMs("2026-11-02", SUB_TZ)).toBe(Date.UTC(2026, 10, 3, 7, 59, 59, 999)); // PST, UTC-8
    expect(startOfDayMs("2026-10-02", SUB_TZ)).toBe(Date.UTC(2026, 9, 2, 7, 0, 0, 0)); // PDT, UTC-7
    expect(addMonths("2026-01-31", 1)).toBe("2026-02-28");
  });

  const base = { status: "ACTIVE", timezone: SUB_TZ, start_date: "2026-10-02", charged_through_date: "2026-11-02" };
  it("active inside the paid period: expiry = end of charged_through day, no grace", () => {
    const now = Date.UTC(2026, 9, 20);
    const d = deriveSubscription(base, now);
    expect(d.status).toBe("active");
    expect(d.expiresAtMs).toBe(endOfDayMs("2026-11-02"));
  });
  it("a missed payment gets 3 days of grace after paid-through", () => {
    const now = endOfDayMs("2026-11-02") + 1000;
    const d = deriveSubscription(base, now);
    expect(d.status).toBe("past_due");
    expect(d.expiresAtMs).toBe(endOfDayMs("2026-11-02") + GRACE_MS);
    expect(GRACE_MS).toBe(3 * 24 * 3600 * 1000);
  });
  it("a cancel gets ZERO grace, even past the date", () => {
    const c = { ...base, canceled_date: "2026-11-02" };
    const during = deriveSubscription(c, Date.UTC(2026, 9, 20));
    expect(during.status).toBe("cancelling");
    expect(during.expiresAtMs).toBe(endOfDayMs("2026-11-02"));
    const after = deriveSubscription({ ...c, status: "CANCELED" }, endOfDayMs("2026-11-02") + 5000, during.chargedThroughMs);
    expect(after.status).toBe("canceled");
    expect(after.expiresAtMs).toBe(endOfDayMs("2026-11-02"));
  });
  it("a free first period (nothing charged yet) runs one month from the start", () => {
    const d = deriveSubscription({ status: "ACTIVE", timezone: "UTC", start_date: "2026-10-02" }, Date.UTC(2026, 9, 3));
    expect(d.status).toBe("active");
    expect(d.expiresAtMs).toBe(endOfDayMs("2026-11-02", "UTC"));
  });
  it("paid-through never moves backward on a stale read", () => {
    const newer = deriveSubscription(base, Date.UTC(2026, 9, 20));
    const stale = deriveSubscription({ ...base, charged_through_date: "2026-10-02" }, Date.UTC(2026, 9, 3), newer.chargedThroughMs);
    expect(stale.chargedThroughMs).toBe(newer.chargedThroughMs);
  });
});

describe("strict Origin", () => {
  const mk = (origin: string | null, host = HOST) => new Request("https://x/", { method: "POST", headers: { host, ...(origin === null ? {} : { origin }) } });
  it("refuses a missing, opaque, malformed or foreign Origin; accepts only the same host", () => {
    expect(strictSameOrigin(mk(null))).toBe(false);
    expect(strictSameOrigin(mk("null"))).toBe(false);
    expect(strictSameOrigin(mk("not a url"))).toBe(false);
    expect(strictSameOrigin(mk("https://evil.example"))).toBe(false);
    expect(strictSameOrigin(mk(`https://${HOST}.evil.example`))).toBe(false);
    expect(strictSameOrigin(mk(`https://${HOST}`))).toBe(true);
  });
});

/* ── grantTier absolute ─────────────────────────────────────────────────── */

describe("grantTier absolute (the subscription seam)", () => {
  it("same tier takes the MAX, never ADDs, and a repeat is a no-op", async () => {
    const k = `${fresh()}@example.org@email`;
    const t1 = Date.now() + 10 * 86400_000;
    await grantTier(k, "A", "sub:1", { expiresAtMs: t1, absolute: true });
    await grantTier(k, "A", "sub:1", { expiresAtMs: t1, absolute: true });
    expect((await getEntitlement(k))?.expiresAtMs).toBe(t1);
    const t2 = t1 + 30 * 86400_000;
    await grantTier(k, "A", "sub:1", { expiresAtMs: t2, absolute: true });
    expect((await getEntitlement(k))?.expiresAtMs).toBe(t2); // a renewal moves it, to Square's date, not t1 + 30d + 30d
    await grantTier(k, "A", "sub:1", { expiresAtMs: t1, absolute: true }); // stale
    expect((await getEntitlement(k))?.expiresAtMs).toBe(t2);
  });
});

/* ── feature switch ─────────────────────────────────────────────────────── */

describe("feature OFF", () => {
  it("every member route is a 404, signed in or not", async () => {
    square.reset();
    operatorOk = false;
    await saveSiteConfig({ features: { subscriptions: false } });
    const n = fresh();
    expect((await j(await subscribePOST(req("/api/member/subscription", n, { tier: "A", cardToken: "cnon:card-nonce-ok" })))).status).toBe(404);
    expect((await j(await subscriptionGET(req("/api/member/subscription", n)))).status).toBe(404);
    expect((await j(await cancelPOST(req("/api/member/subscription/cancel", n, {})))).status).toBe(404);
    expect((await j(await undoPOST(req("/api/member/subscription/undo-cancel", n, {})))).status).toBe(404);
    expect((await j(await upgradePOST(req("/api/member/subscription/upgrade", n, { tier: "B" })))).status).toBe(404);
    expect(square.calls.length).toBe(0);
  });
});

describe("T-555: the operator test door (switch OFF)", () => {
  beforeEach(async () => {
    await freshSetup();
    await saveSiteConfig({ features: { subscriptions: false } });
    operatorOk = false;
  });
  afterEach(() => { operatorOk = false; });

  it("an operator who is also a signed-in member can read, subscribe, cancel and undo", async () => {
    operatorOk = true;
    const x = fresh();
    const g = await j(await subscriptionGET(req("/api/member/subscription", x)));
    expect(g.status).toBe(200);
    expect(g.body.subscription).toBeNull();
    const s = await j(await subscribeAs(x));
    expect(s.status).toBe(200);
    expect((await getEntitlement(who(x).subject))?.tier).toBe("A"); // the grant landed
    const c = await j(await cancelPOST(req("/api/member/subscription/cancel", x, {})));
    expect(c.body.subscription.status).toBe("cancelling");
    const u = await j(await undoPOST(req("/api/member/subscription/undo-cancel", x, {})));
    expect(u.body.subscription.status).toBe("active");
  });

  it("an operator with NO member session gets 401 and never a subscribe", async () => {
    operatorOk = true;
    const r = await j(await subscribePOST(req("/api/member/subscription", null, { tier: "A", cardToken: "cnon:card-nonce-ok" })));
    expect(r.status).toBe(401);
    expect((await j(await subscriptionGET(req("/api/member/subscription", null)))).status).toBe(401);
    expect(square.calls.length).toBe(0);
  });

  it("a non-operator is still a 404 with zero Square calls", async () => {
    const x = fresh();
    expect((await j(await subscribeAs(x))).status).toBe(404);
    expect((await j(await subscriptionGET(req("/api/member/subscription", x)))).status).toBe(404);
    expect(square.calls.length).toBe(0);
    expect(await getRecordForSubject(who(x).subject)).toBeNull();
  });

  it("an operator write with a wrong or missing Origin is still refused", async () => {
    operatorOk = true;
    const x = fresh();
    const body = { tier: "A", cardToken: "cnon:card-nonce-ok" };
    expect((await j(await subscribePOST(req("/api/member/subscription", x, body, { origin: null })))).status).toBe(403);
    expect((await j(await subscribePOST(req("/api/member/subscription", x, body, { origin: "https://evil.example" })))).status).toBe(403);
    expect(square.calls.length).toBe(0);
  });
});

/* ── subscribe ──────────────────────────────────────────────────────────── */

describe("subscribe", () => {
  beforeEach(freshSetup);

  it("signed-in only, strict Origin, a real tier", async () => {
    const n = fresh();
    expect((await j(await subscribePOST(req("/api/member/subscription", null, { tier: "A", cardToken: "cnon:card-nonce-ok" })))).status).toBe(401);
    expect((await j(await subscribePOST(req("/api/member/subscription", n, { tier: "A", cardToken: "cnon:card-nonce-ok" }, { origin: null })))).status).toBe(403);
    expect((await j(await subscribePOST(req("/api/member/subscription", n, { tier: "A", cardToken: "cnon:card-nonce-ok" }, { origin: "https://evil.example" })))).status).toBe(403);
    expect((await j(await subscribePOST(req("/api/member/subscription", n, { tier: "Z", cardToken: "cnon:card-nonce-ok" })))).status).toBe(400);
    expect(square.calls.length).toBe(0);
  });

  it("happy path: customer tagged with the session subject, plan from the SERVER map, entitlement to paid-through", async () => {
    const n = fresh();
    const r = await j(await subscribeAs(n));
    expect(r.status).toBe(200);
    expect(r.body.subscription.status).toBe("active");
    const cust = square.find("POST", /^\/v2\/customers$/)[0].body;
    expect(cust.reference_id).toBe(who(n).subject);
    const sub = square.find("POST", /^\/v2\/subscriptions$/)[0].body;
    expect(sub.plan_variation_id).toBe(VAR.A);
    expect(sub.phases[0].order_template_id).toMatch(/^ORDER/); // RELATIVE plan: template phases
    const rec = await getRecordForSubject(who(n).subject);
    expect(rec?.tier).toBe("A");
    const ent = await getEntitlement(who(n).subject);
    expect(ent?.tier).toBe("A");
    expect(ent?.orderId).toBe(`sub:${rec!.subscriptionId}`);
    expect(ent?.expiresAtMs).toBe(endOfDayMs(addMonths(todayIn(), 1)));
    // no card data in the stored row
    expect(Object.keys(rec!).sort()).toEqual(["cardId", "chargedThroughMs", "createdAtMs", "expiresAtMs", "grantKey", "planVariationId", "squareCustomerId", "status", "subject", "subscriptionId", "tier", "updatedAtMs", "variant"]);
    expect(JSON.stringify(rec)).not.toMatch(/cnon|4111|phone|email_address/i);
  });

  it("NO client-supplied price, plan or subject is ever used", async () => {
    const n = fresh();
    const other = who(fresh()).subject;
    const r = await j(await subscribeAs(n, { price: 1, amount: 1, planVariationId: VAR.C, plan_variation_id: VAR.C, subscription_plan_id: VAR.C, subject: other, npub: other, redirectUrl: "https://evil.example" }));
    expect(r.status).toBe(200);
    expect(square.find("POST", /^\/v2\/subscriptions$/)[0].body.plan_variation_id).toBe(VAR.A);
    expect(JSON.stringify(square.calls)).not.toContain(other);
    expect(await getRecordForSubject(who(n).subject)).not.toBeNull();
    expect(await getRecordForSubject(other)).toBeNull();
  });

  it("refuses a second subscribe to the same tier, and a lower one while on a higher", async () => {
    const n = fresh();
    expect((await j(await subscribeAs(n))).status).toBe(200);
    const again = await j(await subscribeAs(n, { cardToken: "cnon:another-one" }));
    expect(again.status).toBe(409);
    expect(again.body.code).toBe("already_subscribed");
    expect(square.count("POST", /^\/v2\/subscriptions$/)).toBe(1);
    const m = fresh();
    expect((await j(await subscribePOST(req("/api/member/subscription", m, { tier: "B", cardToken: "cnon:card-nonce-ok" })))).status).toBe(200);
    expect((await j(await subscribeAs(m, { cardToken: "cnon:lower-one" }))).body.code).toBe("already_subscribed");
    const up = await j(await subscribePOST(req("/api/member/subscription", n, { tier: "B", cardToken: "cnon:up-one" })));
    expect(up.body.code).toBe("use_upgrade");
  });

  it("promo variants: closed until the operator opens them, then first-time members only", async () => {
    const n = fresh();
    const closed = await j(await subscribeAs(n, { variant: "A" }));
    expect(closed.body.code).toBe("offer_closed");
    await savePlanMap({ tiers: { A: { standard: VAR.A, A: VAR.AFREE }, B: { standard: VAR.B } }, open: ["standard", "A"] });
    const ok = await j(await subscribeAs(n, { variant: "A" }));
    expect(ok.status).toBe(200);
    expect(square.find("POST", /^\/v2\/subscriptions$/)[0].body.plan_variation_id).toBe(VAR.AFREE);
    // a free-phase variation puts the discount on the phase-0 template
    expect(square.find("POST", /^\/v2\/orders$/)[0].body.order.discounts).toEqual([{ catalog_object_id: "DISC100", scope: "ORDER" }]);
    expect(square.find("POST", /^\/v2\/orders$/)[1].body.order.discounts).toBeUndefined();
    // cancel, let it end, then the promo is spent
    const m = fresh();
    await subscribeAs(m);
    const rec = (await getRecordForSubject(who(m).subject))!;
    square.sub(rec.subscriptionId).status = "CANCELED";
    await refresh(rec.subscriptionId);
    const second = await j(await subscribeAs(m, { variant: "A", cardToken: "cnon:second-go" }));
    expect(second.body.code).toBe("offer_used");
  });

  it("an unmapped tier says so", async () => {
    await savePlanMap({ tiers: { A: { standard: VAR.A } } });
    const r = await j(await subscribePOST(req("/api/member/subscription", fresh(), { tier: "C", cardToken: "cnon:card-nonce-ok" })));
    expect(r.body.code).toBe("plan_not_configured");
  });
});

/* ── identity binding ───────────────────────────────────────────────────── */

describe("identity: member X cannot touch member Y", () => {
  beforeEach(freshSetup);
  it("cancel and upgrade act on the session's own subscription only, whatever the body names", async () => {
    const x = fresh(), y = fresh();
    await subscribeAs(x); await subscribeAs(y);
    const recX = (await getRecordForSubject(who(x).subject))!;
    const recY = (await getRecordForSubject(who(y).subject))!;
    expect(recX.subscriptionId).not.toBe(recY.subscriptionId);
    square.calls = [];
    const c = await j(await cancelPOST(req("/api/member/subscription/cancel", x, { subscriptionId: recY.subscriptionId, subject: who(y).subject })));
    expect(c.status).toBe(200);
    const cancels = square.find("POST", /\/cancel$/);
    expect(cancels.length).toBe(1);
    expect(cancels[0].path).toContain(recX.subscriptionId);
    expect(square.sub(recY.subscriptionId).canceled_date).toBeUndefined();
    const u = await j(await upgradePOST(req("/api/member/subscription/upgrade", y, { tier: "B", subscriptionId: recX.subscriptionId })));
    expect(u.status).toBe(200);
    expect((await getRecordForSubject(who(y).subject))?.tier).toBe("B");
    expect((await getRecordForSubject(who(x).subject))?.tier).toBe("A");
  });
  it("a member with no subscription gets 404 on cancel, and cannot reach another's by guessing", async () => {
    const x = fresh(), z = fresh();
    await subscribeAs(x);
    const r = await j(await cancelPOST(req("/api/member/subscription/cancel", z, { subscriptionId: (await getRecordForSubject(who(x).subject))!.subscriptionId })));
    expect(r.status).toBe(404);
    expect(square.count("POST", /\/cancel$/)).toBe(0);
  });
  it("state-changing routes refuse a missing Origin and no session", async () => {
    const x = fresh();
    await subscribeAs(x);
    for (const [fn, path, body] of [[cancelPOST, "/api/member/subscription/cancel", {}], [undoPOST, "/api/member/subscription/undo-cancel", {}], [upgradePOST, "/api/member/subscription/upgrade", { tier: "B" }]] as const) {
      expect((await j(await fn(req(path, x, body, { origin: null })))).status).toBe(403);
      expect((await j(await fn(req(path, null, body)))).status).toBe(401);
    }
    expect(square.count("POST", /\/cancel$|swap-plan|payments/)).toBe(0);
  });
  it("GET returns only my state, with no card or customer ids", async () => {
    const x = fresh();
    await subscribeAs(x);
    const g = await j(await subscriptionGET(req("/api/member/subscription", x)));
    expect(g.body.subscription.tier).toBe("A");
    expect(JSON.stringify(g.body)).not.toMatch(/ccof|CUST|squareCustomerId|cardId/);
    expect((await j(await subscriptionGET(req("/api/member/subscription", null)))).status).toBe(401);
  });
});

/* ── cancel / undo ──────────────────────────────────────────────────────── */

describe("cancel semantics", () => {
  beforeEach(freshSetup);
  it("cancel keeps access to paid-through with no grace; undo restores", async () => {
    const x = fresh();
    await subscribeAs(x);
    const rec0 = (await getRecordForSubject(who(x).subject))!;
    const expiry = (await getEntitlement(who(x).subject))!.expiresAtMs;
    const c = await j(await cancelPOST(req("/api/member/subscription/cancel", x, {})));
    expect(c.body.subscription.status).toBe("cancelling");
    expect(c.body.subscription.expiresAtMs).toBe(expiry);
    expect((await getEntitlement(who(x).subject))?.tier).toBe("A"); // still theirs
    expect(square.sub(rec0.subscriptionId).status).toBe("ACTIVE");
    const u = await j(await undoPOST(req("/api/member/subscription/undo-cancel", x, {})));
    expect(u.body.subscription.status).toBe("active");
    expect(square.sub(rec0.subscriptionId).canceled_date).toBeUndefined();
    // undo when nothing is scheduled is refused
    expect((await j(await undoPOST(req("/api/member/subscription/undo-cancel", x, {})))).status).toBe(409);
  });
  it("a cancelled subscription never earns grace once its date has passed", async () => {
    const x = fresh();
    await subscribeAs(x);
    const rec = (await getRecordForSubject(who(x).subject))!;
    await cancelPOST(req("/api/member/subscription/cancel", x, {}));
    square.sub(rec.subscriptionId).status = "CANCELED";
    const r = (await refresh(rec.subscriptionId))!;
    expect(r.status).toBe("canceled");
    expect(r.expiresAtMs).toBe(endOfDayMs(addMonths(todayIn(), 1)));
  });
});

/* ── refresh: max, grace, no double time ────────────────────────────────── */

describe("refresh: the one place Square becomes expiry", () => {
  beforeEach(freshSetup);
  it("refreshing again and again adds no time; a renewal moves it to Square's new date", async () => {
    const x = fresh();
    await subscribeAs(x);
    const rec = (await getRecordForSubject(who(x).subject))!;
    const e1 = (await getEntitlement(who(x).subject))!.expiresAtMs!;
    for (let i = 0; i < 3; i++) await refresh(rec.subscriptionId);
    expect((await getEntitlement(who(x).subject))!.expiresAtMs).toBe(e1);
    square.sub(rec.subscriptionId).charged_through_date = addMonths(todayIn(), 2);
    await refresh(rec.subscriptionId);
    const e2 = (await getEntitlement(who(x).subject))!.expiresAtMs!;
    expect(e2).toBe(endOfDayMs(addMonths(todayIn(), 2)));
    // a stale read (older date) afterwards cannot shrink it
    square.sub(rec.subscriptionId).charged_through_date = addMonths(todayIn(), 1);
    await refresh(rec.subscriptionId);
    expect((await getEntitlement(who(x).subject))!.expiresAtMs).toBe(e2);
    expect((await getRecord(rec.subscriptionId))!.chargedThroughMs).toBe(e2);
  });
  it("a missed payment: past_due, access held 3 days after paid-through", async () => {
    const x = fresh();
    await subscribeAs(x);
    const rec = (await getRecordForSubject(who(x).subject))!;
    // paid-through was yesterday (LA): the renewal never came
    const yesterday = new Date(Date.now() - 86400_000);
    square.sub(rec.subscriptionId).charged_through_date = todayIn(SUB_TZ, yesterday.getTime());
    // the member holds paid time already; model a fresh grant that ended yesterday-end
    const r = (await refresh(rec.subscriptionId))!;
    expect(r.status).toBe("past_due");
    expect(r.expiresAtMs).toBeGreaterThanOrEqual(endOfDayMs(todayIn(SUB_TZ, yesterday.getTime())) + GRACE_MS);
    expect((await getEntitlement(who(x).subject))?.tier).toBe("A");
  });
});

/* ── upgrade ────────────────────────────────────────────────────────────── */

describe("upgrade", () => {
  beforeEach(freshSetup);
  it("charges the difference ($22) on the card on file, grants B at once, schedules the swap", async () => {
    const x = fresh();
    await subscribeAs(x);
    const rec = (await getRecordForSubject(who(x).subject))!;
    const paidThrough = (await getEntitlement(who(x).subject))!.expiresAtMs!;
    const u = await j(await upgradePOST(req("/api/member/subscription/upgrade", x, { tier: "B", amount: 1 })));
    expect(u.status).toBe(200);
    const pay = square.find("POST", /^\/v2\/payments$/)[0].body;
    expect(pay.amount_money).toEqual({ amount: 2200, currency: "USD" });
    expect(pay.source_id).toBe(rec.cardId);
    expect(pay.customer_id).toBe(rec.squareCustomerId);
    const swap = square.find("POST", /swap-plan$/)[0].body;
    expect(swap.new_plan_variation_id).toBe(VAR.B);
    expect(swap.phases[0].order_template_id).toMatch(/^ORDER/);
    const ent = (await getEntitlement(who(x).subject))!;
    expect(ent.tier).toBe("B");
    expect(ent.expiresAtMs).toBe(paidThrough);
    expect(u.body.subscription.pendingSwapTier).toBe("B");
    // the swap lands at the next billing: Square's plan changes, the pending flag clears
    square.sub(rec.subscriptionId).plan_variation_id = VAR.B;
    square.sub(rec.subscriptionId).charged_through_date = addMonths(todayIn(), 2);
    const after = (await refresh(rec.subscriptionId))!;
    expect(after.pendingSwap).toBeUndefined();
    expect(after.planVariationId).toBe(VAR.B);
    expect((await getEntitlement(who(x).subject))!.tier).toBe("B");
  });
  it("a declined difference payment grants nothing and swaps nothing", async () => {
    const x = fresh();
    await subscribeAs(x);
    square.paymentStatus = "FAILED";
    const u = await j(await upgradePOST(req("/api/member/subscription/upgrade", x, { tier: "B" })));
    expect(u.status).toBe(402);
    expect((await getEntitlement(who(x).subject))!.tier).toBe("A");
    expect(square.count("POST", /swap-plan$/)).toBe(0);
  });
  it("refuses a same/lower tier and an upgrade while a cancel is scheduled", async () => {
    const x = fresh();
    await subscribeAs(x);
    expect((await j(await upgradePOST(req("/api/member/subscription/upgrade", x, { tier: "A" })))).body.code).toBe("not_an_upgrade");
    await cancelPOST(req("/api/member/subscription/cancel", x, {}));
    expect((await j(await upgradePOST(req("/api/member/subscription/upgrade", x, { tier: "B" })))).body.code).toBe("undo_cancel_first");
    expect(square.count("POST", /^\/v2\/payments$/)).toBe(0);
  });
  it("a swap that failed after payment is retried on the next refresh", async () => {
    const x = fresh();
    await subscribeAs(x);
    const rec = (await getRecordForSubject(who(x).subject))!;
    const orig = square.handle.bind(square);
    let failSwap = true;
    square.handle = (m: string, p: string, b: any) => (failSwap && /swap-plan$/.test(p) ? { status: 500, json: {} } : orig(m, p, b));
    await upgradePOST(req("/api/member/subscription/upgrade", x, { tier: "B" }));
    expect((await getRecord(rec.subscriptionId))!.pendingSwap?.scheduled).toBe(false);
    expect((await getEntitlement(who(x).subject))!.tier).toBe("B"); // paid, so granted
    failSwap = false;
    await refresh(rec.subscriptionId);
    expect((await getRecord(rec.subscriptionId))!.pendingSwap?.scheduled).toBe(true);
    square.handle = orig;
  });
});

/* ── webhook ────────────────────────────────────────────────────────────── */

function signed(payload: unknown, opts: { key?: string; url?: string } = {}) {
  const raw = JSON.stringify(payload);
  const sig = crypto.createHmac("sha256", opts.key ?? "whsec-test").update((opts.url ?? process.env.SQUARE_WEBHOOK_URL!) + raw).digest("base64");
  return new Request("https://example.test/api/store/webhook/square", { method: "POST", headers: { "x-square-hmacsha256-signature": sig, "content-type": "application/json" }, body: raw });
}
let evSeq = 0;
const subEvent = (type: string, subscriptionId: string, eventId = `ev-${++evSeq}-${Date.now()}`) => ({ type, event_id: eventId, data: { type: "subscription", id: subscriptionId, object: { subscription: { id: subscriptionId, status: "CANCELED" /* a lie: never trusted */ } } } });
const invEvent = (type: string, invoice: Record<string, unknown>, eventId = `ev-${++evSeq}-${Date.now()}`) => ({ type, event_id: eventId, data: { type: "invoice", id: invoice.id, object: { invoice } } });
const reads = () => square.count("GET", /^\/v2\/subscriptions\//);

describe("webhook", () => {
  beforeEach(freshSetup);

  it("forged events (unsigned, wrong key, wrong URL, tampered body) write nothing", async () => {
    const x = fresh();
    await subscribeAs(x);
    const rec = (await getRecordForSubject(who(x).subject))!;
    square.sub(rec.subscriptionId).charged_through_date = addMonths(todayIn(), 3);
    const ev = subEvent("subscription.updated", rec.subscriptionId);
    const before = reads();
    const unsigned = new Request("https://example.test/api/store/webhook/square", { method: "POST", body: JSON.stringify(ev) });
    await webhookPOST(unsigned);
    await webhookPOST(signed(ev, { key: "wrong" }));
    await webhookPOST(signed(ev, { url: "https://other.test/hook" }));
    const good = signed(ev);
    const tampered = new Request(good.url, { method: "POST", headers: good.headers, body: JSON.stringify({ ...ev, event_id: "ev-tampered" }) });
    await webhookPOST(tampered);
    expect(reads()).toBe(before);
    expect((await getEntitlement(who(x).subject))!.expiresAtMs).toBe(endOfDayMs(addMonths(todayIn(), 1)));
  });

  it("a verified event re-reads Square and never trusts the body's state", async () => {
    const x = fresh();
    await subscribeAs(x);
    const rec = (await getRecordForSubject(who(x).subject))!;
    square.sub(rec.subscriptionId).charged_through_date = addMonths(todayIn(), 2);
    const r = await webhookPOST(signed(subEvent("subscription.updated", rec.subscriptionId))); // body says CANCELED
    expect(r.status).toBe(200);
    expect((await getRecord(rec.subscriptionId))!.status).toBe("active");
    expect((await getEntitlement(who(x).subject))!.expiresAtMs).toBe(endOfDayMs(addMonths(todayIn(), 2)));
  });

  it("replay: the same event_id twice is one refresh", async () => {
    const x = fresh();
    await subscribeAs(x);
    const rec = (await getRecordForSubject(who(x).subject))!;
    const ev = subEvent("invoice.payment_made", rec.subscriptionId, "ev-replay-1");
    const body = invEvent("invoice.payment_made", { id: "inv1", subscription_id: rec.subscriptionId, order_id: "o1" }, "ev-replay-1");
    void ev;
    const before = reads();
    await webhookPOST(signed(body));
    const mid = reads();
    await webhookPOST(signed(body));
    await webhookPOST(signed(body));
    expect(mid - before).toBeGreaterThan(0);
    expect(reads()).toBe(mid);
  });

  it("an unknown subscription id is ignored", async () => {
    const before = square.calls.length;
    const r = await webhookPOST(signed(subEvent("subscription.created", "99999999-0000-4000-8000-000000000000")));
    expect(r.status).toBe(200);
    expect(square.calls.slice(before).every((c) => c.method === "GET")).toBe(true); // a re-read at most, never a write
  });

  it("out of order: an event before the record exists is ignored; later events converge on Square's state", async () => {
    const x = fresh();
    const early = invEvent("invoice.payment_made", { id: "inv0", subscription_id: "11111111-0000-4000-8000-000000000001" });
    await webhookPOST(signed(early));
    await subscribeAs(x);
    const rec = (await getRecordForSubject(who(x).subject))!;
    square.sub(rec.subscriptionId).charged_through_date = addMonths(todayIn(), 2);
    // events arrive newest-first, then the oldest: same end state each time
    await webhookPOST(signed(invEvent("invoice.payment_made", { id: "inv2", subscription_id: rec.subscriptionId })));
    await webhookPOST(signed(subEvent("subscription.updated", rec.subscriptionId)));
    await webhookPOST(signed(subEvent("subscription.created", rec.subscriptionId)));
    const e = (await getEntitlement(who(x).subject))!.expiresAtMs;
    expect(e).toBe(endOfDayMs(addMonths(todayIn(), 2)));
  });

  it("a failed charge event flags past_due and holds access through grace", async () => {
    const x = fresh();
    await subscribeAs(x);
    const rec = (await getRecordForSubject(who(x).subject))!;
    square.sub(rec.subscriptionId).charged_through_date = todayIn(); // due today, not paid
    await webhookPOST(signed(invEvent("invoice.scheduled_charge_failed", { id: "inv9", subscription_id: rec.subscriptionId })));
    const r = (await getRecord(rec.subscriptionId))!;
    expect(r.status).toBe("past_due");
    expect(r.expiresAtMs).toBeGreaterThanOrEqual(endOfDayMs(todayIn()) + GRACE_MS); // max(): never lowered by a later read
  });

  it("a transient failure frees the event id so Square's retry works", async () => {
    const x = fresh();
    await subscribeAs(x);
    const rec = (await getRecordForSubject(who(x).subject))!;
    const orig = square.handle.bind(square);
    let down = true;
    square.handle = (m: string, p: string, b: any) => (down && m === "GET" && p.startsWith("/v2/subscriptions/") ? { status: 500, json: {} } : orig(m, p, b));
    const body = subEvent("subscription.updated", rec.subscriptionId, "ev-transient");
    expect((await webhookPOST(signed(body))).status).toBe(500);
    down = false;
    square.sub(rec.subscriptionId).charged_through_date = addMonths(todayIn(), 2);
    expect((await webhookPOST(signed(body))).status).toBe(200);
    expect((await getEntitlement(who(x).subject))!.expiresAtMs).toBe(endOfDayMs(addMonths(todayIn(), 2)));
    square.handle = orig;
  });
});

/* ── refund scoping ─────────────────────────────────────────────────────── */

describe("refunds are scoped to the refunded period", () => {
  beforeEach(freshSetup);
  const inv = (rec: SubRecord, id: string, due: string, status: string, orderId = `o-${id}`) => ({ id, subscription_id: rec.subscriptionId, order_id: orderId, status, payment_requests: [{ due_date: due }] });

  it("refunding an OLD invoice never revokes the current paid month", async () => {
    const x = fresh();
    await subscribeAs(x);
    const rec = (await getRecordForSubject(who(x).subject))!;
    square.invoices = [inv(rec, "old", "2026-09-02", "REFUNDED"), inv(rec, "cur", "2026-10-02", "PAID")];
    await webhookPOST(signed(invEvent("invoice.refunded", { id: "old", subscription_id: rec.subscriptionId })));
    expect((await getEntitlement(who(x).subject))?.tier).toBe("A");
    expect((await getRecord(rec.subscriptionId))!.status).toBe("active");
  });

  it("a partial refund of the latest invoice does not revoke", async () => {
    const x = fresh();
    await subscribeAs(x);
    const rec = (await getRecordForSubject(who(x).subject))!;
    square.invoices = [inv(rec, "cur", "2026-10-02", "PARTIALLY_REFUNDED")];
    await webhookPOST(signed(invEvent("invoice.refunded", { id: "cur", subscription_id: rec.subscriptionId })));
    expect((await getEntitlement(who(x).subject))?.tier).toBe("A");
  });

  it("a full refund of the LATEST invoice revokes, stops charging, and a later refresh does not regrant", async () => {
    const x = fresh();
    await subscribeAs(x);
    const rec = (await getRecordForSubject(who(x).subject))!;
    square.invoices = [inv(rec, "old", "2026-09-02", "PAID"), inv(rec, "cur", "2026-10-02", "REFUNDED", "order-cur")];
    // a refund.updated event names the invoice's ORDER
    const ev = { type: "refund.updated", event_id: "ev-refund-1", data: { object: { refund: { id: "r1", order_id: "order-cur", status: "COMPLETED" } } } };
    await webhookPOST(signed(ev));
    expect((await getEntitlement(who(x).subject))).toBeNull();
    expect((await getRecord(rec.subscriptionId))!.status).toBe("refunded");
    expect(square.count("POST", /\/cancel$/)).toBe(1);
    await refresh(rec.subscriptionId);
    expect((await getEntitlement(who(x).subject))).toBeNull();
  });
});

/* ── one-time interplay (T-539) ─────────────────────────────────────────── */

describe("one-time purchases beside a subscription", () => {
  beforeEach(freshSetup);
  it("a subscriber is refused the same or a lower tier one-time; a higher tier is allowed", async () => {
    const x = fresh();
    await subscribePOST(req("/api/member/subscription", x, { tier: "B", cardToken: "cnon:card-nonce-ok" }));
    const s = who(x).subject;
    expect(await subscriptionBlocksPurchase(s, "B")).toBe(true);
    expect(await subscriptionBlocksPurchase(s, "A")).toBe(true);
    expect(await subscriptionBlocksPurchase(s, "C")).toBe(false);
    expect(await subscriptionBlocksPurchase(who(fresh()).subject, "A")).toBe(false);
  });
  it("a one-time grant (T-539 term) is untouched by the subscription code", async () => {
    const k = `${fresh()}@example.org@email`;
    const end = Date.now() + 30 * 86400_000;
    await grantTier(k, "A", "order-1", { expiresAtMs: end });
    expect((await getEntitlement(k))?.expiresAtMs).toBeLessThanOrEqual(end);
    await grantTier(k, "A", "order-2", { expiresAtMs: Date.now() + 30 * 86400_000 }); // the old ADD rule still holds
    expect((await getEntitlement(k))!.expiresAtMs!).toBeGreaterThan(end + 29 * 86400_000);
  });
});

/* ── operator plan map ──────────────────────────────────────────────────── */

describe("operator plan routes", () => {
  beforeEach(async () => { await freshSetup(); operatorOk = false; });
  const opReq = (method: string, body?: unknown, origin: string | null = `https://${HOST}`) =>
    new Request(`https://${HOST}/api/admin/store/subscription-plans`, { method, headers: { host: HOST, ...(origin ? { origin } : {}) }, body: body === undefined ? undefined : JSON.stringify(body) });

  it("non-operators are refused on both verbs", async () => {
    expect((await j(await plansGET(opReq("GET")))).status).toBe(401);
    expect((await j(await plansPOST(opReq("POST", { map: {} })))).status).toBe(401);
    expect(square.calls.length).toBe(0);
  });
  it("lists plans with variations, phases and prices; never the token", async () => {
    operatorOk = true;
    const r = await j(await plansGET(opReq("GET")));
    expect(r.status).toBe(200);
    expect(r.body.plans[0].variations.map((v: any) => v.id)).toContain(VAR.A);
    expect(r.body.plans[0].variations[0].phases[0]).toMatchObject({ pricing: "RELATIVE", priceCents: 3300 });
    expect(r.body.environment).toBe("sandbox");
    expect(JSON.stringify(r.body)).not.toContain("sandbox-token-never-logged");
  });
  it("saves a map only with ids Square lists, and only with a matching Origin", async () => {
    operatorOk = true;
    expect((await j(await plansPOST(opReq("POST", { map: { tiers: { A: { standard: VAR.A } } } }, null)))).status).toBe(403);
    expect((await j(await plansPOST(opReq("POST", { map: { tiers: { A: { standard: "NOSUCHVARIATION" } } } })))).status).toBe(400);
    const ok = await j(await plansPOST(opReq("POST", { map: { tiers: { B: { standard: VAR.B } }, open: ["standard", "B"] } })));
    expect(ok.status).toBe(200);
    expect(ok.body.map.tiers.B.standard).toBe(VAR.B);
    expect(ok.body.map.open).toEqual(["standard", "B"]);
  });
});

/* ── fix round: production vault, orphans, reconcile ────────────────────── */

describe("production without a vault refuses", () => {
  beforeEach(freshSetup);
  it("subscribe errors clearly BEFORE calling Square and writes nothing to disk", async () => {
    process.env.VERCEL = "1";
    try {
      const r = await j(await subscribeAs(fresh()));
      expect(r.status).toBe(503);
      expect(r.body.code).toBe("store_unavailable");
      expect(square.calls.length).toBe(0);
    } finally {
      delete process.env.VERCEL;
    }
  });
});

describe("orphaned subscriptions", () => {
  beforeEach(freshSetup);
  async function lostReply(name: string) {
    const orig = square.handle.bind(square);
    square.handle = (m: string, p: string, b: any) => {
      const r = orig(m, p, b);
      return m === "POST" && p === "/v2/subscriptions" ? { status: 500, json: {} } : r; // Square made it, we never heard
    };
    const r = await j(await subscribeAs(name));
    square.handle = orig;
    return r;
  }
  it("a pending intent is written before CreateSubscription, and a webhook adopts the orphan", async () => {
    const x = fresh();
    expect((await lostReply(x)).status).toBe(502);
    expect(await getRecordForSubject(who(x).subject)).toBeNull();
    const subId = [...square.subs.keys()][0];
    await webhookPOST(signed(subEvent("subscription.created", subId)));
    const rec = (await getRecordForSubject(who(x).subject))!;
    expect(rec.subscriptionId).toBe(subId);
    expect(rec.tier).toBe("A"); // from OUR intent
    expect((await getEntitlement(who(x).subject))?.tier).toBe("A");
  });
  it("is ignored when the customer is not one we stored for that subject, or no intent exists", async () => {
    const x = fresh();
    await lostReply(x);
    const subId = [...square.subs.keys()][0];
    // an attacker-made customer tagged with x's subject, same plan: not in our stored set
    square.customers.push({ id: "EVILCUST", reference_id: who(x).subject });
    square.sub(subId).customer_id = "EVILCUST";
    await webhookPOST(signed(subEvent("subscription.updated", subId)));
    expect(await getRecordForSubject(who(x).subject)).toBeNull();
    // a subscription with no pending intent at all
    const y = fresh();
    await subscribeAs(y);
    const other = square.handle("POST", "/v2/subscriptions", { customer_id: square.customers.find((c) => c.reference_id === who(y).subject)!.id, card_id: "c", plan_variation_id: VAR.A, start_date: todayIn(), timezone: SUB_TZ }).json.subscription.id;
    await webhookPOST(signed(subEvent("subscription.updated", other)));
    expect(await getRecord(other)).toBeNull();
  });
});

describe("reconcile route", () => {
  beforeEach(freshSetup);
  const r = (headers: Record<string, string> = {}) => new Request(`https://${HOST}/api/subscriptions/reconcile`, { headers });
  it("401 without a key; the seat secret opens it and it refreshes every record", async () => {
    operatorOk = false;
    expect((await reconcileGET(r())).status).toBe(401);
    expect((await reconcileGET(r({ "x-seat-secret": "wrong" }))).status).toBe(401);
    const a = fresh(), b = fresh();
    await subscribeAs(a); await subscribeAs(b);
    const ids = [(await getRecordForSubject(who(a).subject))!.subscriptionId, (await getRecordForSubject(who(b).subject))!.subscriptionId];
    square.sub(ids[0]).charged_through_date = addMonths(todayIn(), 2);
    const res = await j(await reconcileGET(r({ "x-seat-secret": process.env.SEAT_SECRET! })));
    expect(res.status).toBe(200);
    expect(res.body.checked).toBeGreaterThanOrEqual(2);
    expect((await getEntitlement(who(a).subject))!.expiresAtMs).toBe(endOfDayMs(addMonths(todayIn(), 2)));
  });
});
