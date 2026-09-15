import { describe, it, expect, afterAll, beforeEach, vi } from "vitest";
import { promises as fs } from "fs";
import os from "os";
import path from "path";
import type { ReactElement, ReactNode } from "react";
import { isolateCwd } from "./helpers/isolate-cwd";

/* the repo root, captured BEFORE the isolate (isolateCwd must run ahead of
   any path.join(process.cwd(), …) constant — its own docblock) */
const cwd = isolateCwd("oc-jewelry-puck-295-");

/**
 * TASK-295 wave A pair 3 (0018.06.25 a₿) — /jewelry READS ITS SEED: Puck
 * first, today's <Jewelry> section as the fallback (the /about-/book-/home
 * shape, src/app/jewelry/page.tsx). Pins, model not render (the house idiom
 * — tests/meditation-puck.test.ts's findAll-the-element-tree pattern; the
 * page's own SiteHeader/PopupHost throw under plain react-dom/server):
 *
 *  · THE SEED IS HER WORDS, VERBATIM: SEEDS.jewelry exists with unique ids
 *    (slot children included — the T-231 lesson), the four pieces with their
 *    stories and prices, and the closing note whole; the pendant stand-in
 *    art is SAID code-side (an inline-SVG drawing no image file exists for).
 *  · THE FALLBACK IS UNCHANGED: nothing published ⇒ <Jewelry> renders, no
 *    <Render> anywhere.
 *  · DRAFTS NEVER LEAK: a saved draft alone (never published) still serves
 *    the fallback.
 *  · A PUBLISHED DOC RENDERS: after Publish, the same request serves the
 *    Puck doc through <Render> and the hand-built section steps aside.
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
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "oc-jewelry-puck-fixture-"));
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

describe("the seed — /style/jewelry opens pre-populated, her words verbatim", () => {
  it("SEEDS.jewelry exists and every id is unique, slot children included (the T-231 lesson)", async () => {
    const { SEEDS } = await import("@/lib/puck-seeds");
    const seed = SEEDS.jewelry;
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
    expect(ids.every((id) => id.startsWith("jw-"))).toBe(true);
  });

  it("the audited prose matches today's JSX (sections.tsx Jewelry), word for word", async () => {
    const { SEEDS } = await import("@/lib/puck-seeds");
    const flat = JSON.stringify(SEEDS.jewelry.content);
    expect(flat).toContain("Handmade by Love");
    expect(flat).toContain("The Adornments");
    expect(flat).toContain("Wire-wrapped pendants, made one at a time — copper and rose-gold spirals holding stones that chose you.");
    /* the four pieces, their stories and prices, verbatim */
    expect(flat).toContain("Rose Quartz Spiral");
    expect(flat).toContain("Divine feminine — soft heart-opening.");
    expect(flat).toContain("$88");
    expect(flat).toContain("⚡ ≈ 88,000 sats");
    expect(flat).toContain("Amethyst Ascension");
    expect(flat).toContain("Crown-chakra clarity, held in wire.");
    expect(flat).toContain("⚡ ≈ 111,000 sats");
    expect(flat).toContain("Amazonite Waters");
    expect(flat).toContain("Throat-song truth — for speaking your knowing.");
    expect(flat).toContain("⚡ ≈ 77,000 sats");
    expect(flat).toContain("Citrine Sun");
    expect(flat).toContain("Divine masculine — warmth and the golden spiral.");
    expect(flat).toContain("⚡ ≈ 99,000 sats");
    expect(flat).toContain("Handmade · ships in 3–5 days");
    /* the closing note, whole — words law: transcribed, never rewritten */
    expect(flat).toContain("Physical goods — each piece is handmade and posted to you.");
    expect(flat).toContain("These are stand-in images — photos of the real pieces are coming soon.");
    /* the pendant art is said code-side, never fossilised */
    expect(flat).toContain("── the pendant stand-in art stays code-side");
    /* the page carries no metadata export today — the seed invents none */
    expect(SEEDS.jewelry.root).toEqual({});
  });

  it("jewelry is designer in the manifest, wearing the SAME note every other wired route does", async () => {
    const { PAGE_STATES } = await import("@/lib/page-states");
    const jewelry = PAGE_STATES.find((e) => e.path === "/jewelry")!;
    const about = PAGE_STATES.find((e) => e.path === "/about")!;
    expect(jewelry.state).toBe("designer");
    expect(jewelry.slug).toBe("jewelry");
    expect(jewelry.note).toBe(about.note);
  });
});

describe("JewelryPage — Puck first, the hand-built section as fallback", () => {
  it("with nothing published: <Jewelry> renders — no <Render> anywhere", async () => {
    const JewelryPage = (await import("@/app/jewelry/page")).default;
    const { Jewelry } = await import("@/components/sections");
    const el = await JewelryPage();

    const { Render } = await import("@puckeditor/core");
    expect(findAll(el, (e) => e.type === Render)).toHaveLength(0);
    expect(findAll(el, (e) => e.type === Jewelry)).toHaveLength(1);
  });

  it("draft-only (not yet published) still serves the hand-built page — drafts never leak to visitors", async () => {
    const store = await import("@/lib/puck-store");
    await store.setPuckDraft("jewelry", { content: [{ type: "Heading", props: { id: "h1", text: "unpublished" } }], root: {} });

    const JewelryPage = (await import("@/app/jewelry/page")).default;
    const { Jewelry } = await import("@/components/sections");
    const el = await JewelryPage();

    const { Render } = await import("@puckeditor/core");
    expect(findAll(el, (e) => e.type === Render)).toHaveLength(0);
    expect(findAll(el, (e) => e.type === Jewelry)).toHaveLength(1);
  });

  it("after Publish to live: the SAME request renders the published Puck doc and the hand-built section steps aside", async () => {
    const store = await import("@/lib/puck-store");
    const doc = { content: [{ type: "Heading", props: { id: "h1", text: "Fixture publish — jewelry live", level: "h1", align: "center", style: {} } }], root: {} };
    await store.setPuckDraft("jewelry", doc);
    await store.publishDraft("jewelry");

    const JewelryPage = (await import("@/app/jewelry/page")).default;
    const { Jewelry } = await import("@/components/sections");
    const el = await JewelryPage();

    const { Render } = await import("@puckeditor/core");
    const renders = findAll(el, (e) => e.type === Render);
    expect(renders).toHaveLength(1);
    expect((renders[0].props as { data?: unknown }).data).toEqual(doc);
    expect(findAll(el, (e) => e.type === Jewelry)).toHaveLength(0);
  });

  it("a fresh publish of the real seed renders it whole — the doc passes through untouched", async () => {
    const store = await import("@/lib/puck-store");
    const { SEEDS } = await import("@/lib/puck-seeds");
    await store.setPuckDraft("jewelry", SEEDS.jewelry);
    await store.publishDraft("jewelry");

    const JewelryPage = (await import("@/app/jewelry/page")).default;
    const el = await JewelryPage();

    const { Render } = await import("@puckeditor/core");
    const renders = findAll(el, (e) => e.type === Render);
    expect(renders).toHaveLength(1);
    expect((renders[0].props as { data?: unknown }).data).toEqual(SEEDS.jewelry);
  });
});
