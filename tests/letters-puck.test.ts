import { describe, it, expect, afterAll, beforeEach, vi } from "vitest";
import { promises as fs } from "fs";
import os from "os";
import path from "path";
import type { ReactElement, ReactNode } from "react";
import { isolateCwd } from "./helpers/isolate-cwd";

/* the repo root, captured BEFORE the isolate (isolateCwd must run ahead of
   any path.join(process.cwd(), …) constant — its own docblock) */
const cwd = isolateCwd("oc-letters-puck-296-");

/**
 * TASK-296 wave B, letters-cart pair (0018.06.25 a₿ · block ~967,200) —
 * /letters READS ITS SEED: Puck first, today's hand-built page as the
 * fallback (the /about shape; the server shelf judged AHEAD of the read
 * and injected at render time — applyLettersToPuck, the retreats
 * precedent). Pins, model not render (the house idiom):
 *
 *  · THE SEED IS THE HERO + THE HONEST BLOCK: SEEDS.letters exists with
 *    unique ids (slot children included), the hero verbatim, the
 *    LettersRoom block carrying ONLY its id — never a letter's words (the
 *    shelf is data, never copy).
 *  · THE INJECTOR PUTS THE SHELF INTO THE BLOCK AND NOWHERE ELSE: top-level
 *    LettersRoom blocks gain `recent`; other block types and the input doc
 *    are untouched; nothing to inject into ⇒ the same reference back.
 *  · THE BLOCK RENDERS THE REAL WIDGET WITH THE INJECTED SHELF: render()
 *    with recent mounts LettersRoom carrying it; without, the honest
 *    designer placeholder (never fake letters).
 *  · THE FALLBACK IS UNCHANGED · DRAFTS NEVER LEAK · A PUBLISHED DOC
 *    RENDERS — and a published SEED serves the shelf injected, while the
 *    STORED doc still carries none of it (never written back).
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
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "oc-letters-puck-fixture-"));
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

describe("the seed — /style/letters opens pre-populated, the hero verbatim + the honest block", () => {
  it("SEEDS.letters exists and every id is unique, slot children included (the T-231 lesson)", async () => {
    const { SEEDS } = await import("@/lib/puck-seeds");
    const seed = SEEDS.letters;
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
    expect(ids).toContain("lt-room");
  });

  it("the hero is verbatim and the shelf is a block — never a letter's words in the doc", async () => {
    const { SEEDS } = await import("@/lib/puck-seeds");
    const flat = JSON.stringify(SEEDS.letters.content);
    expect(flat).toContain("From Love, To You");
    expect(flat).toContain("YOUR");
    expect(flat).toContain("LETTERS");
    expect(flat).toContain('"LettersRoom"');
    expect(flat).toContain('"lt-room"');
    /* the shelf is data, never copy: no seeded letter subject fossilises */
    expect(flat).not.toContain("Greetings and Cheers");
    expect(flat).not.toContain('"recent"');
    /* honest root props mirror the hand-built page's metadata */
    const root = SEEDS.letters.root as { props?: { title?: string; description?: string } };
    expect(root.props?.title).toBe("Your Letters — One Cocreation");
    expect(root.props?.description).toBe("The letters Love has sent you, in one reading room.");
  });

  it("letters is designer in the manifest, wearing the SAME note every other wired route does", async () => {
    const { PAGE_STATES } = await import("@/lib/page-states");
    const letters = PAGE_STATES.find((e) => e.path === "/letters")!;
    const about = PAGE_STATES.find((e) => e.path === "/about")!;
    expect(letters.state).toBe("designer");
    expect(letters.slug).toBe("letters");
    expect(letters.note).toBe(about.note);
  });
});

describe("applyLettersToPuck — the injector puts the shelf into the block and NOWHERE else", () => {
  const RECENT = [{ key: "k1", subject: "Fixture letter one" }, { key: "k2", subject: "Fixture letter two" }];

  it("top-level LettersRoom blocks gain `recent`; other blocks are untouched; the input is never mutated", async () => {
    const { applyLettersToPuck } = await import("@/lib/puck-blocks/letters-room");
    const doc = {
      content: [
        { type: "Note", props: { id: "n1", text: "keep me" } },
        { type: "LettersRoom", props: { id: "lt-room" } },
        { type: "Band", props: { id: "b1", content: [{ type: "LettersRoom", props: { id: "nested" } }] } },
      ],
      root: {},
    };
    const out = applyLettersToPuck(doc, RECENT);
    const [note, room, band] = out.content as SeedBlock[];
    expect(note.props).toEqual({ id: "n1", text: "keep me" }); /* nowhere else */
    expect(room.props.recent).toEqual(RECENT); /* the block, injected */
    /* top-level only: a nested LettersRoom keeps the designer placeholder */
    expect(((band.props.content as SeedBlock[])[0].props)).toEqual({ id: "nested" });
    /* the input doc is never mutated */
    expect((doc.content[1] as SeedBlock).props).toEqual({ id: "lt-room" });
  });

  it("nothing to inject into ⇒ the SAME reference comes back (untouched-path law)", async () => {
    const { applyLettersToPuck } = await import("@/lib/puck-blocks/letters-room");
    const doc = { content: [{ type: "Note", props: { id: "n1", text: "x" } }], root: {} };
    expect(applyLettersToPuck(doc, RECENT)).toBe(doc);
  });
});

describe("the LettersRoom block — the real widget with the injected shelf, an honest placeholder without", () => {
  it("render() with recent mounts the REAL LettersRoom carrying the shelf, inside the fallback's own wrap", async () => {
    const { createLettersRoom } = await import("@/lib/puck-blocks/letters-room");
    const LettersRoom = (await import("@/components/LettersRoom")).default;
    const block = createLettersRoom();
    const el = block.render({ recent: [{ key: "k1", subject: "Fixture letter one" }] }) as ReactElement;
    expect(isElement(el)).toBe(true);
    /* the fallback's own container travels with the block (the bb-time
       lesson — the room's markup assumes the centered 640 column) */
    expect(el.type).toBe("div");
    expect((el.props as { className?: string }).className).toContain("wrap");
    const inner = (el.props as { children?: ReactNode }).children;
    expect(isElement(inner)).toBe(true);
    expect((inner as ReactElement).type).toBe(LettersRoom);
    expect(((inner as ReactElement).props as { recent?: unknown[] }).recent).toHaveLength(1);
  });

  it("render() without recent is the honest designer placeholder — never fake letters", async () => {
    const { createLettersRoom } = await import("@/lib/puck-blocks/letters-room");
    const LettersRoom = (await import("@/components/LettersRoom")).default;
    const block = createLettersRoom();
    const el = block.render({}) as ReactElement;
    expect(isElement(el)).toBe(true);
    expect(el.type).not.toBe(LettersRoom);
    expect(JSON.stringify(el)).toContain("render here on the published page");
  });
});

describe("LettersPage — Puck first, the hand-built page as fallback", () => {
  it("with nothing published: the hand-built page renders its LettersRoom — no <Render> anywhere", async () => {
    const LettersPage = (await import("@/app/letters/page")).default;
    const LettersRoom = (await import("@/components/LettersRoom")).default;
    const el = await LettersPage();

    const { Render } = await import("@puckeditor/core");
    expect(findAll(el, (e) => e.type === Render)).toHaveLength(0);
    expect(findAll(el, (e) => e.type === LettersRoom)).toHaveLength(1);
  });

  it("draft-only (not yet published) still serves the hand-built page — drafts never leak to visitors", async () => {
    const store = await import("@/lib/puck-store");
    await store.setPuckDraft("letters", { content: [{ type: "Heading", props: { id: "h1", text: "unpublished" } }], root: {} });

    const LettersPage = (await import("@/app/letters/page")).default;
    const LettersRoom = (await import("@/components/LettersRoom")).default;
    const el = await LettersPage();

    const { Render } = await import("@puckeditor/core");
    expect(findAll(el, (e) => e.type === Render)).toHaveLength(0);
    expect(findAll(el, (e) => e.type === LettersRoom)).toHaveLength(1);
  });

  it("after Publish to live: the SAME request renders the published Puck doc WITH the shelf injected — and the stored doc still carries none of it", async () => {
    const store = await import("@/lib/puck-store");
    const { SEEDS } = await import("@/lib/puck-seeds");
    await store.setPuckDraft("letters", SEEDS.letters);
    await store.publishDraft("letters");

    const LettersPage = (await import("@/app/letters/page")).default;
    const LettersRoom = (await import("@/components/LettersRoom")).default;
    const el = await LettersPage();

    const { Render } = await import("@puckeditor/core");
    const renders = findAll(el, (e) => e.type === Render);
    expect(renders).toHaveLength(1);
    /* the widget block rides the doc WITH the injected shelf … */
    const data = (renders[0].props as { data: { content: SeedBlock[] } }).data;
    const room = data.content.find((b) => b.type === "LettersRoom");
    expect(room).toBeDefined();
    expect(Array.isArray(room!.props.recent)).toBe(true);
    /* … and the hand-built widget steps aside (the block renders it now) */
    expect(findAll(el, (e) => e.type === LettersRoom)).toHaveLength(0);
    /* never written back: the STORED published doc still holds only the id */
    const stored = (await store.getPuckPage("letters")) as { content: SeedBlock[] };
    const storedRoom = stored.content.find((b) => b.type === "LettersRoom");
    expect(storedRoom!.props.recent).toBeUndefined();
  });
});
