import { describe, it, expect } from "vitest";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { buildMenu, menuForLoad } from "@/components/NavMenu";
import { defaultSiteConfig, type SiteConfig } from "@/lib/site-config";

/**
 * Block 976,140 (desk card 976039, the Admiral's answer B, "Empty until it
 * lands"): the built-in menu showed for 6 to 9 seconds on a slow line before
 * Love's saved menu replaced it. Now the bar carries no tabs until her menu
 * lands. If the fetch fails, the built-in menu shows, so the bar is never
 * empty for good.
 */

function lovesConfig(): SiteConfig {
  const c = defaultSiteConfig();
  c.features.store = true;
  c.features.sessions = true;
  c.features.memberships = true;
  c.nav = {
    items: [
      { id: "/about", label: "About", href: "/about" },
      { id: "/store", label: "Store", href: "/store", children: [{ id: "/book", label: "Sessions", href: "/book" }] },
      { id: "/support", label: "Support", href: "/support" },
    ],
  } as SiteConfig["nav"];
  return c;
}

const labels = (m: { label: string }[]) => m.map((x) => x.label);

describe("the menu is empty until Love's saved menu lands (B, 976039)", () => {
  it("waiting: no tabs at all, not the built-in menu", () => {
    expect(menuForLoad({ state: "waiting" })).toEqual([]);
  });

  it("landed: her saved menu, exactly what buildMenu gives", () => {
    const config = lovesConfig();
    expect(menuForLoad({ state: "landed", config })).toEqual(buildMenu(config));
    expect(labels(menuForLoad({ state: "landed", config }))).toEqual(["About", "Store", "Support"]);
  });

  it("failed: the built-in menu, so the bar is never empty for good", () => {
    const menu = menuForLoad({ state: "failed" });
    expect(menu).toEqual(buildMenu(null));
    expect(menu.length).toBeGreaterThan(0);
    expect(labels(menu)).toContain("About");
    expect(labels(menu)).toContain("Support");
  });

  it("NavMenu starts waiting and falls back on every failure path", async () => {
    const src = await readFile(path.join(__dirname, "..", "src/components/NavMenu.tsx"), "utf8");
    expect(src).toContain('useState<MenuLoad>({ state: "waiting" })');
    expect(src).toContain("const menu = menuForLoad(load);");
    // a non-ok answer or an answer without a config is a failure, not a wait
    expect(src).toContain('d?.ok && d.config ? { state: "landed", config: d.config } : { state: "failed" }');
    // a network error is a failure too
    expect(src).toContain('.catch(() => setLoad({ state: "failed" }))');
    // the old first paint (buildMenu of the not-yet-fetched switches) is gone
    expect(src).not.toContain("buildMenu(switches)");
  });
});
