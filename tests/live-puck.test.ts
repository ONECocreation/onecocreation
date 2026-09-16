import { describe, it, expect, afterAll, beforeEach, vi } from "vitest";
import { promises as fs, readFileSync } from "fs";
import os from "os";
import path from "path";
import type { ReactElement, ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";

/* the repo root, captured before any module state matters */
const REPO = process.cwd();

/**
 * TASK-296 wave B, pair live (0018.06.25 a₿ · block 967,201) — /live becomes
 * a designer page, GO §2 rubric line 3 (the RetreatsList shape): ONE
 * LiveDoor block rendering BOTH states (the h1 flips with the server-judged
 * flag, so the h1 belongs to the block), the idle voice as editable fields,
 * the live card + Jitsi embed injected at render by applyLiveToPuck — never
 * stored, never fossilised. The route reads Puck first with today's JSX as
 * the fallback (the /about shape); the server work (getLiveState & co.)
 * stays on the page AHEAD of the read.
 *
 * Pins, model not render for the branch flip (the house idiom — the page's
 * own SiteHeader/PopupHost throw under plain react-dom/server, see
 * tests/retreats-puck.test.ts's note); the page's own <Render> element is
 * rendered to static markup for the published-doc pins.
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

/* every string in an element tree, never touching .type (a module object
   closes a JSON cycle — the T-296 live lesson) */
function textOf(node: ReactNode): string {
  if (node == null || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(textOf).join("");
  if (isElement(node)) {
    const children = (node.props as { children?: ReactNode } | null)?.children;
    return children === undefined ? "" : textOf(children);
  }
  return "";
}

/* a live class room in the fixture: Clair Senses — Foundations (minTier A),
   doors opened at a fixed UTC instant (the block's UTC line is pure) */
const LIVE_STATE = { live: true, kind: "class" as const, room: "clair-senses", startedAt: 1789500000 };

function mockLive(state: unknown) {
  vi.doMock("@/lib/live", async (orig) => ({
    ...(await orig<typeof import("@/lib/live")>()),
    getLiveState: async () => state,
  }));
}

let tmpDir: string;

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "oc-live-puck-fixture-"));
  vi.resetModules();
  vi.stubEnv("PUCK_STORE_DRIVER", "filesystem");
  vi.stubEnv("PUCK_STORE_FS_DIR", tmpDir);
  vi.stubEnv("PUCK_STORE_NAMESPACE", "");
  vi.stubEnv("KV_REST_API_URL", "");
  vi.stubEnv("KV_REST_API_TOKEN", "");
});

afterAll(async () => {
  vi.doUnmock("@/lib/live");
  vi.unstubAllEnvs();
  if (tmpDir) await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
});

describe("the seed — /style/live opens pre-populated: the eyebrow verbatim + ONE LiveDoor entry", () => {
  it("SEEDS.live exists: eyebrow 'Live' + the block with the editable idle fields, and NO live state stored", async () => {
    const { SEEDS } = await import("@/lib/puck-seeds");
    const { LIVE_SCHEDULE, LIVE_YOUTUBE } = await import("@/lib/live");
    const seed = SEEDS.live;
    expect(seed).toBeDefined();
    const content = seed.content as SeedBlock[];
    expect(Array.isArray(content)).toBe(true);
    expect(content).toHaveLength(1);
    expect(content[0].type).toBe("Band");

    const flat = JSON.stringify(seed.content);
    expect(flat).toContain('"Live"');
    expect(flat).toContain("Live, on the rhythm");

    const doors = content.flatMap((b) =>
      (Array.isArray(b.props.content) ? (b.props.content as SeedBlock[]) : []).filter((c) => c.type === "LiveDoor"),
    );
    expect(doors).toHaveLength(1);
    /* the doc holds ONLY the id + the editable idle fields — the field
       literals are pinned against the server constants (@/lib/live is
       server-only; the seed can't import it — the matrix-rooms lesson) */
    expect(doors[0].props).toEqual({
      id: "lv-door",
      idleH1: "Live, on the rhythm",
      schedule: LIVE_SCHEDULE,
      youtubeUrl: LIVE_YOUTUBE,
    });
    /* never fossilised: no flag, no room, no startedAt, no embed */
    expect(flat).not.toContain("startedAt");
    expect(flat).not.toContain("jitsiDomain");
    expect(flat).not.toContain("clair-senses");
    expect(flat).not.toContain('"live":true');
  });

  it("every block id in the seed is unique — slot children included", async () => {
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
    walk(SEEDS.live.content);
    expect(ids.length).toBeGreaterThan(0);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toContain("lv-door");
  });

  it("the root props mirror the hand-built metadata — the title, and NO invented description", async () => {
    const { SEEDS } = await import("@/lib/puck-seeds");
    const root = SEEDS.live.root as { props?: { title?: string; description?: string } };
    expect(root.props?.title).toBe("Live — One Cocreation");
    expect(root.props?.description).toBeUndefined();
  });

  it("live is designer in the manifest, wearing the same note every wired route does", async () => {
    const { PAGE_STATES } = await import("@/lib/page-states");
    const live = PAGE_STATES.find((e) => e.path === "/live")!;
    const about = PAGE_STATES.find((e) => e.path === "/about")!;
    expect(live.state).toBe("designer");
    expect(live.slug).toBe("live");
    expect(live.note).toBe(about.note);
  });
});

describe("the registry + the block's two faces", () => {
  it("LiveDoor is registered in the real config and listed in the Layout group with its data-bound siblings", async () => {
    const { config } = await import("@/lib/puck-config");
    const comps = config.components as Record<string, { label?: string }>;
    expect(comps.LiveDoor).toBeDefined();
    const categories = config.categories as Record<string, { components?: string[] }>;
    expect(categories.layout.components).toContain("LiveDoor");
    /* append-only: after PackagesGrid, never reordered */
    expect(categories.layout.components?.indexOf("LiveDoor")).toBeGreaterThan(
      categories.layout.components?.indexOf("PackagesGrid") ?? -1,
    );
  });

  it("copilot.ts COMPONENTS mirrors LiveDoor (source pin — COMPONENTS is module-private)", () => {
    const src = readFileSync(path.join(REPO, "src/lib/copilot.ts"), "utf8");
    expect(src).toContain('type: "LiveDoor"');
  });

  it("with NO injection (the designer canvas): the idle face from the fields — idle h1, schedule, YouTube", async () => {
    const { config } = await import("@/lib/puck-config");
    const block = (config.components as unknown as Record<string, { render: (p: Record<string, unknown>) => ReactElement }>).LiveDoor;
    const el = block.render({ idleH1: "Live, on the rhythm", schedule: "Mon · Wed · Fri ~11:11", youtubeUrl: "https://www.youtube.com/@Onecocreation" });
    const html = renderToStaticMarkup(el);
    expect(html).toContain("Live, on the rhythm");
    expect(html).toContain("Mon · Wed · Fri ~11:11");
    expect(html).toContain('href="https://www.youtube.com/@Onecocreation"');
    expect(html).toContain("Classes &amp; Community");
    expect(html).not.toContain("Love is live now");
    expect(html).not.toContain("Enter the room");
  });

  it("with live props injected: 'Love is live now', the room card verbatim, the embed mounted", async () => {
    const { config } = await import("@/lib/puck-config");
    const { default: JitsiRoom } = await import("@/components/booking/JitsiRoom");
    const block = (config.components as unknown as Record<string, { render: (p: Record<string, unknown>) => ReactElement }>).LiveDoor;
    const el = block.render({
      idleH1: "Live, on the rhythm",
      schedule: "Mon · Wed · Fri ~11:11",
      youtubeUrl: "https://www.youtube.com/@Onecocreation",
      live: { slug: "clair-senses", title: "Clair Senses — Foundations", kind: "class", tierName: "Weekly Intuitive", startedAt: 1789500000 },
      embed: { jitsiDomain: "meet.example.com", liveRoom: "onecocreation-clair-senses" },
    });
    expect(findAll(el, (e) => e.type === JitsiRoom)).toHaveLength(1);
    const html = renderToStaticMarkup(el);
    expect(html).toContain("Love is live now");
    expect(html).toContain("● live now");
    expect(html).toContain("Class");
    expect(html).toContain("Clair Senses — Foundations");
    expect(html).toContain("Opens with the Weekly Intuitive package — and everything above it.");
    expect(html).toContain("The doors opened at");
    expect(html).toContain('href="/rooms/clair-senses"');
    expect(html).toContain("Enter the room");
    expect(html).toContain("if the room is above your package it will say so kindly");
  });

  it("a community room with minTier all: the free-circle line instead of a package name", async () => {
    const { config } = await import("@/lib/puck-config");
    const block = (config.components as unknown as Record<string, { render: (p: Record<string, unknown>) => ReactElement }>).LiveDoor;
    const html = renderToStaticMarkup(block.render({
      idleH1: "x", schedule: "y", youtubeUrl: "z",
      live: { slug: "heart-field", title: "The Heart Field", kind: "community", tierName: null },
    }));
    expect(html).toContain("Open to every signed-in member — the Community Circle is free.");
    expect(html).toContain("Community");
  });
});

describe("applyLiveToPuck — the render-time injection (never fossilised, nowhere else)", () => {
  it("injects into LiveDoor entries ONLY; pure, the input untouched", async () => {
    const { applyLiveToPuck } = await import("@/lib/puck-blocks/live-door");
    const doc = {
      content: [
        { type: "Heading", props: { id: "h", text: "hi" } },
        { type: "LiveDoor", props: { id: "lv-door", idleH1: "Live, on the rhythm", schedule: "s", youtubeUrl: "y" } },
      ],
      root: {},
    };
    const injected = { live: { slug: "clair-senses", title: "t", kind: "class" as const, tierName: "Weekly Intuitive" }, embed: null };
    const out = applyLiveToPuck(doc, injected);
    expect(out).not.toBe(doc);
    const blocks = out.content as SeedBlock[];
    expect(blocks[0].props.live).toBeUndefined(); // nowhere else
    expect(blocks[1].props.live).toEqual(injected.live);
    expect(blocks[1].props.idleH1).toBe("Live, on the rhythm"); // the fields survive
    // the stored doc keeps no flag
    expect(JSON.stringify(doc)).not.toContain("clair-senses");
  });

  it("a doc with no LiveDoor entry comes back the SAME reference (untouched-path law)", async () => {
    const { applyLiveToPuck } = await import("@/lib/puck-blocks/live-door");
    const doc = { content: [{ type: "Heading", props: { id: "h" } }], root: {} };
    expect(applyLiveToPuck(doc, { live: null, embed: null })).toBe(doc);
  });
});

describe("LivePage — the fallback renders BOTH states as today", () => {
  it("idle (a dark vault): 'Live, on the rhythm', the schedule card, no Render, no room door", async () => {
    const LivePage = (await import("@/app/live/page")).default;
    const { LIVE_SCHEDULE } = await import("@/lib/live");
    const el = await LivePage();

    const { Render } = await import("@puckeditor/core");
    expect(findAll(el, (e) => e.type === Render)).toHaveLength(0);
    const h1s = findAll(el, (e) => e.type === "h1");
    expect(h1s).toHaveLength(1);
    expect((h1s[0].props as { children?: ReactNode }).children).toBe("Live, on the rhythm");
    const flat = textOf(el);
    expect(flat).toContain(LIVE_SCHEDULE);
    expect(flat).not.toContain("Enter the room");
  });

  it("live (fixture flag): 'Love is live now', the Jitsi embed, the room card with its door", async () => {
    mockLive(LIVE_STATE);
    try {
      const LivePage = (await import("@/app/live/page")).default;
      const { default: JitsiRoom } = await import("@/components/booking/JitsiRoom");
      const el = await LivePage();

      const { Render } = await import("@puckeditor/core");
      expect(findAll(el, (e) => e.type === Render)).toHaveLength(0);
      expect(findAll(el, (e) => e.type === JitsiRoom)).toHaveLength(1);
      const h1s = findAll(el, (e) => e.type === "h1");
      expect((h1s[0].props as { children?: ReactNode }).children).toBe("Love is live now");
      const flat = textOf(el);
      expect(flat).toContain("Clair Senses — Foundations");
      expect(flat).toContain("Weekly Intuitive");
      const hrefs = findAll(el, (e) => e.type === "a" || (typeof e.type === "object" && e.type !== null))
        .map((e) => (e.props as { href?: string }).href)
        .filter(Boolean);
      expect(hrefs).toContain("/rooms/clair-senses");
    } finally {
      vi.doUnmock("@/lib/live");
    }
  });

  it("draft-only (not yet published) still serves the hand-built page — drafts never leak to visitors", async () => {
    const store = await import("@/lib/puck-store");
    await store.setPuckDraft("live", { content: [{ type: "Heading", props: { id: "h1", text: "unpublished" } }], root: {} });

    const LivePage = (await import("@/app/live/page")).default;
    const el = await LivePage();

    const { Render } = await import("@puckeditor/core");
    expect(findAll(el, (e) => e.type === Render)).toHaveLength(0);
    expect(findAll(el, (e) => e.type === "h1")).toHaveLength(1);
  });
});

describe("LivePage published — the SAME widget with the server props injected, both states", () => {
  it("idle fixture: the published doc renders the idle face from the fields, the flag injected as null, the store never written back", async () => {
    const store = await import("@/lib/puck-store");
    const doc = { content: [{ type: "LiveDoor", props: { id: "lv-door", idleH1: "Live, on the rhythm", schedule: "Mon · Wed · Fri ~11:11", youtubeUrl: "https://www.youtube.com/@Onecocreation" } }], root: {} };
    await store.setPuckDraft("live", doc);
    await store.publishDraft("live");

    const LivePage = (await import("@/app/live/page")).default;
    const el = await LivePage();

    const { Render } = await import("@puckeditor/core");
    const renders = findAll(el, (e) => e.type === Render);
    expect(renders).toHaveLength(1);
    const data = (renders[0].props as { data: { content: SeedBlock[] } }).data;
    /* the injection landed on the block's props… */
    expect(data.content[0].props.live).toBeNull();
    expect(data.content[0].props.embed).toBeNull();
    /* …and the stored published doc was never written back with a flag */
    expect(await store.getPuckPage("live")).toEqual(doc);

    const html = renderToStaticMarkup(renders[0]);
    expect(html).toContain("Live, on the rhythm");
    expect(html).toContain("Mon · Wed · Fri ~11:11");
    expect(html).not.toContain("Love is live now");
  });

  it("live fixture: the SAME published doc renders 'Love is live now' + the room card + the embed — the flag resolved fresh per request", async () => {
    mockLive(LIVE_STATE);
    try {
      const store = await import("@/lib/puck-store");
      const doc = { content: [{ type: "LiveDoor", props: { id: "lv-door", idleH1: "Live, on the rhythm", schedule: "Mon · Wed · Fri ~11:11", youtubeUrl: "https://www.youtube.com/@Onecocreation" } }], root: {} };
      await store.setPuckDraft("live", doc);
      await store.publishDraft("live");

      const LivePage = (await import("@/app/live/page")).default;
      const el = await LivePage();

      const { Render } = await import("@puckeditor/core");
      const renders = findAll(el, (e) => e.type === Render);
      expect(renders).toHaveLength(1);
      const data = (renders[0].props as { data: { content: SeedBlock[] } }).data;
      expect(data.content[0].props.live).toMatchObject({ slug: "clair-senses", tierName: "Weekly Intuitive", kind: "class" });
      expect(data.content[0].props.embed).toMatchObject({ liveRoom: "onecocreation-clair-senses" });
      /* the stored doc keeps only the fields */
      expect(await store.getPuckPage("live")).toEqual(doc);

      const html = renderToStaticMarkup(renders[0]);
      expect(html).toContain("Love is live now");
      expect(html).toContain("Clair Senses — Foundations");
      expect(html).toContain("Enter the room");
      /* the embed mounted through the block — JitsiRoom's SSR is its
         loading line (the element-level pin lives in the block-face test) */
      expect(html).toContain("opening the room…");
      /* the hand-built branch is gone from this request's output */
      expect(findAll(el, (e) => e.type === "h1" && (e.props as { className?: string }).className === "mgmt-title" && !findAll(e, () => true).length)).toHaveLength(0);
    } finally {
      vi.doUnmock("@/lib/live");
    }
  });

  it("the REAL seed round-trips: published, idle, the eyebrow + the idle voice render verbatim", async () => {
    const store = await import("@/lib/puck-store");
    const { SEEDS } = await import("@/lib/puck-seeds");
    await store.setPuckDraft("live", SEEDS.live);
    await store.publishDraft("live");

    const LivePage = (await import("@/app/live/page")).default;
    const el = await LivePage();

    const { Render } = await import("@puckeditor/core");
    const renders = findAll(el, (e) => e.type === Render);
    expect(renders).toHaveLength(1);
    const html = renderToStaticMarkup(renders[0]);
    expect(html).toContain("Live");
    expect(html).toContain("Live, on the rhythm");
    expect(html).toContain("Mon · Wed · Fri ~11:11");
    expect(html).toContain("The replay stays on the channel when the moment passes.");
  });
});
