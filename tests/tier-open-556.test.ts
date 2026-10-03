/* eslint-disable @typescript-eslint/no-explicit-any -- the fake Square speaks loose JSON */
import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";
import { promises as fs } from "fs";
import path from "path";
import { isolateCwd } from "./helpers/isolate-cwd";

/**
 * T-556: a "Coming soon" membership stays closed. ONE signal decides it:
 * the membership's own store item (live and not comingSoon). Pins the
 * helper, the join and upgrade guards (409 not_open, zero Square calls),
 * the filtered upgrades list, the store page join-box condition and the
 * words.
 */

const { cleanup } = isolateCwd("oc-tier556-");
process.env.SEAT_SECRET = "test-seat-secret-556";
process.env.SQUARE_ACCESS_TOKEN = "sandbox-token-never-logged";
process.env.SQUARE_LOCATION_ID = "LOC1";
process.env.SQUARE_ENVIRONMENT = "sandbox";
delete process.env.KV_REST_API_URL;
delete process.env.KV_REST_API_TOKEN;
delete process.env.REDIS_URL;

type Fake = { status?: string; comingSoon?: boolean } | "missing" | "throws";
const shelf: Record<string, Fake> = {};
vi.mock("@/lib/store", async (orig) => {
  const real = (await orig()) as any;
  return {
    ...real,
    getItem: async (id: string) => {
      const f = shelf[id];
      if (f === "throws") throw new Error("catalog down");
      if (!f || f === "missing") return null;
      return { id, status: "live", ...f };
    },
  };
});

import { makeMemberToken } from "@/lib/member-auth";
import { saveSiteConfig } from "@/lib/site-config";
import { savePlanMap } from "@/lib/subscriptions";
import { tierOpenForJoin } from "@/lib/tier-open";
import { errorWords } from "@/lib/subscription-ui";
import { POST as subscribePOST, GET as subscriptionGET } from "@/app/api/member/subscription/route";
import { POST as upgradePOST } from "@/app/api/member/subscription/upgrade/route";

let calls = 0;
beforeAll(() => {
  vi.stubGlobal("fetch", async () => {
    calls++;
    return new Response(JSON.stringify({ errors: [{ code: "NOT_FOUND" }] }), { status: 404 });
  });
});
afterAll(() => { vi.unstubAllGlobals(); cleanup(); });

const HOST = "example.test";
let seq = 0;
const fresh = () => `t556x${++seq}${Date.now().toString(36)}`;
const cookieFor = (n: string) => `pa-fren=${makeMemberToken(`${n}@example.org`, "email")}`;
function req(p: string, n: string, body?: unknown) {
  const headers: Record<string, string> = { host: HOST, "content-type": "application/json", cookie: cookieFor(n) };
  if (body !== undefined) headers.origin = `https://${HOST}`;
  return new Request(`https://${HOST}${p}`, { method: body === undefined ? "GET" : "POST", headers, body: body === undefined ? undefined : JSON.stringify(body) });
}
const j = async (r: Response) => ({ status: r.status, body: (await r.json()) as any });
const setShelf = (a: Fake, b: Fake, c: Fake) => {
  for (const k of Object.keys(shelf)) delete shelf[k];
  shelf["weekly-intuitive"] = a; shelf["observer"] = b; shelf["evening-star"] = c;
};

beforeEach(async () => {
  calls = 0;
  await saveSiteConfig({ features: { subscriptions: true } });
  await savePlanMap({ tiers: { A: { standard: "VARIATION_A_STD" }, B: { standard: "VARIATION_B_STD" }, C: { standard: "VARIATION_C_STD" } } });
});

describe("tierOpenForJoin", () => {
  it("true for a live item", async () => {
    setShelf({}, {}, {});
    expect(await tierOpenForJoin("A")).toBe(true);
  });
  it("false for comingSoon", async () => {
    setShelf({}, { comingSoon: true }, {});
    expect(await tierOpenForJoin("B")).toBe(false);
  });
  it("false for a non-live status", async () => {
    setShelf({ status: "hidden" }, { status: "sold-out" }, { status: "draft" });
    expect(await tierOpenForJoin("A")).toBe(false);
    expect(await tierOpenForJoin("B")).toBe(false);
    expect(await tierOpenForJoin("C")).toBe(false);
  });
  it("false when the item is missing", async () => {
    setShelf({}, "missing", {});
    expect(await tierOpenForJoin("B")).toBe(false);
  });
  it("false when getItem throws", async () => {
    setShelf({}, "throws", {});
    expect(await tierOpenForJoin("B")).toBe(false);
  });
});

describe("the member routes, switch ON", () => {
  it("join to a coming soon tier is 409 not_open with zero Square calls", async () => {
    setShelf({}, { comingSoon: true }, { comingSoon: true });
    const n = fresh();
    for (const tier of ["B", "C"]) {
      const r = await j(await subscribePOST(req("/api/member/subscription", n, { tier, variant: "standard", cardToken: "cnon:card-nonce-ok" })));
      expect(r.status).toBe(409);
      expect(r.body.code).toBe("not_open");
      expect(r.body.ok).toBe(false);
    }
    expect(calls).toBe(0);
  });

  it("join to an open tier is not stopped by the guard", async () => {
    setShelf({}, { comingSoon: true }, { comingSoon: true });
    const r = await j(await subscribePOST(req("/api/member/subscription", fresh(), { tier: "A", variant: "standard", cardToken: "cnon:card-nonce-ok" })));
    expect(r.body.code).not.toBe("not_open");
    expect(r.status).not.toBe(409);
    expect(calls).toBeGreaterThan(0);
  });

  it("upgrade to a coming soon tier is 409 not_open with zero Square calls", async () => {
    setShelf({}, { comingSoon: true }, { comingSoon: true });
    const r = await j(await upgradePOST(req("/api/member/subscription/upgrade", fresh(), { tier: "B" })));
    expect(r.status).toBe(409);
    expect(r.body.code).toBe("not_open");
    expect(calls).toBe(0);
  });

  it("upgrade to an open tier passes the guard", async () => {
    setShelf({}, {}, { comingSoon: true });
    const r = await j(await upgradePOST(req("/api/member/subscription/upgrade", fresh(), { tier: "B" })));
    expect(r.body.code).not.toBe("not_open");
  });

  it("a member with no subscription still gets a null view", async () => {
    setShelf({}, {}, {});
    const r = await j(await subscriptionGET(req("/api/member/subscription", fresh())));
    expect(r.status).toBe(200);
    expect(r.body.subscription).toBeNull();
  });
});

describe("memberView: upgrades lists only open higher tiers", () => {
  const rec: any = { tier: "A", status: "active", variant: "standard" };
  it("only the open ones", async () => {
    const { memberView } = await import("@/lib/subscription-route");
    setShelf({}, { comingSoon: true }, {});
    const v = await memberView(rec);
    expect(v!.upgrades.map((u) => u.tier)).toEqual(["C"]);
    setShelf({}, { comingSoon: true }, { status: "hidden" });
    expect((await memberView(rec))!.upgrades).toEqual([]);
  });
  it("all of them when all are open; null stays null", async () => {
    const { memberView } = await import("@/lib/subscription-route");
    setShelf({}, {}, {});
    expect((await memberView(rec))!.upgrades.map((u) => u.tier)).toEqual(["B", "C"]);
    expect(await memberView(null)).toBeNull();
  });
});

describe("page and words", () => {
  it("the store item page shows the join box only for an open item", async () => {
    const src = await fs.readFile(path.join(__dirname, "..", "src/app/store/[id]/page.tsx"), "utf8");
    expect(src).toContain("switches.features.subscriptions && tierPageBySlug(item.id) && isPurchasable(item) ?");
    expect(src).toMatch(/import \{[^}]*\bisPurchasable\b[^}]*\} from "@\/lib\/store"/);
  });
  it("errorWords knows not_open", () => {
    expect(errorWords({ code: "not_open" })).toBe("This membership is not open yet. Please check back soon.");
  });
});
