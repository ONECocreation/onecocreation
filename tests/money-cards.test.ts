import { describe, it, expect, beforeAll, beforeEach, vi } from "vitest";
import { createHmac } from "crypto";
import { generateSecretKey, getPublicKey, nip19 } from "nostr-tools";

/**
 * TASK-167 (0018.06.17 a₿ · block 966,080) — the Money desk's CARDS card:
 * the Admiral's walk pinned as tests.
 *
 *  1. THE CHECKLIST DERIVATION (pure, fixture states): all env / mixed /
 *     none / webhook waiting / webhook verified / webhook rejected / a
 *     failing connection — every row's mark, its where-words, and the
 *     error SENTENCE beside the red mark.
 *  2. THE SECTION CHIP WORDS: "live" / "not set up" / "partly set up ·
 *     N of 5" / "needs a fix", and Stripe's honest "not built yet" family.
 *  3. THE WEBHOOK PROOF MARKERS: the webhook route writes
 *     square:webhook:last-verified {at, eventType} after a good signature
 *     and square:webhook:last-rejected {at, reason} after a bad one — and
 *     a VERIFIED-but-unactionable event (order.updated OPEN) writes
 *     NOTHING (a legitimate knock must never read as a rejection).
 *  4. THE DESK GET: carries the connection verdict + the two markers, and
 *     no longer carries the removed bitcoin check.
 *
 * Same harness law as money-desk.test.ts: real route handlers, a real
 * Request, an in-memory Upstash-REST-shaped KV mock, and a stubbed Square
 * API (this environment can't reach Square — the honest limit, unchanged).
 */

import {
  deriveSquareRows,
  squareChip,
  stripeChip,
  WEBHOOK_REJECT_SENTENCE,
  type SquareDeskStatus,
} from "@/components/console/CardsRailCard";
import { SQUARE_WEBHOOK_REJECT_REASON } from "@/app/api/store/webhook/square/route";

const squareRouteGET = async () => (await import("@/app/api/admin/store/square/route")).GET;
const webhookPOST = async () => (await import("@/app/api/store/webhook/square/route")).POST;

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
  throw new Error(`money-cards test: unhandled kv command ${op}`);
}

beforeAll(async () => {
  process.env.KV_REST_API_URL = "https://kv.money-cards.test/";
  process.env.KV_REST_API_TOKEN = "test-kv-token";
  delete process.env.BLOB_READ_WRITE_TOKEN;
  delete process.env.VERCEL;

  const pk = getPublicKey(generateSecretKey());
  process.env.SEAT_SECRET = "money-cards-test-seat-secret";
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
      return new Response(JSON.stringify({ location: { name: "OneCocreation" } }), { status: 200 });
    }
    if (u.includes("/v2/orders/")) {
      return new Response(JSON.stringify({ order: { metadata: {} } }), { status: 200 });
    }
    throw new Error(`money-cards test: unexpected fetch ${u}`);
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

// ── fixture builders ──────────────────────────────────────────────────────

const CONN_OK = { ok: true, at: "2026-09-08T12:00:00.000Z", locationName: "OneCocreation", host: "connect.squareup.com" };
const CONN_BAD = { ok: false, at: "2026-09-08T12:00:00.000Z", host: "connect.squareup.com", reason: "This merchant is not enabled for OAuth" };

function fixture(over: {
  envSet?: Record<string, boolean>;
  vault?: Record<string, { saved: boolean; at: string | null }>;
  connection?: SquareDeskStatus["connection"];
  webhook?: SquareDeskStatus["webhook"];
}): Pick<SquareDeskStatus, "envSet" | "vault" | "connection" | "webhook"> {
  const unset5 = { saved: false, at: null };
  return {
    envSet: {
      "access-token": false, "location-id": false, environment: false,
      "webhook-signature-key": false, "webhook-url": false, ...over.envSet,
    },
    vault: {
      "access-token": unset5, "location-id": unset5, environment: unset5,
      "webhook-signature-key": unset5, "webhook-url": unset5, ...over.vault,
    },
    connection: over.connection ?? null,
    webhook: over.webhook ?? { verified: null, rejected: null },
  };
}

const ALL_ENV = {
  "access-token": true, "location-id": true, environment: true,
  "webhook-signature-key": true, "webhook-url": true,
};

// ── 1 · the checklist derivation ──────────────────────────────────────────

describe("the checklist — all five on Vercel, connection proven", () => {
  it("token/location verified with the name Square answers with; environment by its host", () => {
    const rows = deriveSquareRows(fixture({ envSet: ALL_ENV, connection: CONN_OK }));
    const [token, location, env, sigKey, url] = rows;
    expect(token.mark).toBe("check");
    expect(token.note).toBe("verified 2026-09-08 — Square answers as OneCocreation");
    expect(location.mark).toBe("check");
    expect(env.mark).toBe("check");
    expect(env.note).toBe("verified — connect.squareup.com answered (production)");
    // the webhook pair cannot be proven until Square knocks — honest waiting
    expect(sigKey.mark).toBe("pending");
    expect(sigKey.note).toBe("waiting for Square's first event — send a test event from Webhooks → Subscriptions");
    expect(url.mark).toBe("pending");
    // Vercel-set rows never show a paste input
    expect(rows.every((r) => r.where === "on Vercel")).toBe(true);
    expect(rows.every((r) => !r.canPaste)).toBe(true);
    expect(squareChip(rows, CONN_OK)).toEqual({ tone: "green", words: "live" });
  });

  it("a verified webhook event turns the pair to checks with the stamp + event type", () => {
    const rows = deriveSquareRows(fixture({
      envSet: ALL_ENV,
      connection: CONN_OK,
      webhook: { verified: { at: "2026-09-08T13:00:00.000Z", eventType: "payment.updated" }, rejected: null },
    }));
    expect(rows[3].mark).toBe("check");
    expect(rows[3].note).toBe("verified 2026-09-08 — last event payment.updated");
    expect(rows[4].mark).toBe("check");
    expect(squareChip(rows, CONN_OK)).toEqual({ tone: "green", words: "live" });
  });

  it("a rejected signature NEWER than the last verify shows the error sentence in red", () => {
    const rows = deriveSquareRows(fixture({
      envSet: ALL_ENV,
      connection: CONN_OK,
      webhook: {
        verified: { at: "2026-09-08T13:00:00.000Z", eventType: "payment.updated" },
        rejected: { at: "2026-09-08T14:00:00.000Z", reason: WEBHOOK_REJECT_SENTENCE },
      },
    }));
    expect(rows[3].mark).toBe("error");
    expect(rows[3].note).toBe(WEBHOOK_REJECT_SENTENCE);
    expect(rows[4].mark).toBe("error");
    // the chip cannot say live while a rejection is the freshest word
    expect(squareChip(rows, CONN_OK)).toEqual({ tone: "rose", words: "needs a fix" });
  });

  it("a verify NEWER than the rejection wins — the pair reads verified", () => {
    const rows = deriveSquareRows(fixture({
      envSet: ALL_ENV,
      connection: CONN_OK,
      webhook: {
        verified: { at: "2026-09-08T15:00:00.000Z", eventType: "order.updated" },
        rejected: { at: "2026-09-08T14:00:00.000Z", reason: WEBHOOK_REJECT_SENTENCE },
      },
    }));
    expect(rows[3].mark).toBe("check");
    expect(squareChip(rows, CONN_OK)).toEqual({ tone: "green", words: "live" });
  });
});

describe("the checklist — failing connection, mixed, none", () => {
  it("a failing locations call marks the token + location rows with the error sentence", () => {
    const rows = deriveSquareRows(fixture({ envSet: ALL_ENV, connection: CONN_BAD }));
    expect(rows[0].mark).toBe("error");
    expect(rows[0].note).toBe("This merchant is not enabled for OAuth — fix it on Vercel, then redeploy");
    expect(rows[0].canPaste).toBe(false); // Vercel-set: fixed on Vercel, not here
    expect(rows[1].mark).toBe("error");
    // environment itself can't fail — it says so, honestly pending
    expect(rows[2].mark).toBe("pending");
    expect(squareChip(rows, CONN_BAD)).toEqual({ tone: "rose", words: "needs a fix" });
  });

  it("a failing VAULT row offers the paste form — the way to fix it", () => {
    const rows = deriveSquareRows(fixture({
      vault: {
        "access-token": { saved: true, at: "2026-09-01T00:00:00.000Z" },
        "location-id": { saved: true, at: "2026-09-01T00:00:00.000Z" },
      },
      connection: CONN_BAD,
    }));
    expect(rows[0].where).toBe("in the vault");
    expect(rows[0].mark).toBe("error");
    expect(rows[0].note).toBe("This merchant is not enabled for OAuth");
    expect(rows[0].canPaste).toBe(true);
    expect(squareChip(rows, CONN_BAD)).toEqual({ tone: "rose", words: "partly set up · 2 of 5 — needs a fix" });
  });

  it("mixed: 2 of 5 set and proven, the rest honestly empty/pending", () => {
    const rows = deriveSquareRows(fixture({
      envSet: { "access-token": true, "location-id": true },
      connection: CONN_OK,
    }));
    expect(rows[0].mark).toBe("check");
    expect(rows[1].mark).toBe("check");
    expect(rows[2].mark).toBe("empty");
    expect(rows[2].note).toBe("not set — the house assumes sandbox");
    expect(rows[2].canPaste).toBe(true);
    expect(rows[3].mark).toBe("empty");
    expect(squareChip(rows, CONN_OK)).toEqual({ tone: "lavender", words: "partly set up · 2 of 5" });
  });

  it("only the token set: no connection call is possible — pending, never a fake check", () => {
    const rows = deriveSquareRows(fixture({ envSet: { "access-token": true } }));
    expect(rows[0].mark).toBe("pending");
    expect(rows[0].note).toMatch(/prove together/);
    expect(rows[1].mark).toBe("empty");
    expect(squareChip(rows, null)).toEqual({ tone: "lavender", words: "partly set up · 1 of 5" });
  });

  it("nothing set: five empty boxes, chip says not set up", () => {
    const rows = deriveSquareRows(fixture({}));
    expect(rows.every((r) => r.mark === "empty" && r.where === "not set" && r.canPaste)).toBe(true);
    expect(squareChip(rows, null)).toEqual({ tone: "grey", words: "not set up" });
  });
});

// ── 2 · the chip words ────────────────────────────────────────────────────

describe("the section chips — words, never jargon", () => {
  it("Stripe: not set up / partly · 1 of 2 / keys saved — not built yet (never live, never 'next build')", () => {
    expect(stripeChip(0)).toEqual({ tone: "grey", words: "not set up" });
    expect(stripeChip(1)).toEqual({ tone: "lavender", words: "partly set up · 1 of 2" });
    expect(stripeChip(2)).toEqual({ tone: "lavender", words: "keys saved — not built yet" });
  });

  it("the reject sentence the desk shows is the webhook route's own words", () => {
    expect(WEBHOOK_REJECT_SENTENCE).toBe(SQUARE_WEBHOOK_REJECT_REASON);
  });
});

// ── 3 · the webhook route's proof markers ─────────────────────────────────

const SIG_KEY = "fixture-signature-key";
const HOOK_URL = "https://onecocreation.example/api/store/webhook/square";

function signed(body: string, key = SIG_KEY, url = HOOK_URL): Request {
  const sig = createHmac("sha256", key).update(url + body).digest("base64");
  return new Request("http://localhost/api/store/webhook/square", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-square-hmacsha256-signature": sig },
    body,
  });
}

const PAYMENT_EVENT = JSON.stringify({
  type: "payment.updated",
  data: { object: { payment: { order_id: "sqo_marker_1", status: "COMPLETED" } } },
});
const UNMAPPED_EVENT = JSON.stringify({
  type: "order.updated",
  data: { object: { order: { id: "sqo_open_1", state: "OPEN" } } },
});

describe("the webhook route — proof markers for the desk", () => {
  beforeEach(() => {
    process.env.SQUARE_ACCESS_TOKEN = "EAAA-fixture-token";
    process.env.SQUARE_LOCATION_ID = "L_FIXTURE";
    process.env.SQUARE_WEBHOOK_SIGNATURE_KEY = SIG_KEY;
    process.env.SQUARE_WEBHOOK_URL = HOOK_URL;
  });

  it("a verified event stamps square:webhook:last-verified {at, eventType}", async () => {
    const POST = await webhookPOST();
    const res = await POST(signed(PAYMENT_EVENT));
    expect(res.status).toBe(200);
    const marker = JSON.parse(kvStore["square:webhook:last-verified"] ?? "null");
    expect(marker).not.toBeNull();
    expect(typeof marker.at).toBe("string");
    expect(marker.eventType).toBe("payment.updated");
    expect(kvStore["square:webhook:last-rejected"]).toBeUndefined();
  });

  it("a bad signature stamps square:webhook:last-rejected {at, reason} — still a 200", async () => {
    const POST = await webhookPOST();
    const res = await POST(signed(PAYMENT_EVENT, "the-wrong-key"));
    expect(res.status).toBe(200);
    const marker = JSON.parse(kvStore["square:webhook:last-rejected"] ?? "null");
    expect(marker).not.toBeNull();
    expect(typeof marker.at).toBe("string");
    expect(marker.reason).toBe("signature did not match: check SQUARE_WEBHOOK_URL character for character");
    expect(kvStore["square:webhook:last-verified"]).toBeUndefined();
  });

  it("a VERIFIED but unactionable event (order.updated OPEN) writes NO marker", async () => {
    const POST = await webhookPOST();
    const res = await POST(signed(UNMAPPED_EVENT));
    expect(res.status).toBe(200);
    expect(kvStore["square:webhook:last-verified"]).toBeUndefined();
    expect(kvStore["square:webhook:last-rejected"]).toBeUndefined();
  });

  it("an unsigned knock writes nothing — no oracle, no marker", async () => {
    const POST = await webhookPOST();
    const res = await POST(new Request("http://localhost/api/store/webhook/square", {
      method: "POST",
      body: PAYMENT_EVENT,
    }));
    expect(res.status).toBe(200);
    expect(kvStore["square:webhook:last-verified"]).toBeUndefined();
    expect(kvStore["square:webhook:last-rejected"]).toBeUndefined();
  });
});

// ── 4 · the desk GET — connection verdict + marker reads, no bitcoin ──────

describe("the desk GET — per-row verification payload", () => {
  it("carries the connection verdict (the name + the host) and reads both webhook markers", async () => {
    process.env.SQUARE_ACCESS_TOKEN = "EAAA-fixture-token-get";
    process.env.SQUARE_LOCATION_ID = "L_FIXTURE_GET";
    process.env.SQUARE_ENVIRONMENT = "production";
    kvStore["square:webhook:last-verified"] = JSON.stringify({ at: "2026-09-08T13:00:00.000Z", eventType: "payment.updated" });

    const GET = await squareRouteGET();
    const res = await GET(new Request("http://localhost/api/admin/store/square", {
      headers: { cookie: operatorCookie },
    }));
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.connection?.ok).toBe(true);
    expect(body.connection?.locationName).toBe("OneCocreation");
    expect(body.connection?.host).toBe("connect.squareup.com");
    expect(body.webhook?.verified?.eventType).toBe("payment.updated");
    expect(body.webhook?.rejected).toBeNull();
    // the removed bitcoin check leaves no trace in the payload
    expect("squareBitcoin" in body).toBe(false);
  });

  it("the connection verdict is null — never a fake — when the pair is not set", async () => {
    const GET = await squareRouteGET();
    const res = await GET(new Request("http://localhost/api/admin/store/square", {
      headers: { cookie: operatorCookie },
    }));
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.connection).toBeNull();
  });
});
