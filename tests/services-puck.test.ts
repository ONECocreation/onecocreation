import { describe, it, expect, afterAll, beforeEach, vi } from "vitest";
import { promises as fs } from "fs";
import os from "os";
import path from "path";
import type { ReactElement, ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";

/**
 * TASK-295 wave A pair 4 (0018.06.25 a₿ · block 967,181) — /services becomes
 * a designer page: a Puck seed transcribed VERBATIM from the hand-built JSX
 * (the words law) and the route reading Puck first with today's JSX as the
 * fallback (the /about shape, src/app/about/page.tsx:68-88). No route gates
 * to lift (the page reads no features.* switches itself — the gated pieces
 * stay code-side on the fallback and are SAID, not shown, on the designer
 * branch). THE LIVE PIECES NEVER FOSSILISE: the sessions shelf, the tier
 * cards' names and prices, the subscribe form, and the conditional Retreats
 * door are notes in the seed, not data.
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
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "oc-services-puck-fixture-"));
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

describe("the seed — /style/services opens pre-populated, every word verbatim", () => {
  it("SEEDS.services exists: the six-band walk, the real portraits, and the four code-side notes", async () => {
    const { SEEDS } = await import("@/lib/puck-seeds");
    const seed = SEEDS.services;
    expect(seed).toBeDefined();
    const content = seed.content as SeedBlock[];
    expect(Array.isArray(content)).toBe(true);
    expect(content).toHaveLength(7);

    /* the words law, pinned (src/app/services/page.tsx — the fallback,
       NOT edited) */
    const flat = JSON.stringify(seed.content);
    expect(flat).toContain("Welcome To");
    expect(flat).toContain("The Way of the Heart");
    expect(flat).toContain("To BE Silent or Not to be Silent — that is the Question.");
    expect(flat).toContain("affirmations card");
    expect(flat).toContain("BECOME A");
    expect(flat).toContain("FREE MEMBER");
    expect(flat).toContain("A Discovery Call — credited toward your service");
    expect(flat).toContain("Access to the booking calendar");
    expect(flat).toContain("One month free of The Weekly Intuitive");
    expect(flat).toContain("Create your membership ✨");
    expect(flat).toContain("HOW IT");
    expect(flat).toContain("WORKS");
    expect(flat).toContain("Here's where the adventure begins!");
    expect(flat).toContain("Sign up — the doors open");
    expect(flat).toContain("Your Discovery Call");
    expect(flat).toContain("15–20 minutes — or just book the appointment.");
    expect(flat).toContain("Tell me what you're looking for — and what the session can unlock within you.");
    expect(flat).toContain("🎁 $55 — as your session is booked, checkout hands you a <b>CODE taking $55 off</b> the total of your session (your Discovery Call, kept).");
    expect(flat).toContain("Get Started Today");
    expect(flat).toContain("MONTHLY PAID");
    expect(flat).toContain("MEMBERSHIPS");
    expect(flat).toContain("BE IN");
    expect(flat).toContain("THE KNOW");
    expect(flat).toContain("Unzip Into The New You!");
    expect(flat).toContain("To Connect, Feel Alive — as the New Human you Are.");
    expect(flat).toContain("More Doors");
    expect(flat).toContain("Free Meditation 🎁");
    /* the real portraits, decorative alt verbatim */
    expect(flat).toContain("/images/consciouscuts/lady.webp");
    expect(flat).toContain("/images/consciouscuts/men2.webp");
    /* the live pieces are SAID, never fossilised — no tier names, no prices */
    expect(flat).toContain("── live sessions shelf stays code-side");
    expect(flat).toContain("── live membership cards stay code-side");
    expect(flat).toContain("── live subscribe form stays code-side");
    expect(flat).toContain("── the Retreats 🏜️ door appears only while a retreat is live");
    expect(flat).not.toContain("Weekly Intuitive\", \"h3");
    expect(flat).not.toContain("priceUsd");
    expect(flat).not.toContain('"retreats"');
  });

  it("every block id in the seed is unique — slot children and the literal Gallery included", async () => {
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
    walk(SEEDS.services.content);
    expect(ids.length).toBeGreaterThan(0);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toContain("sv-portraits");
  });

  it("the root is the tolerated bare {} — the hand-built page carries no metadata to mirror", async () => {
    const { SEEDS } = await import("@/lib/puck-seeds");
    expect(SEEDS.services.root).toEqual({});
  });

  it("services is designer in the manifest, wearing the same note every wired route does", async () => {
    const { PAGE_STATES } = await import("@/lib/page-states");
    const services = PAGE_STATES.find((e) => e.path === "/services")!;
    const about = PAGE_STATES.find((e) => e.path === "/about")!;
    expect(services.state).toBe("designer");
    expect(services.slug).toBe("services");
    expect(services.note).toBe(about.note);
  });
});

describe("ServicesPage — Puck first, the hand-built page as fallback", () => {
  it("with nothing published: the hand-built page renders — no <Render> anywhere, the live <Services/> shelf stands", async () => {
    const ServicesPage = (await import("@/app/services/page")).default;
    const { Services } = await import("@/components/sections");
    const el = await ServicesPage();

    const { Render } = await import("@puckeditor/core");
    expect(findAll(el, (e) => e.type === Render)).toHaveLength(0);
    expect(findAll(el, (e) => e.type === Services)).toHaveLength(1);
  });

  it("draft-only (not yet published) still serves the hand-built page — drafts never leak to visitors", async () => {
    const store = await import("@/lib/puck-store");
    await store.setPuckDraft("services", { content: [{ type: "Heading", props: { id: "h1", text: "unpublished" } }], root: {} });

    const ServicesPage = (await import("@/app/services/page")).default;
    const { Services } = await import("@/components/sections");
    const el = await ServicesPage();

    const { Render } = await import("@puckeditor/core");
    expect(findAll(el, (e) => e.type === Render)).toHaveLength(0);
    expect(findAll(el, (e) => e.type === Services)).toHaveLength(1);
  });

  it("after Publish to live: the SAME request renders the published Puck doc, the hand-built branch gone", async () => {
    const store = await import("@/lib/puck-store");
    const style = { font: "default", size: 0, kerning: 0, lineHeight: 0, color: "default", spaceAbove: 0, spaceBelow: 0 };
    const doc = { content: [{ type: "Heading", props: { id: "h1", text: "Fixture publish — services live", level: "h1", align: "center", style } }], root: {} };
    await store.setPuckDraft("services", doc);
    await store.publishDraft("services");

    const ServicesPage = (await import("@/app/services/page")).default;
    const { Services } = await import("@/components/sections");
    const el = await ServicesPage();

    const { Render } = await import("@puckeditor/core");
    const renders = findAll(el, (e) => e.type === Render);
    expect(renders).toHaveLength(1);
    expect((renders[0].props as { data?: unknown }).data).toEqual(doc);
    expect(renderToStaticMarkup(renders[0])).toContain("Fixture publish — services live");
    expect(findAll(el, (e) => e.type === Services)).toHaveLength(0);
  });

  it("the published branch renders the REAL seed verbatim — the words survive the studio round-trip, the notes stand", async () => {
    const store = await import("@/lib/puck-store");
    const { SEEDS } = await import("@/lib/puck-seeds");
    await store.setPuckDraft("services", SEEDS.services);
    await store.publishDraft("services");

    const ServicesPage = (await import("@/app/services/page")).default;
    const el = await ServicesPage();

    const { Render } = await import("@puckeditor/core");
    const renders = findAll(el, (e) => e.type === Render);
    expect(renders).toHaveLength(1);
    const html = renderToStaticMarkup(renders[0]);
    expect(html).toContain("The Way of the Heart");
    expect(html).toContain("To BE Silent or Not to be Silent");
    expect(html).toContain("FREE MEMBER");
    expect(html).toContain("/images/consciouscuts/lady.webp");
    expect(html).toContain("A Discovery Call — credited toward your service");
    expect(html).toContain("Here&#x27;s where the adventure begins!");
    expect(html).toContain("CODE taking $55 off");
    expect(html).toContain("MONTHLY PAID");
    expect(html).toContain("Unzip Into The New You!");
    expect(html).toContain("live sessions shelf stays code-side");
    expect(html).toContain("live membership cards stay code-side");
    /* and NOT the fossilised live data */
    expect(html).not.toContain("sats / month");
  });
});
