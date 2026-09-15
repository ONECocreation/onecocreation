import { describe, it, expect, afterAll, beforeEach, vi } from "vitest";
import { promises as fs } from "fs";
import os from "os";
import path from "path";
import type { ReactElement, ReactNode } from "react";
import { isolateCwd } from "./helpers/isolate-cwd";

/* the repo root, captured BEFORE the isolate (isolateCwd must run ahead of
   any path.join(process.cwd(), …) constant — its own docblock) */
const cwd = isolateCwd("oc-login-puck-296-");

/**
 * TASK-296 wave B, me-login pair (0018.06.25 a₿ · block ~967,192) — /login
 * READS ITS SEED: Puck first, today's hand-built page as the fallback (the
 * /about shape, src/app/login/page.tsx). Pins, model not render (the house
 * idiom — tests/meditation-puck.test.ts's findAll-the-element-tree
 * pattern; the page's own SiteHeader/PopupHost throw under plain
 * react-dom/server):
 *
 *  · THE SEED IS THE HERO + THE HONEST BLOCK: SEEDS.login exists with
 *    unique ids (slot children included — the T-231 lesson), the hero
 *    verbatim, and the LoginDoor block carrying ONLY its id.
 *  · THE BLOCK RENDERS THE REAL DOOR: createLoginDoor().render() mounts
 *    the actual DoorSheet in its page mount — the same door the header
 *    mounts (T-185's one-walk-two-mounts ruling), so a published /login
 *    serves the identical sign-in walk, `?next=` deep links and all.
 *  · THE FALLBACK IS UNCHANGED: nothing published ⇒ the hand-built page
 *    renders (its DoorSheet), no <Render> anywhere.
 *  · DRAFTS NEVER LEAK: a saved draft alone (never published) still serves
 *    the fallback.
 *  · A PUBLISHED DOC RENDERS: after Publish, the same request serves the
 *    Puck doc through <Render> and the hand-built page steps aside.
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
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "oc-login-puck-fixture-"));
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

describe("the seed — /style/login opens pre-populated, the hero verbatim + the honest block", () => {
  it("SEEDS.login exists and every id is unique, slot children included (the T-231 lesson)", async () => {
    const { SEEDS } = await import("@/lib/puck-seeds");
    const seed = SEEDS.login;
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
    expect(ids).toContain("lg-door");
  });

  it("the hero is verbatim and the door is a block, never fossilised copy", async () => {
    const { SEEDS } = await import("@/lib/puck-seeds");
    const flat = JSON.stringify(SEEDS.login.content);
    expect(flat).toContain("Members");
    expect(flat).toContain("WELCOME");
    expect(flat).toContain("HOME");
    expect(flat).toContain('"LoginDoor"');
    expect(flat).toContain('"lg-door"');
    /* honest root props mirror the hand-built page's metadata */
    const root = SEEDS.login.root as { props?: { title?: string; description?: string } };
    expect(root.props?.title).toBe("Sign in — One Cocreation");
    expect(root.props?.description).toContain("no passwords, nothing stored.");
  });

  it("the LoginDoor block renders the REAL door — DoorSheet in its page mount, the header's own sheet", async () => {
    const { createLoginDoor } = await import("@/lib/puck-blocks/login-door");
    const DoorSheet = (await import("@/components/door/DoorSheet")).default;
    const block = createLoginDoor();
    const el = block.render() as ReactElement;
    expect(isElement(el)).toBe(true);
    expect(el.type).toBe(DoorSheet);
    expect((el.props as { mount?: string }).mount).toBe("page");
  });

  it("login is designer in the manifest, wearing the SAME note every other wired route does", async () => {
    const { PAGE_STATES } = await import("@/lib/page-states");
    const login = PAGE_STATES.find((e) => e.path === "/login")!;
    const about = PAGE_STATES.find((e) => e.path === "/about")!;
    expect(login.state).toBe("designer");
    expect(login.slug).toBe("login");
    expect(login.note).toBe(about.note);
  });
});

describe("LoginPage — Puck first, the hand-built page as fallback", () => {
  it("with nothing published: the hand-built page renders its DoorSheet — no <Render> anywhere", async () => {
    const LoginPage = (await import("@/app/login/page")).default;
    const DoorSheet = (await import("@/components/door/DoorSheet")).default;
    const el = await LoginPage();

    const { Render } = await import("@puckeditor/core");
    expect(findAll(el, (e) => e.type === Render)).toHaveLength(0);
    const doors = findAll(el, (e) => e.type === DoorSheet);
    expect(doors).toHaveLength(1);
    expect((doors[0].props as { mount?: string }).mount).toBe("page");
  });

  it("draft-only (not yet published) still serves the hand-built page — drafts never leak to visitors", async () => {
    const store = await import("@/lib/puck-store");
    await store.setPuckDraft("login", { content: [{ type: "Heading", props: { id: "h1", text: "unpublished" } }], root: {} });

    const LoginPage = (await import("@/app/login/page")).default;
    const DoorSheet = (await import("@/components/door/DoorSheet")).default;
    const el = await LoginPage();

    const { Render } = await import("@puckeditor/core");
    expect(findAll(el, (e) => e.type === Render)).toHaveLength(0);
    expect(findAll(el, (e) => e.type === DoorSheet)).toHaveLength(1);
  });

  it("after Publish to live: the SAME request renders the published Puck doc and the hand-built page steps aside", async () => {
    const store = await import("@/lib/puck-store");
    const doc = { content: [{ type: "Heading", props: { id: "h1", text: "Fixture publish — login live", level: "h1", align: "center", style: {} } }], root: {} };
    await store.setPuckDraft("login", doc);
    await store.publishDraft("login");

    const LoginPage = (await import("@/app/login/page")).default;
    const DoorSheet = (await import("@/components/door/DoorSheet")).default;
    const el = await LoginPage();

    const { Render } = await import("@puckeditor/core");
    const renders = findAll(el, (e) => e.type === Render);
    expect(renders).toHaveLength(1);
    expect((renders[0].props as { data?: unknown }).data).toEqual(doc);
    expect(findAll(el, (e) => e.type === DoorSheet)).toHaveLength(0);
  });

  it("a fresh publish of the real seed renders it whole — the doc passes through untouched", async () => {
    const store = await import("@/lib/puck-store");
    const { SEEDS } = await import("@/lib/puck-seeds");
    await store.setPuckDraft("login", SEEDS.login);
    await store.publishDraft("login");

    const LoginPage = (await import("@/app/login/page")).default;
    const el = await LoginPage();

    const { Render } = await import("@puckeditor/core");
    const renders = findAll(el, (e) => e.type === Render);
    expect(renders).toHaveLength(1);
    expect((renders[0].props as { data?: unknown }).data).toEqual(SEEDS.login);
  });
});
