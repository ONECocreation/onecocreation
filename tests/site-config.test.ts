import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { promises as fs } from "fs";
import path from "path";

/**
 * TASK-129 (0018.06.16 a₿) — THE SWITCHES. Pins:
 *  · the defaults ARE Love's streamlined site (community/classes/store/
 *    sessions/cuts OFF, jars/news ON, btcpay/square ON, stripe OFF, jitsi on
 *    the house domain, no static links)
 *  · a stored doc's unknown keys never survive the read (sanitize)
 *  · liveAdapter("square") is null when the switch is OFF though env is set
 *    (and the adapter again once the switch flips back ON)
 *  · the nav MENU carries no Store/Sessions/Community on the defaults and
 *    carries them when the switches are ON
 *  · the jitsi default domain derives meet.onecocreation.com from
 *    identity-config's domainForSpace
 *
 * The env the modules read at load is stubbed BEFORE any import (the same
 * pattern as tests/tenant-keys.test.ts); the fs driver's data/site-config.json
 * is removed before and after so no other gate (square-payments.test.mjs's
 * sync liveAdapter assertions) can trip over a leftover.
 */

const FILE = path.join(process.cwd(), "data", "site-config.json");

let getSiteConfig: (typeof import("@/lib/site-config"))["getSiteConfig"];
let saveSiteConfig: (typeof import("@/lib/site-config"))["saveSiteConfig"];
let defaultSiteConfig: (typeof import("@/lib/site-config"))["defaultSiteConfig"];
let liveAdapter: (typeof import("@/lib/payments"))["liveAdapter"];
let squareAdapter: (typeof import("@/lib/payments"))["squareAdapter"];
let buildMenu: (typeof import("@/components/NavMenu"))["buildMenu"];

beforeAll(async () => {
  process.env.NEXT_PUBLIC_SPACE_NAME = "onecocreation";
  delete process.env.KV_REST_API_URL;
  delete process.env.KV_REST_API_TOKEN;
  delete process.env.BLOB_READ_WRITE_TOKEN;
  delete process.env.REGISTRY_DRIVER;
  await fs.rm(FILE, { force: true });
  ({ getSiteConfig, saveSiteConfig, defaultSiteConfig } = await import("@/lib/site-config"));
  ({ liveAdapter, squareAdapter } = await import("@/lib/payments"));
  ({ buildMenu } = await import("@/components/NavMenu"));
});

afterAll(async () => {
  await fs.rm(FILE, { force: true });
});

describe("the switches — defaults are Love's streamlined site", () => {
  it("no stored doc → the streamlined set, jitsi on the house domain", async () => {
    const c = await getSiteConfig();
    expect(c.features).toEqual({
      community: false,
      classes: false,
      store: false,
      sessions: false,
      cuts: false,
      jars: true,
      news: true,
    });
    expect(c.payments).toEqual({ btcpay: true, square: true, stripe: false });
    expect(c.meeting.rail).toBe("jitsi");
    expect(c.meeting.jitsiDomain).toBe("meet.onecocreation.com");
    expect(c.meeting.allowStaticLinks).toBe(false);
  });
});

describe("the switches — sanitize drops unknown keys", () => {
  it("a hand-edited doc keeps known keys, loses the rest, and bad types fall back", async () => {
    await fs.mkdir(path.dirname(FILE), { recursive: true });
    await fs.writeFile(
      FILE,
      JSON.stringify({
        features: { community: true, bogus: true },
        payments: { square: false, dogecoin: true },
        meeting: { rail: "carrier-pigeon", jitsiDomain: "  ", allowStaticLinks: "yes" },
        zzz: 1,
      }),
      "utf8",
    );
    const c = await getSiteConfig();
    expect(c.features.community).toBe(true);
    expect("bogus" in c.features).toBe(false);
    expect(c.payments.square).toBe(false);
    expect("dogecoin" in c.payments).toBe(false);
    expect(c.meeting.rail).toBe("jitsi"); // unknown rail → default
    expect(c.meeting.jitsiDomain).toBe("meet.onecocreation.com"); // blank → derived default
    expect(c.meeting.allowStaticLinks).toBe(false); // wrong type → default
    expect("zzz" in c).toBe(false);
    await fs.rm(FILE, { force: true });
    await getSiteConfig(); // re-warm the cache to defaults for what follows
  });
});

describe("the switches — liveAdapter honors the rail switches", () => {
  it("square env-configured but switched OFF → null; switched ON → the adapter", async () => {
    process.env.SQUARE_ACCESS_TOKEN = "site-config-test-token";
    process.env.SQUARE_LOCATION_ID = "site-config-test-location";
    try {
      await saveSiteConfig({ payments: { square: false } });
      expect(squareAdapter.configured()).toBe(true); // env alone WOULD charge…
      expect(liveAdapter("square")).toBeNull(); // …but the switch says no
      await saveSiteConfig({ payments: { square: true } });
      expect(liveAdapter("square")).toBe(squareAdapter);
      // the default (no-arg) rail is untouched: btcpay-or-null, never square
      expect(liveAdapter()).not.toBe(squareAdapter);
    } finally {
      delete process.env.SQUARE_ACCESS_TOKEN;
      delete process.env.SQUARE_LOCATION_ID;
      await fs.rm(FILE, { force: true });
      await getSiteConfig();
    }
  });
});

describe("the switches — the nav MENU is built from them", () => {
  // TASK-137 (0018.06.17 a₿), minimal-forced-edit: Community became a
  // HEADER (always present — Free meditation + 11:11 Live with Love always
  // exist under it) instead of a switch, and Support went back to carrying
  // only Support. This describe block pinned the OLD "meditation/news fall
  // under Support while Community is off" shape T-137 was cut to remove;
  // updating the two assertions here is load-bearing for this lane's own
  // gate (`vitest run` must pass), not a cosmetic touch-up.
  const labels = (menu: { label: string }[]) => menu.map((m) => m.label);

  it("defaults: no Store, no Sessions — Community stands anyway (always doors)", () => {
    const menu = buildMenu(defaultSiteConfig());
    expect(labels(menu)).not.toContain("Store");
    expect(labels(menu)).not.toContain("Sessions");
    expect(labels(menu)).toEqual(["About", "Memberships", "Community", "Support"]);
    // meditation and 11:11 always ride Community now, switch or no switch
    const community = menu.find((m) => m.label === "Community");
    expect(community?.subs?.map((s) => s.label)).toContain("Free meditation");
    expect(community?.subs?.map((s) => s.label)).toContain("11:11 Live with Love");
    // news is ON by default → News & letters rides Community too
    expect(community?.subs?.map((s) => s.label)).toContain("News & letters");
    // classes is OFF by default → Classes & rooms does not
    expect(community?.subs?.map((s) => s.label)).not.toContain("Classes & rooms");
    // Support carries only itself — the old stand-ins are gone for good
    expect(menu.find((m) => m.label === "Support")?.subs).toBeUndefined();
  });

  it("everything ON: Store, Sessions appear too, and Community gains Classes & rooms", () => {
    const all = defaultSiteConfig();
    for (const k of Object.keys(all.features) as (keyof typeof all.features)[]) all.features[k] = true;
    const menu = buildMenu(all);
    expect(labels(menu)).toContain("Store");
    expect(labels(menu)).toContain("Sessions");
    expect(labels(menu)).toContain("Community");
    const community = menu.find((m) => m.label === "Community");
    expect(community?.subs?.map((s) => s.label)).toContain("Free meditation");
    expect(community?.subs?.map((s) => s.label)).toContain("Classes & rooms");
    expect(menu.find((m) => m.label === "Support")?.subs).toBeUndefined();
  });
});
