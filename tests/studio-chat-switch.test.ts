import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { promises as fs } from "fs";
import path from "path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { generateSecretKey, getPublicKey, nip19 } from "nostr-tools";
import { isolateCwd } from "./helpers/isolate-cwd";

/**
 * TASK-387 (block 968,088+) — studio chat: hidden per room, and a live
 * on/off switch. Pins:
 *  · `roomsPatchError` refuses a bad slug or a bad chat value IN WORDS,
 *    before anything persists; a clean map (and `{}`) pass.
 *  · `sanitizeRooms` (via `getSiteConfig`) drops an unknown slug or a
 *    garbage `chat` value silently on read — the hand-edited-doc
 *    backstop, never a crash.
 *  · `saveSiteConfig` merges `rooms` PER SLUG (unlike reading/about/nav's
 *    whole-object rule) — a second room's later save never disturbs the
 *    first, and every OTHER config group stays untouched too.
 *  · the route still 401s a cookie-less PUT, nothing written.
 *  · `nextChatHidden` (ClassroomView's own extracted pure function, Build
 *    6): a stale tick's reply is ignored outright; the current tick's own
 *    reading wins otherwise; an absent slug/map reads as chat ON.
 *  · StageView honours `chatHidden`: no `.cl-area-chat` region, no
 *    RoomView/StageChat markup at all (first paint included — a hidden
 *    room never ships chat markup), the `--no-chat` modifier rides the
 *    grid, and the video region is byte-identical either way.
 *  · LessonPathView's two RoomView mounts are gated behind `!chatHidden`
 *    (source pin — `feed` is effect-loaded and this suite's `node`
 *    environment runs no effects, so the "loaded" branches are
 *    unreachable via a static render; see `vitest.config.ts` and the
 *    `classroom-three-rooms.test.ts` precedent, which only ever exercises
 *    LessonPathView's pre-`feed` gated branch through
 *    `renderToStaticMarkup` for the same reason).
 *  · ClassroomView still carries exactly ONE `setInterval` (the poll law).
 */

// captured BEFORE isolateCwd's chdir, for the source-pin reads further
// down (those must read the real tree, never the isolated tmp cwd)
const REPO_ROOT = process.cwd();

const { cleanup: cleanupCwd } = isolateCwd("oc-chat-switch-");

const FILE = path.join(process.cwd(), "data", "site-config.json");

let getSiteConfig: (typeof import("@/lib/site-config"))["getSiteConfig"];
let roomsPatchError: (typeof import("@/lib/site-config"))["roomsPatchError"];
let sitePUT: (typeof import("@/app/api/admin/site/route"))["PUT"];
let cookie: string;

beforeAll(async () => {
  process.env.NEXT_PUBLIC_SPACE_NAME = "onecocreation";
  delete process.env.KV_REST_API_URL;
  delete process.env.KV_REST_API_TOKEN;
  delete process.env.BLOB_READ_WRITE_TOKEN;
  delete process.env.REGISTRY_DRIVER;
  process.env.SEAT_SECRET = "chat-switch-test-secret";
  const pk = getPublicKey(generateSecretKey());
  process.env.OPERATOR_NPUBS = nip19.npubEncode(pk);
  const { makeOperatorToken } = await import("@/lib/operator-auth");
  cookie = `fe-operator=${makeOperatorToken(pk)}`;
  await fs.rm(FILE, { force: true });
  ({ getSiteConfig, roomsPatchError } = await import("@/lib/site-config"));
  ({ PUT: sitePUT } = await import("@/app/api/admin/site/route"));
});

afterAll(async () => {
  await fs.rm(FILE, { force: true });
  cleanupCwd();
});

const put = (body: unknown) =>
  sitePUT(new Request("http://localhost/api/admin/site", {
    method: "PUT",
    headers: { "Content-Type": "application/json", cookie },
    body: JSON.stringify(body),
  }));

describe("roomsPatchError — refuses a bad rooms patch in words", () => {
  it("a clean map passes, and so does an empty one", () => {
    expect(roomsPatchError({ "clair-senses": { chat: "hidden" } })).toBeNull();
    expect(roomsPatchError({ "clair-senses": { chat: "on" } })).toBeNull();
    expect(roomsPatchError({})).toBeNull();
  });

  it("an unknown slug is named in the refusal", () => {
    expect(roomsPatchError({ "not-a-real-room": { chat: "hidden" } })).toMatch(/unknown room "not-a-real-room"/);
  });

  it("a bad chat value is named in the refusal", () => {
    expect(roomsPatchError({ "clair-senses": { chat: "off" } })).toMatch(/clair-senses.*chat must be "on" or "hidden"/);
  });

  it("refuses non-objects outright", () => {
    expect(roomsPatchError(null)).toMatch(/must be an object/);
    expect(roomsPatchError("nope")).toMatch(/must be an object/);
    expect(roomsPatchError([])).toMatch(/must be an object/);
  });
});

describe("sanitizeRooms — the read-side backstop (via getSiteConfig)", () => {
  it("an unknown slug and a garbage chat value both drop silently, never a crash", async () => {
    await fs.mkdir(path.dirname(FILE), { recursive: true });
    await fs.writeFile(
      FILE,
      JSON.stringify({
        rooms: {
          "clair-senses": { chat: "hidden" },
          "not-a-real-room": { chat: "hidden" },
          "tune-up": { chat: "sideways" },
        },
      }),
      "utf8",
    );
    const config = await getSiteConfig();
    expect(config.rooms).toEqual({ "clair-senses": { chat: "hidden" } });
    await fs.rm(FILE, { force: true });
    await getSiteConfig(); // re-warm to defaults for whatever runs after
  });
});

describe("the route: 400 with words on garbage, 200 + saved on a clean patch", () => {
  it("a malformed rooms patch is refused before anything is persisted", async () => {
    const before = await getSiteConfig();
    const bad = await put({ rooms: { "clair-senses": { chat: "nope" } } });
    expect(bad.status).toBe(400);
    const badBody = await bad.json();
    expect(badBody.ok).toBe(false);
    expect(badBody.reason).toMatch(/clair-senses/);
    const after = await getSiteConfig();
    expect(after.rooms).toEqual(before.rooms); // untouched
  });

  it("a clean per-slug patch saves and reads back", async () => {
    const good = await put({ rooms: { "clair-senses": { chat: "hidden" } } });
    expect(good.status).toBe(200);
    const body = await good.json();
    expect(body.ok).toBe(true);
    expect(body.config.rooms).toEqual({ "clair-senses": { chat: "hidden" } });
  });

  it("a second room's later save never disturbs the first (per-slug merge, not whole-object replace)", async () => {
    // "clair-senses" is already hidden from the previous test.
    const res = await put({ rooms: { "tune-up": { chat: "hidden" } } });
    expect(res.status).toBe(200);
    const config = await getSiteConfig();
    expect(config.rooms?.["clair-senses"]).toEqual({ chat: "hidden" }); // untouched
    expect(config.rooms?.["tune-up"]).toEqual({ chat: "hidden" });
  });

  it("flipping one room back to on leaves every other stored slug alone", async () => {
    const res = await put({ rooms: { "clair-senses": { chat: "on" } } });
    expect(res.status).toBe(200);
    const config = await getSiteConfig();
    expect(config.rooms?.["clair-senses"]).toEqual({ chat: "on" });
    expect(config.rooms?.["tune-up"]).toEqual({ chat: "hidden" }); // untouched
  });

  it("a features-, payments-, meeting-, nav-, about- or reading-only save is never blocked by the rooms check", async () => {
    const res = await put({ payments: { stripe: true } });
    expect(res.status).toBe(200);
    const config = await getSiteConfig();
    expect(config.rooms?.["tune-up"]).toEqual({ chat: "hidden" }); // untouched by an unrelated save
  });

  it("the route still refuses a stranger (no operator cookie) — nothing written", async () => {
    const before = await getSiteConfig();
    const res = await sitePUT(new Request("http://localhost/api/admin/site", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rooms: { "clair-senses": { chat: "hidden" } } }),
    }));
    expect(res.status).toBe(401);
    const after = await getSiteConfig();
    expect(after.rooms).toEqual(before.rooms);
  });
});

describe("config first — absent rooms reads back as undefined (no default lives here)", () => {
  it("no saved rooms map → undefined, not a fabricated default", async () => {
    await fs.rm(FILE, { force: true });
    const config = await getSiteConfig();
    expect(config.rooms).toBeUndefined();
    await getSiteConfig(); // re-warm
  });
});

describe("nextChatHidden — the poll's own pure decision (Build 6)", () => {
  it("the current tick's own reading wins: hidden when the map says hidden, on otherwise", async () => {
    const { nextChatHidden } = await import("@/components/rooms/ClassroomView");
    expect(nextChatHidden(false, 1, 1, { rooms: { "clair-senses": { chat: "hidden" } } }, "clair-senses")).toBe(true);
    expect(nextChatHidden(true, 1, 1, { rooms: { "clair-senses": { chat: "on" } } }, "clair-senses")).toBe(false);
  });

  it("an absent slug or an absent map reads as chat ON (Named decision D)", async () => {
    const { nextChatHidden } = await import("@/components/rooms/ClassroomView");
    expect(nextChatHidden(true, 1, 1, { rooms: {} }, "clair-senses")).toBe(false);
    expect(nextChatHidden(true, 1, 1, {}, "clair-senses")).toBe(false);
  });

  it("a stale reply (an earlier tick landing after a later one already became latest) is ignored outright", async () => {
    const { nextChatHidden } = await import("@/components/rooms/ClassroomView");
    const prev = false;
    // tick 1's own reply (chat hidden) arrives after tick 2 already became
    // the latest — it must NOT overwrite whatever state already stands.
    const result = nextChatHidden(prev, 1, 2, { rooms: { "clair-senses": { chat: "hidden" } } }, "clair-senses");
    expect(result).toBe(prev); // stale — unchanged
  });

  it("the current tick (tick === latestTick) is never treated as stale", async () => {
    const { nextChatHidden } = await import("@/components/rooms/ClassroomView");
    expect(nextChatHidden(false, 3, 3, { rooms: { "clair-senses": { chat: "hidden" } } }, "clair-senses")).toBe(true);
  });
});

describe("ClassroomView — still exactly ONE setInterval (the poll law)", () => {
  it("source pin: the lane rides the existing poll, it never adds a second timer", async () => {
    const src = await fs.readFile(path.join(REPO_ROOT, "src/components/rooms/ClassroomView.tsx"), "utf8");
    expect(src.match(/setInterval\(/g)?.length).toBe(1);
  });
});

describe("StageView — chatHidden hides the chat region and the modifier class rides the grid", () => {
  const PROPS = {
    slug: "heart-field",
    alias: "#heart-field:onecocreation.com",
    title: "Heart Field",
    kind: "community" as const,
    live: false,
    roster: null,
  };

  it("chatHidden=false (today's behavior): the chat region mounts, no modifier class", async () => {
    const StageView = (await import("@/components/rooms/StageView")).default;
    const html = renderToStaticMarkup(createElement(StageView, PROPS));
    expect(html).toContain('data-region="chat"');
    expect(html).toContain("opening the room…"); // RoomView's own first paint
    expect(html).not.toContain("cl-grid-stage--no-chat");
  });

  it("chatHidden=true: no chat region, no RoomView/StageChat markup at all, the modifier class rides the grid", async () => {
    const StageView = (await import("@/components/rooms/StageView")).default;
    const html = renderToStaticMarkup(createElement(StageView, { ...PROPS, chatHidden: true }));
    expect(html).not.toContain('data-region="chat"');
    expect(html).not.toContain("opening the room…"); // no RoomView markup, first paint included
    expect(html).toContain("cl-grid-stage--no-chat");
  });

  it("the video region is byte-identical either way — a chat transition never touches it", async () => {
    const StageView = (await import("@/components/rooms/StageView")).default;
    const shown = renderToStaticMarkup(createElement(StageView, PROPS));
    const hidden = renderToStaticMarkup(createElement(StageView, { ...PROPS, chatHidden: true }));
    const videoOf = (html: string) => {
      // start at the video region's OWN wrapping div (role="region" comes
      // before data-region in JSX source order, so this is the div's true
      // start, not partway through its attributes)
      const marker = '<div role="region" class="cl-region cl-area-video"';
      const start = html.indexOf(marker);
      expect(start, "the video region marker is missing").toBeGreaterThan(-1);
      const rest = html.slice(start);
      // the NEXT region div's own start (chat's when shown, people's when
      // hidden) — searching past this div's own leading `<div role=` so it
      // finds the truly next one, never itself
      const next = rest.indexOf('<div role="region"', 1);
      return next === -1 ? rest : rest.slice(0, next);
    };
    expect(videoOf(hidden)).toBe(videoOf(shown));
  });
});

describe("LessonPathView — both RoomView mounts are gated behind chatHidden (source pin)", () => {
  it("both mount sites (the empty-lessons shelf and the Room Chat toggle) carry the same !chatHidden guard", async () => {
    const src = await fs.readFile(path.join(REPO_ROOT, "src/components/rooms/LessonPathView.tsx"), "utf8");
    expect((src.match(/<RoomView\b/g) || []).length).toBe(2); // both mounts still exist, untouched internally
    expect((src.match(/\{!chatHidden && \(/g) || []).length).toBe(2); // both, and only these two, gated
    expect(src).toContain('"no lessons on this shelf yet"'); // the honest copy when hidden
  });

  it("the gate is a plain prop, not a fetch result — no new network read added for it", async () => {
    const src = await fs.readFile(path.join(REPO_ROOT, "src/components/rooms/LessonPathView.tsx"), "utf8");
    // the file's one materials fetch is untouched; chatHidden never rides a fetch of its own
    expect((src.match(/fetch\(/g) || []).length).toBe(1);
  });
});
