import { describe, it, expect, afterAll, beforeEach, vi } from "vitest";
import { promises as fs } from "fs";
import os from "os";
import path from "path";
import type { ReactElement, ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";

/**
 * TASK-295 wave A pair 2 (0018.06.25 a₿ · block 967,178) — /terms becomes
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
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "oc-terms-puck-fixture-"));
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

describe("the seed — /style/terms opens pre-populated, every word verbatim", () => {
  it("SEEDS.terms exists: one plain band carrying the eyebrow, the h1, the blurb and the six bold-lead paragraphs", async () => {
    const { SEEDS } = await import("@/lib/puck-seeds");
    const seed = SEEDS.terms;
    expect(seed).toBeDefined();
    const content = seed.content as SeedBlock[];
    expect(Array.isArray(content)).toBe(true);
    expect(content).toHaveLength(1);
    expect(content[0].type).toBe("Band");

    /* the words law, pinned: every sentence as the hand-built page speaks
       it (src/app/terms/page.tsx — the fallback, NOT edited). The JSX's
       &amp;/&apos; entities render as & and ' — the seed's html field
       carries &amp; so the same glyph comes out. */
    const flat = JSON.stringify(seed.content);
    expect(flat).toContain("The fine print, kindly");
    expect(flat).toContain("Terms & Conditions");
    expect(flat).toContain("Draft v1 — plain language; final wording with Love.");
    expect(flat).toContain("<b>What you're buying.</b> Digital offerings (meditations, affirmations, courses) unlock for the signed-in account that bought them. Memberships open their tier's rooms and content for the paid period. In-person sessions are booked for a specific time and place.");
    expect(flat).toContain("<b>Payment.</b> Prices are shown in dollars and sats. Bitcoin payments (lightning or on-chain) settle to One Cocreation's own wallet — non-custodial, no third parties holding funds. A payment is complete when the invoice settles.");
    expect(flat).toContain("<b>Rescheduling &amp; refunds.</b> Life happens — reach out and we'll work with you. Refunds of bitcoin payments are returned in sats to an address you provide. Pay-what-you-can offers are accepted or kindly declined by Love; declined offers are refunded in full.");
    expect(flat).toContain("<b>Sessions.</b> Booked times are held for you; unpaid holds release automatically. In-person visits depend on location — the mobile studio travels, and your city/state/zip at checkout tells us where.");
    expect(flat).toContain("<b>Not medical advice.</b> Sessions, meditations and classes are spiritual and wellness offerings, not medical or psychological treatment.");
    expect(flat).toContain("<b>Your account.</b> Keys are yours; we never hold them. Email sign-in codes are single-use and short-lived. Be kind in community rooms — Love may remove access for harm.");
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
    walk(SEEDS.terms.content);
    expect(ids.length).toBeGreaterThan(0);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("the root props mirror the hand-built metadata — the title, and NO invented description", async () => {
    const { SEEDS } = await import("@/lib/puck-seeds");
    const root = SEEDS.terms.root as { props?: { title?: string; description?: string } };
    expect(root.props?.title).toBe("Terms & Conditions — One Cocreation");
    expect(root.props?.description).toBeUndefined();
  });

  it("terms is designer in the manifest, wearing the same note every wired route does", async () => {
    const { PAGE_STATES } = await import("@/lib/page-states");
    const terms = PAGE_STATES.find((e) => e.path === "/terms")!;
    const about = PAGE_STATES.find((e) => e.path === "/about")!;
    expect(terms.state).toBe("designer");
    expect(terms.slug).toBe("terms");
    expect(terms.note).toBe(about.note);
  });
});

describe("TermsPage — Puck first, the hand-built page as fallback", () => {
  it("with nothing published: the hand-built page renders — no <Render> anywhere, its own h1 stands", async () => {
    const TermsPage = (await import("@/app/terms/page")).default;
    const el = await TermsPage();

    const { Render } = await import("@puckeditor/core");
    expect(findAll(el, (e) => e.type === Render)).toHaveLength(0);
    const h1s = findAll(el, (e) => e.type === "h1");
    expect(h1s).toHaveLength(1);
  });

  it("draft-only (not yet published) still serves the hand-built page — drafts never leak to visitors", async () => {
    const store = await import("@/lib/puck-store");
    await store.setPuckDraft("terms", { content: [{ type: "Heading", props: { id: "h1", text: "unpublished" } }], root: {} });

    const TermsPage = (await import("@/app/terms/page")).default;
    const el = await TermsPage();

    const { Render } = await import("@puckeditor/core");
    expect(findAll(el, (e) => e.type === Render)).toHaveLength(0);
    expect(findAll(el, (e) => e.type === "h1")).toHaveLength(1);
  });

  it("after Publish to live: the SAME request renders the published Puck doc, the hand-built branch gone", async () => {
    const store = await import("@/lib/puck-store");
    const style = { font: "default", size: 0, kerning: 0, lineHeight: 0, color: "default", spaceAbove: 0, spaceBelow: 0 };
    const doc = { content: [{ type: "Heading", props: { id: "h1", text: "Fixture publish — terms live", level: "h1", align: "center", style } }], root: {} };
    await store.setPuckDraft("terms", doc);
    await store.publishDraft("terms");

    const TermsPage = (await import("@/app/terms/page")).default;
    const el = await TermsPage();

    const { Render } = await import("@puckeditor/core");
    const renders = findAll(el, (e) => e.type === Render);
    expect(renders).toHaveLength(1);
    expect((renders[0].props as { data?: unknown }).data).toEqual(doc);
    expect(renderToStaticMarkup(renders[0])).toContain("Fixture publish — terms live");
    // the hand-built branch is gone from this request's output
    expect(findAll(el, (e) => e.type === "h1" && (e.props as { className?: string }).className === "mgmt-title")).toHaveLength(0);
  });

  it("the published branch renders the REAL seed verbatim — the legal words survive the studio round-trip", async () => {
    const store = await import("@/lib/puck-store");
    const { SEEDS } = await import("@/lib/puck-seeds");
    await store.setPuckDraft("terms", SEEDS.terms);
    await store.publishDraft("terms");

    const TermsPage = (await import("@/app/terms/page")).default;
    const el = await TermsPage();

    const { Render } = await import("@puckeditor/core");
    const renders = findAll(el, (e) => e.type === Render);
    expect(renders).toHaveLength(1);
    const html = renderToStaticMarkup(renders[0]);
    expect(html).toContain("The fine print, kindly");
    expect(html).toContain("Terms &amp; Conditions");
    expect(html).toContain("What you're buying.");
    expect(html).toContain("non-custodial, no third parties holding funds");
    expect(html).toContain("declined offers are refunded in full");
    expect(html).toContain("not medical or psychological treatment");
    expect(html).toContain("Be kind in community rooms");
  });
});
