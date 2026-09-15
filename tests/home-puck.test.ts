import { describe, it, expect, afterAll, beforeEach, vi } from "vitest";
import { promises as fs } from "fs";
import os from "os";
import path from "path";
import type { ReactElement, ReactNode } from "react";
import { isolateCwd } from "./helpers/isolate-cwd";

/* the repo root, captured BEFORE the isolate (isolateCwd must run ahead of
   any path.join(process.cwd(), …) constant — its own docblock) */
const cwd = isolateCwd("oc-home-puck-293-");

/**
 * TASK-293 (0018.06.25 a₿ · block 967,144) — THE HOME PAGE READS ITS SEED:
 * Puck first, today's JSX as the fallback (the /about-/retreats-/packages
 * shape, src/app/page.tsx). Pins, model not render (the house idiom, same
 * findAll-the-element-tree pattern as tests/retreats-puck.test.ts — the
 * page's own SiteHeader/PopupHost throw under plain react-dom/server):
 *
 *  · THE FALLBACK IS UNCHANGED: nothing published ⇒ the hand-built
 *    sections render, byte-for-byte, no <Render> anywhere.
 *  · DRAFTS NEVER LEAK: a saved draft alone (never published) still serves
 *    the fallback.
 *  · THE SIGNED-IN HERO SURVIVES BOTH BRANCHES: <Hero session={session}/>
 *    renders from CODE on both branches — the ONE session read (T-210)
 *    threads to it whether or not a doc is published; the Puck seed
 *    carries no Hero block (T-210's per-soul weekly-reading door can't
 *    live in a static doc).
 *  · THE SWITCH-GATED BANDS NEVER FOSSILISE: applyHomeSwitchesToPuck
 *    resolves the SAME site-config switches sections.tsx's
 *    Packages()/Classes()/Affirmations()/Services() read, fresh on every
 *    request — pinned both as a pure unit (untouched-path law) and through
 *    the wired page.
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

let tmpDir: string;

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "oc-home-puck-fixture-"));
  vi.resetModules();
  vi.stubEnv("PUCK_STORE_DRIVER", "filesystem");
  vi.stubEnv("PUCK_STORE_FS_DIR", tmpDir);
  vi.stubEnv("PUCK_STORE_NAMESPACE", "");
  vi.stubEnv("KV_REST_API_URL", "");
  vi.stubEnv("KV_REST_API_TOKEN", "");
  // the session read is pinned elsewhere (tests/site-knows-who-is-signed-in
  // .test.ts covers weeklyReadingDoor/sessionsFromCookieHeader's own logic
  // in full) — here it's mocked to a fixed value so this file stays about
  // the WIRING: does the ONE session thread to <Hero> on both branches.
  vi.doMock("next/headers", () => ({
    headers: async () => ({ get: () => "pa-fren=irrelevant-under-the-mock" }),
  }));
});

afterAll(async () => {
  vi.doUnmock("next/headers");
  vi.unstubAllEnvs();
  if (tmpDir) await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
  cwd.cleanup();
});

describe("the seed — /style/home opens pre-populated, and carries no fossil", () => {
  it("SEEDS.home exists, carries no Hero block (the signed-in hero stays code-side), and every id is unique", async () => {
    const { SEEDS } = await import("@/lib/puck-seeds");
    const seed = SEEDS.home;
    expect(seed).toBeDefined();
    const content = seed.content as SeedBlock[];
    expect(Array.isArray(content)).toBe(true);
    expect(content.some((b) => b.type === "Hero")).toBe(false);

    const ids: string[] = [];
    const walk = (v: unknown) => {
      if (Array.isArray(v)) { v.forEach(walk); return; }
      if (v && typeof v === "object") {
        const o = v as Record<string, unknown>;
        if (typeof o.id === "string") ids.push(o.id);
        Object.values(o).forEach(walk);
      }
    };
    walk(content);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toEqual(expect.arrayContaining([
      "home-memberships", "home-classes-community", "home-affirmations", "home-services",
    ]));
  });

  it("the audited prose matches today's JSX (sections.tsx), word for word, on the pieces the seed carries", async () => {
    const { SEEDS } = await import("@/lib/puck-seeds");
    const flat = JSON.stringify(SEEDS.home.content);
    // My Story — the quote drops its period (TASK-154 item 6) and carries
    // the rose line (TASK-119 [AMBER]) sections.tsx already holds
    expect(flat).toContain("Where Heaven and Earth Meet”");
    expect(flat).not.toContain("Where Heaven and Earth Meet.”");
    expect(flat).toContain("It will all be right here.");
    expect(flat).toContain("Read my full story");
    expect(flat).not.toContain("Read my full story →");
    // Memberships — PACKAGE_DOORS_WORDS (sections.tsx), not the retired
    // "your tier gently becomes your key" line
    expect(flat).toContain("Your package opens its doors.");
    expect(flat).not.toContain("gently becomes your key");
    // Classes & Community — no arrow on "Enter your rooms" (sections.tsx)
    expect(flat).toContain('"Enter your rooms"');
    // Tend the Field — the real "Three Doors" heading + words
    // (Donations(), sections.tsx), not the retired invented copy, and only
    // the ONE live button (the other two were removed under T-119)
    expect(flat).toContain("Three Doors");
    expect(flat).toContain("Give forward, follow along, read with me.");
    expect(flat).not.toContain("Pay It Forward Flows");
    expect(flat).not.toContain("Book a Session");
    expect(flat).not.toContain("Visit the Store");
    expect(flat).toContain('"The Full Support Room"');
    // Connect — the live heading is "Connect", not "Connect & Book"
    expect(flat).toContain('"Connect"');
    expect(flat).not.toContain("Connect & Book");
  });

  it("home is designer in the manifest, wearing the SAME note every other wired route does (TASK-293 wires it)", async () => {
    const { PAGE_STATES } = await import("@/lib/page-states");
    const home = PAGE_STATES.find((e) => e.path === "/")!;
    const about = PAGE_STATES.find((e) => e.path === "/about")!;
    expect(home.state).toBe("designer");
    expect(home.note).toBe(about.note);
    expect(home.note).not.toContain("unwired");
  });
});

describe("applyHomeSwitchesToPuck — the render-time filter (never fossilised)", () => {
  const doc = (ids: string[]): { content: SeedBlock[]; root: object } => ({
    content: ids.map((id) => ({
      type: "Band",
      props: {
        id,
        content: id === "home-services"
          ? [{ type: "Heading", props: { id: `${id}-h`, text: "Sessions with Love" } }]
          : [],
      },
    })),
    root: {},
  });

  const ALL_ON = { memberships: true, classes: true, community: true, store: true, sessions: true, cuts: false };
  const ALL_IDS = ["home-memberships", "home-classes-community", "home-affirmations", "home-services", "keep-me"];

  it("nothing to hide and the services heading already matches ⇒ the SAME reference comes back (untouched-path law)", async () => {
    const { applyHomeSwitchesToPuck } = await import("@/lib/puck-seeds");
    const d = doc(ALL_IDS);
    expect(applyHomeSwitchesToPuck(d, ALL_ON)).toBe(d);
  });

  it("today's actual defaults (community/classes/store/sessions/cuts off, memberships on) hide three of the four bands", async () => {
    const { applyHomeSwitchesToPuck } = await import("@/lib/puck-seeds");
    const { defaultSiteConfig } = await import("@/lib/site-config");
    const d = doc(ALL_IDS);
    const out = applyHomeSwitchesToPuck(d, defaultSiteConfig().features);
    const ids = (out.content as SeedBlock[]).map((b) => b.props.id);
    expect(ids).toEqual(["home-memberships", "keep-me"]);
    // the input is never mutated
    expect((d.content as SeedBlock[]).map((b) => b.props.id)).toEqual(ALL_IDS);
  });

  it("classes on, community off ⇒ the whole band still stands (the documented partial-hide simplification)", async () => {
    const { applyHomeSwitchesToPuck } = await import("@/lib/puck-seeds");
    const d = doc(["home-classes-community"]);
    const out = applyHomeSwitchesToPuck(d, { ...ALL_ON, classes: true, community: false });
    expect((out.content as SeedBlock[]).map((b) => b.props.id)).toEqual(["home-classes-community"]);
  });

  it("the services band's heading follows `cuts`, in place, only when the band still stands", async () => {
    const { applyHomeSwitchesToPuck } = await import("@/lib/puck-seeds");
    const d = doc(["home-services"]);
    const cutsOn = applyHomeSwitchesToPuck(d, { ...ALL_ON, sessions: true, cuts: true });
    const band = (cutsOn.content as SeedBlock[])[0];
    const heading = (band.props.content as SeedBlock[])[0];
    expect(heading.props.text).toBe("ConsciousCuts & Waxing 🦋");

    const cutsOff = applyHomeSwitchesToPuck(d, { ...ALL_ON, sessions: true, cuts: false });
    const headingOff = ((cutsOff.content as SeedBlock[])[0].props.content as SeedBlock[])[0];
    expect(headingOff.props.text).toBe("Sessions with Love");
  });

  it("both sessions and cuts off ⇒ the services band is gone entirely (no heading to swap)", async () => {
    const { applyHomeSwitchesToPuck } = await import("@/lib/puck-seeds");
    const d = doc(["home-services", "keep-me"]);
    const out = applyHomeSwitchesToPuck(d, { ...ALL_ON, sessions: false, cuts: false });
    expect((out.content as SeedBlock[]).map((b) => b.props.id)).toEqual(["keep-me"]);
  });
});

describe("HomePage — Puck first, the hand-built sections as fallback", () => {
  it("with nothing published: the hand-built sections render — no <Render> anywhere, the real Hero carries the session", async () => {
    vi.doMock("@/lib/member-auth", async (orig) => ({
      ...(await orig<typeof import("@/lib/member-auth")>()),
      sessionsFromCookieHeader: () => [{ token: "t", handle: "love", space: "onecocreation.com" }],
    }));
    vi.doMock("@/lib/member-tier", () => ({ tierForSubject: async () => "B" }));

    try {
      const HomePage = (await import("@/app/page")).default;
      const { Hero, About } = await import("@/components/sections");
      const el = await HomePage();

      const { Render } = await import("@puckeditor/core");
      expect(findAll(el, (e) => e.type === Render)).toHaveLength(0);
      expect(findAll(el, (e) => e.type === About)).toHaveLength(1);
      const heroes = findAll(el, (e) => e.type === Hero);
      expect(heroes).toHaveLength(1);
      expect((heroes[0].props as { session?: unknown }).session).toEqual({ handle: "love", space: "onecocreation.com", tier: "B" });
    } finally {
      vi.doUnmock("@/lib/member-auth");
      vi.doUnmock("@/lib/member-tier");
    }
  });

  it("no cookie at all: the hero gets a KNOWN guest (null), never undefined", async () => {
    vi.doMock("next/headers", () => ({ headers: async () => ({ get: () => null }) }));
    const HomePage = (await import("@/app/page")).default;
    const { Hero } = await import("@/components/sections");
    const el = await HomePage();
    const heroes = findAll(el, (e) => e.type === Hero);
    expect(heroes).toHaveLength(1);
    expect((heroes[0].props as { session?: unknown }).session).toBeNull();
  });

  it("draft-only (not yet published) still serves the hand-built page — drafts never leak to visitors", async () => {
    const store = await import("@/lib/puck-store");
    await store.setPuckDraft("home", { content: [{ type: "Heading", props: { id: "h1", text: "unpublished" } }], root: {} });

    const HomePage = (await import("@/app/page")).default;
    const { Hero } = await import("@/components/sections");
    const el = await HomePage();

    const { Render } = await import("@puckeditor/core");
    expect(findAll(el, (e) => e.type === Render)).toHaveLength(0);
    expect(findAll(el, (e) => e.type === Hero)).toHaveLength(1);
  });

  it("after Publish to live: the SAME request renders the published Puck doc, the hero STILL rendering from code with the session threaded", async () => {
    vi.doMock("@/lib/member-auth", async (orig) => ({
      ...(await orig<typeof import("@/lib/member-auth")>()),
      sessionsFromCookieHeader: () => [{ token: "t", handle: "love", space: "onecocreation.com" }],
    }));
    vi.doMock("@/lib/member-tier", () => ({ tierForSubject: async () => "C" }));

    try {
      const store = await import("@/lib/puck-store");
      const doc = { content: [{ type: "Heading", props: { id: "h1", text: "Fixture publish — home live", level: "h1", align: "center", style: {} } }], root: {} };
      await store.setPuckDraft("home", doc);
      await store.publishDraft("home");

      const HomePage = (await import("@/app/page")).default;
      const { Hero, About } = await import("@/components/sections");
      const el = await HomePage();

      const { Render } = await import("@puckeditor/core");
      const renders = findAll(el, (e) => e.type === Render);
      expect(renders).toHaveLength(1);
      expect((renders[0].props as { data?: unknown }).data).toEqual(doc); // no switch-gated block ⇒ passes through untouched
      // the hand-built section components are gone from this request's output …
      expect(findAll(el, (e) => e.type === About)).toHaveLength(0);
      // … but the real, session-aware Hero still rides above the Puck content
      const heroes = findAll(el, (e) => e.type === Hero);
      expect(heroes).toHaveLength(1);
      expect((heroes[0].props as { session?: unknown }).session).toEqual({ handle: "love", space: "onecocreation.com", tier: "C" });
    } finally {
      vi.doUnmock("@/lib/member-auth");
      vi.doUnmock("@/lib/member-tier");
    }
  });

  it("the published branch reads the LIVE switches — a fresh publish of the real seed hides today's-default bands, never fossilising them", async () => {
    const store = await import("@/lib/puck-store");
    const { SEEDS } = await import("@/lib/puck-seeds");
    await store.setPuckDraft("home", SEEDS.home);
    await store.publishDraft("home");

    const HomePage = (await import("@/app/page")).default;
    const el = await HomePage();

    const { Render } = await import("@puckeditor/core");
    const renders = findAll(el, (e) => e.type === Render);
    expect(renders).toHaveLength(1);
    const ids = ((renders[0].props as { data: { content: SeedBlock[] } }).data.content).map((b) => b.props.id);
    // today's defaults: memberships stands, the other three switch-gated bands don't
    expect(ids).toContain("home-memberships");
    expect(ids).not.toContain("home-classes-community");
    expect(ids).not.toContain("home-affirmations");
    expect(ids).not.toContain("home-services");
    // …and the stored published doc itself was never touched (never fossilised)
    const stored = (await store.getPuckPage("home")) as { content: SeedBlock[] };
    expect(stored.content.map((b) => b.props.id)).toContain("home-services");
  });
});
