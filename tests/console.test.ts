import { describe, it, expect, vi } from "vitest";
import {
  CONSOLE_ROOMS,
  CONSOLE_OVERVIEW,
  roomForPath,
  siteChromeTitle,
} from "@/lib/console";

/**
 * TASK-135 — the console cleanup lane's own tests:
 *   1. the site rail's eight one-word labels, in order, with /a/site on it.
 *   2. houseOnly rooms never surface a real label under the site chrome,
 *      whichever path resolved to them (the Admiral's "DUTY ROSTER
 *      reappeared" catch) — siteChromeTitle is the choke point.
 *   3. an unmapped path's fallback never lands on a houseOnly room.
 *   4. /artist and /u/[handle] redirect to /me under this tenant.
 *   5. BrandDesk's save round-trips a palette slot through the same
 *      /api/brand contract the Studio uses.
 */

describe("the site rail — one word each", () => {
  it("filters houseOnly rooms out of the site chrome's rail", () => {
    const rail = [CONSOLE_OVERVIEW, ...CONSOLE_ROOMS].filter((r) => !r.houseOnly);
    for (const r of rail) expect(r.houseOnly).toBeFalsy();
  });

  it("carries the eight one-word labels, in order, ending with Site", async () => {
    const { SITE_LABELS } = await import("@/components/console/SiteConsoleShell");
    const rail = [CONSOLE_OVERVIEW, ...CONSOLE_ROOMS].filter((r) => !r.houseOnly);
    const labels = rail.map((r) => SITE_LABELS[r.key] ?? r.label);
    expect(labels).toEqual(["Home", "Items", "Services", "Letters", "People", "Money", "Brand", "Site"]);
  });

  it("registers /a/site, reachable and not house furniture", () => {
    const site = CONSOLE_ROOMS.find((r) => r.key === "site");
    expect(site).toBeTruthy();
    expect(site?.href).toBe("/a/site");
    expect(site?.houseOnly).toBeFalsy();
  });
});

describe("siteChromeTitle — the houseOnly choke point", () => {
  it("never passes a houseOnly room's real label through", () => {
    for (const r of CONSOLE_ROOMS.filter((r) => r.houseOnly)) {
      expect(siteChromeTitle(r, r.label)).toBe("Console");
      expect(siteChromeTitle(r, r.label)).not.toBe(r.label);
    }
  });

  it("passes a non-houseOnly room's label straight through", () => {
    for (const r of [CONSOLE_OVERVIEW, ...CONSOLE_ROOMS.filter((r) => !r.houseOnly)]) {
      expect(siteChromeTitle(r, r.label)).toBe(r.label);
    }
  });
});

describe("roomForPath — the unmapped-path fallback", () => {
  it("never falls back to a houseOnly room", () => {
    const room = roomForPath("/a/something-nobody-registered");
    expect(room.houseOnly).toBeFalsy();
    expect(room).toBe(CONSOLE_OVERVIEW);
  });

  it("still resolves every registered room by its own href", () => {
    for (const r of CONSOLE_ROOMS) expect(roomForPath(r.href)).toBe(r);
  });
});

describe("tenant redirects — /artist and /u/[handle] to /me", () => {
  it("/artist redirects to /me for tenant onecocreation", async () => {
    vi.resetModules();
    vi.stubEnv("TENANT", "");
    const { default: ArtistPage } = await import("@/app/artist/page");
    let caught: { digest?: string } | undefined;
    try {
      ArtistPage();
    } catch (e) {
      caught = e as { digest?: string };
    }
    expect(caught?.digest).toContain("NEXT_REDIRECT");
    expect(caught?.digest).toContain("/me");
    vi.unstubAllEnvs();
  });

  it("/u/[handle] redirects to /me for tenant onecocreation", async () => {
    vi.resetModules();
    vi.stubEnv("TENANT", "");
    const { default: FrenProfileRoute } = await import("@/app/u/[handle]/page");
    let caught: { digest?: string } | undefined;
    try {
      await FrenProfileRoute({ params: Promise.resolve({ handle: "anyone" }) });
    } catch (e) {
      caught = e as { digest?: string };
    }
    expect(caught?.digest).toContain("NEXT_REDIRECT");
    expect(caught?.digest).toContain("/me");
    vi.unstubAllEnvs();
  });
});

describe("BrandDesk — the save round-trip", () => {
  it("POSTs a palette through the same /api/brand contract the Studio uses", async () => {
    vi.resetModules();
    vi.stubEnv("KV_REST_API_URL", "https://kv.test");
    vi.stubEnv("KV_REST_API_TOKEN", "kv-token");
    const kvCalls: unknown[][] = [];
    vi.stubGlobal("fetch", async (_url: unknown, init?: { body?: string }) => {
      kvCalls.push(JSON.parse(init?.body ?? "null"));
      return { ok: true, json: async () => ({ result: null }) } as unknown as Response;
    });
    const { setPalette, getPalette } = await import("@/lib/brand-palette");
    const palette = { p1: "#111111", p2: "#222222", p3: "#333333", p4: "#444444", p5: "#555555" };
    await setPalette(palette);
    await getPalette();
    expect(kvCalls).toContainEqual(["SET", "brand:palette:onecocreation", JSON.stringify(palette)]);
    expect(kvCalls).toContainEqual(["GET", "brand:palette:onecocreation"]);
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });
});
