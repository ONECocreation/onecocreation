import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";
import type { ReactElement } from "react";

/**
 * TASK-137 (0018.06.17 a₿) — the menu Love can shape. Pins:
 *
 *  · buildMenu()'s default: Community is a HEADER now, not a switch — it
 *    always carries Free meditation + 11:11 Live with Love, gains News &
 *    letters only when `news` is ON and Classes & rooms only when
 *    `classes` is ON, and Support never carries either stand-in again.
 *  · Affirmations() follows `features.store` exactly like the Admiral
 *    asked ("if I turn the store off the guided affirmations should be
 *    gone too") — called directly as a plain async function (no DOM
 *    renderer in this house's node-environment vitest; package-waitlist's
 *    own precedent renders only SYNCHRONOUS leaf components, so an async
 *    server component is asserted on its returned element instead).
 *  · A custom nav config: rename and reorder round-trip through buildMenu
 *    untouched, one level of nesting survives, and a page whose switch is
 *    OFF never renders even when Love's own saved nav lists it — the exact
 *    same PAGE_CATALOG/pageOn filter the default menu uses.
 *  · site-config.ts sanitize(): the new meeting fields (vdoRoomPrefix,
 *    staticUrl) default and round-trip, and choosing the static rail
 *    implies allowStaticLinks — no separate toggle needed.
 *  · resolveStaticMeetingUrl() (meet/[bookingId]/page.tsx): a service's own
 *    url wins, an old/blank one falls back to the site-wide standing link,
 *    and neither set resolves to null (no link ever invented).
 *
 * Env stubbed before any import, same pattern as tests/site-config.test.ts —
 * but the driver here is a FAKE KV (an in-memory Map behind a stubbed
 * `fetch`, not the fs dev file): three other gates already round-trip
 * through the same `data/site-config.json` path (jars.test.ts,
 * package-waitlist.test.ts, site-config.test.ts itself), and vitest runs
 * test files in separate processes in parallel — real disk contention on
 * that one shared path between four files was flaking `vitest run` about
 * one time in three once this file joined them. The KV path exercises the
 * exact same sanitize()/getSiteConfig()/saveSiteConfig() code this lane
 * changed; only the storage backing differs, and it lives entirely inside
 * this process, so it can never race another file's disk writes.
 */

let getSiteConfig: (typeof import("@/lib/site-config"))["getSiteConfig"];
let saveSiteConfig: (typeof import("@/lib/site-config"))["saveSiteConfig"];
let defaultSiteConfig: (typeof import("@/lib/site-config"))["defaultSiteConfig"];
let buildMenu: (typeof import("@/components/NavMenu"))["buildMenu"];
let PAGE_CATALOG: (typeof import("@/components/NavMenu"))["PAGE_CATALOG"];
let Affirmations: (typeof import("@/components/sections"))["Affirmations"];
let resolveStaticMeetingUrl: (typeof import("@/app/meet/[bookingId]/page"))["resolveStaticMeetingUrl"];

const kvStore = new Map<string, string>();
let lastKey: string | null = null;

async function fakeFetch(_url: string, init?: { body?: unknown }) {
  const [op, key, value] = JSON.parse(String(init?.body)) as [string, string, string?];
  lastKey = key;
  let result: string | null = null;
  if (op === "GET") result = kvStore.get(key) ?? null;
  else if (op === "SET") {
    kvStore.set(key, value ?? "");
    result = "OK";
  }
  return { ok: true, json: async () => ({ result }) } as Response;
}

beforeAll(async () => {
  process.env.NEXT_PUBLIC_SPACE_NAME = "onecocreation";
  process.env.KV_REST_API_URL = "http://fake-kv.invalid";
  process.env.KV_REST_API_TOKEN = "fake-token-nav-config-test";
  delete process.env.BLOB_READ_WRITE_TOKEN;
  delete process.env.REGISTRY_DRIVER;
  vi.stubGlobal("fetch", fakeFetch);
  ({ getSiteConfig, saveSiteConfig, defaultSiteConfig } = await import("@/lib/site-config"));
  ({ buildMenu, PAGE_CATALOG } = await import("@/components/NavMenu"));
  ({ Affirmations } = await import("@/components/sections"));
  ({ resolveStaticMeetingUrl } = await import("@/app/meet/[bookingId]/page"));
});

beforeEach(async () => {
  kvStore.clear();
  await getSiteConfig(); // re-warm the cache to defaults between tests
});

afterAll(() => {
  vi.unstubAllGlobals();
});

describe("buildMenu's default — Community is a header, not a switch", () => {
  it("community OFF: Community still stands with meditation + 11:11; news rides it too (ON by default)", () => {
    const menu = buildMenu(defaultSiteConfig());
    const community = menu.find((m) => m.label === "Community");
    expect(community).toBeTruthy();
    expect(community?.subs?.map((s) => s.label)).toEqual(
      expect.arrayContaining(["News & letters", "Free meditation", "11:11 Live with Love"]),
    );
    expect(community?.subs?.map((s) => s.label)).not.toContain("Classes & rooms");
    // Support carries only itself — the old fallback subs are gone
    expect(menu.find((m) => m.label === "Support")?.subs).toBeUndefined();
  });

  it("news OFF, classes ON: News & letters drops off Community, Classes & rooms joins", () => {
    const c = defaultSiteConfig();
    c.features.news = false;
    c.features.classes = true;
    const community = buildMenu(c).find((m) => m.label === "Community");
    expect(community?.subs?.map((s) => s.label)).not.toContain("News & letters");
    expect(community?.subs?.map((s) => s.label)).toContain("Classes & rooms");
    expect(community?.subs?.map((s) => s.label)).toContain("Free meditation");
    expect(community?.subs?.map((s) => s.label)).toContain("11:11 Live with Love");
  });

  it("store ON: the Store header carries Love's two buttons — Meditations and Memberships", () => {
    // Love's meeting (0018.06.17 a₿, RESUME NOTE): under the Store header,
    // two buttons; the header itself stays the click-through door to /store.
    const c = defaultSiteConfig();
    c.features.store = true;
    const store = buildMenu(c).find((m) => m.label === "Store");
    expect(store?.href).toBe("/store");
    expect(store?.subs?.map((s) => s.label)).toEqual(["Meditations", "Memberships"]);
    expect(store?.subs?.map((s) => s.href)).toEqual(["/meditation", "/memberships"]);
    // store OFF hides the whole header, buttons with it
    expect(buildMenu(defaultSiteConfig()).map((m) => m.label)).not.toContain("Store");
  });
});

describe("Affirmations() follows the store switch", () => {
  it("store OFF (the streamlined default): renders nothing", async () => {
    await saveSiteConfig({ features: { store: false } });
    const result = await Affirmations();
    expect(result).toBeNull();
  });

  it("store ON: renders the Guided Affirmations section", async () => {
    await saveSiteConfig({ features: { store: true } });
    const result = await Affirmations();
    expect(result).not.toBeNull();
    expect((result as ReactElement).type).toBe("section");
    expect((result as ReactElement<{ id: string }>).props.id).toBe("offers");
  });
});

describe("a nav config Love saved — rename, reorder, nest, and the switch filter", () => {
  it("rename + reorder round-trip through buildMenu untouched", () => {
    const c = defaultSiteConfig();
    c.nav = {
      items: [
        { id: "/support", label: "Get help", href: "/support" }, // renamed, moved first
        { id: "/about", label: "About", href: "/about" },
      ],
    };
    const menu = buildMenu(c);
    expect(menu.map((m) => m.label)).toEqual(["Get help", "About"]);
    expect(menu[0].href).toBe("/support");
  });

  it("one level of nesting survives: a page moved under a header shows as its sub", () => {
    const c = defaultSiteConfig();
    c.nav = {
      items: [
        {
          id: "/about",
          label: "About",
          href: "/about",
          children: [{ id: "/support", label: "Support", href: "/support" }],
        },
      ],
    };
    const menu = buildMenu(c);
    expect(menu).toHaveLength(1);
    expect(menu[0].label).toBe("About");
    expect(menu[0].subs?.map((s) => s.label)).toEqual(["Support"]);
  });

  it("a switched-off page never renders, even when Love's own saved nav lists it", () => {
    const c = defaultSiteConfig(); // store OFF, classes OFF by default
    c.nav = {
      items: [
        { id: "/about", label: "About", href: "/about" },
        { id: "/store", label: "Shop", href: "/store" }, // store OFF → must not render
        {
          id: "header-1",
          label: "Extras",
          children: [
            { id: "/classes", label: "Classes", href: "/classes" }, // classes OFF → filtered
            { id: "/support", label: "Support", href: "/support" }, // always on → survives
          ],
        },
      ],
    };
    const menu = buildMenu(c);
    expect(menu.map((m) => m.label)).not.toContain("Shop");
    const extras = menu.find((m) => m.label === "Extras");
    expect(extras?.subs?.map((s) => s.label)).toEqual(["Support"]);
    // flip store ON — the same saved nav now shows it, no re-save needed
    c.features.store = true;
    expect(buildMenu(c).map((m) => m.label)).toContain("Shop");
  });

  it("a broken/empty nav doc never blanks the menu — sanitize falls back to the default", async () => {
    await getSiteConfig(); // establish lastKey before hand-writing garbage under it
    kvStore.set(lastKey!, JSON.stringify({ nav: { items: [{ bogus: true }, { href: "/not-a-real-route" }] } }));
    const c = await getSiteConfig();
    expect(c.nav).toBeUndefined();
    expect(buildMenu(c).length).toBeGreaterThan(0);
  });

  it("PAGE_CATALOG's every href is a real route the store can actually filter", () => {
    // the page picker's own table — every entry names a plain label
    for (const p of PAGE_CATALOG) {
      expect(p.href.startsWith("/")).toBe(true);
      expect(p.label.length).toBeGreaterThan(0);
    }
  });
});

describe("site-config sanitize — the new per-rail meeting fields", () => {
  it("defaults: vdoRoomPrefix is the space name, staticUrl is blank", async () => {
    const c = await getSiteConfig();
    expect(c.meeting.vdoRoomPrefix).toBe("onecocreation");
    expect(c.meeting.staticUrl).toBe("");
  });

  it("round-trips a saved prefix and standing link", async () => {
    await saveSiteConfig({ meeting: { vdoRoomPrefix: "loves-room", staticUrl: "https://zoom.us/j/12345" } });
    const c = await getSiteConfig();
    expect(c.meeting.vdoRoomPrefix).toBe("loves-room");
    expect(c.meeting.staticUrl).toBe("https://zoom.us/j/12345");
  });

  it("choosing the static rail implies allowStaticLinks — no separate toggle needed", async () => {
    await saveSiteConfig({ meeting: { rail: "jitsi", allowStaticLinks: false } });
    expect((await getSiteConfig()).meeting.allowStaticLinks).toBe(false);
    await saveSiteConfig({ meeting: { rail: "static" } });
    expect((await getSiteConfig()).meeting.allowStaticLinks).toBe(true);
    // even an explicit false in the same patch loses to the rail's own implication
    await saveSiteConfig({ meeting: { rail: "static", allowStaticLinks: false } });
    expect((await getSiteConfig()).meeting.allowStaticLinks).toBe(true);
  });

  it("a blank/garbage vdoRoomPrefix falls back to the default, not an empty string", async () => {
    await getSiteConfig(); // establish lastKey before hand-writing garbage under it
    kvStore.set(lastKey!, JSON.stringify({ meeting: { vdoRoomPrefix: "   ", staticUrl: 42 } }));
    const c = await getSiteConfig();
    expect(c.meeting.vdoRoomPrefix).toBe("onecocreation");
    expect(c.meeting.staticUrl).toBe("");
  });
});

describe("resolveStaticMeetingUrl — the static rail's fallback", () => {
  it("the service's own url wins when set", () => {
    expect(resolveStaticMeetingUrl("https://zoom.us/j/own", "https://zoom.us/j/site")).toBe("https://zoom.us/j/own");
  });

  it("a blank/old service url falls back to the site-wide standing link", () => {
    expect(resolveStaticMeetingUrl("", "https://zoom.us/j/site")).toBe("https://zoom.us/j/site");
    expect(resolveStaticMeetingUrl(undefined, "https://zoom.us/j/site")).toBe("https://zoom.us/j/site");
    expect(resolveStaticMeetingUrl("   ", "https://zoom.us/j/site")).toBe("https://zoom.us/j/site");
  });

  it("neither set → null, never a fabricated link", () => {
    expect(resolveStaticMeetingUrl(undefined, "")).toBeNull();
    expect(resolveStaticMeetingUrl("", "  ")).toBeNull();
  });
});
