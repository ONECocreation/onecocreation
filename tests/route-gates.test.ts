import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { promises as fs } from "fs";
import path from "path";
import { isolateCwd } from "./helpers/isolate-cwd";

/**
 * TASK-160 (0018.06.17 a₿ · block 966,055) — ROUTES FOLLOW THEIR SWITCHES.
 * Cut from the T-137 review's seam 4: the nav hid switched-off routes but a
 * direct URL still rendered them. Pins:
 *
 *  · /classes gates on `community` AND `classes` both OFF → the shared
 *    NotOpenYet panel (T-137) INSIDE the site chrome (header + footer);
 *    the gate branch is the page's FIRST early return (the T-159 lane
 *    contract: 1 switch gate → 2 Puck-first read → 3 hand-built fallback);
 *  · /book gates on `sessions` OFF the same way, gate before the data reads;
 *  · /store's T-137 gate on `store` OFF still stands (verify + pin);
 *  · every gate returns the SHARED NotOpenYet — one component, one voice;
 *  · the defaults ARE the streamlined site (no stored doc → community/
 *    classes/sessions/store all OFF), so the gates really fire out of the
 *    box, and a stored doc flipping a switch ON opens the gate;
 *  · /meditation carries NO feature switch by design — pinned OFF the
 *    PAGE_CATALOG row so a future "fix" can't quietly gate the free gift
 *    (T-129 kept it reachable either way; T-137's Community header
 *    always-on invariant depends on it; the welcome trio and the one real
 *    popup both point at it).
 *
 * Part B (Love's Desk roster shows who is here NOW):
 *  · RosterPanel runs T-149's exported soulsOnline over the route's
 *    joined × presence payload — online-only, display names, mxid keys,
 *    "— nobody here yet" on the empty truth;
 *  · matrix.ts's roomRoster reads the homeserver's own presence endpoint
 *    with the bot's token, one bounded batch, null for a refused lookup.
 *
 * The pages are async server components — never rendered in the node test
 * env — so the gate contracts are pinned off the SOURCE (the house's
 * read-the-source pattern, sessions-style.test.ts / classroom-stage.test.ts),
 * and the switch semantics are pinned behaviorally through getSiteConfig on
 * an isolated cwd (the T-158 pattern).
 */

/* ROOT is captured BEFORE isolateCwd chdirs — source reads join against the
   real worktree, the site-config fs driver rides the throwaway cwd. */
const ROOT = process.cwd();
const { cleanup: cleanupCwd } = isolateCwd("oc-route-gates-");

const read = (rel: string) => fs.readFile(path.join(ROOT, rel), "utf8");

/** The clearly-delimited gate branch (the T-159 contract marker). */
function gateBlock(src: string): string {
  const start = src.indexOf("TASK-160 GATE");
  const end = src.indexOf("end TASK-160 GATE");
  expect(start, "gate marker missing").toBeGreaterThan(-1);
  expect(end, "gate end marker missing").toBeGreaterThan(start);
  return src.slice(start, end);
}

describe("TASK-160 — the route gates", () => {
  it("/classes: community AND classes both OFF → NotOpenYet inside the site chrome", async () => {
    const gate = gateBlock(await read("src/app/classes/page.tsx"));
    expect(gate).toContain("getSiteConfig");
    expect(gate).toContain("!switches.features.community && !switches.features.classes");
    expect(gate).toContain("NotOpenYet");
    expect(gate).toContain("<SiteHeader />");
    expect(gate).toContain("<SiteFooter />");
  });

  it("/classes: the gate is the page's FIRST branch — before the hand-built render (T-159 order contract)", async () => {
    const src = await read("src/app/classes/page.tsx");
    expect(src).toContain("export default async function ClassesPage()");
    expect(src.indexOf("TASK-160 GATE")).toBeLessThan(src.indexOf("<CosmicSky />"));
    expect(src.indexOf("TASK-160 GATE")).toBeLessThan(src.indexOf("<RoomsShelf />"));
  });

  it("/book: sessions OFF → NotOpenYet inside the site chrome, gate before the data reads", async () => {
    const src = await read("src/app/book/page.tsx");
    const gate = gateBlock(src);
    expect(gate).toContain("getSiteConfig");
    expect(gate).toContain("!switches.features.sessions");
    expect(gate).toContain("NotOpenYet");
    expect(gate).toContain("<SiteHeader />");
    expect(gate).toContain("<SiteFooter />");
    // FIRST: the gate stands ahead of the shelf's data reads (1 gate → 2 Puck → 3 hand-built)
    expect(src.indexOf("TASK-160 GATE")).toBeLessThan(src.indexOf("await listServices()"));
    expect(src.indexOf("TASK-160 GATE")).toBeLessThan(src.indexOf("await listItems()"));
  });

  it("/store: the T-137 gate on the store switch still stands (verify)", async () => {
    const src = await read("src/app/store/page.tsx");
    expect(src).toContain("!switches.features.store");
    expect(src).toContain("NotOpenYet");
    expect(src).toContain('from "@/components/NotOpenYet"');
    expect(src).toContain("getSiteConfig");
  });

  it("every gated route returns the SHARED NotOpenYet — one component, one voice", async () => {
    for (const rel of ["src/app/classes/page.tsx", "src/app/book/page.tsx", "src/app/store/page.tsx"]) {
      expect(await read(rel), rel).toContain('from "@/components/NotOpenYet"');
    }
  });

  it("/meditation carries NO feature switch — the free gift stays reachable by design (T-129/T-137)", async () => {
    const src = await read("src/components/NavMenu.tsx");
    const row = src.match(/\{ href: "\/meditation"[^}]*\}/);
    expect(row, "PAGE_CATALOG lost its /meditation row").not.toBeNull();
    expect(row![0]).not.toContain("feature");
  });
});

describe("TASK-160 — the switches the gates read (behavioral, isolated cwd)", () => {
  const FILE = path.join(process.cwd(), "data", "site-config.json");
  let getSiteConfig: (typeof import("@/lib/site-config"))["getSiteConfig"];

  beforeAll(async () => {
    process.env.NEXT_PUBLIC_SPACE_NAME = "onecocreation";
    delete process.env.KV_REST_API_URL;
    delete process.env.KV_REST_API_TOKEN;
    delete process.env.BLOB_READ_WRITE_TOKEN;
    delete process.env.REGISTRY_DRIVER;
    await fs.rm(FILE, { force: true });
    ({ getSiteConfig } = await import("@/lib/site-config"));
  });

  afterAll(async () => {
    await fs.rm(FILE, { force: true });
    cleanupCwd();
  });

  it("no stored doc → the streamlined defaults: every gated switch OFF, so the gates fire out of the box", async () => {
    const s = await getSiteConfig();
    expect(s.features.community).toBe(false);
    expect(s.features.classes).toBe(false);
    expect(s.features.sessions).toBe(false);
    expect(s.features.store).toBe(false);
  });

  it("a stored doc flipping a switch ON opens its gate (classes ON → /classes renders)", async () => {
    const s = await getSiteConfig();
    await fs.writeFile(FILE, JSON.stringify({ ...s, features: { ...s.features, classes: true } }), "utf8");
    const next = await getSiteConfig();
    expect(next.features.classes).toBe(true);
    // the /classes gate condition as the page computes it: both OFF → closed
    expect(!next.features.community && !next.features.classes).toBe(false);
    await fs.rm(FILE, { force: true });
  });
});

describe("TASK-160 — Love's Desk roster shows who is here NOW", () => {
  it("RosterPanel runs T-149's soulsOnline over the route's joined × presence payload", async () => {
    const src = await read("src/components/console/desk/RosterPanel.tsx");
    expect(src).toContain('soulsOnline, type Soul } from "@/components/rooms/RoomPresence"');
    expect(src).toContain("soulsOnline(d.joined ?? {}, d.presence ?? {})");
    expect(src).toContain("— nobody here yet");
    expect(src).toContain("key={s.mxid}"); // the T-133 duplicate-key fix rides along
  });

  it("the desk's filter is the room's filter: the route's exact payload shape → online souls only", async () => {
    const { soulsOnline } = await import("@/components/rooms/RoomPresence");
    // the JSON /api/admin/classroom/roster now hands back (single-room mode)
    const payload = {
      joined: {
        "@ada:onecocreation.com": { display_name: "Ada Lovelace" },
        "@key-e2048abc:onecocreation.com": {}, // keyed member, no display name
        "@gone:onecocreation.com": { display_name: "Long Gone" },
      },
      presence: {
        "@ada:onecocreation.com": { presence: "online" },
        "@key-e2048abc:onecocreation.com": { presence: "offline", last_active_ago: 2 * 60 * 1000 },
        "@gone:onecocreation.com": { presence: "offline", last_active_ago: 40 * 60 * 1000 },
      },
    };
    const souls = soulsOnline(payload.joined, payload.presence);
    expect(souls.map((s) => s.name)).toEqual(["Ada Lovelace", "key-e2048abc"]);
    expect(souls.map((s) => s.name)).not.toContain("Long Gone");
    // an empty truth (the server won't say / nobody online) filters to zero — the panel reads the dash
    expect(soulsOnline(payload.joined, {})).toEqual([]);
  });

  it("roomRoster reads the homeserver's own presence endpoint with the bot's token, one bounded batch", async () => {
    const src = await read("src/lib/matrix.ts");
    expect(src).toContain("/presence/${encodeURIComponent(mxid)}/status");
    expect(src).toContain("ROSTER_PRESENCE_CAP");
    expect(src).toContain("presence: Object.fromEntries(answers)");
  });

  it("the roster route passes joined + presence through in single-room mode", async () => {
    const src = await read("src/app/api/admin/classroom/roster/route.ts");
    expect(src).toContain("joined: res.joined");
    expect(src).toContain("presence: res.presence");
  });
});
