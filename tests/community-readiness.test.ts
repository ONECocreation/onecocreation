import { describe, it, expect, beforeEach, afterAll, vi } from "vitest";
import { promises as fs } from "fs";
import path from "path";
import { isolateCwd } from "./helpers/isolate-cwd";

/**
 * TASK-162 (0018.06.17 a₿ · block 966,080) — THE COMMUNITY DOOR'S
 * READINESS. `features.community` is OFF (H58) and nobody could say from the
 * site what's still missing. Pins:
 *
 *   · the five probes from fixture fetches — ALL OK / ONE MISSING /
 *     UNREACHABLE → UNKNOWN (live-or-dash, never an invented ok)
 *   · the rooms probe: the server SAYING "no such room" (404) earns
 *     "opens soon"; a server that won't say paints nothing
 *   · the public rooms feed carries the same per-room live marker
 *   · the probe door is operator-gated (401 without the session)
 *   · the card's words: the flip rule rides AS WORDS, the states ride in
 *     words on every chip (never color alone)
 *   · the T-160 /classes gate and the T-137 header invariant stay
 *
 * The homeserver + meeting domain are fetch stubs (vi.stubGlobal) — the
 * live servers are never touched. The site-config fs driver rides an
 * isolated cwd (the T-158 pattern) so the meeting-rail fixtures are real
 * reads of a real doc.
 */

/* env before any app import; the probes read env AT CALL TIME so the
   per-test mutations below are the knobs */
process.env.SEAT_SECRET = "t162-test-seat-secret";
process.env.MATRIX_HOMESERVER = "http://matrix.test";
delete process.env.KV_REST_API_URL;
delete process.env.KV_REST_API_TOKEN;
delete process.env.BLOB_READ_WRITE_TOKEN;

const ROOT = process.cwd();
const { cleanup: cleanupCwd } = isolateCwd("oc-community-readiness-");

const HS = "http://matrix.test";
const BOT_MXID = "@adminpacman:matrix.test";
/* TASK-210: Love's own seat — the email-seat operator, derived exactly as the
   login door derives it (mxidForSubject: mailbox → `.at.`, on the homeserver's
   own server name — matrixServerName strips the `matrix.` host prefix, so
   http://matrix.test seats her on `test`) */
const LOVE_EMAIL = "love@example.com";
const LOVE_MXID = "@love.at.example.com:test";
const read = (rel: string) => fs.readFile(path.join(ROOT, rel), "utf8");

/* the app imports ride AFTER the env + cwd knobs (hoisted, but the knobs
   above run first at module scope — the same order route-gates uses) */
const { communityReadiness, roomsLive } = await import("@/lib/community-readiness");
const { GET: feedGET } = await import("@/app/api/matrix/rooms/route");
const { GET: readinessGET } = await import("@/app/api/admin/community-readiness/route");

interface StubOpts {
  /** aliases (e.g. "#heart-field:onecocreation.com") the directory resolves */
  roomsResolve?: string[];
  /** everything else the directory is asked about 404s when true */
  serverAnswers?: boolean;
  whoami?: "ok" | "refused";
  unreachable?: boolean;
  /** TASK-210: what the homeserver says about a member's profile — the
   *  display name it carries, or "none" (404: no account yet) */
  profile?: Record<string, string | "none">;
}

/** The stubbed outside world: versions + whoami + the room directory on
 *  HS, and the meeting domain at https://meet.test/. */
function stubWorld(opts: StubOpts) {
  vi.stubGlobal("fetch", async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = decodeURIComponent(String(input));
    const reply = (code: number, obj: unknown) =>
      new Response(JSON.stringify(obj), { status: code, headers: { "Content-Type": "application/json" } });
    if (opts.unreachable) throw new Error("fetch failed (stubbed unreachable)");
    if (url === `${HS}/_matrix/client/versions`) return reply(200, { versions: ["v1.11"] });
    if (url === `${HS}/_matrix/client/v3/account/whoami`) {
      const authed = ((init?.headers as Record<string, string>)?.Authorization ?? "").startsWith("Bearer ");
      if (opts.whoami === "refused" || !authed) return reply(401, { errcode: "M_MISSING_TOKEN" });
      return reply(200, { user_id: BOT_MXID });
    }
    const prof = url.match(/\/_matrix\/client\/v3\/profile\/(.+)\/displayname$/);
    if (prof) {
      const authed = ((init?.headers as Record<string, string>)?.Authorization ?? "").startsWith("Bearer ");
      if (!authed) return reply(401, { errcode: "M_MISSING_TOKEN" });
      const known = opts.profile?.[prof[1]];
      if (!known || known === "none") return reply(404, { errcode: "M_NOT_FOUND" });
      return reply(200, { displayname: known });
    }
    const dir = url.match(/\/_matrix\/client\/v3\/directory\/room\/(.+)$/);
    if (dir) {
      return opts.roomsResolve?.includes(dir[1])
        ? reply(200, { room_id: "!room:matrix.test", servers: ["matrix.test"] })
        : reply(404, { errcode: "M_NOT_FOUND" });
    }
    if (url === "https://meet.test/") return reply(200, "<html>jitsi</html>");
    throw new Error(`stub world: unexpected fetch ${url}`);
  });
}

/** A site-config doc in the isolated cwd's data/ dir (the fs driver). */
async function writeSwitches(meeting: Record<string, unknown>) {
  await fs.writeFile(
    path.join(process.cwd(), "data", "site-config.json"),
    JSON.stringify({ meeting }, null, 2),
  );
}

const ALL_ALIASES = [
  "#heart-field:onecocreation.com",
  "#clair-senses:onecocreation.com",
  "#tune-up:onecocreation.com",
  "#weekly-reading:onecocreation.com",
  "#observers-circle:onecocreation.com",
  "#quantum-healing:onecocreation.com",
  "#inner-sanctum:onecocreation.com",
];

beforeEach(async () => {
  process.env.MATRIX_BOT_TOKEN = "t162-bot-token";
  await writeSwitches({ rail: "jitsi", jitsiDomain: "meet.test" });
});

afterAll(() => cleanupCwd());

describe("TASK-162 — the readiness rows from fixture probes", () => {
  it("ALL OK: every probe answers, all six rows read ok — and Love's row names LOVE, never the bot seat (TASK-210)", async () => {
    stubWorld({ roomsResolve: ALL_ALIASES, whoami: "ok", profile: { [LOVE_MXID]: "Love" } });
    const rows = await communityReadiness({ operator: LOVE_EMAIL });
    expect(rows.map((r) => r.key)).toEqual(["homeserver", "seat", "identity", "rooms", "meeting", "welcome-letter"]);
    expect(rows.every((r) => r.state === "ok")).toBe(true);
    expect(rows[0].words).toContain("matrix.test");
    // the bot seat row says what it is — the house's voice, not Love's
    expect(rows[1].name).toBe("The house's bot seat resolves");
    expect(rows[1].words).toContain(BOT_MXID);
    expect(rows[1].words).toContain("not Love's own");
    // Love's OWN row: derived from the seat she is signed into (the login
    // door's own derivation), and the homeserver's word on who that is
    expect(rows[2].name).toBe("Love's Matrix identity resolves");
    expect(rows[2].words).toContain(LOVE_MXID);
    expect(rows[2].words).toContain('"Love"');
    expect(rows[2].words).not.toContain(BOT_MXID);
    expect(rows[2].words).not.toContain("adminpacman");
    expect(rows[3].words).toContain("7 of 7 rooms resolve");
    expect(rows[4].words).toContain("meet.test answers");
    // the T-156 welcome letter: the built-in words stand until Love saves her own
    expect(rows[5].words).toContain("built-in welcome words");
  });

  it("TASK-210 — Love's row without Love: no operator → unknown (never the bot printed under her name); a keyed operator → unknown, in words", async () => {
    stubWorld({ roomsResolve: ALL_ALIASES, whoami: "ok" });
    const anon = (await communityReadiness()).find((r) => r.key === "identity")!;
    expect(anon.state).toBe("unknown");
    expect(anon.words).toContain("signed in as Love");
    expect(anon.words).not.toContain(BOT_MXID);
    const keyed = (await communityReadiness({ operator: "ab".repeat(32) })).find((r) => r.key === "identity")!;
    expect(keyed.state).toBe("unknown");
    expect(keyed.words).toContain("by key");
  });

  it("TASK-210 — no account yet for Love's derived seat (profile 404) → missing, naming the seat and the fix", async () => {
    stubWorld({ roomsResolve: ALL_ALIASES, whoami: "ok", profile: { [LOVE_MXID]: "none" } });
    const love = (await communityReadiness({ operator: LOVE_EMAIL })).find((r) => r.key === "identity")!;
    expect(love.state).toBe("missing");
    expect(love.words).toContain(LOVE_MXID);
    expect(love.words).toContain("first room visit");
  });

  it("ONE MISSING: no bot token → the seat row says so, naming the ENV NAME only (never a value); Love's row can't ask either", async () => {
    delete process.env.MATRIX_BOT_TOKEN;
    delete process.env.MATRIX_OCC_ADMIN_TOKEN;
    stubWorld({ roomsResolve: ALL_ALIASES, whoami: "ok" });
    const rows = await communityReadiness({ operator: LOVE_EMAIL });
    const seat = rows.find((r) => r.key === "seat")!;
    expect(seat.state).toBe("missing");
    expect(seat.words).toContain("MATRIX_BOT_TOKEN");
    const identity = rows.find((r) => r.key === "identity")!;
    expect(identity.state).toBe("unknown");
    expect(identity.words).toContain("MATRIX_BOT_TOKEN");
    expect(identity.words).toContain(LOVE_MXID); // the derivation still stands — only the asking can't
    expect(rows.filter((r) => r.state === "ok")).toHaveLength(4);
  });

  it("ONE MISSING: the homeserver REFUSES the seat (whoami 401) → the seat row reads missing, in words", async () => {
    stubWorld({ roomsResolve: ALL_ALIASES, whoami: "refused" });
    const rows = await communityReadiness();
    const seat = rows.find((r) => r.key === "seat")!;
    expect(seat.state).toBe("missing");
    expect(seat.words).toContain("refuses");
  });

  it("UNREACHABLE → UNKNOWN: a dead world never invents an ok", async () => {
    stubWorld({ unreachable: true });
    const rows = await communityReadiness({ operator: LOVE_EMAIL });
    for (const key of ["homeserver", "seat", "identity", "rooms", "meeting"]) {
      expect(rows.find((r) => r.key === key)!.state, key).toBe("unknown");
    }
    // the welcome letter is a local read — it still stands, honestly
    expect(rows.find((r) => r.key === "welcome-letter")!.state).toBe("ok");
  });

  it("the server SAYS no room exists (all 404) → the rooms row reads missing, not unknown", async () => {
    stubWorld({ roomsResolve: [], whoami: "ok" });
    const rooms = (await communityReadiness()).find((r) => r.key === "rooms")!;
    expect(rooms.state).toBe("missing");
    expect(rooms.words).toContain("no room resolves");
  });

  it("the static rail needs no server — the meeting row reads ok and says why", async () => {
    await writeSwitches({ rail: "static", staticUrl: "https://zoom.example/j/1" });
    stubWorld({ roomsResolve: ALL_ALIASES, whoami: "ok" });
    const meeting = (await communityReadiness()).find((r) => r.key === "meeting")!;
    expect(meeting.state).toBe("ok");
    expect(meeting.words).toContain("needs no server");
  });
});

describe("TASK-162 — the rooms' live markers (the opens-soon truth)", () => {
  it("roomsLive: resolves → true, the server's 404 → false, silence → null", async () => {
    stubWorld({ roomsResolve: ALL_ALIASES.slice(0, 5), whoami: "ok" });
    const live = await roomsLive();
    expect(live.filter((r) => r.live === true)).toHaveLength(5);
    expect(live.filter((r) => r.live === false).map((r) => r.slug)).toEqual([
      "quantum-healing",
      "inner-sanctum",
    ]);
    stubWorld({ unreachable: true });
    expect((await roomsLive()).every((r) => r.live === null)).toBe(true);
  });

  it("the public feed carries the marker: a room the server 404s rides live:false", async () => {
    stubWorld({ roomsResolve: ALL_ALIASES.filter((a) => !a.includes("quantum")), whoami: "ok" });
    const res = await feedGET(new Request("http://test/api/matrix/rooms"));
    const data = await res.json();
    expect(data.ok).toBe(true);
    const quantum = data.rooms.find((r: { slug: string }) => r.slug === "quantum-healing");
    expect(quantum.live).toBe(false);
    /* TASK-465 (block 968,561): clair-senses is hidden now — it never
       rides this public feed at all, so the feed carries 6 rooms (not 7),
       5 of them live:true (not 6). roomsLive() itself still probes it
       (see the test just above this one) — only the FEED narrows. */
    expect(data.rooms).toHaveLength(6);
    expect(data.rooms.some((r: { slug: string }) => r.slug === "clair-senses")).toBe(false);
    expect(data.rooms.filter((r: { live: boolean | null }) => r.live === true)).toHaveLength(5);
  });

  it("the shelf paints \"opens soon\" only on the server's own NO — never on silence (source pin)", async () => {
    const card = await read("src/components/rooms/PackageRoomsCard.tsx");
    expect(card).toContain("opens soon");
    expect(card).toContain("r.live === false");
  });
});

describe("TASK-162 — the door + the card's words", () => {
  it("the probe door is operator-gated: no session → 401, no rows", async () => {
    stubWorld({ roomsResolve: ALL_ALIASES, whoami: "ok" });
    const res = await readinessGET(new Request("http://test/api/admin/community-readiness"));
    expect(res.status).toBe(401);
  });

  it("the card says the flip rule AS WORDS and every state in words (source pin)", async () => {
    const card = await read("src/components/console/CommunityDoorCard.tsx");
    expect(card).toContain("flip ON when every row above reads ok");
    expect(card).toContain("Your call, always");
    // the three states ride words on the chips — never color alone
    expect(card).toContain('"— the site can\'t tell"');
    expect(card).toContain('label: "missing"');
    expect(card).toContain('label: "ok"');
  });

  it("the card rides its own sub-room under the Site accordion (source pin)", async () => {
    // TASK-188 (0018.06.18 a₿): the card moved from beside the switches to
    // its own view at /a/site/community-door when the Site room became an
    // accordion — same card, same words, new berth. TASK-241 (0018.06.23
    // a₿): the room body itself moved again, from page.tsx (now the server
    // operator-gate wrapper) to SiteCommunityDoorRoom.tsx.
    const page = await read("src/app/a/site/community-door/SiteCommunityDoorRoom.tsx");
    expect(page).toContain("<CommunityDoorCard />");
    expect(page.indexOf("Community door — what it needs before it opens")).toBeGreaterThan(-1);
  });

  it("the invariants stay: the T-160 /classes gate and the T-137 header Community link (source pin)", async () => {
    const classes = await read("src/app/classes/page.tsx");
    expect(classes).toContain("!switches.features.community && !switches.features.classes");
    expect(classes).toContain("NotOpenYet");
    const nav = await read("src/components/NavMenu.tsx");
    // T-137: the Community header is always-on — no feature gate on it
    expect(nav).toContain("Community");
  });
});
