import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { promises as fs } from "fs";
import path from "path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { isolateCwd } from "./helpers/isolate-cwd";

/**
 * TASK-158 (0018.06.17 a₿) — this file's own throwaway cwd (see
 * tests/helpers/isolate-cwd.ts) so `SITE_CONFIG_FILE` below — and every
 * call the fs site-config driver makes off `process.cwd()` — never
 * collides with site-config.test.ts or jars.test.ts running in the same
 * file-parallel pass. Must run before `SITE_CONFIG_FILE` is computed.
 */
const { cleanup: cleanupCwd } = isolateCwd("oc-package-waitlist-");

/**
 * TASK-138 (0018.06.17 a₿) — the package buttons: "I'M INTERESTED", tagged
 * by package, then the package's own page. Pins:
 *
 *  · SubscribeForm's compact door: passing `label` swaps the giant `cta`
 *    sentence for the short word and rides `.btn-sm`; a door that only
 *    passes `cta` (every existing caller) keeps today's big button,
 *    unchanged.
 *  · `nextUrl()` — the `?joined=1` shape a `next` prop rides to, both bare
 *    and when the target already carries its own query.
 *  · `packageWaitlistProps(tier, slug)` (sections.tsx, Packages()'s own
 *    helper) — the exact source tag, compact label, honest note, and the
 *    walk to that tier's own page, pure so it's pinned without rendering.
 *  · `tierRailsOn` / `tierOfferMode` / `tierJoinedBanner`
 *    (/packages/[slug]/page.tsx) — the same `features.store` switch
 *    NavMenu.tsx already reads for the Store door decides buy vs waitlist
 *    vs the joined banner, pure so the gate is pinned without rendering a
 *    page whose SiteHeader/NavMenu ride hooks that need a real app-router.
 *
 * Static server markup for the leaf components only (the house's
 * node-environment vitest, no DOM runner — TASK-123's classroom-layouts
 * precedent): every component rendered here is synchronous.
 */

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

describe("SubscribeForm — the compact `label` door", () => {
  it("label swaps the button text and adds .btn-sm; cta's default is untouched", async () => {
    const { default: SubscribeForm } = await import("@/components/SubscribeForm");
    const compact = renderToStaticMarkup(
      createElement(SubscribeForm, { source: "waitlist-b", label: "I'm interested" }),
    );
    expect(compact).toContain("I&#x27;m interested");
    expect(compact).toMatch(/class="btn btn-rose btn-sm"/);

    const legacy = renderToStaticMarkup(createElement(SubscribeForm, {}));
    expect(legacy).toContain("Send My Free Meditation");
    expect(legacy).not.toContain("btn-sm");
  });

  it("the note renders verbatim under the field", async () => {
    const { default: SubscribeForm } = await import("@/components/SubscribeForm");
    const html = renderToStaticMarkup(
      createElement(SubscribeForm, {
        source: "waitlist-a",
        label: "I'm interested",
        note: "Add me to the pre-list — pre-order coming soon.",
      }),
    );
    expect(html).toContain("Add me to the pre-list");
    expect(html).toContain("pre-order coming soon.");
  });
});

describe("nextUrl — the `?joined=1` shape", () => {
  it("bare path gets a bare ?joined=1", async () => {
    const { nextUrl } = await import("@/components/SubscribeForm");
    expect(nextUrl("/packages/observer")).toBe("/packages/observer?joined=1");
  });

  it("a path already carrying a query gets &joined=1", async () => {
    const { nextUrl } = await import("@/components/SubscribeForm");
    expect(nextUrl("/packages/observer?ref=home")).toBe("/packages/observer?ref=home&joined=1");
  });
});

describe("packageWaitlistProps — the home card's door, tagged by tier (TASK-138)", () => {
  it("tier B → source waitlist-b, the compact label, the honest note, next=/packages/observer", async () => {
    const { packageWaitlistProps } = await import("@/components/sections");
    expect(packageWaitlistProps("B", "observer")).toEqual({
      source: "waitlist-b",
      label: "I'm interested",
      note: "Add me to the pre-list — pre-order coming soon.",
      next: "/packages/observer",
    });
  });

  it("every tier gets its own tag and its own page", async () => {
    const { packageWaitlistProps } = await import("@/components/sections");
    const { TIER_PAGES } = await import("@/lib/tiers-content");
    for (const p of TIER_PAGES) {
      const props = packageWaitlistProps(p.tier, p.slug);
      expect(props.source).toBe(`waitlist-${p.tier.toLowerCase()}`);
      expect(props.next).toBe(`/packages/${p.slug}`);
      expect(props.label).toBe("I'm interested");
    }
  });

  it("no slug found → next is undefined, never a broken href", async () => {
    const { packageWaitlistProps } = await import("@/components/sections");
    expect(packageWaitlistProps("A", undefined).next).toBeUndefined();
  });
});

describe("Packages() home cards render — three compact doors, never the old giant sentence", () => {
  it("three 'I'm interested' buttons, three pre-list notes, none of the old cta sentence", async () => {
    // TASK-187: Packages() is async now (it reads the memberships switch),
    // so we await it to a plain element first — renderToStaticMarkup itself
    // still never sees a promise, same "leaf components only" law as before.
    const { Packages } = await import("@/components/sections");
    const element = await Packages();
    const html = renderToStaticMarkup(element);
    expect((html.match(/I&#x27;m interested/g) ?? []).length).toBe(3);
    expect((html.match(/Add me to the pre-list — pre-order coming soon\./g) ?? []).length).toBe(3);
    expect(html).not.toContain("add me to the list. Pre-order coming soon.");
    expect(html).toMatch(/class="btn btn-rose btn-sm"/);
  });
});

describe("/packages/[slug] — the switch decides buy vs waitlist vs the joined banner", () => {
  it("tierRailsOn reads features.store — the same switch NavMenu uses for the Store door", async () => {
    const { tierRailsOn } = await import("@/app/packages/[slug]/page");
    const { defaultSiteConfig } = await import("@/lib/site-config");
    const off = defaultSiteConfig();
    expect(off.features.store).toBe(false); // Love's streamlined default
    expect(tierRailsOn(off)).toBe(false);
    const on = { ...off, features: { ...off.features, store: true } };
    expect(tierRailsOn(on)).toBe(true);
  });

  it("tierOfferMode: rails off + no join → waitlist; rails off + joined → banner; rails on → buy always", async () => {
    const { tierOfferMode } = await import("@/app/packages/[slug]/page");
    const { defaultSiteConfig } = await import("@/lib/site-config");
    const off = defaultSiteConfig();
    const on = { ...off, features: { ...off.features, store: true } };
    expect(tierOfferMode(off, false)).toBe("waitlist");
    expect(tierOfferMode(off, true)).toBe("banner");
    expect(tierOfferMode(on, false)).toBe("buy");
    expect(tierOfferMode(on, true)).toBe("buy"); // rails ON wins even over a stale ?joined=1
  });

  it("tierJoinedBanner names the tier the joiner is on the list for", async () => {
    const { tierJoinedBanner } = await import("@/app/packages/[slug]/page");
    expect(tierJoinedBanner({ tier: "B" })).toBe("You're on the list for Observer.");
    expect(tierJoinedBanner({ tier: "A" })).toBe("You're on the list for Weekly Intuitive.");
  });

  it("the live switches doc (fs driver) round-trips through getSiteConfig/tierRailsOn", async () => {
    const { getSiteConfig, saveSiteConfig } = await import("@/lib/site-config");
    const { tierRailsOn } = await import("@/app/packages/[slug]/page");
    expect(tierRailsOn(await getSiteConfig())).toBe(false);
    await saveSiteConfig({ features: { store: true } });
    expect(tierRailsOn(await getSiteConfig())).toBe(true);
    await saveSiteConfig({ features: { store: false } });
    expect(tierRailsOn(await getSiteConfig())).toBe(false);
  });
});
