import { describe, it, expect, afterAll, beforeEach, vi } from "vitest";
import { promises as fs } from "fs";
import os from "os";
import path from "path";
import type { ReactElement, ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { isolateCwd } from "./helpers/isolate-cwd";

/* TASK-159: isolated cwd FIRST (the helper's own doc: it must run ahead of
   any top-level path.join(process.cwd(), …)) — the store gate's fixture
   site-config writes land here, never in the repo's real data/. */
const cwd = isolateCwd("oc-puck-publish-159-");

/**
 * TASK-153 (0018.06.17 a₿) — the studio's "Publish to live" for /memberships
 * did not take. Reproduction ran against FIXTURE storage only (the
 * filesystem page-store driver pointed at a throwaway temp dir via
 * PUCK_STORE_FS_DIR) — never the real KV vault.
 *
 * THE TRACE (paste, see SUMMARY.md ## The finding for the full write-up):
 *   1. setPuckDraft("memberships", doc) writes puck:draft:memberships.
 *   2. publishDraft("memberships") reads that draft and writes it verbatim
 *      to puck:page:memberships — ONE call, no cache, no revalidate needed
 *      (kv-driver fetches with cache:"no-store"; the fs driver is a plain
 *      file write). getPuckPage("memberships") reads it back immediately.
 *      => the publish path itself (puck-store.ts / api/puck) is NOT the bug.
 *   3. The visitor-facing route, src/app/memberships/page.tsx, never called
 *      getPuckPage() at all before this lane — it always rendered its
 *      hand-built JSX, publish or no publish. /about is the only sibling
 *      route that had the PUCK P4 fallback wired. That missing read is the
 *      actual mismatch: a write that never gets read back on the one route
 *      that matters to a visitor.
 *
 * These specs pin the fix: the publish path proven correct in isolation,
 * then MembershipsPage() proven to read it back in the very next call —
 * publish -> live within one request, no server restart, no cache.
 *
 * The page component is inspected as a plain React element tree (no DOM
 * render): SiteHeader/SiteFooter/PopupHost are "use client" components that
 * call browser-only hooks (usePathname, useState/useEffect) and would throw
 * under plain react-dom/server outside a real Next request — the fix here
 * only changes which branch <main> takes, so walking the returned element
 * tree's props is the honest, narrow way to pin it.
 *
 * TASK-153 pinned the fix with "@/lib/puck-config" MOCKED OUT: it
 * re-exports @pacsarcade/puck-config, which ships raw .tsx (the package's
 * own README: "hosts consume via transpilePackages") — Next's
 * transpilePackages covered it for `next build` and the dev server, but
 * vitest.config.ts had no equivalent include, so importing it hit a bare
 * JSX file with no automatic-runtime import ("React is not defined").
 *
 * TASK-159 (0018.06.17 a₿ · block 966,055) closed that second seam:
 * vitest.config.ts now inlines @pacsarcade/puck-config with
 * esbuild jsx:"automatic", so this suite rides the REAL config — the
 * published-branch pins below go one step further than T-153's tree walk
 * and render the page's own <Render> element to static markup, proving the
 * real blocks render the published doc, not just that the branch flips.
 *
 * TASK-159 also wires the same PUCK P4 first read into the four remaining
 * seeded routes — /support, /book, /classes, /store — pinned below against
 * the same fixture storage, both branches each (publish -> Render; nothing
 * published -> the hand-built fallback), plus the store's T-137 switch
 * gate proven to sit ABOVE the Puck-first read (the T-160 lane contract:
 * gate -> puck -> fallback). The suite's cwd is isolated
 * (tests/helpers/isolate-cwd.ts) so the store gate's fixture
 * data/site-config.json never lands in the repo's real data/.
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

let tmpDir: string;

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "oc-puck-fixture-"));
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

describe("the publish path itself (fixture filesystem store)", () => {
  it("publishDraft copies draft -> live in one call; getPuckPage reads it back immediately", async () => {
    const store = await import("@/lib/puck-store");
    expect(store.puckStoreReady()).toBe(true); // fs driver is always "configured"
    expect(await store.getPuckPage("memberships")).toBeNull();

    const doc = { content: [{ type: "Heading", props: { id: "h1", text: "Fixture Heart Field" } }], root: {} };
    await store.setPuckDraft("memberships", doc);
    expect(await store.getPuckPage("memberships")).toBeNull(); // draft alone never goes live

    const published = await store.publishDraft("memberships");
    expect(published).toBe(true);
    expect(await store.getPuckPage("memberships")).toEqual(doc); // live, no extra step
  });
});

describe("MembershipsPage — publish to live actually takes", () => {
  it("with nothing published: renders the hand-built lion page, kicker in the rose token", async () => {
    const MembershipsPage = (await import("@/app/memberships/page")).default;
    const el = await MembershipsPage();

    const mains = findAll(el, (e) => e.type === "main");
    expect(mains).toHaveLength(1);
    expect((mains[0].props as { className?: string }).className).toBe("lions-gate-dark");

    const kickers = findAll(el, (e) => (e.props as { className?: string }).className === "kicker");
    expect(kickers).toHaveLength(1);
    // TASK-153 (A): inline style beats the higher-specificity
    // .lions-gate-dark p{color:#D9D2E4} rule in cartridge.css — without it
    // the kicker painted pale, not rose.
    expect((kickers[0].props as { style?: { color?: string } }).style?.color).toBe("var(--rose)");
    expect((kickers[0].props as { children?: unknown }).children).toBe("Memberships");
  });

  it("after Publish to live in /studio: the SAME request now renders the published Puck doc", async () => {
    const store = await import("@/lib/puck-store");
    const doc = { content: [{ type: "Heading", props: { id: "h1", text: "Fixture Heart Field" } }], root: {} };
    await store.setPuckDraft("memberships", doc);
    await store.publishDraft("memberships");

    const MembershipsPage = (await import("@/app/memberships/page")).default;
    const el = await MembershipsPage();

    // the hand-built branch is gone — <main> now wraps Puck's own <Render>
    const mains = findAll(el, (e) => e.type === "main");
    expect(mains).toHaveLength(1);
    expect((mains[0].props as { className?: string }).className).toBeUndefined();

    const { Render } = await import("@puckeditor/core");
    const renders = findAll(el, (e) => e.type === Render);
    expect(renders).toHaveLength(1);
    expect((renders[0].props as { data?: unknown }).data).toEqual(doc);

    // the old hand-built copy is gone from this request's output
    const kickers = findAll(el, (e) => (e.props as { className?: string }).className === "kicker");
    expect(kickers).toHaveLength(0);
  });

  it("draft-only (not yet published) still serves the hand-built page — drafts never leak to visitors", async () => {
    const store = await import("@/lib/puck-store");
    await store.setPuckDraft("memberships", { content: [{ type: "Heading", props: { id: "h1", text: "unpublished" } }], root: {} });

    const MembershipsPage = (await import("@/app/memberships/page")).default;
    const el = await MembershipsPage();

    const mains = findAll(el, (e) => e.type === "main");
    expect((mains[0].props as { className?: string }).className).toBe("lions-gate-dark");
  });
});

/* ── TASK-159 (0018.06.17 a₿ · block 966,055) — the four remaining seeded
   routes read their studio publish first, mirroring T-153's /memberships
   (itself mirroring /about). Same fixture storage (PUCK_STORE_FS_DIR temp
   dir), both branches pinned per page: nothing published -> the hand-built
   fallback (a marker only that page's own JSX carries); draft+publish ->
   exactly one <Render> holding the published doc, the fallback marker gone,
   and the page's own <Render> element rendered to static markup — the REAL
   config now (no mock), so the real blocks render the fixture words. ── */

/* the seed-shaped style object (puck-seeds.ts's st()) — the real Heading
   block's render reads style/level/align, so the fixture doc carries them */
const FIXTURE_STYLE = { font: "default", size: 0, kerning: 0, lineHeight: 0, color: "default", spaceAbove: 0, spaceBelow: 0 };
const fixtureDoc = (text: string) => ({
  content: [{ type: "Heading", props: { id: "h1", text, level: "h1", align: "center", style: FIXTURE_STYLE } }],
  root: {},
});

async function publish(slug: string, text: string) {
  const store = await import("@/lib/puck-store");
  const doc = fixtureDoc(text);
  await store.setPuckDraft(slug, doc);
  await store.publishDraft(slug);
  return doc;
}

describe("SupportPage — publish to live actually takes", () => {
  it("with nothing published: the hand-built room (its own StackedHero kicker), no Render", async () => {
    const SupportPage = (await import("@/app/support/page")).default;
    const { default: StackedHero } = await import("@/components/StackedHero");
    const el = await SupportPage();

    const { Render } = await import("@puckeditor/core");
    expect(findAll(el, (e) => e.type === Render)).toHaveLength(0);
    const heroes = findAll(el, (e) => e.type === StackedHero);
    expect(heroes).toHaveLength(1);
    expect((heroes[0].props as { kicker?: string }).kicker).toBe("Support This Work — Gently ⚡");
  });

  it("after Publish to live in /studio: the SAME request renders the published Puck doc", async () => {
    const doc = await publish("support", "Fixture publish — support live");

    const SupportPage = (await import("@/app/support/page")).default;
    const { default: StackedHero } = await import("@/components/StackedHero");
    const el = await SupportPage();

    const { Render } = await import("@puckeditor/core");
    const renders = findAll(el, (e) => e.type === Render);
    expect(renders).toHaveLength(1);
    expect((renders[0].props as { data?: unknown }).data).toEqual(doc);
    // the real blocks render the fixture words — no mock in this suite
    expect(renderToStaticMarkup(renders[0])).toContain("Fixture publish — support live");
    // the hand-built branch is gone from this request's output
    expect(findAll(el, (e) => e.type === StackedHero)).toHaveLength(0);
  });
});

describe("BookIndexPage — publish to live actually takes", () => {
  it("with nothing published: the hand-built night-shelf page (book-hero-veil), no Render", async () => {
    const BookIndexPage = (await import("@/app/book/page")).default;
    const el = await BookIndexPage();

    const { Render } = await import("@puckeditor/core");
    expect(findAll(el, (e) => e.type === Render)).toHaveLength(0);
    const heroes = findAll(el, (e) =>
      typeof (e.props as { className?: string }).className === "string" &&
      ((e.props as { className?: string }).className ?? "").includes("book-hero-veil"));
    expect(heroes).toHaveLength(1);
  });

  it("after Publish to live in /studio: the SAME request renders the published Puck doc", async () => {
    const doc = await publish("book", "Fixture publish — book live");

    const BookIndexPage = (await import("@/app/book/page")).default;
    const el = await BookIndexPage();

    const { Render } = await import("@puckeditor/core");
    const renders = findAll(el, (e) => e.type === Render);
    expect(renders).toHaveLength(1);
    expect((renders[0].props as { data?: unknown }).data).toEqual(doc);
    expect(renderToStaticMarkup(renders[0])).toContain("Fixture publish — book live");
    const heroes = findAll(el, (e) =>
      ((e.props as { className?: string }).className ?? "").includes?.("book-hero-veil"));
    expect(heroes).toHaveLength(0);
  });
});

describe("ClassesPage — publish to live actually takes", () => {
  it("with nothing published: the hand-built commons hero (The Heartfield Commons), no Render", async () => {
    const ClassesPage = (await import("@/app/classes/page")).default;
    const el = await ClassesPage();

    const { Render } = await import("@puckeditor/core");
    expect(findAll(el, (e) => e.type === Render)).toHaveLength(0);
    const kickers = findAll(el, (e) => (e.props as { className?: string }).className === "kicker");
    expect(kickers).toHaveLength(1);
    expect((kickers[0].props as { children?: unknown }).children).toBe("The Heartfield Commons");
  });

  it("after Publish to live in /studio: the SAME request renders the published Puck doc", async () => {
    const doc = await publish("classes", "Fixture publish — classes live");

    const ClassesPage = (await import("@/app/classes/page")).default;
    const el = await ClassesPage();

    const { Render } = await import("@puckeditor/core");
    const renders = findAll(el, (e) => e.type === Render);
    expect(renders).toHaveLength(1);
    expect((renders[0].props as { data?: unknown }).data).toEqual(doc);
    expect(renderToStaticMarkup(renders[0])).toContain("Fixture publish — classes live");
    expect(findAll(el, (e) => (e.props as { className?: string }).className === "kicker")).toHaveLength(0);
  });
});

describe("StorePage — publish to live actually takes", () => {
  it("the T-137 switch gate sits ABOVE the Puck-first read: store OFF swallows even a published doc", async () => {
    // the isolated cwd holds no site-config yet -> defaults -> store OFF
    await publish("store", "Fixture publish — store gated");

    const StorePage = (await import("@/app/store/page")).default;
    const { default: NotOpenYet } = await import("@/components/NotOpenYet");
    const el = await StorePage();

    const { Render } = await import("@puckeditor/core");
    expect(findAll(el, (e) => e.type === Render)).toHaveLength(0);
    expect(findAll(el, (e) => e.type === NotOpenYet)).toHaveLength(1);
  });

  it("store ON, nothing published: the hand-built shelf (its StackedHero), no Render", async () => {
    const { saveSiteConfig } = await import("@/lib/site-config");
    await saveSiteConfig({ features: { store: true } }); // fixture file in the isolated cwd

    const StorePage = (await import("@/app/store/page")).default;
    const { default: StackedHero } = await import("@/components/StackedHero");
    const el = await StorePage();

    const { Render } = await import("@puckeditor/core");
    expect(findAll(el, (e) => e.type === Render)).toHaveLength(0);
    const heroes = findAll(el, (e) => e.type === StackedHero);
    expect(heroes).toHaveLength(1);
    expect((heroes[0].props as { kicker?: string }).kicker).toBe("Where Heaven and Earth Meet");
  });

  it("store ON, after Publish to live in /studio: the SAME request renders the published Puck doc", async () => {
    const { saveSiteConfig } = await import("@/lib/site-config");
    await saveSiteConfig({ features: { store: true } });
    const doc = await publish("store", "Fixture publish — store live");

    const StorePage = (await import("@/app/store/page")).default;
    const { default: StackedHero } = await import("@/components/StackedHero");
    const el = await StorePage();

    const { Render } = await import("@puckeditor/core");
    const renders = findAll(el, (e) => e.type === Render);
    expect(renders).toHaveLength(1);
    expect((renders[0].props as { data?: unknown }).data).toEqual(doc);
    expect(renderToStaticMarkup(renders[0])).toContain("Fixture publish — store live");
    expect(findAll(el, (e) => e.type === StackedHero)).toHaveLength(0);
  });
});
