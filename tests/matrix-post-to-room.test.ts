import { describe, it, expect, beforeAll, beforeEach, vi } from "vitest";

/**
 * TASK-225 (0018.06.23 a₿): Love's live call failed with "the word did not
 * land — nothing opened (M_UNRECOGNIZED: Unrecognized request)". The Matrix
 * client-server spec (and Synapse, which advertises v1.1–v1.12 at
 * matrix.onecocreation.com) routes message send ONLY as
 * `PUT /_matrix/client/v3/rooms/{roomId}/send/{eventType}/{txnId}` — POST
 * exists only WITHOUT a txnId. `postToRoom` was sending POST-with-txnId,
 * which matches no servlet → 404 M_UNRECOGNIZED.
 *
 * This pins the method and path shape with a mocked global fetch (the
 * homeserver is an in-memory stub — the live server is never touched):
 *   · PUT, path /rooms/<encoded id>/send/m.room.message/<txn>
 *   · body {msgtype: "m.text", body}
 *   · an M_UNRECOGNIZED reply surfaces as "M_UNRECOGNIZED: Unrecognized request"
 */

process.env.MATRIX_HOMESERVER = "http://matrix.test";
process.env.MATRIX_BOT_TOKEN = "bot-token";

const HS = "http://matrix.test";
const ROOM_ID = "!heart:test"; // resolveRoom's alias→id lookup succeeds
const ALIAS = "#heart:test";

interface Call {
  method: string;
  url: string;
  body: unknown;
}

let matrix: typeof import("@/lib/matrix");
let calls: Call[];
let sendMethodOverride: string | null;

function installStubHomeserver() {
  calls = [];
  sendMethodOverride = null;
  vi.stubGlobal("fetch", async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = decodeURIComponent(String(input));
    const method = init?.method ?? "GET";
    const body = init?.body ? JSON.parse(String(init.body)) : undefined;
    calls.push({ method, url, body });
    const reply = (code: number, obj: unknown) =>
      new Response(JSON.stringify(obj), { status: code, headers: { "Content-Type": "application/json" } });

    if (url === `${HS}/_matrix/client/v3/directory/room/${ALIAS}` && method === "GET") {
      return reply(200, { room_id: ROOM_ID, servers: ["test"] });
    }
    const send = url.match(new RegExp(`^${HS}/_matrix/client/v3/rooms/${ROOM_ID}/send/m\\.room\\.message/(.+)$`));
    if (send) {
      if (sendMethodOverride === "M_UNRECOGNIZED") {
        return reply(404, { errcode: "M_UNRECOGNIZED", error: "Unrecognized request" });
      }
      if (method !== "PUT") {
        return reply(404, { errcode: "M_UNRECOGNIZED", error: "Unrecognized request" });
      }
      return reply(200, { event_id: "$abc123" });
    }
    return reply(404, { errcode: "M_UNRECOGNIZED", error: `stub: ${method} ${url}` });
  });
}

beforeAll(async () => {
  matrix = await import("@/lib/matrix");
});

beforeEach(() => {
  installStubHomeserver();
});

describe("postToRoom — PUT with txnId, never bare POST", () => {
  it("sends PUT to /rooms/<encoded id>/send/m.room.message/<txn> with the right body", async () => {
    const res = await matrix.postToRoom(ALIAS, "the Heart Field is open");
    expect(res).toEqual({ ok: true, eventId: "$abc123" });

    const send = calls.find((c) => c.url.includes("/send/m.room.message/"));
    expect(send).toBeDefined();
    expect(send!.method).toBe("PUT");
    expect(send!.url).toMatch(
      new RegExp(`^${HS}/_matrix/client/v3/rooms/${ROOM_ID.replace(/[!:]/g, "\\$&")}/send/m\\.room\\.message/[^/]+$`),
    );
    expect(send!.body).toEqual({ msgtype: "m.text", body: "the Heart Field is open" });
  });

  it("keeps the txnId as the idempotency key — never blank, never repeated across calls", async () => {
    await matrix.postToRoom(ALIAS, "first");
    await matrix.postToRoom(ALIAS, "second");
    const sends = calls.filter((c) => c.url.includes("/send/m.room.message/"));
    expect(sends).toHaveLength(2);
    const txn1 = sends[0].url.split("/send/m.room.message/")[1];
    const txn2 = sends[1].url.split("/send/m.room.message/")[1];
    expect(txn1).toBeTruthy();
    expect(txn2).toBeTruthy();
    expect(txn1).not.toBe(txn2);
  });

  it("an M_UNRECOGNIZED reply surfaces as the exact honest words", async () => {
    sendMethodOverride = "M_UNRECOGNIZED";
    const res = await matrix.postToRoom(ALIAS, "hello");
    expect(res).toEqual({ ok: false, reason: "M_UNRECOGNIZED: Unrecognized request" });
  });
});
