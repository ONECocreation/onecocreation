import { describe, it, expect } from "vitest";
import { buildDefaultMenu, PAGE_CATALOG } from "@/components/NavMenu";
import { defaultSiteConfig, type SiteConfig } from "@/lib/site-config";

/**
 * TASK-645 (block 975,980) — every page keeps a door (the public page
 * standard, rule 9). The Memberships row had been pointed at the shelf
 * (T-615) and the lion page /memberships lost its only menu row; no test
 * asked. This one does: every page in PAGE_CATALOG whose switches are ON
 * has a row in the built-in menu (a tab's own href or a row under it), or
 * it is named below with the reason it has none.
 */

/** Pages with no row in the built-in menu, each with its reason. A page
    added here must also be named in its lane's DONE note. */
const NO_ROW: Record<string, string> = {
  "/me": "the member's own page; reached from the signed-in name in the header (MEMBER_MENU, door-machine.ts)",
  "/store/memberships": "the shelf's memberships section also sits on /store, the Store tab's own door",
  "/letters": "ruled no door, decision card 13, block 975,993",
};

function allOn(): SiteConfig {
  const c = defaultSiteConfig();
  for (const k of Object.keys(c.features) as (keyof SiteConfig["features"])[]) c.features[k] = true;
  return c;
}

function pageOn(s: SiteConfig, feature: (typeof PAGE_CATALOG)[number]["feature"]): boolean {
  if (!feature) return true;
  const list = Array.isArray(feature) ? feature : [feature];
  return list.every((f) => s.features[f]);
}

function doors(s: SiteConfig): Set<string> {
  const menu = buildDefaultMenu(s);
  return new Set(menu.flatMap((m) => [m.href, ...(m.subs ?? []).map((x) => x.href)]));
}

describe("every switched-on page in PAGE_CATALOG keeps a door (T-645)", () => {
  for (const [name, config] of [["every switch ON", allOn()], ["the default switches", defaultSiteConfig()]] as const) {
    it(`${name}: each page has a menu row or a named reason`, () => {
      const reached = doors(config);
      const missing = PAGE_CATALOG
        .filter((p) => pageOn(config, p.feature))
        .filter((p) => !reached.has(p.href) && !(p.href in NO_ROW))
        .map((p) => p.href);
      expect(missing).toEqual([]);
    });
  }

  it("the allow list names only real catalog pages that truly have no row (no stale entries)", () => {
    const reached = doors(allOn());
    for (const href of Object.keys(NO_ROW)) {
      expect(PAGE_CATALOG.some((p) => p.href === href)).toBe(true);
      expect(reached.has(href)).toBe(false);
    }
  });

  it("the lion page /memberships is the Store tab's Memberships row; Three packages stays on /packages", () => {
    const c = defaultSiteConfig();
    c.features.store = true;
    c.features.memberships = true;
    const store = buildDefaultMenu(c).find((m) => m.label === "Store");
    expect(store?.subs?.find((x) => x.label === "Memberships")?.href).toBe("/memberships");
    expect(store?.subs?.find((x) => x.label === "Three packages")?.href).toBe("/packages");
  });

  it("with the store OFF the lion page still has its row (it follows its own switch only)", () => {
    const c = defaultSiteConfig();
    c.features.store = false;
    c.features.memberships = true;
    expect(doors(c).has("/memberships")).toBe(true);
  });
});
