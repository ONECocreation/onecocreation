import { describe, it, expect, afterAll, beforeEach, vi } from "vitest";
import { promises as fs } from "fs";
import os from "os";
import path from "path";
import type { ReactElement, ReactNode } from "react";

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
 * "@/lib/puck-config" is mocked out: it re-exports @pacsarcade/puck-config,
 * which ships raw .tsx (the package's own README: "hosts consume via
 * transpilePackages") — Next's transpilePackages covers it for `next build`
 * and the dev server, but vitest.config.ts (T-158's OWNS, untouched here)
 * has no equivalent include for it, so importing it here hits a bare JSX
 * file with no automatic-runtime import ("React is not defined"). The
 * mock is exactly enough surface for this spec: <Render config={config}>
 * only needs SOME config value to compare by reference against, which
 * these specs never inspect.
 */
vi.mock("@/lib/puck-config", () => ({ config: {} }));

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
