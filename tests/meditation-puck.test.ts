import { describe, it, expect, afterAll, beforeEach, vi } from "vitest";
import { promises as fs } from "fs";
import os from "os";
import path from "path";
import type { ReactElement, ReactNode } from "react";
import { isolateCwd } from "./helpers/isolate-cwd";

/* the repo root, captured BEFORE the isolate (isolateCwd must run ahead of
   any path.join(process.cwd(), …) constant — its own docblock) */
const cwd = isolateCwd("oc-meditation-puck-295-");

/**
 * TASK-295 wave A pair 1 (0018.06.25 a₿) — /meditation READS ITS SEED: Puck
 * first, today's FreeMeditation section as the fallback (the
 * /about-/book-/home shape, src/app/meditation/page.tsx). Pins, model not
 * render (the house idiom — tests/home-puck.test.ts's findAll-the-element-
 * tree pattern; the page's own SiteHeader/PopupHost throw under plain
 * react-dom/server):
 *
 *  · THE SEED IS HER WORDS, VERBATIM: SEEDS.meditation exists with unique
 *    ids (slot children included — the T-231 lesson), the real dusk-lake
 *    photograph with its real alt, and the T-290 line "on the house, from
 *    our 💞 to yours" whole; the live subscribe form is SAID code-side
 *    (a Note), never fossilised.
 *  · THE FALLBACK IS UNCHANGED: nothing published ⇒ the hand-built
 *    <FreeMeditation> section renders, no <Render> anywhere.
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
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "oc-meditation-puck-fixture-"));
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

describe("the seed — /style/meditation opens pre-populated, her words verbatim", () => {
  it("SEEDS.meditation exists and every id is unique, slot children included (the T-231 lesson)", async () => {
    const { SEEDS } = await import("@/lib/puck-seeds");
    const seed = SEEDS.meditation;
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
    expect(ids.every((id) => id.startsWith("md-"))).toBe(true);
  });

  it("the audited prose matches today's JSX (sections.tsx FreeMeditation), word for word", async () => {
    const { SEEDS } = await import("@/lib/puck-seeds");
    const flat = JSON.stringify(SEEDS.meditation.content);
    expect(flat).toContain("Be in the Know");
    expect(flat).toContain("A Free Meditation, With Love");
    expect(flat).toContain("Unzip Into the New You");
    /* the T-290 line, whole — words law: transcribed, never rewritten */
    expect(flat).toContain("Delivered straight to your inbox — on the house, from our 💞 to yours.");
    /* the REAL photograph and its REAL alt (sections.tsx:522), not the
       newsletter.webp the home seed's twin band carries */
    expect(flat).toContain("/images/dusk-lake-storm-light.webp");
    expect(flat).toContain("a still lake under mountains at dusk, orange light breaking through storm cloud");
    /* the live subscribe form is said code-side, never fossilised */
    expect(flat).toContain("── live subscribe form stays code-side ──");
    /* honest root props mirror the hand-built page's metadata */
    const root = SEEDS.meditation.root as { props?: { title?: string; description?: string } };
    expect(root.props?.title).toBe("Free Meditation — One Cocreation");
    expect(root.props?.description).toContain("on the house, from our 💞 to yours");
  });

  it("meditation is designer in the manifest, wearing the SAME note every other wired route does", async () => {
    const { PAGE_STATES } = await import("@/lib/page-states");
    const meditation = PAGE_STATES.find((e) => e.path === "/meditation")!;
    const about = PAGE_STATES.find((e) => e.path === "/about")!;
    expect(meditation.state).toBe("designer");
    expect(meditation.slug).toBe("meditation");
    expect(meditation.note).toBe(about.note);
  });
});

describe("MeditationPage — Puck first, the hand-built section as fallback", () => {
  it("with nothing published: <FreeMeditation> renders — no <Render> anywhere", async () => {
    const MeditationPage = (await import("@/app/meditation/page")).default;
    const { FreeMeditation } = await import("@/components/sections");
    const el = await MeditationPage();

    const { Render } = await import("@puckeditor/core");
    expect(findAll(el, (e) => e.type === Render)).toHaveLength(0);
    expect(findAll(el, (e) => e.type === FreeMeditation)).toHaveLength(1);
  });

  it("draft-only (not yet published) still serves the hand-built page — drafts never leak to visitors", async () => {
    const store = await import("@/lib/puck-store");
    await store.setPuckDraft("meditation", { content: [{ type: "Heading", props: { id: "h1", text: "unpublished" } }], root: {} });

    const MeditationPage = (await import("@/app/meditation/page")).default;
    const { FreeMeditation } = await import("@/components/sections");
    const el = await MeditationPage();

    const { Render } = await import("@puckeditor/core");
    expect(findAll(el, (e) => e.type === Render)).toHaveLength(0);
    expect(findAll(el, (e) => e.type === FreeMeditation)).toHaveLength(1);
  });

  it("after Publish to live: the SAME request renders the published Puck doc and the hand-built section steps aside", async () => {
    const store = await import("@/lib/puck-store");
    const doc = { content: [{ type: "Heading", props: { id: "h1", text: "Fixture publish — meditation live", level: "h1", align: "center", style: {} } }], root: {} };
    await store.setPuckDraft("meditation", doc);
    await store.publishDraft("meditation");

    const MeditationPage = (await import("@/app/meditation/page")).default;
    const { FreeMeditation } = await import("@/components/sections");
    const el = await MeditationPage();

    const { Render } = await import("@puckeditor/core");
    const renders = findAll(el, (e) => e.type === Render);
    expect(renders).toHaveLength(1);
    expect((renders[0].props as { data?: unknown }).data).toEqual(doc);
    expect(findAll(el, (e) => e.type === FreeMeditation)).toHaveLength(0);
  });

  it("a fresh publish of the real seed renders it whole — the doc passes through untouched", async () => {
    const store = await import("@/lib/puck-store");
    const { SEEDS } = await import("@/lib/puck-seeds");
    await store.setPuckDraft("meditation", SEEDS.meditation);
    await store.publishDraft("meditation");

    const MeditationPage = (await import("@/app/meditation/page")).default;
    const el = await MeditationPage();

    const { Render } = await import("@puckeditor/core");
    const renders = findAll(el, (e) => e.type === Render);
    expect(renders).toHaveLength(1);
    expect((renders[0].props as { data?: unknown }).data).toEqual(SEEDS.meditation);
  });
});
