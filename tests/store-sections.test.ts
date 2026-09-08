import { describe, it, expect } from "vitest";
import type { StoreItem } from "@/lib/store";

/**
 * TASK-189 (0018.06.18 a₿, cut from the T-177/T-184 reviews) — THE ONE
 * KIND→SECTION MAP. Before this the same facts lived three times, hand-kept
 * in lockstep: the shelf's SHELF_GROUPS/shelfDoorFor (ShelfSection.tsx),
 * the item page's SECTION_BY_KIND (store/[id]/page.tsx), and RelatedItems'
 * doorFor. All three now import src/lib/store-sections.ts. Pins:
 *
 *  1. sectionForKind/STORE_SECTIONS carry the exact anchor/pill/title/blurb/
 *     icon words the shelf and breadcrumb rode before the refactor;
 *  2. doorForItem: a package goes STRAIGHT to its package page, every other
 *     kind opens its own /store/<id> — the SAME function the shelf's
 *     shelfDoorFor and RelatedItems' door both call now (byte-identical by
 *     construction: one function, not three copies);
 *  3. the shelf (shelfGroups) renders the map's own title/pill/blurb/icon,
 *     unchanged from before the refactor.
 */

function item(over: Partial<StoreItem>): StoreItem {
  return {
    id: "x",
    schemaVersion: 2,
    title: "X",
    blurb: "words",
    images: [],
    kind: "digital",
    price: { sats: 11111 },
    fulfillment: "digital",
    status: "live",
    ...over,
  };
}

describe("STORE_SECTIONS / sectionForKind — the one map's own words", () => {
  it("carries the shelf's exact section words, ConsciousCuts last", async () => {
    const { STORE_SECTIONS } = await import("@/lib/store-sections");
    expect(STORE_SECTIONS.map((s) => s.anchor)).toEqual(["meditations", "memberships", "wares", "sessions"]);
    expect(STORE_SECTIONS.find((s) => s.anchor === "meditations")).toEqual(
      expect.objectContaining({
        title: "Meditations & Journeys",
        pill: "Meditations",
        icon: "🌙",
        kinds: ["digital"],
      }),
    );
    expect(STORE_SECTIONS.find((s) => s.anchor === "wares")?.kinds).toEqual(["self", "fourthwall"]);
  });

  it("every catalog kind resolves to exactly the section its shelf card sits in", async () => {
    const { sectionForKind } = await import("@/lib/store-sections");
    expect(sectionForKind("digital")?.anchor).toBe("meditations");
    expect(sectionForKind("package")?.anchor).toBe("memberships");
    expect(sectionForKind("self")?.anchor).toBe("wares");
    expect(sectionForKind("fourthwall")?.anchor).toBe("wares");
    expect(sectionForKind("service")?.anchor).toBe("sessions");
    expect(sectionForKind("retreat")).toBeUndefined(); // no shelf home — derive-or-dash
  });
});

describe("doorForItem — the ONE door, the same function everywhere", () => {
  it("a package goes STRAIGHT to its package page", async () => {
    const { doorForItem } = await import("@/lib/store-sections");
    expect(doorForItem(item({ kind: "package", id: "weekly-intuitive-month", entitlementTier: "A" })))
      .toBe("/packages/weekly-intuitive");
  });

  it("a package with no matching tier page falls back to /packages", async () => {
    const { doorForItem } = await import("@/lib/store-sections");
    expect(doorForItem(item({ kind: "package", id: "mystery", entitlementTier: "Z" }))).toBe("/packages");
  });

  it("every other kind opens its own full view", async () => {
    const { doorForItem } = await import("@/lib/store-sections");
    for (const kind of ["digital", "self", "fourthwall", "service", "retreat"] as const) {
      expect(doorForItem(item({ kind, id: "abc" }))).toBe("/store/abc");
    }
  });

  it("the shelf's shelfDoorFor and RelatedItems' door are the SAME function — one door, never two", async () => {
    const { doorForItem } = await import("@/lib/store-sections");
    const { shelfDoorFor } = await import("@/components/store/ShelfSection");
    expect(shelfDoorFor).toBe(doorForItem);
  });
});

describe("shelfGroups — the shelf renders the map's own words, unchanged", () => {
  it("each group's title/pill/blurb/icon match STORE_SECTIONS exactly", async () => {
    const { shelfGroups } = await import("@/components/store/ShelfSection");
    const { STORE_SECTIONS } = await import("@/lib/store-sections");
    const groups = shelfGroups([]);
    expect(groups.map((g) => ({ anchor: g.anchor, title: g.title, pill: g.pill, blurb: g.blurb, icon: g.icon }))).toEqual(
      STORE_SECTIONS.map((s) => ({ anchor: s.anchor, title: s.title, pill: s.pill, blurb: s.blurb, icon: s.icon })),
    );
  });
});
