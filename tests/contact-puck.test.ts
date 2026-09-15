import { describe, it, expect, afterAll, beforeEach, vi } from "vitest";
import { promises as fs } from "fs";
import os from "os";
import path from "path";
import type { ReactElement, ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";

/**
 * TASK-295 wave A pair 4 (0018.06.25 a₿ · block 967,181) — /contact becomes
 * a designer page: a Puck seed transcribed VERBATIM from the hand-built JSX
 * (the words law) and the route reading Puck first with today's JSX as the
 * fallback (the /about shape, src/app/about/page.tsx:68-88). No route gates
 * (the page reads no site switches). The live widgets (the contact doors,
 * the write-to-me form) are SAID, not shown, on the designer branch — the
 * sanctioned "stays code-side" note idiom (pair 1's meditation precedent).
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
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "oc-contact-puck-fixture-"));
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

describe("the seed — /style/contact opens pre-populated, every word verbatim", () => {
  it("SEEDS.contact exists: hero, the two code-side notes, write-to-me, and the one real FAQ item", async () => {
    const { SEEDS } = await import("@/lib/puck-seeds");
    const seed = SEEDS.contact;
    expect(seed).toBeDefined();
    const content = seed.content as SeedBlock[];
    expect(Array.isArray(content)).toBe(true);

    /* the words law, pinned (src/app/contact/page.tsx — the fallback,
       NOT edited) */
    const flat = JSON.stringify(seed.content);
    expect(flat).toContain("E.T. Phone Home");
    expect(flat).toContain("I'LL BE");
    expect(flat).toContain("RIGHT HERE");
    expect(flat).toContain("Write to Me 💌");
    expect(flat).toContain("a note lands gently in Love's inbox — she writes back to your email.");
    expect(flat).toContain("What time zones are the YouTube “Live with Love”?");
    expect(flat).toContain("Time zones currently vary between MST (Mountain) and PST (Pacific) — Monday · Wednesday · Friday @ 11:11, or there abouts ;)");
    expect(flat).toContain("the lives and recent videos stop popping up in your feed until you're active with the channel again.");
    /* the live widgets are SAID, never fossilised */
    expect(flat).toContain("── live contact doors stay code-side");
    expect(flat).toContain("── live contact form stays code-side");

    const faqs = content.filter((b) => JSON.stringify(b).includes('"Faq"'));
    expect(faqs.length).toBeGreaterThan(0);
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
    walk(SEEDS.contact.content);
    expect(ids.length).toBeGreaterThan(0);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("the root props mirror the hand-built metadata verbatim", async () => {
    const { SEEDS } = await import("@/lib/puck-seeds");
    const root = SEEDS.contact.root as { props?: { title?: string; description?: string } };
    expect(root.props?.title).toBe("Contact — One Cocreation");
    expect(root.props?.description).toBe("E.T. Phone Home — I'll BE right here. Write to Love, catch the 11:11 lives, book a discovery call.");
  });

  it("contact is designer in the manifest, wearing the same note every wired route does", async () => {
    const { PAGE_STATES } = await import("@/lib/page-states");
    const contact = PAGE_STATES.find((e) => e.path === "/contact")!;
    const about = PAGE_STATES.find((e) => e.path === "/about")!;
    expect(contact.state).toBe("designer");
    expect(contact.slug).toBe("contact");
    expect(contact.note).toBe(about.note);
  });
});

describe("ContactPage — Puck first, the hand-built page as fallback", () => {
  it("with nothing published: the hand-built page renders — no <Render> anywhere, its StackedHero stands", async () => {
    const ContactPage = (await import("@/app/contact/page")).default;
    const { default: StackedHero } = await import("@/components/StackedHero");
    const el = await ContactPage();

    const { Render } = await import("@puckeditor/core");
    expect(findAll(el, (e) => e.type === Render)).toHaveLength(0);
    const heroes = findAll(el, (e) => e.type === StackedHero);
    expect(heroes).toHaveLength(1);
    expect((heroes[0].props as { kicker?: string }).kicker).toBe("E.T. Phone Home");
  });

  it("draft-only (not yet published) still serves the hand-built page — drafts never leak to visitors", async () => {
    const store = await import("@/lib/puck-store");
    await store.setPuckDraft("contact", { content: [{ type: "Heading", props: { id: "h1", text: "unpublished" } }], root: {} });

    const ContactPage = (await import("@/app/contact/page")).default;
    const { default: StackedHero } = await import("@/components/StackedHero");
    const el = await ContactPage();

    const { Render } = await import("@puckeditor/core");
    expect(findAll(el, (e) => e.type === Render)).toHaveLength(0);
    expect(findAll(el, (e) => e.type === StackedHero)).toHaveLength(1);
  });

  it("after Publish to live: the SAME request renders the published Puck doc, the hand-built branch gone", async () => {
    const store = await import("@/lib/puck-store");
    const style = { font: "default", size: 0, kerning: 0, lineHeight: 0, color: "default", spaceAbove: 0, spaceBelow: 0 };
    const doc = { content: [{ type: "Heading", props: { id: "h1", text: "Fixture publish — contact live", level: "h1", align: "center", style } }], root: {} };
    await store.setPuckDraft("contact", doc);
    await store.publishDraft("contact");

    const ContactPage = (await import("@/app/contact/page")).default;
    const { default: StackedHero } = await import("@/components/StackedHero");
    const el = await ContactPage();

    const { Render } = await import("@puckeditor/core");
    const renders = findAll(el, (e) => e.type === Render);
    expect(renders).toHaveLength(1);
    expect((renders[0].props as { data?: unknown }).data).toEqual(doc);
    expect(renderToStaticMarkup(renders[0])).toContain("Fixture publish — contact live");
    expect(findAll(el, (e) => e.type === StackedHero)).toHaveLength(0);
  });

  it("the published branch renders the REAL seed verbatim — her words survive the studio round-trip", async () => {
    const store = await import("@/lib/puck-store");
    const { SEEDS } = await import("@/lib/puck-seeds");
    await store.setPuckDraft("contact", SEEDS.contact);
    await store.publishDraft("contact");

    const ContactPage = (await import("@/app/contact/page")).default;
    const el = await ContactPage();

    const { Render } = await import("@puckeditor/core");
    const renders = findAll(el, (e) => e.type === Render);
    expect(renders).toHaveLength(1);
    const html = renderToStaticMarkup(renders[0]);
    expect(html).toContain("E.T. Phone Home");
    expect(html).toContain("RIGHT HERE");
    expect(html).toContain("Write to Me 💌");
    expect(html).toContain("she writes back to your email.");
    expect(html).toContain("Live with Love");
    expect(html).toContain("Monday · Wednesday · Friday @ 11:11");
    expect(html).toContain("live contact form stays code-side");
  });
});
