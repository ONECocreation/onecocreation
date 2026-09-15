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
/* TASK-231: isolated cwd FIRST — the fixture booking config + fixture order
   book (data/booking-config.json, data/store-orders/) land here, never in
   the repo's real data/. */
const cwd = isolateCwd("oc-retreats-puck-231-");

/**
 * TASK-231 (0018.06.24 a₿ · block 967,070) — /retreats becomes a designer
 * page: a Puck seed transcribed from the hand-built JSX, the live retreat
 * shelf as ONE data-bound block (RetreatsList), and the route reading Puck
 * first with today's JSX as the fallback (the /about-/memberships shape,
 * pinned for /memberships in tests/studio-publish.test.ts — same fixture
 * filesystem store here).
 *
 * RetreatsList is the house's FIRST data-bound block: it can't be an async
 * server component (puck-config.tsx rides the client bundle via
 * StyleEditor), so the server page resolves the shelf and injects it at
 * render time via applyRetreatsToPuck — pinned below: the seed stores NO
 * shelf, the published branch carries one, the cards render the fixture
 * booking config's live seat math.
 *
 * The page component is inspected as a plain React element tree where the
 * branch flip is the pin (SiteHeader/PopupHost throw under plain
 * react-dom/server — see studio-publish.test.ts's note), and the page's own
 * <Render> element is rendered to static markup for the live-shelf pin
 * (the real config, TASK-159's vitest inlining).
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

/* one live retreat in the fixture booking config; two of its eight seats
   sold through one settled order — the seat math the cards must show */
const RETREAT = {
  id: "fixture-retreat",
  title: "Fixture Desert Days",
  location: "Sedona",
  startDate: "2027-03-01",
  endDate: "2027-03-05",
  seats: 8,
  priceSats: 444000,
  depositSats: 111000,
  blurb: "Five fixture days under the red rocks.",
  status: "live" as const,
  createdAtMs: 1,
};

async function writeFixtureBookingConfig() {
  await fs.writeFile(
    path.join(cwd.dir, "data", "booking-config.json"),
    JSON.stringify({ schemaVersion: 1, services: [], rules: [], overrides: [], retreats: [RETREAT] }),
  );
  await fs.mkdir(path.join(cwd.dir, "data", "store-orders"), { recursive: true });
  await fs.writeFile(
    path.join(cwd.dir, "data", "store-orders", "aaaaaaaaaaaaaaaaaaaaaaaa.json"),
    JSON.stringify({
      id: "aaaaaaaaaaaaaaaaaaaaaaaa",
      schemaVersion: 2,
      state: "settled",
      lineItems: [{ itemId: "retreat-fixture-retreat", title: "Fixture Desert Days — a seat", qty: 2 }],
      priceSnapshot: { sats: 222000 },
      adapterId: "fixture",
      chargeIds: [],
      createdAtMs: 1,
    }),
  );
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

describe("the seed — /style/retreats opens pre-populated", () => {
  it("SEEDS.retreats exists, carrying the hero words and exactly one top-level RetreatsList entry", async () => {
    const { SEEDS } = await import("@/lib/puck-seeds");
    const seed = SEEDS.retreats;
    expect(seed).toBeDefined();
    const content = seed.content as SeedBlock[];
    expect(Array.isArray(content)).toBe(true);

    const lists = content.filter((b) => b.type === "RetreatsList");
    expect(lists).toHaveLength(1);
    expect(typeof lists[0].props.emptyText).toBe("string");

    const flat = JSON.stringify(content);
    expect(flat).toContain("A Journey, Not an Appointment");
    expect(flat).toContain("RETREATS");
    expect(flat).toContain("& EXCURSIONS");
    expect(flat).toContain("Blocks of days at a place, held together");
  });

  it("every block id in the seed is unique — slot children included (a collision double-renders the canvas)", async () => {
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
    walk(SEEDS.retreats.content);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toContain("rt-list");
  });

  it("the seed stores NO shelf — the dynamic part never fossilises (no `retreats` prop anywhere)", async () => {
    const { SEEDS } = await import("@/lib/puck-seeds");
    expect(JSON.stringify(SEEDS.retreats.content)).not.toContain('"retreats"');
    // root props carry the page's own title/description, mirroring the hand-built metadata
    const root = SEEDS.retreats.root as { props?: { title?: string; description?: string } };
    expect(root.props?.title).toBe("Retreats — One Cocreation");
    expect(root.props?.description).toContain("sold by the seat, paid in bitcoin");
  });
});

describe("the registry — puck-config + the copilot mirror (the lockstep law)", () => {
  it("RetreatsList is registered in the real config and listed in the Layout group", async () => {
    const { config } = await import("@/lib/puck-config");
    const comps = config.components as Record<string, { label?: string }>;
    expect(comps.RetreatsList).toBeDefined();
    const categories = config.categories as Record<string, { components?: string[] }>;
    expect(categories.layout.components).toContain("RetreatsList");
  });

  it("the block renders its honest placeholder without an injected shelf (the designer side)", async () => {
    const { config } = await import("@/lib/puck-config");
    const block = (config.components as unknown as Record<string, { render: (p: Record<string, unknown>) => ReactElement }>).RetreatsList;
    const html = renderToStaticMarkup(block.render({ emptyText: "No retreats yet" }));
    expect(html).toContain("live retreats shelf");
    expect(html).not.toContain("seats left");
  });

  it("the block renders the same cards as the hand-built page (markup-verbatim transcription)", async () => {
    const { config } = await import("@/lib/puck-config");
    const block = (config.components as unknown as Record<string, { render: (p: Record<string, unknown>) => ReactElement }>).RetreatsList;
    const html = renderToStaticMarkup(block.render({ emptyText: "No retreats yet", retreats: [{ ...RETREAT, seatsLeft: 6 }] }));
    expect(html).toContain("Fixture Desert Days");
    expect(html).toContain("Sedona");
    expect(html).toContain("444,000 sats");
    expect(html).toContain("111,000 holds a seat");
    expect(html).toContain("6 of 8 seats left");
    expect(html).toContain('href="/retreats/fixture-retreat"');
    expect(html).toContain("See the days");
  });

  it("the empty shelf renders the rewordable line plus the fixed letters door", async () => {
    const { config } = await import("@/lib/puck-config");
    const block = (config.components as unknown as Record<string, { render: (p: Record<string, unknown>) => ReactElement }>).RetreatsList;
    const html = renderToStaticMarkup(block.render({ emptyText: "The desert is resting", retreats: [] }));
    expect(html).toContain("The desert is resting");
    expect(html).toContain('href="/news"');
    expect(html).toContain("the letters");
  });

  it("the LinkPicker's static routes include /retreats (source pin — the picker is an inline closure)", () => {
    const src = readFileSync(path.join(REPO, "src/lib/puck-config.tsx"), "utf8");
    expect(src).toContain('{ label: "Retreats", path: "/retreats" }');
  });

  it("copilot.ts COMPONENTS mirrors RetreatsList (source pin — COMPONENTS is module-private)", () => {
    const src = readFileSync(path.join(REPO, "src/lib/copilot.ts"), "utf8");
    expect(src).toContain('type: "RetreatsList"');
  });
});

describe("applyRetreatsToPuck — the render-time injection", () => {
  it("injects the shelf into RetreatsList entries only; pure, input untouched", async () => {
    const { applyRetreatsToPuck } = await import("@/lib/puck-blocks/retreats-list");
    const doc = {
      content: [
        { type: "Heading", props: { id: "h", text: "hi" } },
        { type: "RetreatsList", props: { id: "l", emptyText: "empty" } },
      ],
      root: {},
    };
    const shelf = [{ ...RETREAT, seatsLeft: 6 }];
    const out = applyRetreatsToPuck(doc, shelf);
    expect(out).not.toBe(doc);
    const blocks = out.content as SeedBlock[];
    expect(blocks[0].props.retreats).toBeUndefined();
    expect(blocks[1].props.retreats).toBe(shelf);
    expect(blocks[1].props.emptyText).toBe("empty");
    // the stored doc keeps no shelf
    expect(JSON.stringify(doc)).not.toContain('"retreats"');
  });

  it("a doc with no RetreatsList entry comes back the same reference (untouched-path law)", async () => {
    const { applyRetreatsToPuck } = await import("@/lib/puck-blocks/retreats-list");
    const doc = { content: [{ type: "Heading", props: { id: "h" } }], root: {} };
    expect(applyRetreatsToPuck(doc, [])).toBe(doc);
  });
});

describe("RetreatsPage — Puck first, the hand-built page as fallback", () => {
  it("with nothing published: the hand-built page (its StackedHero), no Render", async () => {
    const RetreatsPage = (await import("@/app/retreats/page")).default;
    const { default: StackedHero } = await import("@/components/StackedHero");
    const el = await RetreatsPage();

    const { Render } = await import("@puckeditor/core");
    expect(findAll(el, (e) => e.type === Render)).toHaveLength(0);
    const heroes = findAll(el, (e) => e.type === StackedHero);
    expect(heroes).toHaveLength(1);
    expect((heroes[0].props as { kicker?: string }).kicker).toBe("A Journey, Not an Appointment");
  });

  it("draft-only (not yet published) still serves the hand-built page — drafts never leak to visitors", async () => {
    const store = await import("@/lib/puck-store");
    await store.setPuckDraft("retreats", { content: [{ type: "Heading", props: { id: "h1", text: "unpublished" } }], root: {} });

    const RetreatsPage = (await import("@/app/retreats/page")).default;
    const { default: StackedHero } = await import("@/components/StackedHero");
    const el = await RetreatsPage();

    const { Render } = await import("@puckeditor/core");
    expect(findAll(el, (e) => e.type === Render)).toHaveLength(0);
    expect(findAll(el, (e) => e.type === StackedHero)).toHaveLength(1);
  });

  it("after Publish to live in /style: the SAME request renders the published Puck doc", async () => {
    const store = await import("@/lib/puck-store");
    const style = { font: "default", size: 0, kerning: 0, lineHeight: 0, color: "default", spaceAbove: 0, spaceBelow: 0 };
    const doc = { content: [{ type: "Heading", props: { id: "h1", text: "Fixture publish — retreats live", level: "h1", align: "center", style } }], root: {} };
    await store.setPuckDraft("retreats", doc);
    await store.publishDraft("retreats");

    const RetreatsPage = (await import("@/app/retreats/page")).default;
    const { default: StackedHero } = await import("@/components/StackedHero");
    const el = await RetreatsPage();

    const { Render } = await import("@puckeditor/core");
    const renders = findAll(el, (e) => e.type === Render);
    expect(renders).toHaveLength(1);
    // no RetreatsList entry in this doc ⇒ the data passes through untouched
    expect((renders[0].props as { data?: unknown }).data).toEqual(doc);
    expect(renderToStaticMarkup(renders[0])).toContain("Fixture publish — retreats live");
    // the hand-built branch is gone from this request's output
    expect(findAll(el, (e) => e.type === StackedHero)).toHaveLength(0);
  });

  it("the published branch live-reads the shelf: the RetreatsList block renders the fixture seat math", async () => {
    await writeFixtureBookingConfig();
    const store = await import("@/lib/puck-store");
    const doc = {
      content: [{ type: "RetreatsList", props: { id: "rl", emptyText: "No retreats on the horizon just now" } }],
      root: {},
    };
    await store.setPuckDraft("retreats", doc);
    await store.publishDraft("retreats");

    const RetreatsPage = (await import("@/app/retreats/page")).default;
    const el = await RetreatsPage();

    const { Render } = await import("@puckeditor/core");
    const renders = findAll(el, (e) => e.type === Render);
    expect(renders).toHaveLength(1);

    // the injection landed on the block's props…
    const data = (renders[0].props as { data: { content: SeedBlock[] } }).data;
    const list = data.content.find((b) => b.type === "RetreatsList");
    expect(Array.isArray(list?.props.retreats)).toBe(true);
    // …and the stored published doc was never written back with a shelf
    expect(JSON.stringify(await store.getPuckPage("retreats"))).not.toContain('"retreats"');

    // the cards carry the fixture's live seat math: 8 seats, 2 settled ⇒ 6 left
    const html = renderToStaticMarkup(renders[0]);
    expect(html).toContain("Fixture Desert Days");
    expect(html).toContain("6 of 8 seats left");
    expect(html).toContain("444,000 sats");
  });
});
