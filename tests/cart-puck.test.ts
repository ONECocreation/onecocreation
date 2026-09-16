import { describe, it, expect, afterAll, beforeEach, vi } from "vitest";
import { promises as fs } from "fs";
import os from "os";
import path from "path";
import type { ReactElement, ReactNode } from "react";
import { isolateCwd } from "./helpers/isolate-cwd";

/* the repo root, captured BEFORE the isolate (isolateCwd must run ahead of
   any path.join(process.cwd(), …) constant — its own docblock) */
const cwd = isolateCwd("oc-cart-puck-296-");

/**
 * TASK-296 wave B, letters-cart pair (0018.06.25 a₿ · block ~967,200) —
 * /cart READS ITS SEED: Puck first, today's hand-built page as the
 * fallback (the /about shape; TASK-186's warm-before-you-judge order
 * preserved AHEAD of the read, the rails injected at render time —
 * applyCartRailsToPuck). Pins, model not render (the house idiom):
 *
 *  · THE SEED IS THE HERO + BLURB + THE HONEST BLOCK: SEEDS.cart exists
 *    with unique ids (slot children included), the hero and the one blurb
 *    verbatim, the CartPanel block carrying ONLY its id — no rail state,
 *    no price words fossilised.
 *  · THE INJECTOR PUTS THE RAILS INTO THE BLOCK AND NOWHERE ELSE.
 *  · THE BLOCK RENDERS THE REAL WIDGET WITH THE INJECTED RAILS; without
 *    them, the honest designer placeholder (never a faked rail state).
 *  · THE FALLBACK IS UNCHANGED · DRAFTS NEVER LEAK · A PUBLISHED DOC
 *    RENDERS — and a published SEED serves the rails injected, while the
 *    STORED doc still carries none of them (never written back).
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
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "oc-cart-puck-fixture-"));
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

describe("the seed — /style/cart opens pre-populated, the hero verbatim + the honest block", () => {
  it("SEEDS.cart exists and every id is unique, slot children included (the T-231 lesson)", async () => {
    const { SEEDS } = await import("@/lib/puck-seeds");
    const seed = SEEDS.cart;
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
    expect(ids).toContain("ca-panel");
  });

  it("the hero and blurb are verbatim and the basket is a block — no rails, no price words in the doc", async () => {
    const { SEEDS } = await import("@/lib/puck-seeds");
    const flat = JSON.stringify(SEEDS.cart.content);
    expect(flat).toContain("The Store");
    expect(flat).toContain("BASKET 🧺");
    expect(flat).toContain("one checkout — everything settles together, by lightning or by card.");
    expect(flat).toContain('"CartPanel"');
    expect(flat).toContain('"ca-panel"');
    expect(flat).not.toContain('"rails"');
    /* honest root props: title only, mirroring the hand-built page (no
       description today — none invented) */
    const root = SEEDS.cart.root as { props?: { title?: string; description?: string } };
    expect(root.props?.title).toBe("Your basket — One Cocreation");
    expect(root.props?.description).toBeUndefined();
  });

  it("cart is designer in the manifest, wearing the SAME note every other wired route does", async () => {
    const { PAGE_STATES } = await import("@/lib/page-states");
    const cart = PAGE_STATES.find((e) => e.path === "/cart")!;
    const about = PAGE_STATES.find((e) => e.path === "/about")!;
    expect(cart.state).toBe("designer");
    expect(cart.slug).toBe("cart");
    expect(cart.note).toBe(about.note);
  });
});

describe("applyCartRailsToPuck — the injector puts the rails into the block and NOWHERE else", () => {
  const RAILS = { btc: true, card: false };

  it("top-level CartPanel blocks gain `rails`; other blocks are untouched; the input is never mutated", async () => {
    const { applyCartRailsToPuck } = await import("@/lib/puck-blocks/cart-panel");
    const doc = {
      content: [
        { type: "Note", props: { id: "n1", text: "keep me" } },
        { type: "CartPanel", props: { id: "ca-panel" } },
        { type: "Band", props: { id: "b1", content: [{ type: "CartPanel", props: { id: "nested" } }] } },
      ],
      root: {},
    };
    const out = applyCartRailsToPuck(doc, RAILS);
    const [note, panel, band] = out.content as SeedBlock[];
    expect(note.props).toEqual({ id: "n1", text: "keep me" }); /* nowhere else */
    expect(panel.props.rails).toEqual(RAILS); /* the block, injected */
    expect(((band.props.content as SeedBlock[])[0].props)).toEqual({ id: "nested" }); /* top-level only */
    expect((doc.content[1] as SeedBlock).props).toEqual({ id: "ca-panel" }); /* never mutated */
  });

  it("nothing to inject into ⇒ the SAME reference comes back (untouched-path law)", async () => {
    const { applyCartRailsToPuck } = await import("@/lib/puck-blocks/cart-panel");
    const doc = { content: [{ type: "Note", props: { id: "n1", text: "x" } }], root: {} };
    expect(applyCartRailsToPuck(doc, RAILS)).toBe(doc);
  });
});

describe("the CartPanel block — the real widget with the injected rails, an honest placeholder without", () => {
  it("render() with rails mounts the REAL CartPanel carrying them, inside the fallback's own wrap", async () => {
    const { createCartPanel } = await import("@/lib/puck-blocks/cart-panel");
    const CartPanel = (await import("@/components/store/CartPanel")).default;
    const block = createCartPanel();
    const el = block.render({ rails: { btc: true, card: false } }) as ReactElement;
    expect(isElement(el)).toBe(true);
    /* the fallback's own container travels with the block (the bb-time
       lesson — a filled basket's layout assumes the 720 column) */
    expect(el.type).toBe("div");
    expect((el.props as { className?: string }).className).toContain("wrap");
    const inner = (el.props as { children?: ReactNode }).children;
    expect(isElement(inner)).toBe(true);
    expect((inner as ReactElement).type).toBe(CartPanel);
    expect(((inner as ReactElement).props as { rails?: unknown }).rails).toEqual({ btc: true, card: false });
  });

  it("render() without rails is the honest designer placeholder — never a faked rail state", async () => {
    const { createCartPanel } = await import("@/lib/puck-blocks/cart-panel");
    const CartPanel = (await import("@/components/store/CartPanel")).default;
    const block = createCartPanel();
    const el = block.render({}) as ReactElement;
    expect(isElement(el)).toBe(true);
    expect(el.type).not.toBe(CartPanel);
    expect(JSON.stringify(el)).toContain("render here on the published page");
  });
});

describe("CartPage — Puck first, the hand-built page as fallback", () => {
  it("with nothing published: the hand-built page renders its CartPanel — no <Render> anywhere", async () => {
    const CartPage = (await import("@/app/cart/page")).default;
    const CartPanel = (await import("@/components/store/CartPanel")).default;
    const el = await CartPage();

    const { Render } = await import("@puckeditor/core");
    expect(findAll(el, (e) => e.type === Render)).toHaveLength(0);
    expect(findAll(el, (e) => e.type === CartPanel)).toHaveLength(1);
  });

  it("draft-only (not yet published) still serves the hand-built page — drafts never leak to visitors", async () => {
    const store = await import("@/lib/puck-store");
    await store.setPuckDraft("cart", { content: [{ type: "Heading", props: { id: "h1", text: "unpublished" } }], root: {} });

    const CartPage = (await import("@/app/cart/page")).default;
    const CartPanel = (await import("@/components/store/CartPanel")).default;
    const el = await CartPage();

    const { Render } = await import("@puckeditor/core");
    expect(findAll(el, (e) => e.type === Render)).toHaveLength(0);
    expect(findAll(el, (e) => e.type === CartPanel)).toHaveLength(1);
  });

  it("after Publish to live: the SAME request renders the published Puck doc WITH the rails injected — and the stored doc still carries none of them", async () => {
    const store = await import("@/lib/puck-store");
    const { SEEDS } = await import("@/lib/puck-seeds");
    await store.setPuckDraft("cart", SEEDS.cart);
    await store.publishDraft("cart");

    const CartPage = (await import("@/app/cart/page")).default;
    const CartPanel = (await import("@/components/store/CartPanel")).default;
    const el = await CartPage();

    const { Render } = await import("@puckeditor/core");
    const renders = findAll(el, (e) => e.type === Render);
    expect(renders).toHaveLength(1);
    /* the widget block rides the doc WITH the injected rails … */
    const data = (renders[0].props as { data: { content: SeedBlock[] } }).data;
    const panel = data.content.find((b) => b.type === "CartPanel");
    expect(panel).toBeDefined();
    expect(panel!.props.rails).toEqual({ btc: expect.any(Boolean), card: expect.any(Boolean) });
    /* … and the hand-built widget steps aside (the block renders it now) */
    expect(findAll(el, (e) => e.type === CartPanel)).toHaveLength(0);
    /* never written back: the STORED published doc still holds only the id */
    const stored = (await store.getPuckPage("cart")) as { content: SeedBlock[] };
    const storedPanel = stored.content.find((b) => b.type === "CartPanel");
    expect(storedPanel!.props.rails).toBeUndefined();
  });
});
