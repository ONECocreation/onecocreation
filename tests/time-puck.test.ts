import { describe, it, expect, afterAll, beforeEach, vi } from "vitest";
import { promises as fs, readFileSync } from "fs";
import os from "os";
import path from "path";
import type { ReactElement, ReactNode } from "react";

/* the repo root, captured before any module state matters */
const REPO = process.cwd();

/**
 * TASK-295 wave A pair 6 (0018.06.25 a₿ · block 967,188) — /time is the
 * EXPECTED FLAG-AND-STOP (K36): the page's live BFT read (block height →
 * 00YY.MM.DD a₿, live-or-dashes) is live data, and live data never
 * fossilises into a stored Puck doc. The honest designer branch needs a
 * data-bound block to hold the clock's place; that block does not exist
 * yet (the proposed diff is in the lane's SUMMARY — puck-config.tsx and
 * copilot.ts untouched). So:
 *
 *  · the SEED exists (the static words, transcribed verbatim, + the
 *    code-side note where the clock stands) so /style/time opens
 *    pre-populated;
 *  · the ROUTE STAYS WORDS — src/app/time/page.tsx is NOT wired (never
 *    reads getPuckPage), and a published puck:page:time doc changes
 *    NOTHING for visitors until the block lane lands;
 *  · the manifest row stays words, its note saying the stop plainly.
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
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "oc-time-puck-fixture-"));
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

describe("the seed — /style/time opens pre-populated, the static words verbatim, the clock never fossilised", () => {
  it("SEEDS.time exists: the eyebrow, the h1, the blurb, the paper door, the tick-tock line — and the code-side note", async () => {
    const { SEEDS } = await import("@/lib/puck-seeds");
    const seed = SEEDS.time;
    expect(seed).toBeDefined();
    const content = seed.content as { type: string; props: Record<string, unknown> }[];
    expect(Array.isArray(content)).toBe(true);
    expect(content).toHaveLength(1);
    expect(content[0].type).toBe("Band");

    /* the words law, pinned (src/app/time/page.tsx — NOT edited) */
    const flat = JSON.stringify(seed.content);
    expect(flat).toContain("The time door");
    expect(flat).toContain("The clock that syncs to the block, not the sun");
    expect(flat).toContain("Bitcoin Federated Time, plainly: the canonical date and the live block height. The orrery that used to perform here has gone home to its own world — a new face for this door is being drawn.");
    expect(flat).toContain("read the paper on GitHub");
    expect(flat).toContain("https://github.com/PacsArcade/bitcoin-federated-time");
    expect(flat).toContain("tick tock, it all comes back to the block");
    expect(flat).toContain("── the live BFT clock stays code-side");
  });

  it("the seed carries NO fossil of the live read — no height, no BFT date, no clock state", async () => {
    const { SEEDS } = await import("@/lib/puck-seeds");
    const flat = JSON.stringify(SEEDS.time.content);
    /* a block height is six digits today; a BFT date wears 00YY.MM.DD.
       Neither may ever appear in the stored doc. */
    expect(flat).not.toMatch(/\d{3},\d{3}/);
    expect(flat).not.toMatch(/00\d\d\.\d\d\.\d\d/);
    expect(flat).not.toContain("bftDate");
    expect(flat).not.toContain("currentBlockInfo");
  });

  it("every block id in the seed is unique — slot children included", async () => {
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
    walk(SEEDS.time.content);
    expect(ids.length).toBeGreaterThan(0);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("the root props mirror the hand-built metadata verbatim", async () => {
    const { SEEDS } = await import("@/lib/puck-seeds");
    const root = SEEDS.time.root as { props?: { title?: string; description?: string } };
    expect(root.props?.title).toBe("The Clock — Bitcoin Federated Time — One Cocreation");
    expect(root.props?.description).toBe("Bitcoin Federated Time, plainly: the canonical date and the live block height — read from the chain, never estimated.");
  });
});

describe("the flag-and-stop — /time STAYS WORDS until the data-bound block lane lands", () => {
  it("the manifest row stays words, saying the stop plainly", async () => {
    const { PAGE_STATES } = await import("@/lib/page-states");
    const time = PAGE_STATES.find((e) => e.path === "/time")!;
    expect(time.state).toBe("words");
    expect(time.note).toContain("flagged-and-stopped");
  });

  it("the route is NOT wired — page.tsx never reads getPuckPage (source pin)", () => {
    const src = readFileSync(path.join(REPO, "src/app/time/page.tsx"), "utf8");
    expect(src).not.toContain("getPuckPage");
    expect(src).not.toContain("@puckeditor/core");
  });

  it("a published puck:page:time doc changes NOTHING for visitors — the hand-built page renders, no <Render> anywhere", async () => {
    const store = await import("@/lib/puck-store");
    const { SEEDS } = await import("@/lib/puck-seeds");
    await store.setPuckDraft("time", SEEDS.time);
    await store.publishDraft("time");

    const TimePage = (await import("@/app/time/page")).default;
    const el = await TimePage();

    const { Render } = await import("@puckeditor/core");
    expect(findAll(el, (e) => e.type === Render)).toHaveLength(0);
    /* the live clock still stands where it always stood */
    const { default: TimeClock } = await import("@/app/time/TimeClock");
    expect(findAll(el, (e) => e.type === TimeClock)).toHaveLength(1);
  });
});
