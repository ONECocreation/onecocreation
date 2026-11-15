import { describe, it, expect } from "vitest";
import { promises as fs } from "fs";
import path from "path";
import type { NavConfig, SiteConfig } from "@/lib/site-config";

/**
 * Block 976,007 — TWO DOORS (the Admiral's desk answers).
 *
 *  5a. "11:11 Live with Love" opens her YouTube lives: ONE address
 *      (src/lib/live-with-love.ts) read by the built-in menu row, the home
 *      Connect card + the /contact door (ContactDoors) and the /classes
 *      spotlight card; an outside row opens in a new tab the way the
 *      site's other outside links do (target="_blank" rel="noreferrer").
 *  5b. Classes closes while its switch is OFF: no menu row, no tab and no
 *      footer row opens /classes, and /classes answers the house's
 *      switched-off idiom (the TASK-160 gate → NotOpenYet). Switch ON:
 *      unchanged. Both states pinned for the built-in menu AND for a menu
 *      shaped like Love's saved one (Community → /classes with a Classes
 *      row), because the live site renders her saved menu.
 *
 * Pages are async server components and NavMenu/SiteFooter are client
 * components, so the render side is pinned off the SOURCE (the house's
 * read-the-source pattern, route-gates.test.ts), and the menu logic is
 * pinned behaviourally through the pure buildMenu/buildDefaultMenu.
 */

const ROOT = process.cwd();
const read = (rel: string) => fs.readFile(path.join(ROOT, rel), "utf8");
const STREAMS = "https://www.youtube.com/@Onecocreation/streams";

/** The shape of Love's saved menu (labels and hrefs only, read from the
    public switches route at block 976,007; nothing of it is written). */
const LOVES_SAVED_SHAPE: NavConfig = {
  items: [
    { id: "/about", label: "About", href: "/about" },
    { id: "/store", label: "Store", href: "/store", children: [
      { id: "/book", label: "Sessions", href: "/book" },
      { id: "/store/meditations", label: "Meditations", href: "/store/meditations" },
      { id: "/memberships", label: "Memberships", href: "/memberships" },
      { id: "/packages", label: "Three packages", href: "/packages" },
    ] },
    { id: "/classes", label: "Community", href: "/classes", children: [
      { id: "/reading", label: "Read with Love", href: "/reading" },
      { id: "/replays", label: "Replays", href: "/replays" },
      { id: "/rooms/heart-field", label: "Heart Field", href: "/rooms/heart-field" },
      { id: "/contact", label: "11:11 Live with Love", href: "/contact" },
      { id: "/meditation", label: "Free meditation", href: "/meditation" },
      { id: "/classes", label: "Classes", href: "/classes" },
      { id: "/news", label: "News & letters", href: "/news" },
    ] },
    { id: "/support", label: "Support", href: "/support" },
  ],
};

async function switches(classes: boolean, nav?: NavConfig): Promise<SiteConfig> {
  const { defaultSiteConfig } = await import("@/lib/site-config");
  const c = defaultSiteConfig();
  // the live switches at block 976,007: community ON, store ON, sessions ON, news OFF
  c.features.community = true;
  c.features.store = true;
  c.features.sessions = true;
  c.features.news = false;
  c.features.classes = classes;
  if (nav) c.nav = nav;
  return c;
}

/** Every href a visitor can open from the menu: each tab and each row. */
function allHrefs(menu: { href: string; subs?: { href: string }[] }[]): string[] {
  return menu.flatMap((m) => [m.href, ...(m.subs ?? []).map((s) => s.href)]);
}

describe("5a — 11:11 Live with Love opens her YouTube lives", () => {
  it("one address, the channel's Live tab", async () => {
    const { LIVE_WITH_LOVE_URL } = await import("@/lib/live-with-love");
    expect(LIVE_WITH_LOVE_URL).toBe(STREAMS);
  });

  it("the built-in menu's 11:11 row is that address", async () => {
    const { buildDefaultMenu } = await import("@/components/NavMenu");
    for (const classes of [false, true]) {
      const community = buildDefaultMenu(await switches(classes)).find((m) => m.label === "Community");
      expect(community?.subs?.find((s) => s.label === "11:11 Live with Love")?.href).toBe(STREAMS);
    }
  });

  it("every 11:11 door reads the one constant; no door keeps its own copy of the address", async () => {
    for (const rel of ["src/components/NavMenu.tsx", "src/components/ContactDoors.tsx", "src/components/CommunitySpotlight.tsx"]) {
      const src = await read(rel);
      expect(src, rel).toContain('import { LIVE_WITH_LOVE_URL } from "@/lib/live-with-love"');
      expect(src, rel).not.toContain("youtube.com/@Onecocreation");
    }
    expect(await read("src/components/NavMenu.tsx")).toContain('{ label: "11:11 Live with Love", href: LIVE_WITH_LOVE_URL }');
    expect(await read("src/components/ContactDoors.tsx")).toMatch(/href=\{LIVE_WITH_LOVE_URL\} target="_blank" rel="noreferrer"/);
    expect(await read("src/components/CommunitySpotlight.tsx")).toContain("href: LIVE_WITH_LOVE_URL, cta: \"@Onecocreation\", external: true");
  });

  it("the home Connect section still hides the 11:11 door when `community` is OFF (its selector matches the new address)", async () => {
    const src = await read("src/components/sections.tsx");
    expect(src).toContain('a[href^="https://www.youtube.com/"]');
    expect(STREAMS.startsWith("https://www.youtube.com/")).toBe(true);
  });

  it("an outside row opens in a new tab, the way the site's other outside links do", async () => {
    const { isOutsideHref } = await import("@/components/NavMenu");
    expect(isOutsideHref(STREAMS)).toBe(true);
    expect(isOutsideHref("/contact")).toBe(false);
    expect(isOutsideHref("/classes")).toBe(false);
    const src = await read("src/components/NavMenu.tsx");
    // the tab and the row both branch on isOutsideHref into a plain <a>
    expect(src).toMatch(/isOutsideHref\(m\.href\) \? \(\s*<a className="nav-link" href=\{m\.href\} target="_blank" rel="noreferrer"/);
    expect(src).toMatch(/isOutsideHref\(s\.href\) \? \(\s*<a key=\{s\.href\} href=\{s\.href\} target="_blank" rel="noreferrer"/);
  });

  it("a saved menu row may carry an outside address (the storage allow-list admits https)", async () => {
    const { isOpenNavHref } = await import("@/lib/nav-edit");
    expect(isOpenNavHref(STREAMS)).toBe(true);
  });
});

describe("5b — Classes closes while its switch is OFF", () => {
  it("switch OFF, built-in menu: no tab and no row opens /classes; Community opens its first row", async () => {
    const { buildDefaultMenu, buildMenu } = await import("@/components/NavMenu");
    for (const menu of [buildDefaultMenu(await switches(false)), buildMenu(await switches(false))]) {
      expect(allHrefs(menu)).not.toContain("/classes");
      const community = menu.find((m) => m.label === "Community");
      expect(community?.href).toBe("/reading");
      expect(community?.subs?.map((s) => s.label)).not.toContain("Classes");
    }
  });

  it("switch OFF, a saved menu shaped like Love's: her Community tab no longer sails to /classes", async () => {
    const { buildMenu } = await import("@/components/NavMenu");
    const menu = buildMenu(await switches(false, LOVES_SAVED_SHAPE));
    expect(allHrefs(menu)).not.toContain("/classes");
    const community = menu.find((m) => m.label === "Community");
    expect(community?.href).toBe("/reading");
    expect(community?.subs?.map((s) => s.label)).not.toContain("Classes");
  });

  it("switch OFF, the pre-fetch paint (no switches yet): no /classes either", async () => {
    const { buildMenu } = await import("@/components/NavMenu");
    expect(allHrefs(buildMenu(null))).not.toContain("/classes");
  });

  it("switch ON: unchanged — Community opens /classes and carries the Classes row (built-in and saved)", async () => {
    const { buildDefaultMenu, buildMenu } = await import("@/components/NavMenu");
    const builtIn = buildDefaultMenu(await switches(true)).find((m) => m.label === "Community");
    expect(builtIn?.href).toBe("/classes");
    expect(builtIn?.subs?.find((s) => s.label === "Classes")?.href).toBe("/classes");
    const saved = buildMenu(await switches(true, LOVES_SAVED_SHAPE));
    const community = saved.find((m) => m.label === "Community");
    expect(community?.href).toBe("/classes");
    expect(community?.subs?.map((s) => s.label)).toEqual([
      "Read with Love", "Replays", "Heart Field", "11:11 Live with Love", "Free meditation", "Classes",
    ]);
    // every other saved tab keeps its own href
    expect(saved.map((m) => [m.label, m.href])).toEqual([
      ["About", "/about"], ["Store", "/store"], ["Community", "/classes"], ["Support", "/support"],
    ]);
  });

  it("the footer's Community row follows the Classes switch (the Sessions row's idiom)", async () => {
    const src = await read("src/components/SiteFooter.tsx");
    expect(src).toContain('{switches?.features.classes && <Link href="/classes">Community</Link>}');
    expect(src).not.toMatch(/^\s*<Link href="\/classes">Community<\/Link>/m);
  });

  it("/classes itself: the TASK-160 gate (NotOpenYet inside the site chrome) on the Classes switch alone", async () => {
    const src = await read("src/app/classes/page.tsx");
    const gate = src.slice(src.indexOf("TASK-160 GATE"), src.indexOf("end TASK-160 GATE"));
    expect(gate).toContain("if (!switches.features.classes) {");
    expect(gate).not.toContain("switches.features.community");
    expect(gate).toContain("<NotOpenYet");
    expect(gate).toContain("<SiteHeader />");
    expect(gate).toContain("<SiteFooter />");
    // the gate stays the page's first branch, before the Puck read
    expect(src.indexOf("TASK-160 GATE")).toBeLessThan(src.indexOf('getPuckPage("classes")'));
  });
});
