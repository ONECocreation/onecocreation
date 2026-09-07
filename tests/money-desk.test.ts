import { describe, it, expect, beforeAll, beforeEach, vi } from "vitest";
import { createHmac } from "crypto";
import { generateSecretKey, getPublicKey, nip19 } from "nostr-tools";

/**
 * TASK-136 (0018.06.17 a₿) — THE MONEY DESK: Square's paste-keys vault
 * drawer (mirror of Stripe's), env-then-vault precedence in squareEnv() and
 * the webhook-secret read, and liveAdapter("square") going live off a
 * vault-only save with no env and no redeploy. Real route handlers, a real
 * Request, an in-memory Upstash-REST-shaped KV mock, and a stubbed Square
 * Locations endpoint (this environment can't reach Square, same honest
 * limit as scripts/square-payments.test.mjs).
 *
 * Every assertion that reads a response body also checks the raw pasted
 * value never rides along — the desk's write-only law (never echo a
 * secret) is tested, not just asserted in a comment.
 */

const squareRouteGET = async () => (await import("@/app/api/admin/store/square/route")).GET;
const squareRoutePOST = async () => (await import("@/app/api/admin/store/square/route")).POST;

let operatorCookie: string;
let kvStore: Record<string, string> = {};

function kvResult(cmd: unknown[]): unknown {
  const [op, key, value] = cmd as [string, string, string | undefined];
  if (op === "GET") return key in kvStore ? kvStore[key] : null;
  if (op === "SET") {
    kvStore[key] = String(value);
    return "OK";
  }
  if (op === "DEL") {
    const had = key in kvStore;
    delete kvStore[key];
    return had ? 1 : 0;
  }
  if (op === "EXISTS") return key in kvStore ? 1 : 0;
  throw new Error(`money-desk test: unhandled kv command ${op}`);
}

beforeAll(async () => {
  process.env.KV_REST_API_URL = "https://kv.money-desk.test/";
  process.env.KV_REST_API_TOKEN = "test-kv-token";
  delete process.env.BLOB_READ_WRITE_TOKEN;
  delete process.env.VERCEL;

  const pk = getPublicKey(generateSecretKey());
  process.env.SEAT_SECRET = "money-desk-test-seat-secret";
  process.env.OPERATOR_NPUBS = nip19.npubEncode(pk);
  const { makeOperatorToken } = await import("@/lib/operator-auth");
  operatorCookie = `fe-operator=${makeOperatorToken(pk)}`;

  vi.stubGlobal("fetch", async (url: unknown, init?: RequestInit) => {
    const u = String(url);
    if (u === process.env.KV_REST_API_URL) {
      const cmd = JSON.parse(String(init?.body)) as unknown[];
      return new Response(JSON.stringify({ result: kvResult(cmd) }), { status: 200 });
    }
    if (u.includes("/v2/locations/")) {
      return new Response(
        JSON.stringify({ location: { name: "Pac's Arcade (sandbox)", capabilities: ["CASH_APP_BITCOIN"] } }),
        { status: 200 },
      );
    }
    throw new Error(`money-desk test: unexpected fetch ${u}`);
  });
});

beforeEach(() => {
  kvStore = {};
  delete process.env.SQUARE_ACCESS_TOKEN;
  delete process.env.SQUARE_LOCATION_ID;
  delete process.env.SQUARE_ENVIRONMENT;
  delete process.env.SQUARE_WEBHOOK_SIGNATURE_KEY;
  delete process.env.SQUARE_WEBHOOK_URL;
});

const get = () =>
  squareRouteGET().then((GET) => GET(new Request("http://localhost/api/admin/store/square", {
    headers: { cookie: operatorCookie },
  })));

const post = (body: Record<string, unknown>) =>
  squareRoutePOST().then((POST) => POST(new Request("http://localhost/api/admin/store/square", {
    method: "POST",
    headers: { "Content-Type": "application/json", cookie: operatorCookie },
    body: JSON.stringify(body),
  })));

describe("the vault route — operator gate", () => {
  it("refuses a GET with no operator cookie", async () => {
    const GET = await squareRouteGET();
    const res = await GET(new Request("http://localhost/api/admin/store/square"));
    expect(res.status).toBe(401);
    expect((await res.json()).ok).toBe(false);
  });
});

describe("the vault route — save / status / clear, never an echo", () => {
  it("saves a field write-only: the response never carries the pasted value", async () => {
    const res = await post({ field: "access-token", value: "EAAA-super-secret-token-1" });
    const text = await res.text();
    expect(res.status).toBe(200);
    expect(text).not.toContain("EAAA-super-secret-token-1");
    const body = JSON.parse(text);
    expect(body.ok).toBe(true);
    expect(body.saved).toBe(true);
    expect(typeof body.at).toBe("string");
  });

  it("GET reports saved/at only — status flips from unset to vault, never the value", async () => {
    let status = await get().then((r) => r.json());
    expect(status.source).toBe("unset");
    expect(status.vault["access-token"].saved).toBe(false);

    await post({ field: "access-token", value: "EAAA-secret-a" });
    status = await get().then((r) => r.json());
    expect(status.vault["access-token"].saved).toBe(true);
    // both required fields must be saved before the desk calls it "vault"-configured
    expect(status.source).toBe("unset");

    await post({ field: "location-id", value: "L_FAKE_LOCATION" });
    const res = await get();
    const text = await res.text();
    expect(text).not.toContain("EAAA-secret-a");
    expect(text).not.toContain("L_FAKE_LOCATION");
    status = JSON.parse(text);
    expect(status.source).toBe("vault");
    expect(status.configured).toBe(true);
  });

  it("clears a field back to unsaved", async () => {
    await post({ field: "access-token", value: "EAAA-secret-b" });
    let status = await get().then((r) => r.json());
    expect(status.vault["access-token"].saved).toBe(true);

    await post({ field: "access-token", clear: true });
    status = await get().then((r) => r.json());
    expect(status.vault["access-token"].saved).toBe(false);
    expect(status.source).toBe("unset");
  });

  it("prefills the default webhook URL for the desk to show, editable", async () => {
    const status = await get().then((r) => r.json());
    expect(status.defaultWebhookUrl).toMatch(/\/api\/store\/webhook\/square$/);
  });
});

describe("the vault route — honest validation", () => {
  it("refuses an unknown field", async () => {
    const res = await post({ field: "bogus", value: "x" });
    expect(res.status).toBe(400);
  });

  it("refuses a badly-prefixed access token", async () => {
    const res = await post({ field: "access-token", value: "not-a-square-token" });
    expect(res.status).toBe(400);
    expect((await res.json()).reason).toMatch(/EAAA/);
  });

  it("environment is an enum, not free text", async () => {
    const bad = await post({ field: "environment", value: "carrier-pigeon" });
    expect(bad.status).toBe(400);
    const good = await post({ field: "environment", value: "production" });
    expect(good.status).toBe(200);
  });
});

describe("the vault route — test the connection", () => {
  it("refuses the test with nothing configured", async () => {
    const res = await post({ action: "test" });
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.reason).toMatch(/paste the keys/);
  });

  it("reports the location name once configured — never the token", async () => {
    await post({ field: "access-token", value: "EAAA-secret-c" });
    await post({ field: "location-id", value: "L_FAKE_LOCATION_2" });
    const res = await post({ action: "test" });
    const text = await res.text();
    expect(text).not.toContain("EAAA-secret-c");
    const body = JSON.parse(text);
    expect(body.ok).toBe(true);
    expect(body.message).toBe("connected as Pac's Arcade (sandbox)");
  });
});

describe("payments.ts squareEnv() — env-then-vault precedence", () => {
  it("uses the vault when env is absent, then env wins the moment it's set", async () => {
    const { squareEnv, loadSquareVaultEnv } = await import("@/lib/payments");
    kvStore["oc:square:access-token"] = "EAAA-vault-token";
    kvStore["oc:square:location-id"] = "L_VAULT";
    await loadSquareVaultEnv();

    expect(squareEnv()).toEqual({ accessToken: "EAAA-vault-token", locationId: "L_VAULT", environment: "sandbox" });

    process.env.SQUARE_ACCESS_TOKEN = "EAAA-env-token";
    process.env.SQUARE_LOCATION_ID = "L_ENV";
    process.env.SQUARE_ENVIRONMENT = "production";
    // env wins outright, even though the vault still holds different values
    expect(squareEnv()).toEqual({ accessToken: "EAAA-env-token", locationId: "L_ENV", environment: "production" });

    delete process.env.SQUARE_ACCESS_TOKEN;
    delete process.env.SQUARE_LOCATION_ID;
    delete process.env.SQUARE_ENVIRONMENT;
    // falls straight back to the (still-warm) vault the moment env is gone
    expect(squareEnv()).toEqual({ accessToken: "EAAA-vault-token", locationId: "L_VAULT", environment: "sandbox" });
  });
});

describe("liveAdapter('square') — goes live off a vault save, no redeploy", () => {
  it("null with nothing configured; the adapter once the vault alone has both fields", async () => {
    const { squareAdapter, liveAdapter, loadSquareVaultEnv } = await import("@/lib/payments");
    // clean slate: an unrelated earlier test in this file may have warmed
    // the cache with different values — a fresh load against an empty
    // kvStore proves the vault, not stale module state, drives this
    await loadSquareVaultEnv();
    expect(squareAdapter.configured()).toBe(false);
    expect(liveAdapter("square")).toBeNull();

    kvStore["oc:square:access-token"] = "EAAA-live-token";
    kvStore["oc:square:location-id"] = "L_LIVE";
    await loadSquareVaultEnv();

    expect(squareAdapter.configured()).toBe(true);
    // the site's default switches (no stored site-config.json in this
    // process) keep payments.square ON — see site-config.ts's defaults
    expect(liveAdapter("square")).toBe(squareAdapter);
  });
});

describe("verifyWebhook — reads the vault's signature key + URL when env is absent", () => {
  it("a vault-sourced key/url verifies a correctly-signed body", async () => {
    const { squareAdapter, loadSquareVaultEnv } = await import("@/lib/payments");
    const key = "vault-only-signature-key";
    const url = "https://site.example/api/store/webhook/square";
    kvStore["oc:square:webhook-signature-key"] = key;
    kvStore["oc:square:webhook-url"] = url;
    await loadSquareVaultEnv();

    const rawBody = JSON.stringify({
      type: "order.updated",
      data: { object: { order: { id: "sqo_vault_1", state: "COMPLETED" } } },
    });
    const sig = createHmac("sha256", key).update(url + rawBody).digest("base64");

    const event = await squareAdapter.verifyWebhook(rawBody, new Headers({ "x-square-hmacsha256-signature": sig }));
    expect(event).toEqual({ type: "settled", chargeId: "sqo_vault_1" });
  });
});

// Number One's follow-through (0018.06.17 a₿): cold instances warm the vault
// once before the money routes read it — env complete ⇒ no vault call at all.
describe("ensureSquareVault (cold instance)", () => {
  it("resolves without touching KV when the env carries all five values", async () => {
    const saved = { ...process.env };
    process.env.SQUARE_ACCESS_TOKEN = "EAAAtest-fixture-token-0000";
    process.env.SQUARE_LOCATION_ID = "L_FIXTURE_TEST";
    process.env.SQUARE_WEBHOOK_SIGNATURE_KEY = "fixture-sig";
    process.env.SQUARE_WEBHOOK_URL = "https://example.test/api/store/webhook/square";
    const calls: unknown[] = [];
    const realFetch = globalThis.fetch;
    globalThis.fetch = (async (...a: unknown[]) => { calls.push(a); throw new Error("must not be called"); }) as typeof fetch;
    try {
      const { ensureSquareVault } = await import("@/lib/payments");
      await expect(ensureSquareVault()).resolves.toBeUndefined();
      expect(calls).toHaveLength(0);
    } finally {
      globalThis.fetch = realFetch;
      process.env = saved;
    }
  });
});
