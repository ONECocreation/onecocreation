import { describe, it, expect, afterEach, vi } from "vitest";

/**
 * TASK-270 — the fleet's own furniture (officers roster, ship's log,
 * cross-project sign-off tickets) is per-site config (HB-10's
 * recommendation): every clone, ONE Cocreation included, ships these
 * EMPTY unless NEXT_PUBLIC_HOUSE_SEEDS=1 asks for them. Never a
 * rename-in-place — src/lib/house-seeds.ts is the one switch every
 * consumer reads.
 */

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("house seeds — empty by default (ONE Cocreation's own deployment)", () => {
  it("CONSOLE_OFFICERS renders no officers with the switch unset", async () => {
    vi.resetModules();
    vi.stubEnv("NEXT_PUBLIC_HOUSE_SEEDS", "");
    const { CONSOLE_OFFICERS } = await import("@/lib/console");
    expect(CONSOLE_OFFICERS).toEqual([]);
  });

  it("SEED_SIGNOFFS renders no tickets with the switch unset", async () => {
    vi.resetModules();
    vi.stubEnv("NEXT_PUBLIC_HOUSE_SEEDS", "");
    const { SEED_SIGNOFFS } = await import("@/lib/signoffs");
    expect(SEED_SIGNOFFS).toEqual([]);
  });

  it("SHIP_LOG renders no entries with the switch unset", async () => {
    vi.resetModules();
    vi.stubEnv("NEXT_PUBLIC_HOUSE_SEEDS", "");
    const { SHIP_LOG } = await import("@/lib/shiplog");
    expect(SHIP_LOG).toEqual([]);
  });
});

describe("house seeds — populated only when a site config asks (NEXT_PUBLIC_HOUSE_SEEDS=1)", () => {
  it("CONSOLE_OFFICERS carries the house officer roster", async () => {
    vi.resetModules();
    vi.stubEnv("NEXT_PUBLIC_HOUSE_SEEDS", "1");
    const { CONSOLE_OFFICERS } = await import("@/lib/console");
    expect(CONSOLE_OFFICERS.length).toBeGreaterThan(0);
    expect(CONSOLE_OFFICERS.map((o) => o.role)).toContain("THE CAPTAIN");
  });

  it("SEED_SIGNOFFS carries the house's cross-project tickets", async () => {
    vi.resetModules();
    vi.stubEnv("NEXT_PUBLIC_HOUSE_SEEDS", "1");
    const { SEED_SIGNOFFS } = await import("@/lib/signoffs");
    expect(SEED_SIGNOFFS.length).toBeGreaterThan(0);
  });

  it("SHIP_LOG carries the house's own history", async () => {
    vi.resetModules();
    vi.stubEnv("NEXT_PUBLIC_HOUSE_SEEDS", "1");
    const { SHIP_LOG } = await import("@/lib/shiplog");
    expect(SHIP_LOG.length).toBeGreaterThan(0);
  });
});

describe("no default URL in src/lib points at the template's domains (bft.ts's sanctioned provenance rows excepted)", () => {
  it("CHAT_URL_DEFAULT is honestly empty — ONE Cocreation has no chat.onecocreation.com door recorded here", async () => {
    vi.resetModules();
    const { CHAT_URL_DEFAULT } = await import("@/lib/nodeconfig");
    expect(CHAT_URL_DEFAULT).toBe("");
  });

  it("the default cartridge's time door points at this site's own /api/chain/tip", async () => {
    vi.resetModules();
    const { cartridge } = await import("@/brand/cartridge");
    expect(cartridge.doors.timeTipUrl).toBe("https://onecocreation.com/api/chain/tip?full=1");
  });

  it("the earthside cartridge's time door points at this site's own /api/chain/tip", async () => {
    vi.resetModules();
    const { earthside } = await import("@/brand/cartridges/earthside");
    expect(earthside.doors.timeTipUrl).toBe("https://onecocreation.com/api/chain/tip?full=1");
  });

  it("NIP05_DOMAIN and SPACE_NAME fall back to OC's own domain/space, never the template's", async () => {
    vi.resetModules();
    // `??` only falls back on null/undefined — delete, don't stub "", so the
    // module genuinely sees the env var unset (a fresh fork with no .env).
    delete process.env.NEXT_PUBLIC_NIP05_DOMAIN;
    delete process.env.NEXT_PUBLIC_SPACE_NAME;
    const { NIP05_DOMAIN, SPACE_NAME } = await import("@/lib/identity-config");
    expect(NIP05_DOMAIN).toBe("onecocreation.com");
    expect(SPACE_NAME).toBe("onecocreation");
  });
});
