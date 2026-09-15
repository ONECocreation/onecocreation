import { describe, it, expect, afterAll, beforeEach, vi } from "vitest";
import { promises as fs } from "fs";
import os from "os";
import path from "path";
import type { ReactElement, ReactNode } from "react";
import { isolateCwd } from "./helpers/isolate-cwd";

/* the repo root, captured BEFORE the isolate (isolateCwd must run ahead of
   any path.join(process.cwd(), …) constant — its own docblock) */
const cwd = isolateCwd("oc-news-puck-295-");

/**
 * TASK-295 wave A pair 5 (0018.06.25 a₿) — /news READS ITS SEED: Puck
 * first, today's hand-built shelf page as the fallback (the
 * /about-/book-/home shape, src/app/news/page.tsx). Pins, model not render
 * (the house idiom — tests/meditation-puck.test.ts's findAll-the-element-
 * tree pattern; the page's own SiteHeader/PopupHost throw under plain
 * react-dom/server):
 *
 *  · THE SEED IS HER WORDS, VERBATIM: SEEDS.news exists with unique ids
 *    (slot children included — the T-231 lesson), the hero + lead whole;
 *    the live public-letters shelf and the subscribe form are SAID
 *    code-side (live reads, never fossilised).
 *  · THE FALLBACK IS UNCHANGED: nothing published ⇒ the hand-built page
 *    renders (its StackedHero + BeInTheKnow), no <Render> anywhere.
 *  · DRAFTS NEVER LEAK: a saved draft alone (never published) still serves
 *    the fallback.
 *  · A PUBLISHED DOC RENDERS: after Publish, the same request serves the
 *    Puck doc through <Render> and the hand-built page steps aside.
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
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "oc-news-puck-fixture-"));
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

describe("the seed — /style/news opens pre-populated, her words verbatim", () => {
  it("SEEDS.news exists and every id is unique, slot children included (the T-231 lesson)", async () => {
    const { SEEDS } = await import("@/lib/puck-seeds");
    const seed = SEEDS.news;
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
    expect(ids.every((id) => id.startsWith("nw-"))).toBe(true);
  });

  it("the audited prose matches today's JSX (src/app/news/page.tsx), word for word", async () => {
    const { SEEDS } = await import("@/lib/puck-seeds");
    const flat = JSON.stringify(SEEDS.news.content);
    expect(flat).toContain("From the Field");
    expect(flat).toContain("NEWS");
    expect(flat).toContain("& LETTERS");
    expect(flat).toContain("Love's open notes — every public letter lives here after it lands in the inboxes.");
    /* the live pieces are said code-side, never fossilised — no letter
       subject, no form copy baked in */
    expect(flat).toContain("── live public-letters shelf stays code-side");
    expect(flat).toContain("── live subscribe form (Be in the Know) stays code-side ──");
    /* honest root props mirror the hand-built page's metadata */
    const root = SEEDS.news.root as { props?: { title?: string; description?: string } };
    expect(root.props?.title).toBe("News & Letters — One Cocreation");
    expect(root.props?.description).toBe("Love's public notes to the field.");
  });

  it("news is designer in the manifest, wearing the SAME note every other wired route does", async () => {
    const { PAGE_STATES } = await import("@/lib/page-states");
    const news = PAGE_STATES.find((e) => e.path === "/news")!;
    const about = PAGE_STATES.find((e) => e.path === "/about")!;
    expect(news.state).toBe("designer");
    expect(news.slug).toBe("news");
    expect(news.note).toBe(about.note);
  });
});

describe("NewsPage — Puck first, the hand-built shelf page as fallback", () => {
  it("with nothing published: the hand-built page renders — no <Render> anywhere", async () => {
    const NewsPage = (await import("@/app/news/page")).default;
    const StackedHero = (await import("@/components/StackedHero")).default;
    const BeInTheKnow = (await import("@/components/BeInTheKnow")).default;
    const el = await NewsPage();

    const { Render } = await import("@puckeditor/core");
    expect(findAll(el, (e) => e.type === Render)).toHaveLength(0);
    expect(findAll(el, (e) => e.type === StackedHero)).toHaveLength(1);
    expect(findAll(el, (e) => e.type === BeInTheKnow)).toHaveLength(1);
  });

  it("draft-only (not yet published) still serves the hand-built page — drafts never leak to visitors", async () => {
    const store = await import("@/lib/puck-store");
    await store.setPuckDraft("news", { content: [{ type: "Heading", props: { id: "h1", text: "unpublished" } }], root: {} });

    const NewsPage = (await import("@/app/news/page")).default;
    const StackedHero = (await import("@/components/StackedHero")).default;
    const el = await NewsPage();

    const { Render } = await import("@puckeditor/core");
    expect(findAll(el, (e) => e.type === Render)).toHaveLength(0);
    expect(findAll(el, (e) => e.type === StackedHero)).toHaveLength(1);
  });

  it("after Publish to live: the SAME request renders the published Puck doc and the hand-built page steps aside", async () => {
    const store = await import("@/lib/puck-store");
    const doc = { content: [{ type: "Heading", props: { id: "h1", text: "Fixture publish — news live", level: "h1", align: "center", style: {} } }], root: {} };
    await store.setPuckDraft("news", doc);
    await store.publishDraft("news");

    const NewsPage = (await import("@/app/news/page")).default;
    const StackedHero = (await import("@/components/StackedHero")).default;
    const el = await NewsPage();

    const { Render } = await import("@puckeditor/core");
    const renders = findAll(el, (e) => e.type === Render);
    expect(renders).toHaveLength(1);
    expect((renders[0].props as { data?: unknown }).data).toEqual(doc);
    expect(findAll(el, (e) => e.type === StackedHero)).toHaveLength(0);
  });

  it("a fresh publish of the real seed renders it whole — the doc passes through untouched", async () => {
    const store = await import("@/lib/puck-store");
    const { SEEDS } = await import("@/lib/puck-seeds");
    await store.setPuckDraft("news", SEEDS.news);
    await store.publishDraft("news");

    const NewsPage = (await import("@/app/news/page")).default;
    const el = await NewsPage();

    const { Render } = await import("@puckeditor/core");
    const renders = findAll(el, (e) => e.type === Render);
    expect(renders).toHaveLength(1);
    expect((renders[0].props as { data?: unknown }).data).toEqual(SEEDS.news);
  });
});
