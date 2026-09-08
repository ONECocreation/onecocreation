import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";
import fs from "node:fs";
import type { ReactElement, ReactNode } from "react";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

/**
 * TASK-176 (0018.06.18 a₿ · block 966098) — the Store's Meditations door
 * opens the meditations shelf, and the free one is a card there. Pins:
 *
 *  · KNOWN_NAV_HREFS carries /store/meditations and /store/memberships (the
 *    storage-layer allow-list — the door the house built);
 *  · both filtered routes render ONLY their own section — /store/meditations
 *    carries digital items (the free gift as its first card), /store/-
 *    memberships carries package items; the whole-shelf link rides both;
 *  · both routes gate on the store switch exactly like /store (T-137's
 *    shared NotOpenYet, never a dead page);
 *  · the free card: first in the row, both faces' doors go to /meditation,
 *    the price reads "free · a gift", no checkout words anywhere — and it
 *    is HIDDEN when the gift's audio is absent (derive-or-dash, the file
 *    itself is the truth);
 *  · /store's own meditations section carries the same free card first.
 *
 * Env stubbed before any import, same fake-KV pattern as
 * tests/nav-config.test.ts — one in-memory Map serves BOTH the site-config
 * doc (site:config:<tenant>) and the store catalog (store:catalog), so no
 * disk path is touched and nothing can race another file. hasFreeMeditation
 * reads the repo's real public/audio (the gift ships with the site); the
 * absent case is pinned by spying fs.existsSync.
 */

let getSiteConfig: (typeof import("@/lib/site-config"))["getSiteConfig"];
let saveSiteConfig: (typeof import("@/lib/site-config"))["saveSiteConfig"];
let KNOWN_NAV_HREFS: (typeof import("@/lib/site-config"))["KNOWN_NAV_HREFS"];

const kvStore = new Map<string, string>();

async function fakeFetch(_url: string, init?: { body?: unknown }) {
  const [op, key, value] = JSON.parse(String(init?.body)) as [string, string, string?];
  let result: string | null = null;
  if (op === "GET") result = kvStore.get(key) ?? null;
  else if (op === "SET") {
    kvStore.set(key, value ?? "");
    result = "OK";
  }
  return { ok: true, json: async () => ({ result }) } as Response;
}

/** a v2 catalog item, minimal but real */
function item(over: Record<string, unknown>) {
  return {
    id: "x",
    schemaVersion: 2,
    title: "X",
    blurb: "words",
    images: [],
    price: {},
    status: "live",
    ...over,
  };
}

const CATALOG = {
  schemaVersion: 2,
  items: [
    item({ id: "i-am-worthy", title: "I AM Worthy", kind: "digital", fulfillment: "digital", price: { sats: 21000 } }),
    item({ id: "thank-you-wakeup", title: "Thank You Wakeup", kind: "digital", fulfillment: "digital", price: { sats: 11111 } }),
    item({ id: "weekly-intuitive-month", title: "The Weekly Intuitive", kind: "package", fulfillment: "package", entitlementTier: "A", price: { sats: 33000 } }),
    item({ id: "a-tote", title: "A Tote", kind: "self", fulfillment: "self", price: { sats: 55000 } }),
  ],
};

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

beforeAll(async () => {
  process.env.NEXT_PUBLIC_SPACE_NAME = "onecocreation";
  process.env.KV_REST_API_URL = "http://fake-kv.invalid";
  process.env.KV_REST_API_TOKEN = "fake-token-meditations-shelf-test";
  delete process.env.BLOB_READ_WRITE_TOKEN;
  delete process.env.REGISTRY_DRIVER;
  vi.stubGlobal("fetch", fakeFetch);
  ({ getSiteConfig, saveSiteConfig, KNOWN_NAV_HREFS } = await import("@/lib/site-config"));
});

beforeEach(async () => {
  kvStore.clear();
  kvStore.set("store:catalog", JSON.stringify(CATALOG));
  await getSiteConfig(); // re-warm the cache to defaults between tests
});

afterAll(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("KNOWN_NAV_HREFS — the two shelf routes are known doors", () => {
  it("carries /store/meditations and /store/memberships", () => {
    expect(KNOWN_NAV_HREFS).toContain("/store/meditations");
    expect(KNOWN_NAV_HREFS).toContain("/store/memberships");
  });
});

describe("the filtered routes render ONLY their own section", () => {
  it("/store/meditations — the meditations section only, free card flagged on, whole-shelf link present", async () => {
    await saveSiteConfig({ features: { store: true } });
    const { default: StoreMeditationsPage } = await import("@/app/store/meditations/page");
    const { default: ShelfSection } = await import("@/components/store/ShelfSection");
    const el = await StoreMeditationsPage();

    const sections = findAll(el, (e) => e.type === ShelfSection);
    expect(sections).toHaveLength(1);
    const props = sections[0].props as {
      group: { anchor: string; items: { id: string; kind: string }[] };
      withFreeCard?: boolean;
      wholeShelfLink?: boolean;
    };
    expect(props.group.anchor).toBe("meditations");
    // only the digital items, price-ascending — no packages, no wares
    expect(props.group.items.map((i) => i.id)).toEqual(["thank-you-wakeup", "i-am-worthy"]);
    expect(props.group.items.every((i) => i.kind === "digital")).toBe(true);
    expect(props.withFreeCard).toBe(true);
    expect(props.wholeShelfLink).toBe(true);
  });

  it("/store/memberships — the memberships section only, no free card", async () => {
    await saveSiteConfig({ features: { store: true } });
    const { default: StoreMembershipsPage } = await import("@/app/store/memberships/page");
    const { default: ShelfSection } = await import("@/components/store/ShelfSection");
    const el = await StoreMembershipsPage();

    const sections = findAll(el, (e) => e.type === ShelfSection);
    expect(sections).toHaveLength(1);
    const props = sections[0].props as {
      group: { anchor: string; items: { id: string; kind: string }[] };
      withFreeCard?: boolean;
      wholeShelfLink?: boolean;
    };
    expect(props.group.anchor).toBe("memberships");
    expect(props.group.items.map((i) => i.id)).toEqual(["weekly-intuitive-month"]);
    expect(props.group.items.every((i) => i.kind === "package")).toBe(true);
    expect(props.withFreeCard).toBeFalsy();
    expect(props.wholeShelfLink).toBe(true);
  });

  it("store OFF: both routes answer the shared NotOpenYet panel, never a dead page", async () => {
    await saveSiteConfig({ features: { store: false } });
    const { default: NotOpenYet } = await import("@/components/NotOpenYet");
    const { default: StoreMeditationsPage } = await import("@/app/store/meditations/page");
    const { default: StoreMembershipsPage } = await import("@/app/store/memberships/page");
    expect(findAll(await StoreMeditationsPage(), (e) => e.type === NotOpenYet)).toHaveLength(1);
    expect(findAll(await StoreMembershipsPage(), (e) => e.type === NotOpenYet)).toHaveLength(1);
  });
});

describe("the free meditation card on the shelf", () => {
  const group = {
    anchor: "meditations",
    title: "Meditations & Journeys",
    pill: "Meditations",
    blurb: "Recorded affirmations and journeys — yours the moment payment settles.",
    kinds: ["digital"] as ("digital")[],
    icon: "🌙",
    items: [
      item({ id: "thank-you-wakeup", title: "Thank You Wakeup", kind: "digital", fulfillment: "digital", price: { sats: 11111 } }),
    ] as never,
  };

  it("renders FIRST in the grid, ahead of the paid cards", async () => {
    const { default: ShelfSection } = await import("@/components/store/ShelfSection");
    const { default: FreeMeditationCard } = await import("@/components/store/FreeMeditationCard");
    const { default: StoreItemCard } = await import("@/components/store/StoreItemCard");
    const el = ShelfSection({ group, rails: { btc: true, card: true }, withFreeCard: true });

    const grids = findAll(el, (e) =>
      typeof (e.props as { className?: string }).className === "string" &&
      ((e.props as { className?: string }).className ?? "").startsWith("grid "));
    expect(grids).toHaveLength(1);
    const kids = (grids[0].props as { children: ReactNode[] }).children
      .flatMap((c) => (Array.isArray(c) ? c : [c]))
      .filter(Boolean);
    expect((kids[0] as ReactElement).type).toBe(FreeMeditationCard);
    expect((kids[1] as ReactElement).type).toBe(StoreItemCard);
  });

  it("is HIDDEN when the site's free meditation is absent (derive-or-dash)", async () => {
    const spy = vi.spyOn(fs, "existsSync").mockReturnValue(false);
    try {
      const { default: ShelfSection, hasFreeMeditation } = await import("@/components/store/ShelfSection");
      const { default: FreeMeditationCard } = await import("@/components/store/FreeMeditationCard");
      expect(hasFreeMeditation()).toBe(false);
      const el = ShelfSection({ group, rails: { btc: true, card: true }, withFreeCard: true });
      expect(findAll(el, (e) => e.type === FreeMeditationCard)).toHaveLength(0);
    } finally {
      spy.mockRestore();
    }
  });

  it("its words are the gift's own, its doors go to /meditation, and no checkout rides it", async () => {
    const { default: FreeMeditationCard } = await import("@/components/store/FreeMeditationCard");
    const html = renderToStaticMarkup(createElement(FreeMeditationCard));
    expect(html).toContain("Unzip Into the New You");
    expect(html).toContain("free · a gift");
    // the front's door and the back's Full view both go to the gift's page
    expect(html.match(/href="\/meditation"/g)?.length).toBe(2);
    // not a catalog item: no price in sats or dollars, no basket, no buy door
    expect(html).not.toContain("sats");
    expect(html).not.toContain("$");
    expect(html.toLowerCase()).not.toContain("basket");
    expect(html.toLowerCase()).not.toContain("checkout");
  });

  it("/store's own meditations section carries the same free card (withFreeCard on that group only)", async () => {
    await saveSiteConfig({ features: { store: true } });
    const { default: StorePage } = await import("@/app/store/page");
    const { default: ShelfSection } = await import("@/components/store/ShelfSection");
    const el = await StorePage();
    const sections = findAll(el, (e) => e.type === ShelfSection);
    const byAnchor = new Map(sections.map((s) => [
      (s.props as { group: { anchor: string } }).group.anchor,
      s.props as { withFreeCard?: boolean },
    ]));
    expect(byAnchor.get("meditations")?.withFreeCard).toBe(true);
    expect(byAnchor.get("memberships")?.withFreeCard).toBeFalsy();
    expect(byAnchor.get("wares")?.withFreeCard).toBeFalsy();
  });
});
