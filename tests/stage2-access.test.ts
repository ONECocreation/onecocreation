import { describe, it, expect, vi, beforeEach } from "vitest";
import { readFileSync } from "node:fs";
import type { StoreItem } from "@/lib/store";
import { getItem } from "@/lib/store";
import { decideStage2, stage2PackageDoor, STAGE2_MIN_TIER } from "@/lib/stage2-access";

/**
 * TASK-439 (block 968,218, Amendment 1 of block 968,222) — the ONE Stage 2
 * access decision, pure pins. `decideStage2` over the full matrix;
 * `STAGE2_MIN_TIER` is the only place the minimum is written (ruling 1:
 * "any paid package … weekly intuitive … gets added to all"); the package
 * door's words/href come from the house's own tables, and its `week` offer
 * (Amendment A1) reads the STORE's live item, sale-aware, fail-optional.
 *
 * `@/lib/store`'s `getItem` is the one mocked boundary (the brief's own
 * instruction); everything else runs real.
 */

vi.mock("@/lib/store", () => ({ getItem: vi.fn() }));
const mockGetItem = vi.mocked(getItem);

function weekItem(over: Partial<StoreItem>): StoreItem {
  return {
    id: "weekly-one-week",
    schemaVersion: 2,
    title: "Weekly Zoom — One Week Pass",
    blurb: "one week of the Weekly Intuitive",
    images: [],
    kind: "package",
    price: { fiat: { amount: 1100, currency: "USD" }, sats: 11_111 },
    fulfillment: "package",
    status: "live",
    ...over,
  };
}

beforeEach(() => {
  mockGetItem.mockReset();
  mockGetItem.mockResolvedValue(null);
});

describe("STAGE2_MIN_TIER — ruling 1, written once", () => {
  it("is tier A (Weekly Intuitive), the base every paid package carries", () => {
    expect(STAGE2_MIN_TIER).toBe("A");
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

  it("published + tiers A, B and C -> open (the progressive ladder satisfies the minimum)", () => {
    expect(decideStage2(true, { signedIn: true, tier: "A" })).toBe("open");
    expect(decideStage2(true, { signedIn: true, tier: "B" })).toBe("open");
    expect(decideStage2(true, { signedIn: true, tier: "C" })).toBe("open");
  });
});

describe("stage2PackageDoor — the house's own words, derived-or-dashed", () => {
  it("names Weekly Intuitive and points at its own tier page", async () => {
    const door = await stage2PackageDoor();
    expect(door.name).toBe("Weekly Intuitive");
    expect(door.href).toBe("/packages/weekly-intuitive");
  });

  it("a live weekly-one-week item with a fiat price -> the week offer carries the STORE's number (Amendment A1)", async () => {
    mockGetItem.mockResolvedValue(weekItem({}));
    const door = await stage2PackageDoor();
    expect(door.week).toEqual({ itemId: "weekly-one-week", price: "$11" });
  });

  it("a live item ON SALE -> the week offer reads the sale price, never the list price", async () => {
    mockGetItem.mockResolvedValue(
      weekItem({ sale: { fiat: { amount: 850, currency: "USD" } } }),
    );
    const door = await stage2PackageDoor();
    expect(door.week).toEqual({ itemId: "weekly-one-week", price: "$8.50" });
  });

  it("a missing item -> week: null, and the door itself is unchanged", async () => {
    mockGetItem.mockResolvedValue(null);
    const door = await stage2PackageDoor();
    expect(door).toEqual({
      name: "Weekly Intuitive",
      href: "/packages/weekly-intuitive",
      week: null,
    });
  });

  it("a hidden item (the pass 'disappeared') -> week: null", async () => {
    mockGetItem.mockResolvedValue(weekItem({ status: "hidden" }));
    expect((await stage2PackageDoor()).week).toBeNull();
  });

  it("a live item with no fiat part -> week: null (never a guessed price)", async () => {
    mockGetItem.mockResolvedValue(weekItem({ price: { sats: 11_111 } }));
    expect((await stage2PackageDoor()).week).toBeNull();
  });

  it("getItem THROWS -> week: null, and name/href still stand (the offer is optional; the door never fails because of it)", async () => {
    mockGetItem.mockRejectedValue(new Error("catalog vault down"));
    const door = await stage2PackageDoor();
    expect(door).toEqual({
      name: "Weekly Intuitive",
      href: "/packages/weekly-intuitive",
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
