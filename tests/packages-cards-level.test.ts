import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { promises as fs } from "fs";
import path from "path";
import { renderToStaticMarkup } from "react-dom/server";
import { isolateCwd } from "./helpers/isolate-cwd";

/**
 * TASK-254 (0018.06.24 a₿) — THE MEMBERSHIP CARDS STAND LEVEL, and the tier
 * page's picture keeps one shape (the Admiral: "that issue bled into the
 * memberships area. they are all off now"). These pins hold the fix, not a
 * pixel measurement (no DOM runner here — same "node-environment vitest"
 * law as tests/classes-cards.test.ts):
 *
 *  · the feature list reserves TWO LINES PER BULLET (`.feat li{min-height}`)
 *    so the door row lands at the same y whether a given card's bullets
 *    wrap or not — a whole-list min-height couldn't do this because the
 *    three tiers' bullets each wrap a different number of times;
 *  · the tier-name pill centres itself in the card's flex column
 *    (`.tier-name-pill{align-self:center}`) instead of stretching full-width
 *    and left-aligned;
 *  · the shine rim matches the card's own rim (24px, not 26px);
 *  · the rails-ON door ("See the package") fills the card's foot
 *    (`.push>a.btn{width:100%;text-align:center}`, scoped in Packages()'s
 *    own <style>, never touching T-253's `.push` rule in house.css) —
 *    button CLASS and WORDS are unchanged (T-255's skin, not this lane's);
 *  · the tier page's picture sits in a 4/3 frame (object-fit:cover) so the
 *    three tiers' different native aspect ratios (327×480 · 488×480 ·
 *    640×455) no longer swing the right column's height;
 *  · the tier page's related-card "YES!" door lost its inline marginTop so
 *    `.push` (T-253's, untouched) can level it again.
 *
 * tests/package-waitlist.test.ts and tests/store-cards.test.ts keep passing
 * unchanged — this file adds pins, it never edits theirs.
 */

/* the source/CSS pins below read real repo files, so REPO_ROOT is captured
   BEFORE isolateCwd() chdir's the process (same ordering trap the helper's
   own docblock warns about) — SITE_CONFIG_FILE, by contrast, is meant to
   follow the fs site-config driver into the throwaway cwd, same as
   tests/package-waitlist.test.ts. */
const REPO_ROOT = process.cwd();
const { cleanup: cleanupCwd } = isolateCwd("oc-packages-cards-level-");
const SITE_CONFIG_FILE = path.join(process.cwd(), "data", "site-config.json");

beforeAll(async () => {
  delete process.env.KV_REST_API_URL;
  delete process.env.KV_REST_API_TOKEN;
  delete process.env.BLOB_READ_WRITE_TOKEN;
  delete process.env.REGISTRY_DRIVER;
  await fs.rm(SITE_CONFIG_FILE, { force: true });
});

afterAll(async () => {
  await fs.rm(SITE_CONFIG_FILE, { force: true });
  cleanupCwd();
});

describe("house.css — the additive TASK-254 rules (owned selectors only)", () => {
  it("the feature list reserves a min-height PER BULLET, not once on the whole list", async () => {
    const css = await fs.readFile(path.join(REPO_ROOT, "src/app/house.css"), "utf8");
    expect(css).toMatch(/\.feat li\{[^}]*min-height:[^;}]+/);
    // the reserve rides the li, never a whole-.feat min-height (the three
    // tiers' bullets wrap a different number of times — see the file docblock)
    expect(css).not.toMatch(/\.feat\{[^}]*min-height/);
  });

  it("the tier-name pill centres itself in the card's flex column", async () => {
    const css = await fs.readFile(path.join(REPO_ROOT, "src/app/house.css"), "utf8");
    expect(css).toMatch(/\.tier-name-pill\{[^}]*align-self:center[^;}]*\}/);
  });

  it("the shine rim (24px) matches the card's own rim, added AFTER the original 26px rule so it wins the cascade", async () => {
    const css = await fs.readFile(path.join(REPO_ROOT, "src/app/house.css"), "utf8");
    const original = css.indexOf("border-radius:26px");
    const fix = css.indexOf(".shine-hover::before{border-radius:24px}");
    expect(original).toBeGreaterThan(-1);
    expect(fix).toBeGreaterThan(original); // later in the cascade, same specificity → wins
  });

  it("T-253's rules stay untouched by this lane — .push/.card keep their pinned shapes", async () => {
    const css = await fs.readFile(path.join(REPO_ROOT, "src/app/house.css"), "utf8");
    expect(css).toMatch(/\.push\{margin-top:auto\}/);
    expect(css).toMatch(/\.card\{background:var\(--panel\)/);
  });
});

describe("sections.tsx — Packages()'s scoped <style>, source-level (no house.css .push edit)", () => {
  it("the rails-ON door fills the foot via a scoped selector, not a class/word change", async () => {
    const src = await fs.readFile(path.join(REPO_ROOT, "src/components/sections.tsx"), "utf8");
    expect(src).toContain("#packages .push>a.btn{width:100%;text-align:center}");
    // the door's own class + words are still exactly what T-255 owns
    expect(src).toContain('<Link href={`/packages/${slug}`} className="btn btn-sm">See the package</Link>');
  });
});

describe("Packages() renders — three level cards, unchanged doors (rendered markup)", () => {
  it("three .card.shine-hover cards, each with a .feat list and a centred .tier-name-pill", async () => {
    const { Packages } = await import("@/components/sections");
    const html = renderToStaticMarkup(await Packages());
    expect((html.match(/class="card shine-hover"/g) ?? []).length).toBe(3);
    expect((html.match(/class="feat"/g) ?? []).length).toBe(3);
    expect((html.match(/class="tier-name-pill /g) ?? []).length).toBe(3);
  });

  it("rails ON — the exact pinned door string still renders, untouched by the width fix (CSS-only, no markup change)", async () => {
    const { saveSiteConfig } = await import("@/lib/site-config");
    const { Packages } = await import("@/components/sections");
    const { TIER_PAGES } = await import("@/lib/tiers-content");
    await saveSiteConfig({ features: { store: true } });
    try {
      const html = renderToStaticMarkup(await Packages());
      for (const p of TIER_PAGES) {
        expect(html).toContain(`<a class="btn btn-sm" href="/packages/${p.slug}">See the package</a>`);
      }
    } finally {
      await saveSiteConfig({ features: { store: false } });
    }
  });
});

describe("/packages/[slug] — the tier picture's 4/3 frame, and the YES! door's dropped inline marginTop", () => {
  it("the picture is framed 4/3, object-fit cover, matching .thumb's recipe (house.css:171)", async () => {
    const src = await fs.readFile(path.join(REPO_ROOT, "src/app/packages/[slug]/page.tsx"), "utf8");
    expect(src).toMatch(/aspectRatio:\s*"4\/3"/);
    expect(src).toMatch(/objectFit:\s*"cover"/);
  });

  it("the related-card push door carries no inline marginTop — .push (T-253's) levels it instead", async () => {
    const src = await fs.readFile(path.join(REPO_ROOT, "src/app/packages/[slug]/page.tsx"), "utf8");
    expect(src).not.toMatch(/className="btn btn-sm push"\s+style=\{\{\s*marginTop/);
    expect(src).toContain('<span className="btn btn-sm push">YES!</span>');
  });
});
