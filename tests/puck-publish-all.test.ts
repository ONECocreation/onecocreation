import { describe, it, expect, beforeEach, afterAll, vi } from "vitest";
import { promises as fs } from "fs";
import os from "os";
import path from "path";
import { generateSecretKey, getPublicKey, nip19 } from "nostr-tools";
import { isolateCwd } from "./helpers/isolate-cwd";

/* isolated cwd FIRST (the helper's own doc: it must run ahead of any
   top-level path.join(process.cwd(), …)) — the store gate's fixture
   site-config writes land here, never in the repo's real data/. */
const cwd = isolateCwd("oc-puck-publish-all-233-");

/**
 * TASK-233 (0018.06.25 a₿ · block 967,125) — the first-ever pins for the
 * route's bulk publish and the studio's {draft, live} load:
 *
 *  · POST {publishAll:true} — the lint-gated loop (api/puck/route.ts):
 *    a clean page publishes, a page with lint errors is BLOCKED with its
 *    slug + error count, and the blocked page's live copy is never
 *    written. The {published, blocked} contract the overlay's
 *    plain-language alert reads. Fixture fs store only (the
 *    studio-publish.test.ts idiom) — never the real vault.
 *  · GET ?slug=… — the {draft, live} pair the overlay's Live → Draft
 *    panes read: draft is the working copy, live is null until the first
 *    publish and equal to the published doc after.
 *  · the operator gate: no cookie, no route (401).
 *
 * The store-level publishDraft copy semantics are already pinned in
 * studio-publish.test.ts; these pins sit one level up, at the route
 * shapes PuckEditor actually speaks.
 */

const CLEAN_DOC = {
  content: [{ type: "Heading", props: { id: "h1", level: "h1", text: "A Kind Title" } }],
  root: {},
};
/* no H1 anywhere — the one-h1 rail errors in the brand lane */
const NO_TITLE_DOC = {
  content: [{ type: "Text", props: { id: "t1", text: "just some words" } }],
  root: {},
};

let tmpDir: string;
let cookie: string;

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "oc-puck-publish-all-"));
  vi.resetModules();
  vi.stubEnv("PUCK_STORE_DRIVER", "filesystem");
  vi.stubEnv("PUCK_STORE_FS_DIR", tmpDir);
  vi.stubEnv("PUCK_STORE_NAMESPACE", "");
  vi.stubEnv("KV_REST_API_URL", "");
  vi.stubEnv("KV_REST_API_TOKEN", "");
  vi.stubEnv("SEAT_SECRET", "task-233-test-seat-secret");
  const pk = getPublicKey(generateSecretKey());
  vi.stubEnv("OPERATOR_NPUBS", nip19.npubEncode(pk));
  const { makeOperatorToken } = await import("@/lib/operator-auth");
  cookie = `fe-operator=${makeOperatorToken(pk)}`;
});

afterAll(async () => {
  vi.unstubAllEnvs();
  if (tmpDir) await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
  cwd.cleanup();
});

const post = (body: unknown, withCookie = true) =>
  import("@/app/api/puck/route").then(({ POST }) =>
    POST(new Request("http://localhost/api/puck", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(withCookie ? { cookie } : {}) },
      body: JSON.stringify(body),
    })),
  );

const get = (slug: string, withCookie = true) =>
  import("@/app/api/puck/route").then(({ GET }) =>
    GET(new Request(`http://localhost/api/puck?slug=${encodeURIComponent(slug)}`, {
      headers: withCookie ? { cookie } : {},
    })),
  );

describe("GET ?slug — the {draft, live} pair the overlay reads", () => {
  it("draft saved, never published → live is null (the honest never-published state)", async () => {
    const store = await import("@/lib/puck-store");
    await store.setPuckDraft("home", CLEAN_DOC);
    const res = await get("home");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.draft).toEqual(CLEAN_DOC);
    expect(body.live).toBeNull();
  });

  it("after publishDraft, live equals the published doc and the draft stays its own copy", async () => {
    const store = await import("@/lib/puck-store");
    await store.setPuckDraft("home", CLEAN_DOC);
    await store.publishDraft("home");
    const edited = { ...CLEAN_DOC, root: { touched: true } };
    await store.setPuckDraft("home", edited);
    const body = await (await get("home")).json();
    expect(body.live).toEqual(CLEAN_DOC); // the published copy
    expect(body.draft).toEqual(edited); // the working copy, distinct
  });

  it("no operator cookie → 401, drafts never exposed", async () => {
    const res = await get("home", false);
    expect(res.status).toBe(401);
  });
});

describe("POST {publishAll:true} — the lint-gated loop", () => {
  it("publishes the clean page, blocks the linted one, and never writes the blocked page live", async () => {
    const store = await import("@/lib/puck-store");
    await store.setPuckDraft("kind-page", CLEAN_DOC);
    await store.setPuckDraft("no-title", NO_TITLE_DOC);

    const res = await post({ publishAll: true });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.published).toContain("kind-page");
    expect(body.published).not.toContain("no-title");
    const held = (body.blocked as { slug: string; errors: number }[]).find((b) => b.slug === "no-title");
    expect(held).toBeTruthy();
    expect(held!.errors).toBeGreaterThanOrEqual(1);

    expect(await store.getPuckPage("kind-page")).toEqual(CLEAN_DOC); // live
    expect(await store.getPuckPage("no-title")).toBeNull(); // blocked — never written
  });

  it("the published/blocked contract is the exact shape the overlay's plain-language alert reads", async () => {
    const store = await import("@/lib/puck-store");
    await store.setPuckDraft("no-title", NO_TITLE_DOC);
    const body = await (await post({ publishAll: true })).json();
    expect(Array.isArray(body.published)).toBe(true);
    expect(Array.isArray(body.blocked)).toBe(true);
    for (const b of body.blocked) {
      expect(typeof b.slug).toBe("string");
      expect(typeof b.errors).toBe("number");
    }
    expect(body.published).toEqual([]);
    expect(body.blocked.map((b: { slug: string }) => b.slug)).toEqual(["no-title"]);
  });

  it("no operator cookie → 401, nothing published", async () => {
    const store = await import("@/lib/puck-store");
    await store.setPuckDraft("kind-page", CLEAN_DOC);
    const res = await post({ publishAll: true }, false);
    expect(res.status).toBe(401);
    expect(await store.getPuckPage("kind-page")).toBeNull();
  });
});
