import { describe, it, expect, afterAll, beforeEach, vi } from "vitest";
import { promises as fs, readFileSync } from "fs";
import os from "os";
import path from "path";
import type { ReactElement, ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";

/* the repo root, captured before any module state matters */
const REPO = process.cwd();

/**
 * TASK-296 wave B, pair bb-time (0018.06.25 a₿) — /time becomes a designer
 * page, landing T-295 pair 6's ruled flag-and-stop: the live BFT read is
 * CLIENT-live (live-or-dashes), so the { id }-only BftClock block (GO §2
 * rubric line 2, the JoinSurface shape) holds the clock's place — the
 * stored doc carries only the id, never a reading. The route reads Puck
 * first with today's JSX as the fallback (the /about shape,
 * src/app/about/page.tsx:68-88). No route gates (the page reads no site
 * switches).
 *
 * Pins, model not render for the branch flip (the house idiom — the page's
 * own SiteHeader/PopupHost throw under plain react-dom/server, see
 * tests/retreats-puck.test.ts's note); the page's own <Render> element is
 * rendered to static markup for the published-doc pins (TimeClock's SSR is
 * the dashes — the live-or-dashes ruling, hydration fills).
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

describe("the seed — /style/time opens pre-populated, the static words verbatim, the clock a block", () => {
  it("SEEDS.time exists: the eyebrow, the h1, the blurb, ONE BftClock block, the paper door, the tick-tock line", async () => {
    const { SEEDS } = await import("@/lib/puck-seeds");
    const seed = SEEDS.time;
    expect(seed).toBeDefined();
    const content = seed.content as SeedBlock[];
    expect(Array.isArray(content)).toBe(true);
    expect(content).toHaveLength(1);
    expect(content[0].type).toBe("Band");

    /* the words law, pinned (src/app/time/page.tsx — the fallback, NOT edited) */
    const flat = JSON.stringify(seed.content);
    expect(flat).toContain("The time door");
    expect(flat).toContain("The clock that syncs to the block, not the sun");
    expect(flat).toContain("Bitcoin Federated Time, plainly: the canonical date and the live block height. The orrery that used to perform here has gone home to its own world — a new face for this door is being drawn.");
    expect(flat).toContain("read the paper on GitHub");
    expect(flat).toContain("https://github.com/PacsArcade/bitcoin-federated-time");
    expect(flat).toContain("tick tock, it all comes back to the block");

    /* the flag-and-stop LANDED: exactly one BftClock block, the pair-6 note retired */
    const walk = (v: unknown, out: SeedBlock[] = []): SeedBlock[] => {
      if (Array.isArray(v)) { v.forEach((x) => walk(x, out)); return out; }
      if (v && typeof v === "object") {
        const o = v as SeedBlock & { type?: string };
        if (o.type === "BftClock") out.push(o as SeedBlock);
        Object.values(o).forEach((x) => walk(x, out));
      }
      return out;
    };
    const clocks = walk(seed.content);
    expect(clocks).toHaveLength(1);
    expect(clocks[0].props).toEqual({ id: "tc-clock" }); // the doc holds ONLY the id
    expect(flat).not.toContain("stays code-side");
  });

  it("the seed carries NO fossil of the live read — no height, no BFT date, no clock state", async () => {
    const { SEEDS } = await import("@/lib/puck-seeds");
    const flat = JSON.stringify(SEEDS.time.content);
    expect(flat).not.toMatch(/\d{3},\d{3}/);
    expect(flat).not.toMatch(/00\d\d\.\d\d\.\d\d/);
    expect(flat).not.toContain("bftDate");
    expect(flat).not.toContain("currentBlockInfo");
  });

  it("every block id in the seed is unique — slot children and the BftClock block included", async () => {
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
    expect(ids).toContain("tc-clock");
  });

  it("the root props mirror the hand-built metadata verbatim", async () => {
    const { SEEDS } = await import("@/lib/puck-seeds");
    const root = SEEDS.time.root as { props?: { title?: string; description?: string } };
    expect(root.props?.title).toBe("The Clock — Bitcoin Federated Time — One Cocreation");
    expect(root.props?.description).toBe("Bitcoin Federated Time, plainly: the canonical date and the live block height — read from the chain, never estimated.");
  });

  it("time is designer in the manifest, wearing the same note every wired route does", async () => {
    const { PAGE_STATES } = await import("@/lib/page-states");
    const time = PAGE_STATES.find((e) => e.path === "/time")!;
    const about = PAGE_STATES.find((e) => e.path === "/about")!;
    expect(time.state).toBe("designer");
    expect(time.slug).toBe("time");
    expect(time.note).toBe(about.note);
  });
});

describe("the registry — puck-config + the copilot mirror (the lockstep law, append-only)", () => {
  it("BftClock is registered in the real config and listed in the Actions group", async () => {
    const { config } = await import("@/lib/puck-config");
    const comps = config.components as Record<string, { label?: string }>;
    expect(comps.BftClock).toBeDefined();
    const categories = config.categories as Record<string, { components?: string[] }>;
    expect(categories.actions.components).toContain("BftClock");
    /* append-only: the siblings keep their places */
    expect(categories.actions.components?.indexOf("BftClock")).toBeGreaterThan(
      categories.actions.components?.indexOf("FormDoors") ?? -1,
    );
  });

  it("the block renders the REAL TimeClock — SSR is the dashes (live-or-dashes, hydration fills)", async () => {
    const { config } = await import("@/lib/puck-config");
    const block = (config.components as unknown as Record<string, { render: (p: Record<string, unknown>) => ReactElement }>).BftClock;
    const html = renderToStaticMarkup(block.render({}));
    expect(html).toContain("————.——.—— —");
    expect(html).toContain("Bitcoin Federated Time — live reading");
  });

  it("copilot.ts COMPONENTS mirrors BftClock (source pin — COMPONENTS is module-private)", () => {
    const src = readFileSync(path.join(REPO, "src/lib/copilot.ts"), "utf8");
    expect(src).toContain('type: "BftClock"');
  });
});

describe("TimePage — Puck first, the hand-built page as fallback, the clock live on both branches", () => {
  it("with nothing published: the hand-built page renders — no <Render> anywhere, TimeClock stands", async () => {
    const TimePage = (await import("@/app/time/page")).default;
    const { default: TimeClock } = await import("@/app/time/TimeClock");
    const el = await TimePage();

    const { Render } = await import("@puckeditor/core");
    expect(findAll(el, (e) => e.type === Render)).toHaveLength(0);
    expect(findAll(el, (e) => e.type === TimeClock)).toHaveLength(1);
  });

  it("draft-only (not yet published) still serves the hand-built page — drafts never leak to visitors", async () => {
    const store = await import("@/lib/puck-store");
    await store.setPuckDraft("time", { content: [{ type: "Heading", props: { id: "h1", text: "unpublished" } }], root: {} });

    const TimePage = (await import("@/app/time/page")).default;
    const { default: TimeClock } = await import("@/app/time/TimeClock");
    const el = await TimePage();

    const { Render } = await import("@puckeditor/core");
    expect(findAll(el, (e) => e.type === Render)).toHaveLength(0);
    expect(findAll(el, (e) => e.type === TimeClock)).toHaveLength(1);
  });

  it("after Publish to live: the SAME request renders the published Puck doc — the SAME clock widget through the block", async () => {
    const store = await import("@/lib/puck-store");
    const doc = { content: [{ type: "BftClock", props: { id: "tc-clock" } }], root: {} };
    await store.setPuckDraft("time", doc);
    await store.publishDraft("time");

    const TimePage = (await import("@/app/time/page")).default;
    const { default: TimeClock } = await import("@/app/time/TimeClock");
    const el = await TimePage();

    const { Render } = await import("@puckeditor/core");
    const renders = findAll(el, (e) => e.type === Render);
    expect(renders).toHaveLength(1);
    /* { id }-only: the data passes through untouched — nothing injected,
       nothing written back (the stored published doc keeps only the id) */
    expect((renders[0].props as { data?: unknown }).data).toEqual(doc);
    expect(await store.getPuckPage("time")).toEqual(doc);
    /* and the block renders the real clock (its SSR dashes) */
    const html = renderToStaticMarkup(renders[0]);
    expect(html).toContain("————.——.—— —");
    // the hand-built branch is gone from this request's output
    expect(findAll(el, (e) => e.type === TimeClock && !(e.props as object))).toHaveLength(0);
  });

  it("the published branch renders the REAL seed — the static words verbatim AND the clock block live", async () => {
    const store = await import("@/lib/puck-store");
    const { SEEDS } = await import("@/lib/puck-seeds");
    await store.setPuckDraft("time", SEEDS.time);
    await store.publishDraft("time");

    const TimePage = (await import("@/app/time/page")).default;
    const el = await TimePage();

    const { Render } = await import("@puckeditor/core");
    const renders = findAll(el, (e) => e.type === Render);
    expect(renders).toHaveLength(1);
    const html = renderToStaticMarkup(renders[0]);
    expect(html).toContain("The time door");
    expect(html).toContain("The clock that syncs to the block, not the sun");
    expect(html).toContain("————.——.—— —");
    expect(html).toContain("read the paper on GitHub");
    expect(html).toContain("tick tock, it all comes back to the block");
  });
});
