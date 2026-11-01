import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";
import type { ReactElement } from "react";
import { COLLABORATIONS_HREF, COLLABORATIONS_SUBS, DOTERRA_TAB_LABEL, DOTERRA_URL, PLACEHOLDER_NAV_HREFS } from "@/lib/collab-tabs";

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
let buildDefaultMenu: (typeof import("@/components/NavMenu"))["buildDefaultMenu"];
let PAGE_CATALOG: (typeof import("@/components/NavMenu"))["PAGE_CATALOG"];
let navTabHere: (typeof import("@/components/NavMenu"))["navTabHere"];
let navChildHere: (typeof import("@/components/NavMenu"))["navChildHere"];
let Affirmations: (typeof import("@/components/sections"))["Affirmations"];
let Packages: (typeof import("@/components/sections"))["Packages"];
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
  ({ buildMenu, buildDefaultMenu, PAGE_CATALOG, navTabHere, navChildHere } = await import("@/components/NavMenu"));
  ({ Affirmations, Packages } = await import("@/components/sections"));
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
  it("community OFF: Community still stands with meditation + 11:11 + the reading room; news rides it too (ON by default)", () => {
    const menu = buildMenu(defaultSiteConfig());
    const community = menu.find((m) => m.label === "Community");
    expect(community).toBeTruthy();
    expect(community?.subs?.map((s) => s.label)).toEqual(
      expect.arrayContaining(["News & letters", "Free meditation", "11:11 Live with Love", "Read with Love"]),
    );
    // TASK-213: "Classes & rooms" split into two doors — Classes (still
    // classes-gated) and The reading room (always on, its own gate)
    expect(community?.subs?.map((s) => s.label)).not.toContain("Classes & rooms");
    expect(community?.subs?.map((s) => s.label)).not.toContain("Classes");
    // Support carries only itself — the old fallback subs are gone
    expect(menu.find((m) => m.label === "Support")?.subs).toBeUndefined();
  });

  it("news OFF, classes ON: News & letters drops off Community, Classes joins beside the reading room", () => {
    const c = defaultSiteConfig();
    c.features.news = false;
    c.features.classes = true;
    const community = buildMenu(c).find((m) => m.label === "Community");
    expect(community?.subs?.map((s) => s.label)).not.toContain("News & letters");
    expect(community?.subs?.map((s) => s.label)).toContain("Classes");
    expect(community?.subs?.map((s) => s.label)).toContain("Read with Love");
    expect(community?.subs?.map((s) => s.label)).toContain("Free meditation");
    expect(community?.subs?.map((s) => s.label)).toContain("11:11 Live with Love");
  });

  it("store ON: the Store header carries Sessions, Meditations, Memberships and Three packages (T-615)", () => {
    // T-615 (the Admiral: "ok to move to this layout"): Sessions and Three
    // packages moved under Store; the Memberships TAB folded away. The
    // header stays the click-through door to /store. The free gift keeps
    // /meditation under Community.
    const c = defaultSiteConfig();
    c.features.store = true;
    c.features.sessions = true;
    c.features.memberships = true;
    const menu = buildMenu(c);
    // T-637: the Collaborations + doTERRA tabs joined the default menu
    // between Community and Support (block 973,977, the Admiral's "ok to
    // build") — the pinned order gains both.
    expect(menu.map((m) => m.label)).toEqual(["About", "Store", "Community", "Collaborations", "doTERRA", "Support"]);
    const store = menu.find((m) => m.label === "Store");
    expect(store?.href).toBe("/store");
    expect(store?.subs?.map((s) => s.label)).toEqual(["Sessions", "Meditations", "Memberships", "Three packages"]);
    expect(store?.subs?.map((s) => s.href)).toEqual(["/book", "/store/meditations", "/store/memberships", "/packages"]);
    const community = menu.find((m) => m.label === "Community");
    expect(community?.subs?.find((s) => s.label === "Free meditation")?.href).toBe("/meditation");
    expect(community?.subs?.map((s) => s.label).slice(0, 2)).toEqual(["Read with Love", "Replays"]);
    // every href appears once in the whole menu (nothing doubled by the moves)
    const hrefs = menu.flatMap((m) => (m.subs ? m.subs.map((x) => x.href) : [m.href]));
    expect(new Set(hrefs).size).toBe(hrefs.length);
    // store OFF keeps only the rows whose own switch is on (no meditations shelf)
    const off = defaultSiteConfig();
    off.features.store = false;
    off.features.sessions = false;
    off.features.memberships = false;
    expect(buildMenu(off).map((m) => m.label)).not.toContain("Store");
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
    kvStore.set(lastKey!, JSON.stringify({ nav: { items: [{ bogus: true }, { href: "javascript:alert(1)" }, { href: "http://plain.example" }] } }));
    const c = await getSiteConfig();
    expect(c.nav).toBeUndefined();
    expect(buildMenu(c).length).toBeGreaterThan(0);
  });

  it("T-620: a menu row may be an https link or a coming-later path, and a heading-only tab survives", async () => {
    await getSiteConfig();
    kvStore.set(lastKey!, JSON.stringify({ nav: { items: [
      { id: "a", label: "Travels", href: "https://lovestravels.example" },
      { id: "b", label: "Soon", href: "/travels" },
      { id: "c", label: "Gifts", children: [] },
      { id: "d", label: "Bad", href: "javascript:alert(1)" },
    ] } }));
    const c = await getSiteConfig();
    expect(c.nav?.items.map((i) => i.label)).toEqual(["Travels", "Soon", "Gifts"]);
    expect(buildMenu(c).map((m) => m.label)).toEqual(["Travels", "Soon"]); // a heading hides until it holds a page
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

/* TASK-176 (0018.06.18 a₿ · block 966098) — the two pins below. */

describe("TASK-176 — the Store header's read-migration", () => {
  it("a saved nav whose Store header still says /meditation migrates on read to /store/meditations", async () => {
    await getSiteConfig(); // establish lastKey before hand-writing the old-shape doc under it
    kvStore.set(lastKey!, JSON.stringify({
      features: { store: true },
      nav: {
        items: [
          {
            id: "/store", label: "Store", href: "/store",
            children: [
              { id: "/meditation", label: "Meditations", href: "/meditation" }, // the pre-T-176 default
              { id: "/memberships", label: "Memberships", href: "/memberships" },
            ],
          },
          {
            id: "/classes", label: "Community", href: "/classes",
            children: [{ id: "/meditation", label: "Free meditation", href: "/meditation" }],
          },
        ],
      },
    }));
    const c = await getSiteConfig();
    const store = c.nav?.items.find((i) => i.href === "/store");
    // the Store header's Meditations child migrated…
    expect(store?.children?.map((ch) => ch.href)).toEqual(["/store/meditations", "/memberships"]);
    // …label and id are Love's, untouched
    expect(store?.children?.[0].label).toBe("Meditations");
    // the Community header's Free meditation child keeps /meditation — it IS the gift
    const community = c.nav?.items.find((i) => i.label === "Community");
    expect(community?.children?.[0].href).toBe("/meditation");
    // and the migrated menu renders the shelf route through buildMenu
    const menu = buildMenu(c);
    expect(menu.find((m) => m.label === "Store")?.subs?.[0].href).toBe("/store/meditations");
  });
});

describe("TASK-176 — the nav underline ruling (Admiral, 0018.06.17)", () => {
  const storeTab = {
    label: "Store",
    href: "/store",
    subs: [
      { label: "Meditations", href: "/store/meditations" },
      { label: "Memberships", href: "/store/memberships" },
    ],
  };

  it("a header tab is underlined ONLY when the page IS that tab — never for a child", () => {
    expect(navTabHere("/store", storeTab)).toBe(true);
    // the Admiral's case: /memberships must NOT light the Store tab
    expect(navTabHere("/memberships", storeTab)).toBe(false);
    // nor do the shelf's own filtered routes or an item page
    expect(navTabHere("/store/meditations", storeTab)).toBe(false);
    expect(navTabHere("/store/memberships", storeTab)).toBe(false);
    expect(navTabHere("/store/some-item", storeTab)).toBe(false);
    expect(navTabHere("/", storeTab)).toBe(false);
  });

  it("the child button keeps its own current mark (exact page or its own sub-path)", () => {
    expect(navChildHere("/store/meditations", "/store/meditations")).toBe(true);
    expect(navChildHere("/memberships", "/memberships")).toBe(true);
    expect(navChildHere("/book/xyz", "/book")).toBe(true); // a child's own sub-path still marks it
    expect(navChildHere("/store", "/store/meditations")).toBe(false);
    expect(navChildHere("/memberships", "/store/memberships")).toBe(false);
  });
});

/* TASK-187 (0018.06.18 a₿ · block 966,104) — THE MEMBERSHIPS SWITCH.
   "I didn't see a way to turn on and off the memberships" (the Admiral).
   Pins:
    · buildDefaultMenu(): the top-level Memberships door follows its own
      switch (default ON, so nothing visibly changes until it's flipped),
      and the Store header's Memberships button follows it TOO — on top of
      the store switch it already needed;
    · PAGE_CATALOG: /memberships and /packages carry `feature: "memberships"`,
      /store/memberships now needs BOTH `store` and `memberships` (an array);
    · buildMenu()'s custom-nav filter (pageOn) honors the same multi-switch
      row, and a saved nav's /memberships / /packages rows still survive
      sanitize (KNOWN_NAV_HREFS never lost these hrefs). */

describe("TASK-187 — the memberships switch", () => {
  it("buildDefaultMenu (T-615): no Memberships tab and no Sessions tab; Three packages sits under Store, Heart Field under Community", () => {
    const menu = buildDefaultMenu(defaultSiteConfig());
    expect(menu.map((m) => m.label)).not.toContain("Memberships");
    expect(menu.map((m) => m.label)).not.toContain("Sessions");
    expect(menu.find((m) => m.label === "Store")?.subs?.map((s) => s.href)).toContain("/packages");
    expect(menu.find((m) => m.label === "Community")?.subs?.map((s) => s.href)).toContain("/rooms/heart-field");
  });

  it("the Store header's Memberships row follows memberships too, on top of the store switch", () => {
    const c = defaultSiteConfig();
    c.features.store = true;
    c.features.sessions = false;
    const labels = () => buildDefaultMenu(c).find((m) => m.label === "Store")?.subs?.map((s) => s.label);
    expect(labels()).toEqual(["Meditations", "Memberships", "Three packages"]);
    c.features.memberships = false;
    expect(labels()).toEqual(["Meditations"]);
  });

  it("PAGE_CATALOG: /memberships and /packages carry feature: \"memberships\"; /store/memberships needs both switches", () => {
    expect(PAGE_CATALOG.find((p) => p.href === "/memberships")?.feature).toBe("memberships");
    expect(PAGE_CATALOG.find((p) => p.href === "/packages")?.feature).toBe("memberships");
    expect(PAGE_CATALOG.find((p) => p.href === "/store/memberships")?.feature).toEqual(["store", "memberships"]);
  });

  it("buildMenu's custom-nav filter: a saved row to /memberships follows the switch, same as the default menu", () => {
    const c = defaultSiteConfig();
    c.nav = { items: [{ id: "/memberships", label: "Field", href: "/memberships" }] };
    expect(buildMenu(c).map((m) => m.label)).toContain("Field"); // memberships ON by default
    c.features.memberships = false;
    expect(buildMenu(c).map((m) => m.label)).not.toContain("Field");
  });

  it("buildMenu's custom-nav filter: /store/memberships needs BOTH switches, not just one", () => {
    const c = defaultSiteConfig();
    c.features.store = true;
    c.nav = {
      items: [
        {
          id: "header-1",
          label: "Shelf",
          children: [{ id: "/store/memberships", label: "Memberships shelf", href: "/store/memberships" }],
        },
      ],
    };
    // store ON, memberships ON (default) → survives
    expect(buildMenu(c).find((m) => m.label === "Shelf")?.subs?.map((s) => s.label)).toEqual(["Memberships shelf"]);
    // store ON, memberships OFF → filtered out, the header itself then has nothing left and drops too
    c.features.memberships = false;
    expect(buildMenu(c).map((m) => m.label)).not.toContain("Shelf");
  });

  it("a saved nav's /memberships and /packages rows survive sanitize — the KNOWN_NAV_HREFS allow-list never lost them", async () => {
    await saveSiteConfig({
      nav: {
        items: [
          { id: "/memberships", label: "Field", href: "/memberships" },
          { id: "/packages", label: "Packages", href: "/packages" },
        ],
      },
    });
    const c = await getSiteConfig();
    expect(c.nav?.items.map((i) => i.href)).toEqual(["/memberships", "/packages"]);
  });

  it("site-config sanitize: memberships defaults ON and round-trips through save/get", async () => {
    const c = await getSiteConfig();
    expect(c.features.memberships).toBe(true);
    await saveSiteConfig({ features: { memberships: false } });
    expect((await getSiteConfig()).features.memberships).toBe(false);
    await saveSiteConfig({ features: { memberships: true } });
    expect((await getSiteConfig()).features.memberships).toBe(true);
  });
});

describe("Packages() — the home hero's package doors follow the memberships switch", () => {
  it("memberships ON (the default): renders the three-card section", async () => {
    await saveSiteConfig({ features: { memberships: true } });
    const result = await Packages();
    expect(result).not.toBeNull();
    expect((result as ReactElement).type).toBe("section");
    expect((result as ReactElement<{ id: string }>).props.id).toBe("packages");
  });

  it("memberships OFF: renders nothing — same visibility-only idiom as Affirmations()", async () => {
    await saveSiteConfig({ features: { memberships: false } });
    const result = await Packages();
    expect(result).toBeNull();
  });
});

/* TASK-637 (block 973,977 — K185 item 1, the Admiral's "ok to build" on the
   approved mockup): the Collaborations + doTERRA tabs ride the default menu
   for real; the placeholders live in src/lib/collab-tabs.ts (Love's seam). */

describe("TASK-637 — the Collaborations + doTERRA tabs in the default menu", () => {
  it("Collaborations sits between Community and Support, with Love's five rows in her order, one level deep", () => {
    const menu = buildDefaultMenu(defaultSiteConfig());
    // memberships ON by default keeps a one-row Store header (Three packages)
    expect(menu.map((m) => m.label)).toEqual(["About", "Store", "Community", "Collaborations", "doTERRA", "Support"]);
    const collab = menu.find((m) => m.label === "Collaborations");
    expect(collab?.href).toBe(COLLABORATIONS_HREF);
    expect(collab?.subs).toEqual(COLLABORATIONS_SUBS);
    expect(collab?.subs?.map((s) => s.label)).toEqual([
      "Universally Local", "Local artist", "Local practitioners", "Stay Locally", "Find them on the map",
    ]);
    // the one-level law: "Universally Local" is the drop's first row, never a nested fly-out
    expect(collab?.subs?.every((s) => !("subs" in s))).toBe(true);
  });

  it("the doTERRA tab is a leaf riding the placeholder link, label case exactly as Love wrote it", () => {
    const dot = buildDefaultMenu(defaultSiteConfig()).find((m) => m.label === DOTERRA_TAB_LABEL);
    expect(DOTERRA_TAB_LABEL).toBe("doTERRA");
    expect(dot).toBeTruthy();
    expect(dot?.subs).toBeUndefined();
    expect(dot?.href).toBe(DOTERRA_URL);
  });

  it("the placeholder hrefs ride PLACEHOLDER_NAV_HREFS — the nav never prefetches a page that doesn't exist yet", () => {
    expect(PLACEHOLDER_NAV_HREFS.has(COLLABORATIONS_HREF)).toBe(true);
    for (const sub of COLLABORATIONS_SUBS.filter((s) => s.href.startsWith("/"))) {
      expect(PLACEHOLDER_NAV_HREFS.has(sub.href)).toBe(true);
    }
    // the external rows (the map link) are never prefetched by Next anyway
    expect(PLACEHOLDER_NAV_HREFS.has("https://maps.example.com/universally-local")).toBe(false);
  });

  it("both tabs render pre-fetch (s === null): no switch gates either of them", () => {
    const labels = buildMenu(null).map((m) => m.label);
    expect(labels).toContain("Collaborations");
    expect(labels).toContain("doTERRA");
  });

  it("a saved nav carrying the new rows survives sanitize — isOpenNavHref admits them, KNOWN_NAV_HREFS unchanged", async () => {
    await saveSiteConfig({
      nav: {
        items: [
          {
            id: COLLABORATIONS_HREF, label: "Collaborations", href: COLLABORATIONS_HREF,
            children: COLLABORATIONS_SUBS.map((s) => ({ id: s.href, label: s.label, href: s.href })),
          },
          { id: DOTERRA_URL, label: "doTERRA", href: DOTERRA_URL },
        ],
      },
    });
    const c = await getSiteConfig();
    expect(c.nav?.items.map((i) => i.label)).toEqual(["Collaborations", "doTERRA"]);
    expect(c.nav?.items[0].children).toHaveLength(5);
    const menu = buildMenu(c);
    expect(menu.map((m) => m.label)).toEqual(["Collaborations", "doTERRA"]);
    expect(menu[0].subs?.map((s) => s.label)).toEqual(COLLABORATIONS_SUBS.map((s) => s.label));
  });
});
