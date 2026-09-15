import { describe, it, expect, afterAll, beforeEach, vi } from "vitest";
import { promises as fs } from "fs";
import os from "os";
import path from "path";
import type { ReactElement, ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";

/**
 * TASK-295 wave A pair 2 (0018.06.25 a₿ · block 967,178) — /privacy becomes
 * a designer page: a Puck seed transcribed VERBATIM from the hand-built JSX
 * (the words law — the legal pages' words are never rewritten) and the route
 * reading Puck first with today's JSX as the fallback (the /about shape,
 * src/app/about/page.tsx:68-88). No route gates (the page reads no site
 * switches), no data-bound blocks (pure prose).
 *
 * Pins, model not render for the branch flip (the house idiom — the page's
 * own SiteHeader/PopupHost throw under plain react-dom/server, see
 * tests/retreats-puck.test.ts's note); the page's own <Render> element is
 * rendered to static markup for the published-doc pin.
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
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "oc-privacy-puck-fixture-"));
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

describe("the seed — /style/privacy opens pre-populated, every word verbatim", () => {
  it("SEEDS.privacy exists: one plain band carrying the eyebrow, the h1, the blurb and the five bold-lead paragraphs", async () => {
    const { SEEDS } = await import("@/lib/puck-seeds");
    const seed = SEEDS.privacy;
    expect(seed).toBeDefined();
    const content = seed.content as SeedBlock[];
    expect(Array.isArray(content)).toBe(true);
    expect(content).toHaveLength(1);
    expect(content[0].type).toBe("Band");

    /* the words law, pinned: every sentence as the hand-built page speaks
       it (src/app/privacy/page.tsx — the fallback, NOT edited) */
    const flat = JSON.stringify(seed.content);
    expect(flat).toContain("Your data, plainly");
    expect(flat).toContain("Privacy Policy");
    expect(flat).toContain("Draft v1 — this page describes what the site actually does.");
    expect(flat).toContain("<b>What we collect.</b> Only what an order or letter needs: an email for receipts and sign-in codes; a name and address only when something ships; city/state/zip only for in-person visits; your nostr public key if you sign in with one. No ad trackers, no analytics beacons, no third-party cookies.");
    expect(flat).toContain("<b>What we forget.</b> Contact and shipping details on orders are automatically purged about 30 days after delivery — the returns window closes, and then we forget on purpose. Order records themselves (what was bought, for how much) remain for the books.");
    expect(flat).toContain("<b>Email.</b> The list is opt-in. Every newsletter carries a one-click unsubscribe. Sign-in codes expire in ten minutes.");
    expect(flat).toContain("<b>Payments.</b> Bitcoin invoices are processed by One Cocreation's own payment server. We never see card numbers (there are none) and never custody your keys.");
    expect(flat).toContain("<b>Your rights.</b> Ask and we'll show you what we hold about you, correct it, or delete what the law lets us delete. Write to the house at the addresses in the footer.");
  });

  it("every block id in the seed is unique — slot children included (a collision double-renders the canvas)", async () => {
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
    walk(SEEDS.privacy.content);
    expect(ids.length).toBeGreaterThan(0);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("the root props mirror the hand-built metadata — the title, and NO invented description", async () => {
    const { SEEDS } = await import("@/lib/puck-seeds");
    const root = SEEDS.privacy.root as { props?: { title?: string; description?: string } };
    expect(root.props?.title).toBe("Privacy Policy — One Cocreation");
    expect(root.props?.description).toBeUndefined();
  });

  it("privacy is designer in the manifest, wearing the same note every wired route does", async () => {
    const { PAGE_STATES } = await import("@/lib/page-states");
    const privacy = PAGE_STATES.find((e) => e.path === "/privacy")!;
    const about = PAGE_STATES.find((e) => e.path === "/about")!;
    expect(privacy.state).toBe("designer");
    expect(privacy.slug).toBe("privacy");
    expect(privacy.note).toBe(about.note);
  });
});

describe("PrivacyPage — Puck first, the hand-built page as fallback", () => {
  it("with nothing published: the hand-built page renders — no <Render> anywhere, its own h1 stands", async () => {
    const PrivacyPage = (await import("@/app/privacy/page")).default;
    const el = await PrivacyPage();

    const { Render } = await import("@puckeditor/core");
    expect(findAll(el, (e) => e.type === Render)).toHaveLength(0);
    const h1s = findAll(el, (e) => e.type === "h1");
    expect(h1s).toHaveLength(1);
    expect((h1s[0].props as { children?: ReactNode }).children).toBe("Privacy Policy");
  });

  it("draft-only (not yet published) still serves the hand-built page — drafts never leak to visitors", async () => {
    const store = await import("@/lib/puck-store");
    await store.setPuckDraft("privacy", { content: [{ type: "Heading", props: { id: "h1", text: "unpublished" } }], root: {} });

    const PrivacyPage = (await import("@/app/privacy/page")).default;
    const el = await PrivacyPage();

    const { Render } = await import("@puckeditor/core");
    expect(findAll(el, (e) => e.type === Render)).toHaveLength(0);
    expect(findAll(el, (e) => e.type === "h1")).toHaveLength(1);
  });

  it("after Publish to live: the SAME request renders the published Puck doc, the hand-built branch gone", async () => {
    const store = await import("@/lib/puck-store");
    const style = { font: "default", size: 0, kerning: 0, lineHeight: 0, color: "default", spaceAbove: 0, spaceBelow: 0 };
    const doc = { content: [{ type: "Heading", props: { id: "h1", text: "Fixture publish — privacy live", level: "h1", align: "center", style } }], root: {} };
    await store.setPuckDraft("privacy", doc);
    await store.publishDraft("privacy");

    const PrivacyPage = (await import("@/app/privacy/page")).default;
    const el = await PrivacyPage();

    const { Render } = await import("@puckeditor/core");
    const renders = findAll(el, (e) => e.type === Render);
    expect(renders).toHaveLength(1);
    expect((renders[0].props as { data?: unknown }).data).toEqual(doc);
    expect(renderToStaticMarkup(renders[0])).toContain("Fixture publish — privacy live");
    // the hand-built branch is gone from this request's output
    expect(findAll(el, (e) => e.type === "h1" && (e.props as { className?: string }).className === "mgmt-title")).toHaveLength(0);
  });

  it("the published branch renders the REAL seed verbatim — the legal words survive the studio round-trip", async () => {
    const store = await import("@/lib/puck-store");
    const { SEEDS } = await import("@/lib/puck-seeds");
    await store.setPuckDraft("privacy", SEEDS.privacy);
    await store.publishDraft("privacy");

    const PrivacyPage = (await import("@/app/privacy/page")).default;
    const el = await PrivacyPage();

    const { Render } = await import("@puckeditor/core");
    const renders = findAll(el, (e) => e.type === Render);
    expect(renders).toHaveLength(1);
    const html = renderToStaticMarkup(renders[0]);
    expect(html).toContain("Your data, plainly");
    expect(html).toContain("Privacy Policy");
    expect(html).toContain("What we collect.");
    expect(html).toContain("no third-party cookies");
    expect(html).toContain("never custody your keys");
    expect(html).toContain("addresses in the footer");
  });
});
