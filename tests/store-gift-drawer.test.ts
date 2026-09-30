import { describe, it, expect } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import fs from "node:fs";
import path from "node:path";
import type { StoreItem } from "@/lib/store";
import { shelfGroups } from "@/components/store/ShelfSection";
import { relatedItems } from "@/components/store/RelatedItems";
import { sectionForItem } from "@/lib/store-sections";
import { JAR_ITEMS } from "@/lib/jars";

/**
 * TASK-498 (block 969,095+ · R-072, settled Monday — the Admiral
 * [00:44:13–00:44:38]: the "gifts of gratitude" item under Support "is
 * supposed to be gone"; tip items live ONLY under Store, in their own
 * drop-down at the bottom). These pins witness the move:
 *
 *  1. /support's page source carries no jar anything (no TipJar, no
 *     jarsOpen, no "Gifts of Gratitude") — the room stays, the jars left.
 *  2. /store mounts the GiftDrawer AFTER the shelf sections, gated the
 *     same double way as before (jarsOpen() AND live shelf items).
 *  3. shelfGroups never returns a JAR_ITEMS id in any group — the jars
 *     leave the shelf grid (they rode Meditations by kind before).
 *  4. relatedItems excludes jar ids in BOTH directions — a jar is never
 *     related to anything and nothing is ever related to a jar.
 *  5. sectionForItem maps the three jar ids to the gifts pseudo-section
 *     ({anchor: "gifts", pill: "Gifts"}) and falls through to the one
 *     kind→section map for everything else.
 *  6. the drawer renders NOTHING with an empty liveJars list
 *     (derive-or-dash — a rail-off or all-hidden state shows no drawer).
 *  7. the stale location words moved: the money room's jar title points
 *     at /store, and the /support Puck seed's two jar bands are gone
 *     (so Love's next studio publish cannot resurrect the jars).
 */

const JAR_IDS = Object.values(JAR_ITEMS);

function readSrc(rel: string): string {
  return fs.readFileSync(path.join(process.cwd(), rel), "utf8");
}

function item(over: Partial<StoreItem>): StoreItem {
  return {
    id: "x",
    schemaVersion: 2,
    title: "X",
    blurb: "words",
    images: [],
    kind: "digital",
    price: {},
    fulfillment: "digital",
    status: "live",
    ...over,
  };
}

describe("1. /support page source — the jars left the room (R-072)", () => {
  it("no TipJar, no jarsOpen, no liveJarKeys, no Gifts of Gratitude in the page source", () => {
    const src = readSrc("src/app/support/page.tsx");
    expect(src).not.toContain("TipJar");
    expect(src).not.toContain("jarsOpen");
    expect(src).not.toContain("liveJarKeys");
    expect(src).not.toContain("Gifts of Gratitude");
    expect(src).not.toContain("Choose the jar it fills");
  });
});

describe("2. /store page source — the drawer mounts below the shelf, double-gated", () => {
  it("GiftDrawer mounts AFTER the sections map, gated on jarsOpen() and live jars", () => {
    const src = readSrc("src/app/store/page.tsx");
    expect(src).toContain('import GiftDrawer from "@/components/store/GiftDrawer"');
    expect(src).toContain("jarsOpen()");
    expect(src).toContain("liveJarKeys()");
    const sectionsAt = src.indexOf("groups.map(");
    const drawerAt = src.indexOf("<GiftDrawer");
    expect(sectionsAt).toBeGreaterThan(-1);
    expect(drawerAt).toBeGreaterThan(sectionsAt);
    expect(src).toMatch(/\{jars\.length > 0 && <GiftDrawer liveJars=\{jars\} \/>\}/);
  });
});

describe("3. shelfGroups — a jar id never lands in any shelf group", () => {
  it("the three jar items (digital kind) are excluded from every group; a real meditation stays", () => {
    const items = [
      ...JAR_IDS.map((id) => item({ id })),
      item({ id: "worthy", title: "Worthy", price: { sats: 21000 } }),
    ];
    const groups = shelfGroups(items);
    for (const g of groups) {
      for (const i of g.items) {
        expect(JAR_IDS).not.toContain(i.id);
      }
    }
    expect(groups.find((g) => g.anchor === "meditations")!.items.map((i) => i.id)).toEqual(["worthy"]);
  });
});

describe("4. relatedItems — a jar is never related, and nothing is related to a jar", () => {
  it("jars do not ride a meditation's related row", () => {
    const all = [
      ...JAR_IDS.map((id) => item({ id })),
      item({ id: "wakeup", title: "Wakeup" }),
      item({ id: "worthy", title: "Worthy" }),
    ];
    const related = relatedItems(all, item({ id: "wakeup" }));
    expect(related.map((i) => i.id)).toEqual(["worthy"]);
  });

  it("a jar's own page gets no related row from same-kind items", () => {
    const all = [item({ id: "wakeup" }), item({ id: "worthy" })];
    const related = relatedItems(all, item({ id: JAR_ITEMS.love }));
    expect(related).toEqual([]);
  });
});

describe("5. sectionForItem — jars crumb to the gifts pseudo-section, everything else falls through", () => {
  it("the three jar ids map to {anchor: gifts, pill: Gifts}", () => {
    for (const id of JAR_IDS) {
      expect(sectionForItem({ id, kind: "digital" })).toEqual({ anchor: "gifts", pill: "Gifts" });
    }
  });

  it("a non-jar digital item still resolves via the one kind→section map", () => {
    expect(sectionForItem({ id: "worthy", kind: "digital" })).toEqual(
      expect.objectContaining({ anchor: "meditations", pill: "Meditations" }),
    );
  });

  it("a kind with no shelf home (retreat) still gets no crumb", () => {
    expect(sectionForItem({ id: "some-retreat", kind: "retreat" })).toBeUndefined();
  });
});

describe("6. the drawer — derive-or-dash on an empty jar list", () => {
  it("renders nothing when liveJars is empty (rail off or all items hidden)", async () => {
    const { default: GiftDrawer } = await import("@/components/store/GiftDrawer");
    expect(renderToStaticMarkup(createElement(GiftDrawer, { liveJars: [] }))).toBe("");
  });
});

describe("7. the stale location words — money room and the /support Puck seed", () => {
  it("the money room's jar title no longer points at /support", () => {
    const src = readSrc("src/app/a/money/page.tsx");
    expect(src).not.toContain("the doors live on /support");
    expect(src).toContain("the doors live on /store");
  });

  it("the /support seed carries no jar bands, but the wild-doors note survives", () => {
    const src = readSrc("src/lib/puck-seeds.ts");
    expect(src).not.toContain('su.heading("Gifts of Gratitude"');
    expect(src).not.toContain("Where Pay It Forward Flows");
    expect(src).not.toContain("── live tip jars stay code-side ──");
    expect(src).toContain("── live wild doors stay code-side (beasts grow out of their cells on hover) ──");
  });
});
