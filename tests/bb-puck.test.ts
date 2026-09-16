import { describe, it, expect, afterAll, beforeEach, vi } from "vitest";
import { promises as fs, readFileSync } from "fs";
import os from "os";
import path from "path";
import type { ReactElement, ReactNode } from "react";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

/* the repo root, captured before any module state matters */
const REPO = process.cwd();

/**
 * TASK-296 wave B, pair bb-time (0018.06.25 a₿) — /bb becomes a designer
 * page: the header words as a Puck seed transcribed VERBATIM (the words
 * law), the live Bitcoin Buddy console as the { id }-only BbConsole block
 * (GO §2 rubric line 2 — self-contained CLIENT widget: member session,
 * NIP-07 signer, localStorage buddies, the live tip poll; nothing
 * server-judged, so nothing injected and nothing fossilised), and the
 * route reading Puck first with today's JSX as the fallback (the /about
 * shape, src/app/about/page.tsx:68-88). No route gates (the page reads no
 * site switches).
 *
 * Pins, model not render for the branch flip (the house idiom — the page's
 * own SiteHeader/PopupHost throw under plain react-dom/server, see
 * tests/retreats-puck.test.ts's note); the page's own <Render> element is
 * rendered to static markup for the published-doc pins (BbConsole's SSR is
 * its honest "WAKING THE HATCHERY…" waking state — hydration fills).
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
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "oc-bb-puck-fixture-"));
  vi.resetModules();
  vi.stubEnv("PUCK_STORE_DRIVER", "filesystem");
  vi.stubEnv("PUCK_STORE_FS_DIR", tmpDir);
  vi.stubEnv("PUCK_STORE_NAMESPACE", "");
  vi.stubEnv("KV_REST_API_URL", "");
  vi.stubEnv("KV_REST_API_TOKEN", "");
});

afterAll(async () => {
  vi.unstubAllEnvs();
  if (tmpDir) await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
});

describe("the seed — /style/bb opens pre-populated, the header words verbatim, the console a block", () => {
  it("SEEDS.bb exists: one plain band with the eyebrow, the h1, the blurb, and ONE BbConsole block", async () => {
    const { SEEDS } = await import("@/lib/puck-seeds");
    const seed = SEEDS.bb;
    expect(seed).toBeDefined();
    const content = seed.content as SeedBlock[];
    expect(Array.isArray(content)).toBe(true);
    expect(content).toHaveLength(1);
    expect(content[0].type).toBe("Band");

    /* the words law, pinned (src/app/bb/page.tsx — the fallback, NOT edited) */
    const flat = JSON.stringify(seed.content);
    expect(flat).toContain("One Cocreation");
    expect(flat).toContain("Bitcoin Buddy");
    expect(flat).toContain("A lil buddy tied to the block — co-owned with your friends, kept alive with your key.");

    const walk = (v: unknown, out: SeedBlock[] = []): SeedBlock[] => {
      if (Array.isArray(v)) { v.forEach((x) => walk(x, out)); return out; }
      if (v && typeof v === "object") {
        const o = v as SeedBlock & { type?: string };
        if (o.type === "BbConsole") out.push(o as SeedBlock);
        Object.values(o).forEach((x) => walk(x, out));
      }
      return out;
    };
    const consoles = walk(seed.content);
    expect(consoles).toHaveLength(1);
    expect(consoles[0].props).toEqual({ id: "bb-console" }); // the doc holds ONLY the id
  });

  it("the seed carries NO fossil — no npub, no buddy, no block height, no session", async () => {
    const { SEEDS } = await import("@/lib/puck-seeds");
    const flat = JSON.stringify(SEEDS.bb.content);
    expect(flat).not.toContain("npub1");
    expect(flat).not.toContain("buddies");
    expect(flat).not.toMatch(/\d{3},\d{3}/);
    expect(flat).not.toContain("pa-fren");
  });

  it("every block id in the seed is unique — slot children and the BbConsole block included", async () => {
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
    walk(SEEDS.bb.content);
    expect(ids.length).toBeGreaterThan(0);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toContain("bb-console");
  });

  it("the root props mirror the hand-built metadata verbatim", async () => {
    const { SEEDS } = await import("@/lib/puck-seeds");
    const root = SEEDS.bb.root as { props?: { title?: string; description?: string } };
    expect(root.props?.title).toBe("Bitcoin Buddy — One Cocreation");
    expect(root.props?.description).toBe("Meet your Bitcoin Buddy — a co-owned virtual pet born at a block and cared for with your key. Sign in with nostr to start.");
  });

  it("bb is designer in the manifest, wearing the same note every wired route does", async () => {
    const { PAGE_STATES } = await import("@/lib/page-states");
    const bb = PAGE_STATES.find((e) => e.path === "/bb")!;
    const about = PAGE_STATES.find((e) => e.path === "/about")!;
    expect(bb.state).toBe("designer");
    expect(bb.slug).toBe("bb");
    expect(bb.note).toBe(about.note);
  });
});

describe("the registry — puck-config + the copilot mirror (the lockstep law, append-only)", () => {
  it("BbConsole is registered in the real config and listed in the Actions group", async () => {
    const { config } = await import("@/lib/puck-config");
    const comps = config.components as Record<string, { label?: string }>;
    expect(comps.BbConsole).toBeDefined();
    const categories = config.categories as Record<string, { components?: string[] }>;
    expect(categories.actions.components).toContain("BbConsole");
    expect(categories.actions.components?.indexOf("BbConsole")).toBeGreaterThan(
      categories.actions.components?.indexOf("FormDoors") ?? -1,
    );
  });

  it("the block renders the REAL console — SSR is its honest waking state (hydration fills)", async () => {
    const { config } = await import("@/lib/puck-config");
    const block = (config.components as unknown as Record<string, { render: (p: Record<string, unknown>) => ReactElement }>).BbConsole;
    const html = renderToStaticMarkup(block.render({}));
    expect(html).toContain("WAKING THE HATCHERY");
  });

  it("copilot.ts COMPONENTS mirrors BbConsole (source pin — COMPONENTS is module-private)", () => {
    const src = readFileSync(path.join(REPO, "src/lib/copilot.ts"), "utf8");
    expect(src).toContain('type: "BbConsole"');
  });
});

describe("BbPage — Puck first, the hand-built page as fallback, the console live on both branches", () => {
  beforeEach(() => {
    /* next/font/local throws outside the Next build — DisplayFonts is the
       fallback's font loader, not the wiring under test (the pair-6 bday
       test's idiom) */
    vi.doMock("@/components/DisplayFonts", () => ({
      default: ({ children }: { children?: ReactNode }) => createElement("div", null, children),
    }));
  });

  afterAll(() => {
    vi.doUnmock("@/components/DisplayFonts");
  });

  it("with nothing published: the hand-built page renders — no <Render> anywhere, BbConsole stands", async () => {
    const BbPage = (await import("@/app/bb/page")).default;
    const { default: BbConsole } = await import("@/components/BbConsole");
    const el = await BbPage();

    const { Render } = await import("@puckeditor/core");
    expect(findAll(el, (e) => e.type === Render)).toHaveLength(0);
    expect(findAll(el, (e) => e.type === BbConsole)).toHaveLength(1);
  });

  it("draft-only (not yet published) still serves the hand-built page — drafts never leak to visitors", async () => {
    const store = await import("@/lib/puck-store");
    await store.setPuckDraft("bb", { content: [{ type: "Heading", props: { id: "h1", text: "unpublished" } }], root: {} });

    const BbPage = (await import("@/app/bb/page")).default;
    const { default: BbConsole } = await import("@/components/BbConsole");
    const el = await BbPage();

    const { Render } = await import("@puckeditor/core");
    expect(findAll(el, (e) => e.type === Render)).toHaveLength(0);
    expect(findAll(el, (e) => e.type === BbConsole)).toHaveLength(1);
  });

  it("after Publish to live: the SAME request renders the published Puck doc — the SAME console widget through the block", async () => {
    const store = await import("@/lib/puck-store");
    const doc = { content: [{ type: "BbConsole", props: { id: "bb-console" } }], root: {} };
    await store.setPuckDraft("bb", doc);
    await store.publishDraft("bb");

    const BbPage = (await import("@/app/bb/page")).default;
    const { default: BbConsole } = await import("@/components/BbConsole");
    const el = await BbPage();

    const { Render } = await import("@puckeditor/core");
    const renders = findAll(el, (e) => e.type === Render);
    expect(renders).toHaveLength(1);
    /* { id }-only: the data passes through untouched — nothing injected,
       nothing written back (the stored published doc keeps only the id) */
    expect((renders[0].props as { data?: unknown }).data).toEqual(doc);
    expect(await store.getPuckPage("bb")).toEqual(doc);
    /* and the block renders the real console (its SSR waking state) */
    const html = renderToStaticMarkup(renders[0]);
    expect(html).toContain("WAKING THE HATCHERY");
    // the hand-built branch is gone from this request's output
    expect(findAll(el, (e) => e.type === BbConsole)).toHaveLength(0);
  });

  it("the published branch renders the REAL seed — the header words verbatim AND the console block live", async () => {
    const store = await import("@/lib/puck-store");
    const { SEEDS } = await import("@/lib/puck-seeds");
    await store.setPuckDraft("bb", SEEDS.bb);
    await store.publishDraft("bb");

    const BbPage = (await import("@/app/bb/page")).default;
    const el = await BbPage();

    const { Render } = await import("@puckeditor/core");
    const renders = findAll(el, (e) => e.type === Render);
    expect(renders).toHaveLength(1);
    const html = renderToStaticMarkup(renders[0]);
    expect(html).toContain("Bitcoin Buddy");
    expect(html).toContain("A lil buddy tied to the block");
    expect(html).toContain("WAKING THE HATCHERY");
  });
});
