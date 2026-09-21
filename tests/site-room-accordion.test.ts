import { describe, it, expect, vi } from "vitest";
import { promises as fs } from "fs";
import path from "path";

/**
 * TASK-188 (0018.06.18 a₿ · block 966,112) — the Site room breathes:
 *
 *   · the accordion's rows: Switches (default at /a/site), Menu, Community
 *     door, Videos on About — and NO "Community & rooms" row (no such card
 *     exists; the spec's own condition)
 *   · the current mark: siteSubForPath pins which sub-row a path lights
 *   · the accordion remembers open/closed (localStorage) and only the Site
 *     row of the rail changes (source pins)
 *   · each sub-route renders its one card (source pins), and /a/site keeps
 *     the switches alone
 */

const ROOT = process.cwd();
const read = (rel: string) => fs.readFile(path.join(ROOT, rel), "utf8");

describe("the accordion's rows + the current mark", () => {
  it("carries the four /a/site sub-rooms (Switches first) plus TASK-330's Brand row, last", async () => {
    const { SITE_SUBS } = await import("@/components/console/SiteConsoleShell");
    expect(SITE_SUBS.map((s) => [s.key, s.href, s.label])).toEqual([
      ["switches", "/a/site", "Switches"],
      ["menu", "/a/site/menu", "Menu"],
      ["community-door", "/a/site/community-door", "Community door"],
      ["about-videos", "/a/site/about-videos", "Videos on About"],
      // TASK-381 (block 968,047+): the weekly reading's source, no public
      // surface yet (the notice is T-382, held on the mockup nod).
      ["reading", "/a/site/reading", "The weekly reading"],
      // TASK-330 (0018.06.27 a₿): Brand folds under Site as a fifth
      // sub-row — its own route (/a/brand), not under /a/site/*.
      ["brand", "/a/brand", "Brand"],
    ]);
    // "Community & rooms" is omitted — no such card exists on /a/site
    const labels: string[] = SITE_SUBS.map((s) => s.label);
    expect(labels).not.toContain("Community & rooms");
  });

  it("marks the current sub-row for every sub-route, Switches for the default", async () => {
    const { siteSubForPath } = await import("@/components/console/SiteConsoleShell");
    expect(siteSubForPath("/a/site")).toBe("switches");
    expect(siteSubForPath("/a/site/menu")).toBe("menu");
    expect(siteSubForPath("/a/site/community-door")).toBe("community-door");
    expect(siteSubForPath("/a/site/about-videos")).toBe("about-videos");
    expect(siteSubForPath("/a/site/reading")).toBe("reading");
    // a deeper unknown /a/site/* path still marks Switches; outside /a/site nothing marks
    expect(siteSubForPath("/a/site/anything-else")).toBe("switches");
    expect(siteSubForPath("/a/money")).toBeNull();
    expect(siteSubForPath("/a")).toBeNull();
  });

  /* TASK-330 (0018.06.27 a₿): Brand is NOT under /a/site/* — it's its own
     route, /a/brand — so siteSubForPath's "exact" match (not the
     startsWith("/a/site/") branch) is what has to answer it. */
  it("marks Brand current on its own route, /a/brand — outside /a/site/*", async () => {
    const { siteSubForPath } = await import("@/components/console/SiteConsoleShell");
    expect(siteSubForPath("/a/brand")).toBe("brand");
  });

  it("the Site row reads active on /a/brand (new coverage, TASK-330 decision 2's active-prop wiring)", async () => {
    const { createElement: h } = await import("react");
    const { renderToStaticMarkup } = await import("react-dom/server");
    vi.resetModules();
    vi.doMock("next/navigation", () => ({ usePathname: () => "/a/brand" }));
    const { default: SiteConsoleShell } = await import("@/components/console/SiteConsoleShell");
    const html = renderToStaticMarkup(h(SiteConsoleShell, { children: h("div", null, "body") }));
    // the Site row itself reads active (is-active) even though current.key
    // is "brand", not "site" — decision 2's one-line active-prop change.
    expect(html).toContain('aria-controls="mgmt-site-subs"');
    const siteButtonMatch = html.match(/<button[^>]*aria-controls="mgmt-site-subs"[^>]*>/);
    expect(siteButtonMatch).not.toBeNull();
    expect(siteButtonMatch?.[0]).toContain("mgmt-rail-tab is-active");
    // the accordion is closed by default (SSR/no localStorage) — the sub-row
    // markup itself is siteSubForPath's own contract, pinned above, since
    // the sub-list only renders once toggled open client-side.
    expect(html).toContain("Site<span");
    expect(html).toContain('<h1 class="mgmt-title">Brand');
    vi.doUnmock("next/navigation");
    vi.resetModules();
  });

  it("remembers open/closed in localStorage and exposes the accordion semantics (source pin)", async () => {
    const shell = await read("src/components/console/SiteConsoleShell.tsx");
    expect(shell).toContain('localStorage.getItem(SITE_ACCORDION_KEY)');
    expect(shell).toContain("oc-console-site-open");
    expect(shell).toContain("aria-expanded={open}");
    expect(shell).toContain('aria-controls="mgmt-site-subs"');
    expect(shell).toContain('aria-current={subActive ? "page" : undefined}');
  });
});

describe("the sub-routes — each renders its one card", () => {
  it("/a/site keeps the switches alone — the moved cards are gone (source pin)", async () => {
    // TASK-241: the room body moved from page.tsx to SiteRoom.tsx (page.tsx
    // is now the server operator-gate wrapper) — same body, new file.
    const page = await read("src/app/a/site/SiteRoom.tsx");
    expect(page).toContain("The Switches");
    expect(page).toContain("FEATURE_ROWS");
    expect(page).toContain("RAIL_ROWS");
    expect(page).toContain("MEETING_RAILS");
    expect(page).not.toContain("NavEditor");
    expect(page).not.toContain("CommunityDoorCard");
    expect(page).not.toContain("AboutVideosCard");
  });

  it("/a/site/menu renders the nav editor", async () => {
    // TASK-241: body moved to SiteMenuRoom.tsx.
    const page = await read("src/app/a/site/menu/SiteMenuRoom.tsx");
    expect(page).toContain("<NavEditor />");
    expect(page).toContain("Menu — the doors Love shapes");
  });

  it("/a/site/community-door renders T-162's card", async () => {
    // TASK-241: body moved to SiteCommunityDoorRoom.tsx.
    const page = await read("src/app/a/site/community-door/SiteCommunityDoorRoom.tsx");
    expect(page).toContain("<CommunityDoorCard />");
    expect(page).toContain("Community door — what it needs before it opens");
  });

  it("/a/site/about-videos renders T-161's playlist card", async () => {
    // TASK-241: body moved to SiteAboutVideosRoom.tsx.
    const page = await read("src/app/a/site/about-videos/SiteAboutVideosRoom.tsx");
    expect(page).toContain("<AboutVideosCard />");
    expect(page).toContain("Videos on About — the playlist Love pastes");
    // the card itself moved verbatim — still self-contained through /api/admin/site
    const card = await read("src/app/a/site/about-videos/AboutVideosCard.tsx");
    expect(card).toContain('fetch("/api/admin/site"');
  });
});

describe("the menu editor's drag-and-drop (source pins)", () => {
  it("drags through the pure helpers, keeps the arrows, and shows the landing line", async () => {
    const editor = await read("src/components/console/NavEditor.tsx");
    expect(editor).toContain('from "@/lib/nav-edit"');
    expect(editor).toContain("moveRow");
    expect(editor).toContain("nestUnder");
    // the drop line + the drag handle
    expect(editor).toContain("DropLine");
    expect(editor).toContain("draggable");
    expect(editor).toContain("onDragOver");
    expect(editor).toContain("onDrop");
    // the keyboard arrows stay for accessibility; Save is unchanged
    expect(editor).toContain("aria-label={`move ${item.label} up`}");
    expect(editor).toContain("Save the menu");
  });
});
