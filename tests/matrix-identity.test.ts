import { describe, it, expect, beforeAll, beforeEach, vi } from "vitest";

/**
 * TASK-133 (0018.06.17 a₿): a member's chat message must carry the MEMBER's
 * identity. The Admiral signed in as adminpacman and his Heart Field post
 * came out wearing "Love" — his fren handle derived straight onto the BOT
 * SEAT's localpart, and the room guessed the label. Pins:
 *
 *   · an operator/house-handle subject derives an mxid DISTINCT from the
 *     bot seat's and from the artist's (one human = one mxid)
 *   · email + key subjects derive stable, distinct mxids
 *   · the homeserver display name is set ONCE from the handle and a name
 *     the member set themselves is never overwritten
 *   · request-level, against a STUBBED homeserver: the token the login door
 *     hands out sends as its OWN sender — a message sent with token X
 *     carries sender X
 *
 * The homeserver is an in-memory stub (vi.stubGlobal fetch) — the live
 * server is never touched.
 */

/* env before any app import — the login route reads MATRIX_HOMESERVER at
   module load */
process.env.SEAT_SECRET = "t133-test-seat-secret";
process.env.MATRIX_HOMESERVER = "http://matrix.test";
process.env.MATRIX_OCC_JWT_SECRET = "t133-test-jwt-secret";
process.env.MATRIX_BOT_TOKEN = "bot-token";

const HS = "http://matrix.test";
const BOT_MXID = "@adminpacman:test"; // the bot seat, as in prod (matrix.ts)
const ADMIRAL_NPUB =
  "npub1eyzryz3mqxml3e3km4htvz7kztjgz92ve4wzevck43ztzxuv34vq92jlk7"; // throwaway dev key

/* the registry is mocked at the module seam: the board knows the Admiral's
   key, nobody else's — no data files, no blob store */
vi.mock("@/lib/registry", () => ({
  getEntry: vi.fn(async (handle: string) =>
    handle === "adminpacman" ? { handle, npub: ADMIRAL_NPUB, status: "committed" } : null),
}));

/* ── the stubbed homeserver ─────────────────────────────────────────────── */

interface StubState {
  accounts: Map<string, { displayname: string | null }>; // localpart → profile
  sent: { sender: string; body: string }[];
  jwtSubs: string[]; // every sub the login door asked the HS to open
  displaynamePuts: string[]; // every PUT displayname, in order
}

function installStubHomeserver(): StubState {
  const state: StubState = {
    accounts: new Map([[BOT_MXID.slice(1).split(":")[0], { displayname: "Love" }]]),
    sent: [],
    jwtSubs: [],
    displaynamePuts: [],
  };
  const whoOf = (init?: RequestInit): string | null => {
    const m = ((init?.headers as Record<string, string>)?.Authorization ?? "").match(/^Bearer (.+)$/);
    if (!m) return null;
    if (m[1] === "bot-token") return "adminpacman";
    const t = m[1].match(/^tok-(.+)$/);
    return t ? t[1] : null;
  };

  vi.stubGlobal("fetch", async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = decodeURIComponent(String(input));
    const method = init?.method ?? "GET";
    const reply = (code: number, obj: unknown) =>
      new Response(JSON.stringify(obj), { status: code, headers: { "Content-Type": "application/json" } });

    if (url === `${HS}/_matrix/client/v3/login` && method === "POST") {
      const body = JSON.parse(String(init?.body)) as { token: string };
      const sub = JSON.parse(Buffer.from(body.token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/"), "base64").toString()).sub as string;
      state.jwtSubs.push(sub);
      if (!state.accounts.has(sub)) state.accounts.set(sub, { displayname: null });
      return reply(200, { access_token: `tok-${sub}`, user_id: `@${sub}:test`, device_id: `dev-${sub}` });
    }
    if (url === `${HS}/_matrix/client/v3/account/whoami`) {
      const who = whoOf(init);
      return who ? reply(200, { user_id: `@${who}:test` }) : reply(401, { errcode: "M_MISSING_TOKEN" });
    }
    const dir = url.match(/\/directory\/room\/(.+)$/);
    if (dir && method === "GET") return reply(200, { room_id: "!heart:test", servers: ["test"] });
    const prof = url.match(/\/profile\/@([^:/]+):test\/displayname$/);
    if (prof && method === "GET") {
      const dn = state.accounts.get(prof[1])?.displayname;
      return reply(200, dn ? { displayname: dn } : {});
    }
    if (prof && method === "PUT") {
      const name = (JSON.parse(String(init?.body)) as { displayname: string }).displayname;
      state.accounts.get(prof[1])!.displayname = name;
      state.displaynamePuts.push(`${prof[1]} → ${name}`);
      return reply(200, {});
    }
    if (url.includes("/invite")) return reply(200, {});
    if (url.includes("/join/")) return reply(200, { room_id: "!heart:test" });
    const send = url.match(/\/rooms\/!heart:test\/send\/m\.room\.message\//);
    if (send && method === "PUT") {
      const who = whoOf(init)!;
      state.sent.push({ sender: `@${who}:test`, body: (JSON.parse(String(init?.body)) as { body: string }).body });
      return reply(200, { event_id: `$e${state.sent.length}` });
    }
    if (url.includes("/messages")) {
      return reply(200, {
        chunk: state.sent.map((m, i) => ({
          type: "m.room.message", event_id: `$e${i + 1}`, sender: m.sender,
          origin_server_ts: 1000 + i, content: { msgtype: "m.text", body: m.body },
        })).reverse(),
      });
    }
    return reply(404, { errcode: "M_UNRECOGNIZED", error: `stub: ${method} ${url}` });
  });
  return state;
}

/* ── the suite ───────────────────────────────────────────────────────────── */

let loginPOST: (request: Request) => Promise<Response>;
let matrix: typeof import("@/lib/matrix");
let makeFrenToken: (handle: string, space: string) => string;
let stub: StubState;

function loginRequest(handle: string, space: string): Request {
  return new Request("http://localhost/api/matrix/login", {
    method: "POST",
    headers: { cookie: `pa-fren=${makeFrenToken(handle, space)}` },
  });
}

beforeAll(async () => {
  stub = installStubHomeserver();
  matrix = await import("@/lib/matrix");
  ({ makeFrenToken } = await import("@/lib/fren-auth"));
  ({ POST: loginPOST } = await import("@/app/api/matrix/login/route"));
});

beforeEach(() => {
  stub.sent.length = 0;
  stub.jwtSubs.length = 0;
  stub.displaynamePuts.length = 0;
});

describe("mxid derivation — one human = one mxid", () => {
  it("email and key subjects derive stable, distinct mxids", () => {
    const email1 = matrix.mxidForSubject("ada@example.org@email");
    const email2 = matrix.mxidForSubject("ada@example.org@email");
    const key = matrix.mxidForSubject("ada@onecocreation");
    expect(email1).toBe("@ada.at.example.org:test");
    expect(email1).toBe(email2); // same soul, same mxid every time
    expect(key).toBe("@ada:test");
    expect(key).not.toBe(email1);
  });

  it("a keyed member's collision mxid is stable, theirs alone — never the bot's, never the artist's", () => {
    const hex = "c904320a3b01b7f8e636dd6eb60bd612e481154ccd5c2cb316ac44b11b8c8d58";
    const own1 = matrix.mxidForKeyedMember(hex);
    const own2 = matrix.mxidForKeyedMember(hex);
    expect(own1).toBe(own2);
    expect(own1).toMatch(/^@key-[a-z0-9]{32}:test$/);
    expect(own1).not.toBe(matrix.mxidForSubject("adminpacman@onecocreation")); // the bot seat
    expect(own1).not.toBe(matrix.mxidForSubject("love@onecocreation")); // the artist
    expect(matrix.localpartOf(own1)).not.toBe(matrix.localpartOf(BOT_MXID));
  });

  it("the keyless collision door derives from the subject hash — stable, and never the bot's", () => {
    const a = matrix.mxidForHashedSubject("adminpacman@onecocreation");
    expect(a).toBe(matrix.mxidForHashedSubject("adminpacman@onecocreation"));
    expect(a).toMatch(/^@member-[a-f0-9]{24}:test$/);
    expect(matrix.localpartOf(a)).not.toBe(matrix.localpartOf(BOT_MXID));
  });
});

describe("ensureDisplayName — set once, never overwritten", () => {
  it("sets the handle when the account carries no name, then leaves it alone", async () => {
    stub.accounts.set("ada", { displayname: null });
    const first = await matrix.ensureDisplayName(HS, "tok-ada", "@ada:test", "ada");
    expect(first).toEqual({ ok: true, set: true });
    const second = await matrix.ensureDisplayName(HS, "tok-ada", "@ada:test", "ada");
    expect(second).toEqual({ ok: true, set: false });
    expect(stub.displaynamePuts).toEqual(["ada → ada"]); // exactly one PUT
  });

  it("never overwrites a name the member set themselves", async () => {
    stub.accounts.set("bea", { displayname: "Bea the Brave" });
    const res = await matrix.ensureDisplayName(HS, "tok-bea", "@bea:test", "bea");
    expect(res).toEqual({ ok: true, set: false });
    expect(stub.displaynamePuts).toEqual([]); // no PUT at all
    expect(stub.accounts.get("bea")!.displayname).toBe("Bea the Brave");
  });
});

describe("the login door, request-level against the stubbed homeserver", () => {
  it("the house-handle member (the Admiral's seat) does NOT land on the bot account", async () => {
    const res = await loginPOST(loginRequest("adminpacman", "onecocreation"));
    expect(res.status).toBe(200);
    const data = (await res.json()) as { ok: boolean; userId: string; accessToken: string };
    expect(data.ok).toBe(true);
    expect(data.userId).toMatch(/^@key-[a-z0-9]{32}:test$/);
    expect(data.userId).not.toBe(BOT_MXID); // the bot stays the bot
    expect(stub.jwtSubs[0]).toBe(matrix.localpartOf(data.userId)); // the JWT opens THEIR account
    // the door also set their display name from their handle, once
    expect(stub.displaynamePuts).toEqual([`${matrix.localpartOf(data.userId)} → adminpacman`]);
  });

  it("email and key members walk out as themselves", async () => {
    const email = (await (await loginPOST(loginRequest("ada@example.org", "email"))).json()) as { userId: string };
    const key = (await (await loginPOST(loginRequest("ada", "onecocreation"))).json()) as { userId: string };
    expect(email.userId).toBe("@ada.at.example.org:test");
    expect(key.userId).toBe("@ada:test");
  });

  it("a message sent with token X carries sender X", async () => {
    const admiral = (await (await loginPOST(loginRequest("adminpacman", "onecocreation"))).json()) as {
      userId: string; accessToken: string;
    };
    const ada = (await (await loginPOST(loginRequest("ada", "onecocreation"))).json()) as {
      userId: string; accessToken: string;
    };
    const sendAs = async (token: string, body: string) => {
      const r = await fetch(`${HS}/_matrix/client/v3/rooms/!heart:test/send/m.room.message/t${Date.now()}${body.length}`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ msgtype: "m.text", body }),
      });
      expect(r.ok).toBe(true);
    };
    await sendAs(admiral.accessToken, "the Admiral was here");
    await sendAs(ada.accessToken, "ada says hello");
    const timeline = (await (await fetch(`${HS}/_matrix/client/v3/rooms/!heart:test/messages?dir=b&limit=60`)).json()) as {
      chunk: { sender: string; content: { body: string } }[];
    };
    const byBody = Object.fromEntries(timeline.chunk.map((e) => [e.content.body, e.sender]));
    expect(byBody["the Admiral was here"]).toBe(admiral.userId);
    expect(byBody["ada says hello"]).toBe(ada.userId);
    expect(admiral.userId).not.toBe(ada.userId);
  });
});
