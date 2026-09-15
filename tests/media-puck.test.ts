import { describe, it, expect, afterAll, beforeEach, vi } from "vitest";
import { promises as fs } from "fs";
import os from "os";
import path from "path";
import type { ReactElement, ReactNode } from "react";
import { isolateCwd } from "./helpers/isolate-cwd";

/* the repo root, captured BEFORE the isolate (isolateCwd must run ahead of
   any path.join(process.cwd(), …) constant — its own docblock) */
const cwd = isolateCwd("oc-media-puck-295-");

/**
 * TASK-295 wave A pair 5 (0018.06.25 a₿) — /media READS ITS SEED: Puck
 * first, today's MediaKit as the fallback (the /about-/book-/home shape,
 * src/app/media/page.tsx). Pins, model not render (the house idiom —
 * tests/meditation-puck.test.ts's findAll-the-element-tree pattern; the
 * page's own SiteHeader/PopupHost throw under plain react-dom/server):
 *
 *  · THE SEED IS THE KIT'S WORDS, VERBATIM: SEEDS.media exists with unique
 *    ids (slot children included — the T-231 lesson); every static word is
 *    seeded — the glyph notes, the real download paths, the palette
 *    names/hexes/roles, the press blurbs whole. The click-to-copy
 *    BEHAVIOUR and the two code-drawn visuals (the struck ess, the colour
 *    chips) are SAID code-side — behaviour, never data, is all a static
 *    doc can't hold.
 *  · THE FALLBACK IS UNCHANGED: nothing published ⇒ <MediaKit> renders, no
 *    <Render> anywhere.
 *  · DRAFTS NEVER LEAK: a saved draft alone (never published) still serves
 *    the fallback.
 *  · A PUBLISHED DOC RENDERS: after Publish, the same request serves the
 *    Puck doc through <Render> and the hand-built kit steps aside.
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
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "oc-media-puck-fixture-"));
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
  cwd.cleanup();
});

describe("the seed — /style/media opens pre-populated, the kit's words verbatim", () => {
  it("SEEDS.media exists and every id is unique, slot children included (the T-231 lesson)", async () => {
    const { SEEDS } = await import("@/lib/puck-seeds");
    const seed = SEEDS.media;
    expect(seed).toBeDefined();
    const content = seed.content as SeedBlock[];
    expect(Array.isArray(content)).toBe(true);
    expect(content.length).toBeGreaterThan(0);

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
    expect(ids.length).toBeGreaterThan(0);
    expect(new Set(ids).size).toBe(ids.length);
    /* the kit's own prefix, so no other page's region can collide */
    expect(ids.every((id) => id.startsWith("mi-"))).toBe(true);
  });

  it("the audited prose matches today's JSX (src/components/MediaKit.tsx), word for word", async () => {
    const { SEEDS } = await import("@/lib/puck-seeds");
    const flat = JSON.stringify(SEEDS.media.content);
    /* header */
    expect(flat).toContain("Media & assets");
    expect(flat).toContain("Copy a ₿ without leaving home");
    expect(flat).toContain("No trip to emojipedia required.");
    /* the glyphs, verbatim */
    expect(flat).toContain("Bitcoin sign — Unicode U+20BF. The whole coin; 1 ₿ = 100,000,000 sats.");
    expect(flat).toContain("Satoshi — the cent of bitcoin, 100,000,000 to the ₿. No Unicode exists; paste the word.");
    expect(flat).toContain("After-bitcoin date marker — rides after a BFT date: 0018.04.15 a₿.");
    expect(flat).toContain("Before-bitcoin marker — pre-genesis dates wear it the same way, after the date.");
    expect(flat).toContain("Star-in-a-box — every block height wears the boxed star in UI: ★ 957,661.");
    expect(flat).toContain("Lightning — the rail sats ride: instant, tiny, off-chain settlement.");
    expect(flat).toContain("a proposal, not yet a settled standard");
    /* the brand assets — real paths, real words */
    expect(flat).toContain("/brand/onecocreation-mark.svg");
    expect(flat).toContain("/brand/onecocreation-mark-email.png");
    expect(flat).toContain("/brand/onecocreation-lockup-raylit.svg");
    expect(flat).toContain("/brand/onecocreation-lockup-email.png");
    expect(flat).toContain("The ring with the purple half — where heaven and earth meet.");
    expect(flat).toContain("The raylit lockup — mark and wordmark together, lit from above.");
    /* the palette — names, hexes, roles, verbatim (the sign-in contract's set) */
    expect(flat).toContain("gold · #D9B24E — money ONLY");
    expect(flat).toContain("purple · #9B26D6 — info · verify");
    expect(flat).toContain("copper · #C77B4A — warmth");
    expect(flat).toContain("Gold is money, and only money.");
    /* the press blurbs, whole */
    expect(flat).toContain("One Cocreation is the way of the heart — sessions, meditations, and a community where heaven and earth meet, with a free, sovereign name@onecocreation tag");
    expect(flat).toContain("no rent, no resets, nobody to ask. Everything gets tied to the block.");
    /* the behaviour is said code-side, never faked */
    expect(flat).toContain("── the click-to-copy buttons stay code-side");
    expect(flat).toContain("── the COPY ONE-LINER / COPY PARAGRAPH buttons stay code-side ──");
    /* honest root props mirror the hand-built page's metadata */
    const root = SEEDS.media.root as { props?: { title?: string; description?: string } };
    expect(root.props?.title).toBe("Media & assets — One Cocreation");
    expect(root.props?.description).toContain("No trip to emojipedia required.");
  });

  it("media is designer in the manifest, wearing the SAME note every other wired route does", async () => {
    const { PAGE_STATES } = await import("@/lib/page-states");
    const media = PAGE_STATES.find((e) => e.path === "/media")!;
    const about = PAGE_STATES.find((e) => e.path === "/about")!;
    expect(media.state).toBe("designer");
    expect(media.slug).toBe("media");
    expect(media.note).toBe(about.note);
  });
});

describe("MediaPage — Puck first, the hand-built kit as fallback", () => {
  beforeEach(() => {
    /* DisplayFonts calls next/font/local at module top — a no-go under plain
       vitest and beside the point here (these pins are about the Puck-vs-
       fallback wiring, not the font cascade): a passthrough stands in. */
    vi.doMock("@/components/DisplayFonts", () => ({
      default: ({ children }: { children?: ReactNode }) => children,
    }));
  });

  it("with nothing published: <MediaKit> renders — no <Render> anywhere", async () => {
    const MediaPage = (await import("@/app/media/page")).default;
    const MediaKit = (await import("@/components/MediaKit")).default;
    const el = await MediaPage();

    const { Render } = await import("@puckeditor/core");
    expect(findAll(el, (e) => e.type === Render)).toHaveLength(0);
    expect(findAll(el, (e) => e.type === MediaKit)).toHaveLength(1);
  });

  it("draft-only (not yet published) still serves the hand-built page — drafts never leak to visitors", async () => {
    const store = await import("@/lib/puck-store");
    await store.setPuckDraft("media", { content: [{ type: "Heading", props: { id: "h1", text: "unpublished" } }], root: {} });

    const MediaPage = (await import("@/app/media/page")).default;
    const MediaKit = (await import("@/components/MediaKit")).default;
    const el = await MediaPage();

    const { Render } = await import("@puckeditor/core");
    expect(findAll(el, (e) => e.type === Render)).toHaveLength(0);
    expect(findAll(el, (e) => e.type === MediaKit)).toHaveLength(1);
  });

  it("after Publish to live: the SAME request renders the published Puck doc and the hand-built kit steps aside", async () => {
    const store = await import("@/lib/puck-store");
    const doc = { content: [{ type: "Heading", props: { id: "h1", text: "Fixture publish — media live", level: "h1", align: "center", style: {} } }], root: {} };
    await store.setPuckDraft("media", doc);
    await store.publishDraft("media");

    const MediaPage = (await import("@/app/media/page")).default;
    const MediaKit = (await import("@/components/MediaKit")).default;
    const el = await MediaPage();

    const { Render } = await import("@puckeditor/core");
    const renders = findAll(el, (e) => e.type === Render);
    expect(renders).toHaveLength(1);
    expect((renders[0].props as { data?: unknown }).data).toEqual(doc);
    expect(findAll(el, (e) => e.type === MediaKit)).toHaveLength(0);
  });

  it("a fresh publish of the real seed renders it whole — the doc passes through untouched", async () => {
    const store = await import("@/lib/puck-store");
    const { SEEDS } = await import("@/lib/puck-seeds");
    await store.setPuckDraft("media", SEEDS.media);
    await store.publishDraft("media");

    const MediaPage = (await import("@/app/media/page")).default;
    const el = await MediaPage();

    const { Render } = await import("@puckeditor/core");
    const renders = findAll(el, (e) => e.type === Render);
    expect(renders).toHaveLength(1);
    expect((renders[0].props as { data?: unknown }).data).toEqual(SEEDS.media);
  });
});
