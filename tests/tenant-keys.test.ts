import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { createHmac } from "crypto";
import { generateSecretKey, getPublicKey, nip19 } from "nostr-tools";

/**
 * G3 (TASK-97): the tenant namespacing changes NOTHING under the default.
 * Every formerly-hardcoded `onecocreation` KV key / HMAC label now rides
 * src/lib/tenant.ts's TENANT (env-driven, default 'onecocreation') — these
 * specs capture the exact keys/labels the modules use under the default and
 * pin them byte-for-byte against the pre-TASK-97 literals, so the saved
 * brand palette, the pasted media GitHub token and the live presence room
 * all keep resolving. One spec then flips TENANT to prove the namespacing
 * actually engages.
 *
 * The operator cookie is minted with the real makeOperatorToken against a
 * throwaway key (same pattern as tests/recon-img.test.ts); fetch is stubbed
 * to capture the bare Upstash-REST kv() command arrays.
 */

const PRESENCE_SECRET = "task97-test-presence-secret";
let cookie: string;
let kvCalls: unknown[][];

const jsonResponse = (result: unknown) =>
  ({ ok: true, json: async () => ({ result }) }) as unknown as Response;

beforeAll(async () => {
  const pk = getPublicKey(generateSecretKey());
  process.env.SEAT_SECRET = "task97-test-seat-secret";
  process.env.OPERATOR_NPUBS = nip19.npubEncode(pk);
  /* the envs the modules read — pinned BEFORE any module load (TENANT empty
     string exercises the same `|| "onecocreation"` path as unset) */
  vi.stubEnv("TENANT", "");
  vi.stubEnv("KV_REST_API_URL", "https://kv.test");
  vi.stubEnv("KV_REST_API_TOKEN", "kv-token");
  vi.stubEnv("GITHUB_TOKEN", "");
  vi.stubEnv("PRESENCE_SECRET", PRESENCE_SECRET);
  kvCalls = [];
  vi.stubGlobal("fetch", async (_url: unknown, init?: { body?: string }) => {
    kvCalls.push(JSON.parse(init?.body ?? "null"));
    return jsonResponse(null);
  });
  const { makeOperatorToken } = await import("@/lib/operator-auth");
  cookie = `fe-operator=${makeOperatorToken(pk)}`;
});

afterAll(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("tenant constant", () => {
  it("defaults to 'onecocreation' when TENANT is unset/empty", async () => {
    const { TENANT } = await import("@/lib/tenant");
    expect(TENANT).toBe("onecocreation");
  });
});

describe("brand-palette keys (default tenant)", () => {
  it("writes/reads the palette at the byte-identical legacy keys", async () => {
    const bp = await import("@/lib/brand-palette");
    const palette = { p1: "#EBCB77", p2: "#8B76C4", p3: "#E7B2C3", p4: "#8FD0D8", p5: "#2A1F45" };
    await bp.setPalette(palette);
    await bp.setPaletteDawn({ p1: "#8A6410" });
    await bp.getPalette();
    await bp.getPaletteDawn();
    expect(kvCalls).toContainEqual(["SET", "brand:palette:onecocreation", JSON.stringify(palette)]);
    expect(kvCalls).toContainEqual(["SET", "brand:palette-dawn:onecocreation", JSON.stringify({ p1: "#8A6410" })]);
    expect(kvCalls).toContainEqual(["GET", "brand:palette:onecocreation"]);
    expect(kvCalls).toContainEqual(["GET", "brand:palette-dawn:onecocreation"]);
  });
});

describe("media token key (default tenant)", () => {
  it("reads the saved GitHub token at the byte-identical legacy key", async () => {
    const before = kvCalls.length;
    const { GET } = await import("@/app/api/media/route");
    const res = await GET(new Request("http://localhost/api/media", { headers: { cookie } }));
    expect(res.status).toBe(200);
    /* no env token, KV returns null → the route honestly reports not-ready */
    expect(await res.json()).toEqual({ ok: true, ready: false, items: [] });
    expect(kvCalls.slice(before)).toContainEqual(["GET", "media:github-token:onecocreation"]);
  });
});

describe("presence room labels (default tenant)", () => {
  it("derives the byte-identical roomId/roomKey from the legacy labels", async () => {
    const { GET } = await import("@/app/api/presence/route");
    const res = await GET(new Request("http://localhost/api/presence", { headers: { cookie } }));
    expect(res.status).toBe(200);
    const d = await res.json();
    const hmac = (label: string) => createHmac("sha256", PRESENCE_SECRET).update(label).digest("hex");
    expect(d.ok).toBe(true);
    expect(d.roomId).toBe(hmac("onecocreation:presence:v1").slice(0, 32));
    expect(d.roomKey).toBe(hmac("onecocreation:presence:v1:key"));
  });
});

describe("namespacing engages", () => {
  it("a second tenant gets its own keyspace", async () => {
    vi.resetModules();
    vi.stubEnv("TENANT", "secondsite");
    const { TENANT } = await import("@/lib/tenant");
    expect(TENANT).toBe("secondsite");
    const bp = await import("@/lib/brand-palette");
    await bp.getPalette();
    expect(kvCalls).toContainEqual(["GET", "brand:palette:secondsite"]);
    expect(kvCalls).not.toContainEqual(["GET", "brand:palette-dawn:secondsite"]);
    vi.unstubAllEnvs();
    vi.resetModules();
  });
});
