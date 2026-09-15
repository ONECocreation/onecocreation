import { describe, it, expect, afterAll, beforeEach, vi } from "vitest";
import { promises as fs, readFileSync } from "fs";
import os from "os";
import path from "path";
import type { ReactElement, ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { isolateCwd } from "./helpers/isolate-cwd";

/* the repo root, captured BEFORE the isolate (isolateCwd must run ahead of
   any path.join(process.cwd(), …) constant — its own docblock) */
const REPO = process.cwd();
/* TASK-232: isolated cwd FIRST — the fixture site-config writes
   (data/site-config.json) land here, never in the repo's real data/. */
const cwd = isolateCwd("oc-packages-puck-232-");

/**
 * TASK-232 (0018.06.25 a₿ · block 967,125) — /packages (the memberships
 * index) becomes a designer page, riding T-231's RetreatsList pattern:
 * her words in the seed, the three-tier grid as ONE data-bound block
 * (PackagesGrid), the route reading 1 gate → 2 Puck → 3 hand-built.
 *
 * THE ASYMMETRY THIS LANE FIXES: /packages had NO route-level gate — the
 * memberships switch was enforced INSIDE Packages() (sections.tsx, the
 * home section). A naive Puck-first read would have bypassed the switch on
 * the index route. The gate now sits at the route level in the T-187 idiom
 * (memberships/page.tsx), ahead of the Puck read.
 *
 * PackagesGrid can't be an async server component (T-231's ruling:
 * puck-config.tsx rides the client bundle) and can't import the tier
 * registry at all (entitlement.ts imports fs) — so the server page resolves
 * the shelf (TIERS × TIER_PAGES × tierRailsOn) and injects it via
 * applyPackagesToPuck. Pinned below: the seed stores NO shelf and NO
 * names/prices, the published branch carries the live shelf, the rails-OFF
 * waitlist door holds the pinned props contract byte-for-byte.
 */

function isElement(n: unknown): n is ReactElement {
  return !!n && typeof n === "object" && "type" in (n as object) && "props" in (n as object);
}

function findAll(node: ReactNode, pred: (el: ReactElement) => boolean, out: ReactElement[] = []): ReactElement[] {
  if (Array.isArray(node)) {
    for (const n of node) findAll(n, pred, out);
    return out;
  }
  if (isElement(node)) {
    if (pred(node)) out.push(node);
    const children = (node.props as { children?: ReactNode } | null)?.children;
    if (children !== undefined) findAll(children, pred, out);
  }
  return out;
}

type SeedBlock = { type: string; props: Record<string, unknown> };

/* the fixture shelf, resolved exactly the way the page resolves it */
async function fixtureShelf(railsOn: boolean) {
  const { TIERS } = await import("@/lib/entitlement");
  const { TIER_PAGES } = await import("@/lib/tiers-content");
  return {
    railsOn,
    tiers: TIER_PAGES.map((p) => ({
      tier: p.tier,
      slug: p.slug,
      name: TIERS[p.tier].name,
      priceUsd: TIERS[p.tier].priceUsd,
      priceSats: TIERS[p.tier].priceSats,
    })),
  };
}

let tmpDir: string;

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "oc-puck-fixture-"));
  vi.resetModules();
  vi.stubEnv("PUCK_STORE_DRIVER", "filesystem");
  vi.stubEnv("PUCK_STORE_FS_DIR", tmpDir);
  vi.stubEnv("PUCK_STORE_NAMESPACE", "");
  vi.stubEnv("KV_REST_API_URL", "");
  vi.stubEnv("KV_REST_API_TOKEN", "");
});

afterAll(async () => {
  vi.unstubAllEnvs();
  if (tmpDir) await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
  cwd.cleanup();
});

describe("the seed — /style/packages opens pre-populated with her words", () => {
  it("SEEDS.packages exists, carrying the kicker, the heading, the lead, the footnote, and exactly one PackagesGrid entry", async () => {
    const { SEEDS } = await import("@/lib/puck-seeds");
    const seed = SEEDS.packages;
    expect(seed).toBeDefined();
    const content = seed.content as SeedBlock[];
    expect(Array.isArray(content)).toBe(true);

    const grids = content.filter((b) => b.type === "PackagesGrid");
    expect(grids).toHaveLength(1);

    const flat = JSON.stringify(content);
    expect(flat).toContain("The Heart Field — Where Heaven and Earth Meet");
    expect(flat).toContain("Memberships");
    expect(flat).toContain("Three ways into the field — each includes everything before it.");
    expect(flat).toContain("How the gate works:");
  });

  it("the lead closes on PACKAGE_DOORS_WORDS verbatim (T-229's exported const — transcribed, pinned against the source)", async () => {
    const { SEEDS } = await import("@/lib/puck-seeds");
    const { PACKAGE_DOORS_WORDS } = await import("@/components/sections");
    expect(JSON.stringify(SEEDS.packages.content)).toContain(PACKAGE_DOORS_WORDS);
  });

  it("names and prices NEVER enter the seed — they stay in TIERS and render through the block", async () => {
    const { SEEDS } = await import("@/lib/puck-seeds");
    const { TIERS } = await import("@/lib/entitlement");
    const flat = JSON.stringify(SEEDS.packages);
    for (const t of Object.values(TIERS)) {
      expect(flat).not.toContain(t.name);
      expect(flat).not.toContain(String(t.priceSats));
      expect(flat).not.toContain(t.priceSats.toLocaleString("en-US"));
    }
    expect(flat).not.toContain('"shelf"'); // the dynamic part never fossilises
  });

  it("the seed carries exactly one h1 — the publish rails' one-h1 rule is an ERROR, the seed must publish clean", async () => {
    const { SEEDS } = await import("@/lib/puck-seeds");
    const flat: SeedBlock[] = [];
    const walk = (v: unknown) => {
      if (Array.isArray(v)) { v.forEach(walk); return; }
      if (v && typeof v === "object") {
        const o = v as Record<string, unknown>;
        if (typeof o.type === "string" && o.props && typeof o.props === "object") flat.push(o as unknown as SeedBlock);
        Object.values(o).forEach(walk);
      }
    };
    walk(SEEDS.packages.content);
    const h1s = flat.filter((b) =>
      (b.type === "Heading" && b.props.level === "h1") ||
      (b.type === "StackedHeading" && b.props.tag === "h1") ||
      b.type === "Hero");
    expect(h1s).toHaveLength(1);
  });

  it("every block id in the seed is unique — slot children included (T-231's collision lesson)", async () => {
    const { SEEDS } = await import("@/lib/puck-seeds");
    const ids: string[] = [];
    const walk = (v: unknown) => {
      if (Array.isArray(v)) { v.forEach(walk); return; }
      if (v && typeof v === "object") {
        const o = v as Record<string, unknown>;
        if (typeof o.id === "string") ids.push(o.id);
        Object.values(o).forEach(walk);
      }
    };
    walk(SEEDS.packages.content);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toContain("pk-grid");
  });

  it("the block's feats arrays stay in lockstep with Packages()'s (source pin — sections.tsx is the fallback, not edited)", () => {
    const src = readFileSync(path.join(REPO, "src/components/sections.tsx"), "utf8");
    for (const f of [
      "Live weekly meetup in Love's room — 4× a month",
      "Explore your Clair Senses through breath",
      "Meditations, toning, light language",
      "A held energetic field, in community",
      "Everything in Weekly Intuitive",
      "Weekly recorded reading + affirmations",
      "Movement, meditation & navigation",
      "Everything in Weekly Intuitive & Observer",
      "Monthly 1–1½ hr focused meeting",
      "Quantum healing & reference tools",
      "All classes + full community",
    ]) {
      expect(src).toContain(f);
    }
  });
});

describe("the registry — puck-config + the copilot mirror (the lockstep law)", () => {
  it("PackagesGrid is registered in the real config and listed in the Layout group", async () => {
    const { config } = await import("@/lib/puck-config");
    const comps = config.components as Record<string, { label?: string }>;
    expect(comps.PackagesGrid).toBeDefined();
    const categories = config.categories as Record<string, { components?: string[] }>;
    expect(categories.layout.components).toContain("PackagesGrid");
  });

  it("the block renders its honest placeholder without an injected shelf (the designer side)", async () => {
    const { config } = await import("@/lib/puck-config");
    const block = (config.components as unknown as Record<string, { render: (p: Record<string, unknown>) => ReactElement }>).PackagesGrid;
    const html = renderToStaticMarkup(block.render({}));
    expect(html).toContain("live packages grid");
    expect(html).not.toContain("Weekly Intuitive");
  });

  it("the block renders the same cards as Packages() — pills, picture doors, prices, feats", async () => {
    const { config } = await import("@/lib/puck-config");
    const block = (config.components as unknown as Record<string, { render: (p: Record<string, unknown>) => ReactElement }>).PackagesGrid;
    const html = renderToStaticMarkup(block.render({ shelf: await fixtureShelf(false) }));
    expect(html).toContain('class="tier-pills"');
    expect(html).toContain("Weekly Intuitive");
    expect(html).toContain("Observer");
    expect(html).toContain("Evening Star");
    expect(html).toContain("$33<small>/mo</small>");
    expect(html).toContain("55,555 sats / month");
    expect(html).toContain('<a class="thumb-link" aria-label="Weekly Intuitive" href="/packages/weekly-intuitive">');
    expect(html).toContain("Live weekly meetup in Love&#x27;s room — 4× a month");
  });

  it("rails OFF — the doors are the waitlist form, holding the pinned packageWaitlistProps contract byte-for-byte", async () => {
    const { config } = await import("@/lib/puck-config");
    const { packageWaitlistProps } = await import("@/components/sections");
    const { packageGridWaitlistProps } = await import("@/lib/puck-blocks/packages-grid");
    const { TIER_PAGES } = await import("@/lib/tiers-content");
    // the block's door props ARE sections.tsx's pinned helper, byte-for-byte
    for (const p of TIER_PAGES) {
      expect(packageGridWaitlistProps(p.tier, p.slug)).toEqual(packageWaitlistProps(p.tier, p.slug));
    }
    const block = (config.components as unknown as Record<string, { render: (p: Record<string, unknown>) => ReactElement }>).PackagesGrid;
    const html = renderToStaticMarkup(block.render({ shelf: await fixtureShelf(false) }));
    expect(html).not.toContain("See the package");
    expect((html.match(/I&#x27;m interested/g) ?? []).length).toBe(3);
    expect(html).toContain("Add me to the pre-list — pre-order coming soon.");
  });

  it("rails ON — each card's door becomes the 'See the package' link, the waitlist form leaves", async () => {
    const { config } = await import("@/lib/puck-config");
    const block = (config.components as unknown as Record<string, { render: (p: Record<string, unknown>) => ReactElement }>).PackagesGrid;
    const html = renderToStaticMarkup(block.render({ shelf: await fixtureShelf(true) }));
    expect((html.match(/See the package/g) ?? []).length).toBe(3);
    expect(html).not.toContain("I&#x27;m interested");
    expect(html).toContain('<a class="btn btn-sm" href="/packages/observer">See the package</a>');
  });

  it("the LinkPicker's static routes include /packages (source pin — the picker is an inline closure)", () => {
    const src = readFileSync(path.join(REPO, "src/lib/puck-config.tsx"), "utf8");
    expect(src).toContain('{ label: "Packages", path: "/packages" }');
  });

  it("copilot.ts COMPONENTS mirrors PackagesGrid (source pin — COMPONENTS is module-private)", () => {
    const src = readFileSync(path.join(REPO, "src/lib/copilot.ts"), "utf8");
    expect(src).toContain('type: "PackagesGrid"');
  });
});

describe("applyPackagesToPuck — the render-time injection", () => {
  it("injects the shelf into PackagesGrid entries only; pure, input untouched", async () => {
    const { applyPackagesToPuck } = await import("@/lib/puck-blocks/packages-grid");
    const shelf = await fixtureShelf(false);
    const doc = {
      content: [
        { type: "Heading", props: { id: "h", text: "hi" } },
        { type: "PackagesGrid", props: { id: "g" } },
      ],
      root: {},
    };
    const out = applyPackagesToPuck(doc, shelf);
    expect(out).not.toBe(doc);
    const blocks = out.content as SeedBlock[];
    expect(blocks[0].props.shelf).toBeUndefined();
    expect(blocks[1].props.shelf).toBe(shelf);
    expect(JSON.stringify(doc)).not.toContain('"shelf"');
  });

  it("a doc with no PackagesGrid entry comes back the same reference (untouched-path law)", async () => {
    const { applyPackagesToPuck } = await import("@/lib/puck-blocks/packages-grid");
    const doc = { content: [{ type: "Heading", props: { id: "h" } }], root: {} };
    expect(applyPackagesToPuck(doc, await fixtureShelf(false))).toBe(doc);
  });
});

describe("PackagesPage — 1 gate → 2 Puck → 3 hand-built fallback", () => {
  it("memberships OFF swallows even a published doc — the route gate sits ABOVE the Puck read", async () => {
    const { saveSiteConfig } = await import("@/lib/site-config");
    await saveSiteConfig({ features: { memberships: false } }); // fixture file in the isolated cwd
    const store = await import("@/lib/puck-store");
    const { SEEDS } = await import("@/lib/puck-seeds");
    await store.setPuckDraft("packages", SEEDS.packages);
    await store.publishDraft("packages");

    const PackagesPage = (await import("@/app/packages/page")).default;
    const { default: NotOpenYet } = await import("@/components/NotOpenYet");
    const el = await PackagesPage();

    const { Render } = await import("@puckeditor/core");
    expect(findAll(el, (e) => e.type === Render)).toHaveLength(0);
    expect(findAll(el, (e) => e.type === NotOpenYet)).toHaveLength(1);
  });

  it("switch ON (the default), nothing published: the hand-built Packages() section, no Render", async () => {
    // the fixture config persists across this file's tests — pin the switches explicitly
    const { saveSiteConfig } = await import("@/lib/site-config");
    await saveSiteConfig({ features: { memberships: true, store: false } });
    const PackagesPage = (await import("@/app/packages/page")).default;
    const { Packages } = await import("@/components/sections");
    const el = await PackagesPage();

    const { Render } = await import("@puckeditor/core");
    expect(findAll(el, (e) => e.type === Render)).toHaveLength(0);
    expect(findAll(el, (e) => e.type === Packages)).toHaveLength(1);
  });

  it("draft-only (not yet published) still serves the hand-built page — drafts never leak to visitors", async () => {
    const { saveSiteConfig } = await import("@/lib/site-config");
    await saveSiteConfig({ features: { memberships: true, store: false } });
    const store = await import("@/lib/puck-store");
    await store.setPuckDraft("packages", { content: [{ type: "Heading", props: { id: "h1", text: "unpublished" } }], root: {} });

    const PackagesPage = (await import("@/app/packages/page")).default;
    const { Packages } = await import("@/components/sections");
    const el = await PackagesPage();

    const { Render } = await import("@puckeditor/core");
    expect(findAll(el, (e) => e.type === Render)).toHaveLength(0);
    expect(findAll(el, (e) => e.type === Packages)).toHaveLength(1);
  });

  it("after Publish to live in /style: the SAME request renders the published Puck doc with the live shelf injected", async () => {
    const { saveSiteConfig } = await import("@/lib/site-config");
    await saveSiteConfig({ features: { memberships: true, store: false } });
    const store = await import("@/lib/puck-store");
    const { SEEDS } = await import("@/lib/puck-seeds");
    await store.setPuckDraft("packages", SEEDS.packages);
    await store.publishDraft("packages");

    const PackagesPage = (await import("@/app/packages/page")).default;
    const { Packages } = await import("@/components/sections");
    const el = await PackagesPage();

    const { Render } = await import("@puckeditor/core");
    const renders = findAll(el, (e) => e.type === Render);
    expect(renders).toHaveLength(1);
    // the hand-built section is gone from this request's output
    expect(findAll(el, (e) => e.type === Packages)).toHaveLength(0);

    // the injection landed on the block's props…
    const data = (renders[0].props as { data: { content: SeedBlock[] } }).data;
    const grid = data.content.find((b) => b.type === "PackagesGrid");
    const shelf = grid?.props.shelf as { railsOn: boolean; tiers: unknown[] } | undefined;
    expect(Array.isArray(shelf?.tiers)).toBe(true);
    expect(shelf?.railsOn).toBe(false); // the store switch defaults OFF
    // …and the stored published doc was never written back with a shelf
    expect(JSON.stringify(await store.getPuckPage("packages"))).not.toContain('"shelf"');

    // the rendered page carries her seed words AND the live tier cards
    const html = renderToStaticMarkup(renders[0]);
    expect(html).toContain("The Heart Field — Where Heaven and Earth Meet");
    expect(html).toContain("Three ways into the field");
    expect(html).toContain("How the gate works:");
    expect(html).toContain("Weekly Intuitive");
    expect(html).toContain("55,555 sats / month");
    expect(html).toContain("I&#x27;m interested"); // rails OFF (default): the waitlist door
  });

  it("the published branch follows the store switch: rails ON flips the doors to the sale", async () => {
    const { saveSiteConfig } = await import("@/lib/site-config");
    await saveSiteConfig({ features: { memberships: true, store: true } }); // fixture file in the isolated cwd
    const store = await import("@/lib/puck-store");
    const { SEEDS } = await import("@/lib/puck-seeds");
    await store.setPuckDraft("packages", SEEDS.packages);
    await store.publishDraft("packages");

    const PackagesPage = (await import("@/app/packages/page")).default;
    const el = await PackagesPage();

    const { Render } = await import("@puckeditor/core");
    const renders = findAll(el, (e) => e.type === Render);
    expect(renders).toHaveLength(1);
    const html = renderToStaticMarkup(renders[0]);
    expect((html.match(/See the package/g) ?? []).length).toBe(3);
    expect(html).not.toContain("I&#x27;m interested");
  });
});
