import { describe, it, expect, afterAll, beforeEach, vi } from "vitest";
import { promises as fs } from "fs";
import os from "os";
import path from "path";
import type { ReactElement, ReactNode } from "react";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

/**
 * TASK-295 wave A pair 6 (0018.06.25 a₿ · block 967,188) — /bday becomes a
 * designer page: a Puck seed transcribed VERBATIM from the hand-built JSX
 * (the words law) and the route reading Puck first with today's JSX as the
 * fallback (the /about shape, src/app/about/page.tsx:68-88). No route gates
 * (the page reads no site switches), no live data anywhere — the page exists
 * BECAUSE the modeled birth-block reading stays off this site (the
 * 0018.05.26 a₿ dashes-over-estimates ruling).
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

let tmpDir: string;

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "oc-bday-puck-fixture-"));
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

describe("the seed — /style/bday opens pre-populated, every word verbatim", () => {
  it("SEEDS.bday exists: one plain band with the eyebrow, the h1 and the blurb carrying the /time door", async () => {
    const { SEEDS } = await import("@/lib/puck-seeds");
    const seed = SEEDS.bday;
    expect(seed).toBeDefined();
    const content = seed.content as SeedBlock[];
    expect(Array.isArray(content)).toBe(true);
    expect(content).toHaveLength(1);
    expect(content[0].type).toBe("Band");

    /* the words law, pinned (src/app/bday/page.tsx — the fallback, NOT edited) */
    const flat = JSON.stringify(seed.content);
    expect(flat).toContain("One Cocreation The Bitcoin Birthday checker");
    expect(flat).toContain("When were you born, in bitcoin time?");
    expect(flat).toContain("The checker that answered this has moved with the time kit to its own world — it reads a modeled birth block, and this site only shows what the chain can vouch for.");
    expect(flat).toContain("It returns with this door's new face.");
    expect(flat).toContain("The plain live reading keeps ticking at");
    expect(flat).toContain('href=\\"/time\\"');
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
    walk(SEEDS.bday.content);
    expect(ids.length).toBeGreaterThan(0);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("the root props mirror the hand-built metadata verbatim", async () => {
    const { SEEDS } = await import("@/lib/puck-seeds");
    const root = SEEDS.bday.root as { props?: { title?: string; description?: string } };
    expect(root.props?.title).toBe("Bitcoin Birthday — One Cocreation");
    expect(root.props?.description).toBe("The Bitcoin Birthday checker has moved with the time kit — it returns with this door's new face.");
  });

  it("bday is designer in the manifest, wearing the same note every wired route does", async () => {
    const { PAGE_STATES } = await import("@/lib/page-states");
    const bday = PAGE_STATES.find((e) => e.path === "/bday")!;
    const about = PAGE_STATES.find((e) => e.path === "/about")!;
    expect(bday.state).toBe("designer");
    expect(bday.slug).toBe("bday");
    expect(bday.note).toBe(about.note);
  });
});

describe("BdayPage — Puck first, the hand-built page as fallback", () => {
  beforeEach(() => {
    /* next/font/local throws outside the Next build — DisplayFonts is the
       fallback's font loader, not the wiring under test; the house's
       model-not-render idiom mocks it away (the fonts are the cartridge's
       own concern, pinned elsewhere) */
    vi.doMock("@/components/DisplayFonts", () => ({
      default: ({ children }: { children?: ReactNode }) => createElement("div", null, children),
    }));
  });

  afterAll(() => {
    vi.doUnmock("@/components/DisplayFonts");
  });

  it("with nothing published: the hand-built page renders — no <Render> anywhere, its own h1 stands", async () => {
    const BdayPage = (await import("@/app/bday/page")).default;
    const el = await BdayPage();

    const { Render } = await import("@puckeditor/core");
    expect(findAll(el, (e) => e.type === Render)).toHaveLength(0);
    const h1s = findAll(el, (e) => e.type === "h1");
    expect(h1s).toHaveLength(1);
    expect((h1s[0].props as { children?: ReactNode }).children).toBe("When were you born, in bitcoin time?");
  });

  it("draft-only (not yet published) still serves the hand-built page — drafts never leak to visitors", async () => {
    const store = await import("@/lib/puck-store");
    await store.setPuckDraft("bday", { content: [{ type: "Heading", props: { id: "h1", text: "unpublished" } }], root: {} });

    const BdayPage = (await import("@/app/bday/page")).default;
    const el = await BdayPage();

    const { Render } = await import("@puckeditor/core");
    expect(findAll(el, (e) => e.type === Render)).toHaveLength(0);
    expect(findAll(el, (e) => e.type === "h1")).toHaveLength(1);
  });

  it("after Publish to live: the SAME request renders the published Puck doc, the hand-built branch gone", async () => {
    const store = await import("@/lib/puck-store");
    const style = { font: "default", size: 0, kerning: 0, lineHeight: 0, color: "default", spaceAbove: 0, spaceBelow: 0 };
    const doc = { content: [{ type: "Heading", props: { id: "h1", text: "Fixture publish — bday live", level: "h1", align: "center", style } }], root: {} };
    await store.setPuckDraft("bday", doc);
    await store.publishDraft("bday");

    const BdayPage = (await import("@/app/bday/page")).default;
    const el = await BdayPage();

    const { Render } = await import("@puckeditor/core");
    const renders = findAll(el, (e) => e.type === Render);
    expect(renders).toHaveLength(1);
    expect((renders[0].props as { data?: unknown }).data).toEqual(doc);
    expect(renderToStaticMarkup(renders[0])).toContain("Fixture publish — bday live");
    expect(findAll(el, (e) => e.type === "h1" && (e.props as { className?: string }).className === "mgmt-title")).toHaveLength(0);
  });

  it("the published branch renders the REAL seed verbatim — the words and the /time door survive the studio round-trip", async () => {
    const store = await import("@/lib/puck-store");
    const { SEEDS } = await import("@/lib/puck-seeds");
    await store.setPuckDraft("bday", SEEDS.bday);
    await store.publishDraft("bday");

    const BdayPage = (await import("@/app/bday/page")).default;
    const el = await BdayPage();

    const { Render } = await import("@puckeditor/core");
    const renders = findAll(el, (e) => e.type === Render);
    expect(renders).toHaveLength(1);
    const html = renderToStaticMarkup(renders[0]);
    expect(html).toContain("One Cocreation The Bitcoin Birthday checker");
    expect(html).toContain("When were you born, in bitcoin time?");
    expect(html).toContain("this site only shows what the chain can vouch for");
    expect(html).toContain('href="/time"');
  });
});
