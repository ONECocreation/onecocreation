import { describe, it, expect } from "vitest";
import { promises as fs } from "fs";
import path from "path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { SEEDS } from "@/lib/puck-seeds";
import {
  PAGE_STATES,
  ARCHIVE_SEEDS,
  ROUTE_WALK_EXCLUSIONS,
  pageStateEntryForPath,
  pageStateEntryForSlug,
  isArchiveSlug,
} from "@/lib/page-states";
import PagesPanel from "@/components/style/PagesPanel";

/**
 * TASK-230 (0018.06.25 a₿ · block 967,125) — the pages panel is the map of
 * the whole site. Pins, in the spec's own order:
 *
 *  · THE MANIFEST DERIVES OR DASHES: walk src/app/*\/page.tsx against
 *    PAGE_STATES — every walked route appears exactly once, or is dashed
 *    in ROUTE_WALK_EXCLUSIONS with its reason (/a the console, /api the
 *    endpoints). No stale manifest entries either: a designer/words entry
 *    without a walked page fails. `designer` is DERIVED, not claimed: each
 *    designer route's page.tsx must really call getPuckPage — and home,
 *    the seeded-but-unwired one, must really NOT (the pin says so plainly).
 *  · THE ARCHIVE SIXTEEN: ARCHIVE_SEEDS is pinned against the set derived
 *    from SEEDS itself — a seventeenth "-old" seed can't slip in ungrouped.
 *  · THE PANEL WEARS THE MANIFEST: static markup pins — badges per
 *    manifest, SITE MAP rows for the words routes, ARCHIVE collapsed by
 *    default (none of the sixteen renders), the recon REFERENCE group
 *    still the floor. (The accordion's localStorage memory and the
 *    expanded state are pinned off the source here and SHOWN in the
 *    lane's shots — renderToStaticMarkup always paints the server
 *    snapshot, which is closed.)
 *  · THE DEFAULT DEVICE STAYS MOBILE (Love's call, wave 2): the 360px
 *    default comes from Puck core's defaultViewports[0] and the repo NEVER
 *    overrides it. Pinned on both sides — PuckEditor's <Puck> and
 *    StyleEditor's <PuckEditor> pass no viewport override, and core's
 *    inherited default is still 360 (a puck upgrade that flips it screams
 *    here instead of surprising Love).
 *
 * The pages are client components — the panel pins ride renderToStaticMarkup
 * (node env, the house's read-the-source-and-static-markup pattern from
 * style-route.test.ts / retreats-puck.test.ts).
 */

const ROOT = process.cwd();
const read = (rel: string) => fs.readFile(path.join(ROOT, rel), "utf8");
const exists = (rel: string) =>
  fs.stat(path.join(ROOT, rel)).then(() => true, () => false);

/* the walk: every top-level segment with its own page.tsx is a public
   route the manifest must answer for (dynamic-only and door segments —
   /p, /style, /studio — have no top-level page.tsx by construction) */
async function walkTopLevelRoutes(): Promise<string[]> {
  const entries = await fs.readdir(path.join(ROOT, "src/app"), { withFileTypes: true });
  const segs: string[] = [];
  for (const e of entries) {
    if (e.isDirectory() && (await exists(`src/app/${e.name}/page.tsx`))) segs.push(e.name);
  }
  return segs.sort();
}

describe("TASK-230 — the manifest covers every public route exactly once (derive-or-dash)", () => {
  it("every walked route is in PAGE_STATES exactly once — or dashed with a reason", async () => {
    const walked = await walkTopLevelRoutes();
    expect(walked.length).toBeGreaterThan(20); /* the walk itself worked */
    for (const seg of walked) {
      const p = `/${seg}`;
      const hits = PAGE_STATES.filter((e) => e.path === p);
      if (seg in ROUTE_WALK_EXCLUSIONS) {
        expect(hits, `${p} is dashed AND listed — pick one`).toEqual([]);
        expect(ROUTE_WALK_EXCLUSIONS[seg].length, `${p} is dashed without its reason`).toBeGreaterThan(0);
      } else {
        expect(hits.length, `${p} is a public route with no manifest row — list it or dash it`).toBe(1);
        expect(["designer", "words"], `${p} is a live route — reference is the seeds' shelf`).toContain(hits[0].state);
      }
    }
    /* the front door: src/app/page.tsx walks as "/" */
    expect(await exists("src/app/page.tsx")).toBe(true);
    expect(PAGE_STATES.filter((e) => e.path === "/")).toHaveLength(1);
    /* the named exclusions stand as dashes */
    expect(ROUTE_WALK_EXCLUSIONS.a).toBeTruthy();
    expect(ROUTE_WALK_EXCLUSIONS.api).toBeTruthy();
  });

  it("no stale entries: every designer/words row answers a walked route; no path repeats", async () => {
    const walked = new Set(await walkTopLevelRoutes());
    for (const e of PAGE_STATES) {
      if (e.state === "reference") {
        expect(e.path, `reference rows publish at /p/<slug>: ${e.path}`).toMatch(/^\/p\/[a-z0-9-]+-old$/);
        continue;
      }
      if (e.path === "/") continue;
      expect(walked.has(e.path.slice(1)), `${e.path} is in the manifest but no page.tsx walks it`).toBe(true);
    }
    expect(new Set(PAGE_STATES.map((e) => e.path)).size).toBe(PAGE_STATES.length);
  });

  it("designer is derived: each designer route's page.tsx really reads getPuckPage — TASK-293: home too, now it's wired; TASK-295 pair 1: /meditation joins, and /packages' stale row catches up to T-232", async () => {
    const designers = PAGE_STATES.filter((e) => e.state === "designer");
    expect(designers.map((e) => e.slug).sort()).toEqual(
      /* the union of the T-295 wave A pairs (pair 1 meditation + the cured
         packages row, pair 2 privacy + terms, pair 3 artist + jewelry,
         pair 4 contact + services, pair 5 media + news, pair 6 bday) and
         T-296 wave B so far: me-login brought login + me, bb-time brought
      /* the union of the T-295 wave A pairs (pair 1 meditation + the cured
         packages row, pair 2 privacy + terms, pair 3 artist + jewelry,
         pair 4 contact + services, pair 5 media + news, pair 6 bday) and
         T-296 wave B so far: me-login brought login + me, bb-time brought
         bb + time (pair 6's ruled flag-and-stop landing), letters-cart
         brought cart + letters, pair live brought live */
      ["about", "artist", "bb", "bday", "book", "cart", "classes", "contact", "home", "jewelry", "letters", "live", "login", "me", "media", "meditation", "memberships", "news", "packages", "privacy", "retreats", "services", "store", "support", "terms", "time"]
    );
    for (const e of designers) {
      const page = await read(e.path === "/" ? "src/app/page.tsx" : `src/app/${e.path.slice(1)}/page.tsx`);
      expect(page, `${e.path} claims designer but never reads the designer's page`).toContain("getPuckPage");
      if (e.slug === "home") {
        // home's path ("/") isn't its slug's own path — the one deliberate exception
        expect(e.path).toBe("/");
      } else {
        expect(e.slug).toBe(e.path.slice(1));
      }
    }
  });

  it("the archive sixteen derive from SEEDS itself — same set, seed order", () => {
    const seedOlds = Object.keys(SEEDS).filter((k) => k.endsWith("-old"));
    expect(seedOlds).toHaveLength(16);
    expect(ARCHIVE_SEEDS).toEqual(seedOlds);
    expect(PAGE_STATES.filter((e) => e.state === "reference").map((e) => e.slug)).toEqual(seedOlds);
  });

  it("the slug/path lookups answer honestly — badge or nothing, never a guess", () => {
    expect(pageStateEntryForSlug("about")?.state).toBe("designer");
    expect(pageStateEntryForSlug("home")?.state).toBe("designer"); // TASK-293: wired, the same badge every other designer route wears
    expect(pageStateEntryForSlug("home-old")?.state).toBe("reference");
    /* the words sample moved off /jewelry when pair 3 flipped it and off
       /login when the T-296 me-login pair wired it — /welcome is the ruled
       words route (pair 1's flag-and-stop stands; not in wave B's scope) */
    expect(pageStateEntryForSlug("welcome")?.state).toBe("words");
    expect(pageStateEntryForSlug("some-page-love-made")).toBeNull();
    /* the /time words pin moved when T-296 pair bb-time landed pair 6's
       flag-and-stop — /welcome is the wave's remaining plain-words route */
    expect(pageStateEntryForPath("/time")?.state).toBe("designer");
    expect(pageStateEntryForPath("/welcome")?.state).toBe("words");
    expect(pageStateEntryForPath("/p/observer-old")?.state).toBe("reference");
    expect(isArchiveSlug("links-old")).toBe(true);
    expect(isArchiveSlug("links")).toBe(false);
  });
});

describe("TASK-230 — the panel wears the manifest", () => {
  const renderPanel = () =>
    renderToStaticMarkup(createElement(PagesPanel, {
      slug: "about",
      pages: [],
      order: null,
      storeReady: false,
      refresh: () => {},
      flushDraft: async () => {},
      onClose: () => {},
    }));

  it("state badges render per manifest — designer on the wired rows, words on the site map, no badge on the unknown", () => {
    const html = renderPanel();
    expect(html).toContain(">designer</span>");
    expect(html).toContain(">words</span>");
    /* the tooltip speaks the manifest's note verbatim (html-escaped
       apostrophe and all — so the substring below stops short of one) —
       TASK-293: home wears the same designer note every other wired route
       does now */
    expect(html).toContain("designer — the live route reads the designer");
    expect(pageStateEntryForSlug("home")!.note).toBe(pageStateEntryForSlug("about")!.note);
    /* the no-KV honest note still stands */
    expect(html).toContain("pages store not connected");
  });

  it("SITE MAP lists the words routes as read-only new-tab links to the designer", () => {
    const html = renderPanel();
    expect(html).toContain("SITE MAP · every public route still in words");
    /* was href="/style/jewelry" (pair 3 flipped it), then /style/login
       (the T-296 me-login pair wired it) — /welcome is the words sample now */
    expect(html).toContain('href="/style/welcome"');
    expect(html).toContain('target="_blank"');
    expect(html).toContain("/welcome");
  });

  it("the sixteen -old seeds sit under ARCHIVE, collapsed by default — none of them renders", () => {
    const html = renderPanel();
    expect(html).toContain("ARCHIVE · the original ShinePages pages · 16");
    expect(html).toContain('aria-expanded="false"');
    for (const slug of ARCHIVE_SEEDS) {
      expect(html, `${slug} renders while ARCHIVE is collapsed`).not.toContain(slug);
    }
    /* group order: living pages, then SITE MAP, then ARCHIVE, with the
       recon REFERENCE shelf still the floor */
    expect(html.indexOf("SITE MAP")).toBeGreaterThan(-1);
    expect(html.indexOf("SITE MAP")).toBeLessThan(html.indexOf("ARCHIVE ·"));
    expect(html.indexOf("ARCHIVE ·")).toBeLessThan(html.indexOf("REFERENCE ·"));
  });

  it("the accordion is the Site-room idiom: localStorage-remembered, closed the honest default", async () => {
    const src = await read("src/components/style/PagesPanel.tsx");
    expect(src).toContain('ARCHIVE_LS_KEY = "oc-studio-pages-archive-open"');
    expect(src).toContain("useSyncExternalStore");
    /* getServerSnapshot is closed, and denied storage reads closed */
    expect(src).toContain("() => false");
    expect(src).toContain('window.localStorage.setItem(ARCHIVE_LS_KEY, readArchiveOpen() ? "0" : "1")');
    /* archive rows keep the same renderer — only the grouping changed */
    expect(src).toContain("archiveOpen && archiveRows.map(({ p, i }) => renderRow(p, i))");
  });
});

describe("TASK-230 — the default device stays mobile (pin it, don't move it)", () => {
  it("PuckEditor's <Puck> passes NO viewport override — the 360px default is inherited from core", async () => {
    const puck = await read("src/components/PuckEditor.tsx");
    const open = puck.match(/<Puck\s[\s\S]*?>/);
    expect(open, "couldn't find the <Puck> opening tag").not.toBeNull();
    expect(open![0]).not.toContain("viewports");
    expect(open![0]).not.toMatch(/\bui\s*=/);
  });

  it("StyleEditor's <PuckEditor> passes no viewport override either", async () => {
    const se = await read("src/components/style/StyleEditor.tsx");
    const open = se.match(/<PuckEditor\s[\s\S]*?\/>/);
    expect(open, "couldn't find the <PuckEditor> opening tag").not.toBeNull();
    expect(open![0]).not.toContain("viewports");
  });

  it("core's inherited default is still 360px mobile-first (a puck upgrade that flips it screams here)", async () => {
    const core = await read("node_modules/@puckeditor/core/dist/index.js");
    expect(core).toMatch(/defaultViewports = \[\s*\{ width: 360, height: "auto", icon: "Smartphone", label: "Small" \}/);
  });
});
