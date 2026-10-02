import fs from "fs";
import { describe, it, expect } from "vitest";
import {
  abbreviateSubject, cancelConfirmWords, deskChip, deskStatus, deskTone, errorWords, joinStage, monthlyLine,
  offerLineFromPhases, panelFacts, pickOffer, squareSdkUrl, subscriptionOwnsNotice, upgradeLine, type SubView,
} from "../src/lib/subscription-ui";
import { cancelCall, getJoinConfig, getSubscription, subscribeCall, undoCancelCall, upgradeCall } from "../src/lib/subscription-client";
import { offersFrom } from "../src/lib/subscription-offers";
import { mapBody } from "../src/components/console/SubscriptionsDesk";

const DAY = 86_400_000;
const T0 = Date.UTC(2026, 10, 2, 20); // Nov 2, 2026
const view = (o: Partial<SubView> = {}): SubView => ({
  status: "active", tier: "A", tierName: "Weekly Intuitive", chargedThroughMs: T0, expiresAtMs: T0, canceledAtMs: null,
  pendingSwapTier: null, upgrades: [{ tier: "B", name: "Observer", differenceCents: 2200 }], ...o,
});

describe("copy", () => {
  it("the promise line", () => expect(monthlyLine(33)).toBe("$33 a month. Renews monthly. Cancel any time."));
  it("every route code has human words, no code leaks, no em dash or arrow", () => {
    const codes = ["already_subscribed", "use_upgrade", "offer_closed", "offer_used", "plan_not_configured", "email_required", "card_declined", "payment_failed", "undo_cancel_first", "payment_needed", "store_unavailable"];
    for (const c of codes) {
      const w = errorWords({ code: c });
      expect(w.length).toBeGreaterThan(20);
      expect(w).not.toContain(c);
      expect(w).not.toMatch(/[—→]/);
    }
  });
  it("falls back on HTTP status then a generic line; a dead network is plain", () => {
    expect(errorWords({ httpStatus: 429 })).toMatch(/Too many/);
    expect(errorWords({ code: "weird", httpStatus: 500 })).toMatch(/Nothing was charged/);
    expect(errorWords(null)).toMatch(/connection/);
  });
  it("square sdk host follows the environment", () => {
    expect(squareSdkUrl("sandbox")).toBe("https://sandbox.web.squarecdn.com/v1/square.js");
    expect(squareSdkUrl("production")).toBe("https://web.squarecdn.com/v1/square.js");
    expect(squareSdkUrl(undefined)).toBe("https://sandbox.web.squarecdn.com/v1/square.js");
  });
  it("upgrade and cancel words", () => {
    expect(upgradeLine({ name: "Observer", differenceCents: 2200 }, 55)).toBe("Pay $22 now for the rest of this month. Then $55 a month.");
    expect(cancelConfirmWords(T0)).toContain("You keep access until November 2, 2026");
  });
});

describe("join stage", () => {
  const base = { checked: true, signedIn: true, configOk: true as boolean | null, subscription: null as SubView | null | undefined };
  it("walks signed out, loading, ready, already, off", () => {
    expect(joinStage({ ...base, checked: false })).toBe("checking");
    expect(joinStage({ ...base, signedIn: false })).toBe("signed-out");
    expect(joinStage({ ...base, configOk: null })).toBe("checking");
    expect(joinStage({ ...base, subscription: undefined })).toBe("checking");
    expect(joinStage({ ...base, configOk: false })).toBe("off");
    expect(joinStage(base)).toBe("ready");
    expect(joinStage({ ...base, subscription: view() })).toBe("already");
    expect(joinStage({ ...base, subscription: view({ status: "canceled" }) })).toBe("ready");
  });
  it("offers: first-time members get an open promo with words; everyone else the regular price", () => {
    expect(pickOffer(["standard", "B"], { B: "$22 a month." }, false)).toEqual({ variant: "B", line: "$22 a month." });
    expect(pickOffer(["standard", "B"], { B: "x" }, true)).toEqual({ variant: "standard", line: null });
    expect(pickOffer(["standard"], { B: "x" }, false).variant).toBe("standard");
    expect(pickOffer(["standard", "A"], {}, false).variant).toBe("standard");
  });
  it("offer sentences come from Square's phases", () => {
    expect(offerLineFromPhases([{ ordinal: 0, periods: 1, priceCents: 0 }, { ordinal: 1, periods: null, priceCents: 3300 }])).toBe("Free for your first month, then $33 a month.");
    expect(offerLineFromPhases([{ ordinal: 0, periods: 1, priceCents: 1650 }, { ordinal: 1, periods: null, priceCents: 3300 }])).toBe("$16.50 for your first month, then $33 a month.");
    expect(offerLineFromPhases([{ ordinal: 0, periods: null, priceCents: 2200 }])).toBe("$22 a month.");
    expect(offerLineFromPhases([{ ordinal: 0, periods: null, priceCents: null }])).toBeNull();
  });
  it("offersFrom only words open, non-standard, mapped variants", () => {
    const plans = [{ planId: "p", name: "P", variations: [{ id: "VAR_FREE_1", name: "v", phases: [{ ordinal: 0, cadence: "MONTHLY", periods: 1, pricing: "RELATIVE" as const, priceCents: 0, discountIds: [] }, { ordinal: 1, cadence: "MONTHLY", periods: null, pricing: "RELATIVE" as const, priceCents: 3300, discountIds: [] }] }] }];
    const map = { tiers: { A: { standard: "VAR_FREE_1", A: "VAR_FREE_1", B: "VAR_FREE_1" } }, open: ["standard", "A"] };
    expect(offersFrom(map, plans)).toEqual({ A: { A: "Free for your first month, then $33 a month." } });
  });
});

describe("/me panel state", () => {
  it("active: renews on a date, can cancel and upgrade", () => {
    const f = panelFacts(view())!;
    expect(f.stateLine).toBe("Renews on November 2, 2026");
    expect([f.canCancel, f.canUndo, f.canUpgrade]).toEqual([true, false, true]);
  });
  it("cancelling: ends on a date, can keep it, cannot upgrade", () => {
    const f = panelFacts(view({ status: "cancelling", canceledAtMs: T0 + 3 * DAY }))!;
    expect(f.stateLine).toBe("Ends on November 5, 2026");
    expect([f.canCancel, f.canUndo, f.canUpgrade]).toEqual([false, true, false]);
  });
  it("past due: payment needed, says the access date once", () => {
    const f = panelFacts(view({ status: "past_due", expiresAtMs: T0 + 3 * DAY }))!;
    expect(f.stateLine).toBe("Payment needed");
    expect(f.note).toContain("November 5, 2026");
    expect(f.canUpgrade).toBe(false);
  });
  it("cancelled with paid time left: says when it ends, no controls, owns the notice", () => {
    const v = view({ status: "canceled", expiresAtMs: T0 + 5 * DAY });
    const f = panelFacts(v, T0)!;
    expect(f.stateLine).toBe("Ends on November 7, 2026");
    expect([f.canCancel, f.canUndo, f.canUpgrade]).toEqual([false, false, false]);
    expect(subscriptionOwnsNotice(v, T0)).toBe(true);
    expect(subscriptionOwnsNotice(v, T0 + 6 * DAY)).toBe(false);
  });
  it("ended or refunded: no panel, and the T-539 notice keeps the story (no duplicate)", () => {
    expect(panelFacts(view({ status: "canceled", expiresAtMs: T0 - DAY }), T0)).toBeNull();
    expect(subscriptionOwnsNotice(view({ status: "refunded" }), T0)).toBe(false);
    expect(subscriptionOwnsNotice(null)).toBe(false);
    expect(subscriptionOwnsNotice(undefined)).toBe(false);
    expect(subscriptionOwnsNotice(view(), T0)).toBe(true);
    expect(subscriptionOwnsNotice(view({ status: "cancelling" }), T0)).toBe(true);
  });
});

describe("Money desk rows", () => {
  it("abbreviates subjects and says one state with its date", () => {
    expect(abbreviateSubject("averyveryverylonghandle@email")).toBe("averyv...ndle@email");
    expect(abbreviateSubject("love@onecocreation")).toBe("love@onecocreation");
    expect(abbreviateSubject("shots@example.com@email")).toBe("sh...@example.com");
    expect(deskStatus("past_due")).toBe("past due");
    expect(deskStatus("refunded")).toBe("ended");
    expect(deskChip("active", T0)).toBe("Active, renews Nov 2, 2026");
    expect(deskChip("cancelling", T0, T0, T0 + 3 * DAY)).toBe("Cancelling, ends Nov 5, 2026");
    expect(deskChip("past_due", T0, T0 + 3 * DAY)).toBe("Past due, access to Nov 5, 2026");
    expect(deskChip("canceled", T0)).toBe("Ended Nov 2, 2026");
    expect(deskTone("past due")).toBe("rose");
  });
  it("the plan map body drops empty slots", () => {
    expect(mapBody({ tiers: { A: { standard: "ABCDEFGH1", A: undefined }, B: {} }, open: [] })).toEqual({ tiers: { A: { standard: "ABCDEFGH1" } }, open: ["standard"] });
  });
});

describe("route-call wiring (fake fetch)", () => {
  function fake(status: number, json: unknown) {
    const calls: { url: string; init?: RequestInit }[] = [];
    const f = (async (url: string, init?: RequestInit) => { calls.push({ url, init }); return { ok: status < 400, status, json: async () => json } as Response; }) as unknown as typeof fetch;
    return { f, calls };
  }
  it("subscribe posts only tier, variant key, token, email, verification; same-origin", async () => {
    const { f, calls } = fake(200, { ok: true, subscription: view() });
    const r = await subscribeCall(f, { tier: "A", variant: "B", cardToken: "cnon:abc123", email: "a@b.co", verificationToken: "ver" });
    expect(r?.ok).toBe(true);
    expect(calls[0].url).toBe("/api/member/subscription");
    expect(calls[0].init?.method).toBe("POST");
    expect(calls[0].init?.credentials).toBe("same-origin");
    expect(JSON.parse(calls[0].init?.body as string)).toEqual({ tier: "A", variant: "B", cardToken: "cnon:abc123", email: "a@b.co", verificationToken: "ver" });
  });
  it("the regular variant is left out of the body", async () => {
    const { f, calls } = fake(200, { ok: true });
    await subscribeCall(f, { tier: "B", variant: "standard", cardToken: "cnon:abc123" });
    expect(JSON.parse(calls[0].init?.body as string)).toEqual({ tier: "B", cardToken: "cnon:abc123" });
  });
  it("a refusal keeps its code and status", async () => {
    const { f } = fake(402, { ok: false, code: "card_declined", reason: "x" });
    const r = await subscribeCall(f, { tier: "A", cardToken: "cnon:abc123" });
    expect(r).toMatchObject({ ok: false, code: "card_declined", httpStatus: 402 });
  });
  it("cancel, undo and upgrade hit their routes", async () => {
    const a = fake(200, { ok: true }); await cancelCall(a.f); expect(a.calls[0].url).toBe("/api/member/subscription/cancel");
    const b = fake(200, { ok: true }); await undoCancelCall(b.f); expect(b.calls[0].url).toBe("/api/member/subscription/undo-cancel");
    const c = fake(200, { ok: true }); await upgradeCall(c.f, "C");
    expect(c.calls[0].url).toBe("/api/member/subscription/upgrade");
    expect(JSON.parse(c.calls[0].init?.body as string)).toEqual({ tier: "C" });
  });
  it("GET: null, off (404), error; network failure is null not a throw", async () => {
    expect(await getSubscription(fake(200, { ok: true, subscription: null }).f)).toEqual({ subscription: null });
    expect(await getSubscription(fake(404, { ok: false }).f)).toEqual({ off: true });
    expect(await getSubscription(fake(500, { ok: false }).f)).toEqual({ error: true });
    const boom = (async () => { throw new Error("net"); }) as unknown as typeof fetch;
    expect(await getSubscription(boom)).toEqual({ error: true });
    expect(await subscribeCall(boom, { tier: "A", cardToken: "cnon:abc123" })).toBeNull();
  });
  it("config: off at 404, shaped otherwise", async () => {
    expect(await getJoinConfig(fake(404, {}).f)).toBe("off");
    const c = await getJoinConfig(fake(200, { ok: true, environment: "sandbox", applicationId: "sandbox-sq0idb-x", locationId: "L1", open: ["standard"], offers: {} }).f);
    expect(c).toMatchObject({ environment: "sandbox", applicationId: "sandbox-sq0idb-x", locationId: "L1" });
    expect(await getJoinConfig(fake(503, { ok: false }).f)).toBeNull();
  });
});

describe("house laws in the new files", () => {
  const files = ["src/components/store/JoinWithCard.tsx", "src/components/me/MembershipPanel.tsx", "src/components/console/SubscriptionsDesk.tsx", "src/lib/subscription-ui.ts"];
  for (const f of files) {
    it(`${f}: no em dash, no arrow or emoji on a button label (payment button may carry the card)`, () => {
      const src = fs.readFileSync(f, "utf8");
      expect(src).not.toMatch(/—/);
      expect(src).not.toMatch(/→/);
    });
  }
  it("the config route never returns the access token", () => {
    const src = fs.readFileSync("src/app/api/member/subscription/config/route.ts", "utf8");
    expect(src).not.toMatch(/accessToken/);
  });
});
