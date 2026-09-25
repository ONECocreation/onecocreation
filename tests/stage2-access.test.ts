import { describe, it, expect, vi, beforeEach } from "vitest";
import { readFileSync } from "node:fs";
import type { StoreItem } from "@/lib/store";
import { getItem } from "@/lib/store";
import { decideStage2, stage2PackageDoor, STAGE2_MIN_TIER } from "@/lib/stage2-access";

/**
 * TASK-439 (block 968,218, Amendment 1 of block 968,222; the floor RAISED
 * by TASK-465, block 968,561) — the ONE Stage 2 access decision, pure
 * pins. `decideStage2` over the full matrix; `STAGE2_MIN_TIER` is the only
 * place the minimum is written — was ruling 1's "any paid package …
 * weekly intuitive … gets added to all" (tier A), now the Admiral's block
 * 968,561: "the playground is for members of the observer or better
 * package" (tier B). The package door's words/href come from the house's
 * own tables, and its `week` offer (Amendment A1) reads the STORE's live
 * item, sale-aware, fail-optional — TASK-465 moves that item to Observer's
 * own `observer-one-week`, never Weekly Intuitive's `weekly-one-week`.
 *
 * `@/lib/store`'s `getItem` is the one mocked boundary (the brief's own
 * instruction); everything else runs real.
 */

vi.mock("@/lib/store", () => ({ getItem: vi.fn() }));
const mockGetItem = vi.mocked(getItem);

function weekItem(over: Partial<StoreItem>): StoreItem {
  return {
    id: "observer-one-week",
    schemaVersion: 2,
    title: "Observer — One Week Pass",
    blurb: "one week of the Observer package",
    images: [],
    kind: "package",
    price: { fiat: { amount: 2200, currency: "USD" }, sats: 22_222 },
    fulfillment: "package",
    status: "live",
    ...over,
  };
}

beforeEach(() => {
  mockGetItem.mockReset();
  mockGetItem.mockResolvedValue(null);
});

describe("STAGE2_MIN_TIER — ruling A/B (block 968,561), written once", () => {
  it("is tier B (Observer) — RAISED from tier A (Weekly Intuitive) by TASK-465", () => {
    expect(STAGE2_MIN_TIER).toBe("B");
  });
});

describe("decideStage2 — the full matrix, via roomGate (never re-implemented)", () => {
  it("not published -> hidden for EVERY visitor, signed in or not, any tier", () => {
    expect(decideStage2(false, { signedIn: false, tier: null })).toBe("hidden");
    expect(decideStage2(false, { signedIn: true, tier: null })).toBe("hidden");
    expect(decideStage2(false, { signedIn: true, tier: "A" })).toBe("hidden");
    expect(decideStage2(false, { signedIn: true, tier: "B" })).toBe("hidden");
    expect(decideStage2(false, { signedIn: true, tier: "C" })).toBe("hidden");
  });

  it("published + anonymous -> signin (never package, never open)", () => {
    expect(decideStage2(true, { signedIn: false, tier: null })).toBe("signin");
  });

  it("published + signed in with no tier -> package", () => {
    expect(decideStage2(true, { signedIn: true, tier: null })).toBe("package");
  });

  it("published + tier A alone -> package (TASK-465: A no longer satisfies the raised floor)", () => {
    expect(decideStage2(true, { signedIn: true, tier: "A" })).toBe("package");
  });

  it("published + tiers B and C -> open (the progressive ladder satisfies the Observer floor)", () => {
    expect(decideStage2(true, { signedIn: true, tier: "B" })).toBe("open");
    expect(decideStage2(true, { signedIn: true, tier: "C" })).toBe("open");
  });
});

describe("stage2PackageDoor — the house's own words, derived-or-dashed", () => {
  it("names Observer and points at its own tier page (TASK-465: was Weekly Intuitive)", async () => {
    const door = await stage2PackageDoor();
    expect(door.name).toBe("Observer");
    expect(door.href).toBe("/packages/observer");
  });

  it("a live observer-one-week item with a fiat price -> the week offer carries the STORE's number (Amendment A1)", async () => {
    mockGetItem.mockResolvedValue(weekItem({}));
    const door = await stage2PackageDoor();
    expect(door.week).toEqual({ itemId: "observer-one-week", price: "$22" });
  });

  it("a live item ON SALE -> the week offer reads the sale price, never the list price", async () => {
    mockGetItem.mockResolvedValue(
      weekItem({ sale: { fiat: { amount: 1700, currency: "USD" } } }),
    );
    const door = await stage2PackageDoor();
    expect(door.week).toEqual({ itemId: "observer-one-week", price: "$17" });
  });

  it("a missing item -> week: null, and the door itself is unchanged", async () => {
    mockGetItem.mockResolvedValue(null);
    const door = await stage2PackageDoor();
    expect(door).toEqual({
      name: "Observer",
      href: "/packages/observer",
      week: null,
    });
  });

  it("a hidden item (the pass 'disappeared') -> week: null", async () => {
    mockGetItem.mockResolvedValue(weekItem({ status: "hidden" }));
    expect((await stage2PackageDoor()).week).toBeNull();
  });

  it("a live item with no fiat part -> week: null (never a guessed price)", async () => {
    mockGetItem.mockResolvedValue(weekItem({ price: { sats: 22_222 } }));
    expect((await stage2PackageDoor()).week).toBeNull();
  });

  it("getItem THROWS -> week: null, and name/href still stand (the offer is optional; the door never fails because of it)", async () => {
    mockGetItem.mockRejectedValue(new Error("catalog vault down"));
    const door = await stage2PackageDoor();
    expect(door).toEqual({
      name: "Observer",
      href: "/packages/observer",
      week: null,
    });
  });
});

describe("Amendment A4 source pin — the tier page stops promising the week when the pass isn't on the shelf", () => {
  const PAGE = "src/app/packages/[slug]/page.tsx";

  it("the 'or $11 — one week' line rides page.oneTime && oneTimeLive, never page.oneTime alone", () => {
    const src = readFileSync(PAGE, "utf8");
    expect(src).toContain("page.oneTime && oneTimeLive");
    expect(src).not.toContain("{page.oneTime && (");
  });
});
