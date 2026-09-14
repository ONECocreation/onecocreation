import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { promises as fs } from "fs";
import path from "path";
import { fileURLToPath } from "node:url";
import { isolateCwd } from "./helpers/isolate-cwd";

/**
 * TASK-243 (0018.06.23 a₿) — every studio link opens Love's own studio
 * (ONECocreation/studio, live at vdo.onecocreation.com), never the public
 * vdo.ninja. Pins:
 *
 *  · studioVdoLinks(prefix, host) / vdoBase(host) build EVERY link from
 *    the host they're given — not a hardcoded one (a fictional host below
 *    proves it, the same way a real fork's own studio host would flow
 *    through);
 *  · SiteConfig.meeting.vdoHost derives `vdo.<the space's own domain>` by
 *    default — same idiom as jitsiDomain, one word further — and a hand-
 *    edited doc's scheme/path is REFUSED outright (falls back to the
 *    derived default), never silently stripped down to something that
 *    might not be what was meant;
 *  · the grep-pin: src/** carries zero "https://vdo.ninja" literals
 *    anywhere — every call-site now reads the config's own host.
 *
 * This file isolates its own throwaway cwd (tests/helpers/isolate-cwd.ts)
 * so its `FILE` — and every call the fs site-config driver makes off
 * process.cwd() — never collides with another suite's data/site-config.json
 * in the same file-parallel pass (the T-158 pattern).
 */
const { cleanup: cleanupCwd } = isolateCwd("oc-studio-own-door-");

const FILE = path.join(process.cwd(), "data", "site-config.json");
/** the repo's real src/, independent of the isolated cwd above — derived
 *  from this test file's own on-disk location, never process.cwd(). */
const REPO_SRC = path.resolve(fileURLToPath(import.meta.url), "..", "..", "src");

let getSiteConfig: (typeof import("@/lib/site-config"))["getSiteConfig"];
let saveSiteConfig: (typeof import("@/lib/site-config"))["saveSiteConfig"];
let studioVdoLinks: (typeof import("@/lib/live"))["studioVdoLinks"];
let vdoBase: (typeof import("@/lib/live"))["vdoBase"];

/* the env the modules read at load is stubbed BEFORE any import — the same
   pattern as tests/site-config.test.ts (identity-config's SPACE_NAME is a
   module-top-level const, frozen the instant identity-config.ts first
   loads, so both @/lib/live and @/lib/site-config must be imported AFTER
   the env is set, never before). */
beforeAll(async () => {
  process.env.NEXT_PUBLIC_SPACE_NAME = "onecocreation";
  delete process.env.KV_REST_API_URL;
  delete process.env.KV_REST_API_TOKEN;
  delete process.env.BLOB_READ_WRITE_TOKEN;
  delete process.env.REGISTRY_DRIVER;
  await fs.rm(FILE, { force: true });
  ({ getSiteConfig, saveSiteConfig } = await import("@/lib/site-config"));
  ({ studioVdoLinks, vdoBase } = await import("@/lib/live"));
});

afterAll(async () => {
  await fs.rm(FILE, { force: true });
  cleanupCwd();
});

describe("studioVdoLinks / vdoBase — built from the host they're given, never hardcoded", () => {
  it("a fictional host proves the derivation isn't pinned to vdo.ninja or vdo.onecocreation.com", () => {
    const vdo = studioVdoLinks("someartist", "vdo.example-studio.test");
    expect(vdo.room).toBe("someartist-studio");
    expect(vdo.push).toBe("https://vdo.example-studio.test/?room=someartist-studio&push=host");
    expect(vdo.guest).toBe("https://vdo.example-studio.test/?room=someartist-studio");
  });

  it("vdoBase is the one join point — a trailing slash, nothing more", () => {
    expect(vdoBase("vdo.example.test")).toBe("https://vdo.example.test/");
  });
});

describe("SiteConfig.meeting.vdoHost — derives Love's own studio by default", () => {
  it("no stored doc → vdo.<the space's own domain>, same idiom as jitsiDomain", async () => {
    const c = await getSiteConfig();
    expect(c.meeting.jitsiDomain).toBe("meet.onecocreation.com");
    expect(c.meeting.vdoHost).toBe("vdo.onecocreation.com");
  });

  it("a hand-edited doc's blank vdoHost falls back to the derived default", async () => {
    await fs.mkdir(path.dirname(FILE), { recursive: true });
    await fs.writeFile(FILE, JSON.stringify({ meeting: { vdoHost: "   " } }), "utf8");
    const c = await getSiteConfig();
    expect(c.meeting.vdoHost).toBe("vdo.onecocreation.com");
    await fs.rm(FILE, { force: true });
    await getSiteConfig(); // re-warm the cache to defaults for what follows
  });

  it("a pasted full URL (a scheme) is REFUSED outright, not stripped down to its host", async () => {
    const c = await saveSiteConfig({ meeting: { vdoHost: "https://evil.example.test" } });
    // refused → the DERIVED DEFAULT, never "evil.example.test" (which is
    // what silently stripping the scheme would have produced)
    expect(c.meeting.vdoHost).toBe("vdo.onecocreation.com");
  });

  it("a host carrying a path is REFUSED outright, falling back to the default", async () => {
    const c = await saveSiteConfig({ meeting: { vdoHost: "evil.example.test/some/path" } });
    expect(c.meeting.vdoHost).toBe("vdo.onecocreation.com");
  });

  it("a clean bare host saves exactly as typed", async () => {
    const c = await saveSiteConfig({ meeting: { vdoHost: "vdo.example-artist.com" } });
    expect(c.meeting.vdoHost).toBe("vdo.example-artist.com");
    await saveSiteConfig({ meeting: { vdoHost: "vdo.onecocreation.com" } }); // leave it as found
  });
});

describe("the grep-pin — zero public vdo.ninja literals survive in src/**", () => {
  it("no source file under src/ builds a link off the literal https://vdo.ninja (prose naming the public service is fine — a live link off it is not)", async () => {
    const offenders: string[] = [];
    async function walk(dir: string): Promise<void> {
      for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          await walk(full);
        } else if (/\.(ts|tsx|js|jsx)$/.test(entry.name)) {
          const text = await fs.readFile(full, "utf8");
          if (text.includes("https://vdo.ninja")) offenders.push(path.relative(REPO_SRC, full));
        }
      }
    }
    await walk(REPO_SRC);
    expect(offenders).toEqual([]);
  });
});
