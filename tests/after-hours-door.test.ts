import { describe, it, expect, beforeAll, beforeEach, afterEach } from "vitest";
import { readFileSync } from "node:fs";
import { createElement as h } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { generateSecretKey, getPublicKey, nip19 } from "nostr-tools";

/**
 * TASK-236 (0018.06.23 a₿, Love's call #3 — "the director's cut") — THE
 * AFTER-HOURS DOOR: "after a reading, Weekly Intuitive members join Love in
 * the members' room 45 minutes later for the deeper dive." Pins:
 *
 *  · `live.ts`'s `LiveState.afterHours` sanitises field-by-field — a room
 *    outside ROOMS, the free Commons, or a non-finite `at` all drop it
 *    silently, and the whole thing rides ONLY while `live` itself is true;
 *  · `POST /api/admin/live`'s `action: "after-hours"` / `"after-hours-
 *    clear"` are operator-gated like open/close, bounded (room must exist
 *    and not be the Commons, minutes 1–240), and skip ONLY the matrix gate
 *    (no room announcement rides them) while the vault gate still applies;
 *  · `GET /api/live` resolves the sanitised state into words — roomTitle,
 *    package (TIERS' name), packageSlug (TIER_PAGES' slug);
 *  · `AfterHoursDoor` (the Stage's new region, NOT inside RoomVideoSlot)
 *    renders nothing when unset or more than 60 minutes stale, the
 *    satisfied-tier door when the viewer's tier clears the target room,
 *    the package door otherwise, and the sign-in door when signed out.
 */

const read = (rel: string) => readFileSync(rel, "utf8");

/* ── a tiny in-memory fake of the KV REST driver live.ts's kv() speaks to —
   GET answers whatever was last SET, so the sanitise/route tests below
   exercise the REAL live.ts functions end to end, never a module mock. ── */
function fakeKv() {
  let stored: string | null = null;
  const fetchMock = async (_url: string, init?: RequestInit) => {
    const cmd = JSON.parse(String(init?.body)) as unknown[];
    if (cmd[0] === "SET") {
      stored = cmd[2] as string;
      return new Response(JSON.stringify({ result: "OK" }), { status: 200 });
    }
    return new Response(JSON.stringify({ result: stored }), { status: 200 });
  };
  return {
    fetchMock,
    seed: (v: string | null) => { stored = v; },
    get stored() { return stored; },
  };
}

let operatorCookie: string;

beforeAll(async () => {
  process.env.SEAT_SECRET = "task-236-test-seat-secret";
  const pk = getPublicKey(generateSecretKey());
  process.env.OPERATOR_NPUBS = nip19.npubEncode(pk);
  const { makeOperatorToken } = await import("@/lib/operator-auth");
  operatorCookie = `fe-operator=${makeOperatorToken(pk)}`;
});

const realFetch = global.fetch;
let kv: ReturnType<typeof fakeKv>;

beforeEach(() => {
  kv = fakeKv();
  process.env.KV_REST_API_URL = "https://kv.test.local/exec";
  process.env.KV_REST_API_TOKEN = "test-token";
  // matrix stays DARK throughout this suite — proves after-hours never
  // needs it (a separate pin below also checks open/close would still gate)
  delete process.env.MATRIX_BOT_TOKEN;
  delete process.env.MATRIX_OCC_ADMIN_TOKEN;
  global.fetch = kv.fetchMock as unknown as typeof fetch;
});

afterEach(() => {
  global.fetch = realFetch;
  delete process.env.KV_REST_API_URL;
  delete process.env.KV_REST_API_TOKEN;
});

async function postAdminLive(body: unknown, cookie?: string) {
  const { POST } = await import("@/app/api/admin/live/route");
  return POST(
    new Request("http://test.local/api/admin/live", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(cookie ? { cookie } : {}) },
      body: JSON.stringify(body),
    }),
  );
}

describe("getLiveState — afterHours sanitises field-by-field", () => {
  it("keeps a good afterHours (a real member room, a numeric `at`)", async () => {
    kv.seed(JSON.stringify({
      live: true, kind: "class", room: "clair-senses", startedAt: 1750000000,
      afterHours: { room: "weekly-reading", at: 1750003600 },
    }));
    const { getLiveState } = await import("@/lib/live");
    const s = await getLiveState();
    expect(s.afterHours).toEqual({ room: "weekly-reading", at: 1750003600 });
  });

  it("drops it when the room isn't in ROOMS", async () => {
    kv.seed(JSON.stringify({
      live: true, room: "clair-senses",
      afterHours: { room: "not-a-real-room", at: 1750003600 },
    }));
    const { getLiveState } = await import("@/lib/live");
    const s = await getLiveState();
    expect(s.afterHours).toBeUndefined();
  });

  it("drops it when the target is the free Commons (minTier \"all\")", async () => {
    kv.seed(JSON.stringify({
      live: true, room: "clair-senses",
      afterHours: { room: "heart-field", at: 1750003600 },
    }));
    const { getLiveState } = await import("@/lib/live");
    const s = await getLiveState();
    expect(s.afterHours).toBeUndefined();
  });

  it("drops it when `at` isn't a finite number", async () => {
    for (const at of ["soon", Number.NaN, Number.POSITIVE_INFINITY, undefined]) {
      kv.seed(JSON.stringify({ live: true, room: "clair-senses", afterHours: { room: "weekly-reading", at } }));
      const { getLiveState } = await import("@/lib/live");
      const s = await getLiveState();
      expect(s.afterHours).toBeUndefined();
    }
  });

  it("a dark `live` wipes it too — the whole state reads IDLE", async () => {
    kv.seed(JSON.stringify({
      live: false, afterHours: { room: "weekly-reading", at: 1750003600 },
    }));
    const { getLiveState } = await import("@/lib/live");
    const s = await getLiveState();
    expect(s.live).toBe(false);
    expect(s.afterHours).toBeUndefined();
  });
});

describe("POST /api/admin/live — action: after-hours / after-hours-clear", () => {
  it("401 without the operator cookie, both actions", async () => {
    const a = await postAdminLive({ action: "after-hours", room: "clair-senses", minutes: 45 });
    expect(a.status).toBe(401);
    const b = await postAdminLive({ action: "after-hours-clear" });
    expect(b.status).toBe(401);
  });

  it("400 on an unknown room", async () => {
    const r = await postAdminLive({ action: "after-hours", room: "not-a-room", minutes: 45 }, operatorCookie);
    expect(r.status).toBe(400);
    expect((await r.json()).ok).toBe(false);
  });

  it("400 on the free Commons — never a legitimate after-hours target", async () => {
    const r = await postAdminLive({ action: "after-hours", room: "heart-field", minutes: 45 }, operatorCookie);
    expect(r.status).toBe(400);
  });

  it("400 on an out-of-bounds or non-finite minutes", async () => {
    for (const minutes of [0, 241, -5, Number.NaN, Number.POSITIVE_INFINITY, "45" as unknown as number]) {
      const r = await postAdminLive({ action: "after-hours", room: "clair-senses", minutes }, operatorCookie);
      expect(r.status).toBe(400);
    }
  });

  it("503 when the vault is dark, even with an otherwise-good body", async () => {
    delete process.env.KV_REST_API_URL;
    delete process.env.KV_REST_API_TOKEN;
    const r = await postAdminLive({ action: "after-hours", room: "clair-senses", minutes: 45 }, operatorCookie);
    expect(r.status).toBe(503);
  });

  it("200 with the matrix bot dark — after-hours skips ONLY the matrix gate", async () => {
    // beforeEach already leaves MATRIX_BOT_TOKEN/MATRIX_OCC_ADMIN_TOKEN unset
    const r = await postAdminLive({ action: "after-hours", room: "clair-senses", minutes: 45 }, operatorCookie);
    expect(r.status).toBe(200);
  });

  it("sets afterHours on the vault: at ≈ now + minutes*60, the room slugged", async () => {
    // seeded live (the real-world case — set while the reading is still on
    // the air): getLiveState() reads the whole state as IDLE once
    // `live !== true`, so an afterHours written against a dark room would
    // never surface on the next read either — this proves the round trip
    // while live, same as the operator's own actual sequence.
    kv.seed(JSON.stringify({ live: true, kind: "class", room: "clair-senses", startedAt: 1750000000 }));
    const before = Math.floor(Date.now() / 1000);
    const r = await postAdminLive({ action: "after-hours", room: "clair-senses", minutes: 45 }, operatorCookie);
    expect(r.status).toBe(200);
    const d = await r.json();
    expect(d.ok).toBe(true);
    expect(d.afterHours.room).toBe("clair-senses");
    expect(d.afterHours.at).toBeGreaterThanOrEqual(before + 45 * 60 - 2);
    expect(d.afterHours.at).toBeLessThanOrEqual(before + 45 * 60 + 5);

    const { getLiveState } = await import("@/lib/live");
    const s = await getLiveState();
    expect(s.afterHours?.room).toBe("clair-senses");
  });

  it("after-hours-clear drops it, the rest of the state carries forward", async () => {
    kv.seed(JSON.stringify({
      live: true, kind: "class", room: "clair-senses", startedAt: 1750000000,
      afterHours: { room: "weekly-reading", at: 1750003600 },
    }));
    const r = await postAdminLive({ action: "after-hours-clear" }, operatorCookie);
    expect(r.status).toBe(200);
    const d = await r.json();
    expect(d.afterHours).toBeNull();

    const { getLiveState } = await import("@/lib/live");
    const s = await getLiveState();
    expect(s.afterHours).toBeUndefined();
    expect(s.live).toBe(true);
    expect(s.room).toBe("clair-senses");
    expect(s.startedAt).toBe(1750000000);
  });

  it("GET /api/admin/live carries state.afterHours straight through", async () => {
    kv.seed(JSON.stringify({
      live: true, room: "clair-senses", afterHours: { room: "weekly-reading", at: 1750003600 },
    }));
    const { GET } = await import("@/app/api/admin/live/route");
    const res = await GET(new Request("http://test.local/api/admin/live", { headers: { cookie: operatorCookie } }));
    const d = await res.json();
    expect(d.state.afterHours).toEqual({ room: "weekly-reading", at: 1750003600 });
  });
});

describe("GET /api/live — afterHours resolved into words", () => {
  it("null when unset", async () => {
    kv.seed(JSON.stringify({ live: true, room: "clair-senses" }));
    const { GET } = await import("@/app/api/live/route");
    const json = await (await GET()).json();
    expect(json.afterHours).toBeNull();
  });

  it("the full shape when set — roomTitle, package (TIERS' name), packageSlug (TIER_PAGES' slug)", async () => {
    kv.seed(JSON.stringify({
      live: true, room: "clair-senses", afterHours: { room: "weekly-reading", at: 1750003600 },
    }));
    const { GET } = await import("@/app/api/live/route");
    const json = await (await GET()).json();
    expect(json.afterHours).toEqual({
      room: "weekly-reading",
      roomTitle: "Chronicles: Weekly Reading",
      package: "Observer",
      packageSlug: "observer",
      at: 1750003600,
    });
  });

  it("a closed room (live:false) reads afterHours as null too", async () => {
    kv.seed(JSON.stringify({ live: false }));
    const { GET } = await import("@/app/api/live/route");
    const json = await (await GET()).json();
    expect(json.live).toBe(false);
    expect(json.afterHours).toBeNull();
  });
});

describe("AfterHoursDoor — the Stage's deeper-dive door", () => {
  const AFTER_HOURS = {
    room: "clair-senses",
    roomTitle: "Clair Senses — Foundations",
    package: "Weekly Intuitive",
    packageSlug: "weekly-intuitive",
  };

  it("renders nothing when afterHours is null", async () => {
    const AfterHoursDoor = (await import("@/components/rooms/AfterHoursDoor")).default;
    const html = renderToStaticMarkup(h(AfterHoursDoor, { afterHours: null }));
    expect(html).toBe("");
  });

  it("renders nothing when `at` is more than 60 minutes in the past (stale)", async () => {
    const AfterHoursDoor = (await import("@/components/rooms/AfterHoursDoor")).default;
    const at = Math.floor(Date.now() / 1000) - 61 * 60;
    const html = renderToStaticMarkup(
      h(AfterHoursDoor, { afterHours: { ...AFTER_HOURS, at }, signedIn: true, viewerTier: "A" }),
    );
    expect(html).toBe("");
  });

  it("a satisfied tier draws the countdown + the ghost 'Go deeper' door", async () => {
    const AfterHoursDoor = (await import("@/components/rooms/AfterHoursDoor")).default;
    const at = Math.floor(Date.now() / 1000) + 45 * 60;
    const html = renderToStaticMarkup(
      h(AfterHoursDoor, { afterHours: { ...AFTER_HOURS, at }, signedIn: true, viewerTier: "A" }),
    );
    expect(html).toContain("Weekly Intuitive members — we go deeper in 45 minutes");
    expect(html).toContain("Go deeper in Clair Senses — Foundations");
    expect(html).toContain('href="/rooms/clair-senses"');
    expect(html).toContain("btn-ghost");
    expect(html).not.toContain("btn-gold");
    expect(html).not.toContain("opens with the");
  });

  it("an under-tier signed-in member draws the package door, never the room link", async () => {
    const AfterHoursDoor = (await import("@/components/rooms/AfterHoursDoor")).default;
    const at = Math.floor(Date.now() / 1000) + 45 * 60;
    const html = renderToStaticMarkup(
      h(AfterHoursDoor, { afterHours: { ...AFTER_HOURS, at }, signedIn: true, viewerTier: null }),
    );
    expect(html).toContain("The deeper dive opens with the Weekly Intuitive package"); // Number One follow-through: the stage IS open to them; the dive is the gated room
    expect(html).not.toContain("This stage opens with");
    expect(html).toContain('href="/packages/weekly-intuitive"');
    expect(html).not.toContain('href="/rooms/clair-senses"');
    expect(html).not.toContain("btn-gold");
  });

  it("a signed-out visitor draws the sign-in door, naming the room", async () => {
    const AfterHoursDoor = (await import("@/components/rooms/AfterHoursDoor")).default;
    const at = Math.floor(Date.now() / 1000) + 45 * 60;
    const html = renderToStaticMarkup(
      h(AfterHoursDoor, { afterHours: { ...AFTER_HOURS, at }, signedIn: false, viewerTier: null }),
    );
    expect(html).toContain("Clair Senses — Foundations opens for members");
    expect(html).toContain("Sign in");
    expect(html).not.toContain("btn-gold");
  });

  it("at/after zero: the words say 'we're going deeper now'", async () => {
    const AfterHoursDoor = (await import("@/components/rooms/AfterHoursDoor")).default;
    const at = Math.floor(Date.now() / 1000) - 5; // 5 seconds past, well inside the 60-min grace
    const html = renderToStaticMarkup(
      h(AfterHoursDoor, { afterHours: { ...AFTER_HOURS, at }, signedIn: true, viewerTier: "A" }),
    );
    expect(html).toContain("we&#x27;re going deeper now");
  });
});

describe("source pins", () => {
  it("RoomVideoSlot.tsx never mentions AfterHoursDoor — its Jitsi branch stays untouched", () => {
    expect(read("src/components/rooms/RoomVideoSlot.tsx")).not.toContain("AfterHoursDoor");
  });

  it("StageView.tsx mounts AfterHoursDoor as its own region, right after the video region", () => {
    const src = read("src/components/rooms/StageView.tsx");
    const videoAt = src.indexOf('data-region="video"');
    const doorAt = src.indexOf("<AfterHoursDoor");
    const resourcesAt = src.indexOf("cl-area-resources");
    expect(videoAt).toBeGreaterThan(-1);
    expect(doorAt).toBeGreaterThan(videoAt);
    expect(resourcesAt).toBeGreaterThan(doorAt);
  });

  it("go-live-room.tsx carries the after-hours row, house ghost buttons only", () => {
    const src = read("src/app/a/live/go-live-room.tsx");
    expect(src).toContain('{ action, room: afterHoursRoomSlug, minutes: afterHoursMinutes }');
    expect(src).toContain('actAfterHours("after-hours")');
    expect(src).toContain('actAfterHours("after-hours-clear")');
    expect(src).not.toContain("btn-gold");
  });

  /* TASK-330 (0018.06.27 a₿): the go-live door's room-chip mapping moved
     from /a/live/page.tsx (now a bare redirect) into /a/studio/page.tsx —
     StudioHub's goLiveRooms prop is built with the exact same ROOMS.map
     shape, minTier threaded the same way, so the after-hours picker's
     free-Commons filter still has what it needs. */
  it("DoorRoom / the go-live door's room mapping (now in /a/studio/page.tsx) thread minTier so the picker can filter the free Commons out", () => {
    expect(read("src/components/console/LiveDoorCard.tsx")).toContain("minTier?: Tier");
    expect(read("src/app/a/studio/page.tsx")).toContain("minTier: r.minTier");
  });
});
