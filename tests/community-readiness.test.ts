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
  it("ALL OK: every probe answers, all five rows read ok", async () => {
    stubWorld({ roomsResolve: ALL_ALIASES, whoami: "ok" });
    const rows = await communityReadiness();
    expect(rows.map((r) => r.key)).toEqual(["homeserver", "identity", "rooms", "meeting", "welcome-letter"]);
    expect(rows.every((r) => r.state === "ok")).toBe(true);
    expect(rows[0].words).toContain("matrix.test");
    expect(rows[1].words).toContain(BOT_MXID);
    expect(rows[2].words).toContain("7 of 7 rooms resolve");
    expect(rows[3].words).toContain("meet.test answers");
    // the T-156 welcome letter: the built-in words stand until Love saves her own
    expect(rows[4].words).toContain("built-in welcome words");
  });

  it("ONE MISSING: no bot token → the identity row says so, naming the ENV NAME only (never a value)", async () => {
    delete process.env.MATRIX_BOT_TOKEN;
    delete process.env.MATRIX_OCC_ADMIN_TOKEN;
    stubWorld({ roomsResolve: ALL_ALIASES, whoami: "ok" });
    const rows = await communityReadiness();
    const identity = rows.find((r) => r.key === "identity")!;
    expect(identity.state).toBe("missing");
    expect(identity.words).toContain("MATRIX_BOT_TOKEN");
    expect(rows.filter((r) => r.state === "ok")).toHaveLength(4);
  });

  it("ONE MISSING: the homeserver REFUSES the seat (whoami 401) → missing, in words", async () => {
    stubWorld({ roomsResolve: ALL_ALIASES, whoami: "refused" });
    const rows = await communityReadiness();
    const identity = rows.find((r) => r.key === "identity")!;
    expect(identity.state).toBe("missing");
    expect(identity.words).toContain("refuses");
  });

  it("UNREACHABLE → UNKNOWN: a dead world never invents an ok", async () => {
    stubWorld({ unreachable: true });
    const rows = await communityReadiness();
    for (const key of ["homeserver", "identity", "rooms", "meeting"]) {
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
    expect(data.rooms.filter((r: { live: boolean | null }) => r.live === true)).toHaveLength(6);
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
    // accordion — same card, same words, new berth.
    const page = await read("src/app/a/site/community-door/page.tsx");
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
