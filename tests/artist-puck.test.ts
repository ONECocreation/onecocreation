import { describe, it, expect, afterAll, beforeEach, vi } from "vitest";
import { promises as fs } from "fs";
import os from "os";
import path from "path";
import type { ReactElement, ReactNode } from "react";
import { isolateCwd } from "./helpers/isolate-cwd";

/* the repo root, captured BEFORE the isolate (isolateCwd must run ahead of
   any path.join(process.cwd(), …) constant — its own docblock) */
const cwd = isolateCwd("oc-artist-puck-295-");

/**
 * TASK-295 wave A pair 3 (0018.06.25 a₿) — /artist READS ITS SEED behind
 * its gate: the TASK-135 tenant redirect comes FIRST (the T-232 idiom —
 * route gates before the Puck read), then Puck first, then the hand-built
 * ArtistRegistry as the fallback (src/app/artist/page.tsx). Pins, model not
 * render (the house idiom — tests/meditation-puck.test.ts's pattern):
 *
 *  · THE SEED CARRIES THE STATIC HEADER, VERBATIM: eyebrow / title / blurb
 *    render unconditionally atop every gated state of ArtistRegistry — the
 *    one honestly seedable copy. The session-gated app (sign-in nudge,
 *    level-locked screen, the three /api/artist/* tabs) is SAID code-side.
 *  · THE GATE IS FIRST: on THIS tenant (TENANT unset ⇒ "onecocreation")
 *    the page redirects to /me — and still redirects with a published doc
 *    in the store: the designer's page is never consulted here.
 *  · BEHIND THE GATE (another tenant): nothing published ⇒ the registry
 *    renders, no <Render>; a draft alone never leaks; after Publish the
 *    same request serves the Puck doc and the registry steps aside.
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
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "oc-artist-puck-fixture-"));
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

describe("the seed — /style/artist opens with the registry's static header, verbatim", () => {
  it("SEEDS.artist exists and every id is unique, slot children included (the T-231 lesson)", async () => {
    const { SEEDS } = await import("@/lib/puck-seeds");
    const seed = SEEDS.artist;
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
    expect(ids.every((id) => id.startsWith("ar-"))).toBe(true);
  });

  it("the header matches ArtistRegistry's own words, and the live app is said code-side", async () => {
    const { SEEDS } = await import("@/lib/puck-seeds");
    const flat = JSON.stringify(SEEDS.artist.content);
    expect(flat).toContain("Artist training");
    expect(flat).toContain("Artist Registry");
    expect(flat).toContain("Your name on the Spaces protocol — request it, watch the auction, anchor it to Bitcoin.");
    expect(flat).toContain("── the live Artist Registry stays code-side");
    /* nothing session-shaped fossilised: no gate-state copy, no tab labels */
    expect(flat).not.toContain("Checking your entitlement");
    expect(flat).not.toContain("FILE THE REQUEST");
    /* root props mirror the hand-built page's metadata verbatim */
    const root = SEEDS.artist.root as { props?: { title?: string; description?: string } };
    expect(root.props?.title).toBe("Artist Registry — One Cocreation");
    expect(root.props?.description).toContain("the artist door of One Cocreation");
  });

  it("artist is designer in the manifest, wearing the SAME note every other wired route does", async () => {
    const { PAGE_STATES } = await import("@/lib/page-states");
    const artist = PAGE_STATES.find((e) => e.path === "/artist")!;
    const about = PAGE_STATES.find((e) => e.path === "/about")!;
    expect(artist.state).toBe("designer");
    expect(artist.slug).toBe("artist");
    expect(artist.note).toBe(about.note);
  });
});

describe("ArtistPage — the tenant gate comes FIRST, before the Puck read", () => {
  it("on THIS tenant (onecocreation): the page redirects to /me — even with a published doc in the store", async () => {
    const store = await import("@/lib/puck-store");
    await store.setPuckDraft("artist", { content: [{ type: "Heading", props: { id: "h1", text: "published" } }], root: {} });
    await store.publishDraft("artist");

    const ArtistPage = (await import("@/app/artist/page")).default;
    /* next/navigation's redirect() throws NEXT_REDIRECT — the gate fired
       before getPuckPage was ever consulted */
    await expect(ArtistPage()).rejects.toThrow(/NEXT_REDIRECT/);
  });
});

describe("ArtistPage behind the gate (another tenant) — Puck first, the registry as fallback", () => {
  beforeEach(() => {
    vi.stubEnv("TENANT", "othertenant");
    vi.resetModules(); /* TENANT is read at module load (src/lib/tenant.ts) */
  });

  it("with nothing published: <ArtistRegistry> renders — no <Render> anywhere", async () => {
    const ArtistPage = (await import("@/app/artist/page")).default;
    const ArtistRegistry = (await import("@/components/ArtistRegistry")).default;
    const el = await ArtistPage();

    const { Render } = await import("@puckeditor/core");
    expect(findAll(el, (e) => e.type === Render)).toHaveLength(0);
    expect(findAll(el, (e) => e.type === ArtistRegistry)).toHaveLength(1);
  });

  it("draft-only (not yet published) still serves the registry — drafts never leak", async () => {
    const store = await import("@/lib/puck-store");
    await store.setPuckDraft("artist", { content: [{ type: "Heading", props: { id: "h1", text: "unpublished" } }], root: {} });

    const ArtistPage = (await import("@/app/artist/page")).default;
    const ArtistRegistry = (await import("@/components/ArtistRegistry")).default;
    const el = await ArtistPage();

    const { Render } = await import("@puckeditor/core");
    expect(findAll(el, (e) => e.type === Render)).toHaveLength(0);
    expect(findAll(el, (e) => e.type === ArtistRegistry)).toHaveLength(1);
  });

  it("after Publish to live: the SAME request renders the published Puck doc and the registry steps aside", async () => {
    const store = await import("@/lib/puck-store");
    const doc = { content: [{ type: "Heading", props: { id: "h1", text: "Fixture publish — artist live", level: "h1", align: "center", style: {} } }], root: {} };
    await store.setPuckDraft("artist", doc);
    await store.publishDraft("artist");

    const ArtistPage = (await import("@/app/artist/page")).default;
    const ArtistRegistry = (await import("@/components/ArtistRegistry")).default;
    const el = await ArtistPage();

    const { Render } = await import("@puckeditor/core");
    const renders = findAll(el, (e) => e.type === Render);
    expect(renders).toHaveLength(1);
    expect((renders[0].props as { data?: unknown }).data).toEqual(doc);
    expect(findAll(el, (e) => e.type === ArtistRegistry)).toHaveLength(0);
  });
});
