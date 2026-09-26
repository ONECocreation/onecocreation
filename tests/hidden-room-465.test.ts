import { describe, it, expect, beforeAll, beforeEach, afterEach } from "vitest";
import { readFileSync } from "node:fs";
import { createElement as h } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { generateSecretKey, getPublicKey, nip19 } from "nostr-tools";

/**
 * TASK-465 (block 968,561), the adversarial review's two blockers.
 *
 * 1. "clair senses room can be hidden for now." Hiding it from the rooms
 *    feed and its own page was not enough: Love could still go live in it,
 *    or point the after-hours door at it. Then the site-wide live strip
 *    named it, and its link 404'd. Now the admin feed never offers a
 *    hidden room, the write route refuses one, the public live read never
 *    names one, and the after-hours door draws nothing for one.
 * 2. Love's own Stage 2 card said "Weekly Intuitive and above can come
 *    in." The floor is Observer now. The card reads the floor's name from
 *    the server page, never a literal.
 *
 * Same in-memory KV fake as tests/after-hours-door.test.ts, so the REAL
 * live.ts and route code run end to end.
 */

const read = (rel: string) => readFileSync(rel, "utf8");

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
  process.env.SEAT_SECRET = "task-465-hidden-room-seat-secret";
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
  // a bot token so `open` gets past the matrix gate; a hidden room must be
  // refused BEFORE anything is posted (the fake answers any post with OK)
  process.env.MATRIX_BOT_TOKEN = "test-bot-token";
  global.fetch = kv.fetchMock as unknown as typeof fetch;
});

afterEach(() => {
  global.fetch = realFetch;
  delete process.env.KV_REST_API_URL;
  delete process.env.KV_REST_API_TOKEN;
  delete process.env.MATRIX_BOT_TOKEN;
});

async function postAdminLive(body: unknown) {
  const { POST } = await import("@/app/api/admin/live/route");
  return POST(
    new Request("http://test.local/api/admin/live", {
      method: "POST",
      headers: { "Content-Type": "application/json", cookie: operatorCookie },
      body: JSON.stringify(body),
    }),
  );
}

describe("Love's go-live pickers never offer a hidden room", () => {
  it("GET /api/admin/live's rooms feed leaves clair-senses out, keeps the rest", async () => {
    kv.seed(null);
    const { GET } = await import("@/app/api/admin/live/route");
    const d = await (await GET(new Request("http://test.local/api/admin/live", { headers: { cookie: operatorCookie } }))).json();
    const slugs = (d.rooms as { slug: string }[]).map((r) => r.slug);
    expect(slugs).not.toContain("clair-senses");
    expect(slugs).toContain("heart-field");
    expect(slugs).toContain("weekly-reading");
    expect(slugs).toContain("tune-up");
  });

  it("the studio page's goLiveRooms list filters hidden rooms too (source pin)", () => {
    expect(read("src/app/a/studio/page.tsx")).toContain("goLiveRooms={ROOMS.filter((r) => !r.hidden).map(");
  });
});

describe("the admin write route refuses a hidden room", () => {
  it("open in clair-senses answers 400 and writes no live flag", async () => {
    kv.seed(null);
    const res = await postAdminLive({ action: "open", room: "clair-senses" });
    expect(res.status).toBe(400);
    expect(kv.stored).toBeNull();
  });

  it("after-hours in clair-senses answers 400 and writes nothing", async () => {
    kv.seed(JSON.stringify({ live: true, room: "heart-field", startedAt: 1750000000 }));
    const before = kv.stored;
    const res = await postAdminLive({ action: "after-hours", room: "clair-senses", minutes: 45 });
    expect(res.status).toBe(400);
    expect(kv.stored).toBe(before);
  });

  it("after-hours in a room that is not hidden still works", async () => {
    kv.seed(JSON.stringify({ live: true, room: "heart-field", startedAt: 1750000000 }));
    const res = await postAdminLive({ action: "after-hours", room: "weekly-reading", minutes: 45 });
    expect(res.status).toBe(200);
    expect(JSON.parse(kv.stored!).afterHours.room).toBe("weekly-reading");
  });
});

describe("GET /api/live never names a hidden room in public", () => {
  it("a flag left live in clair-senses reads dark: no room, no title, so no strip", async () => {
    kv.seed(JSON.stringify({ live: true, room: "clair-senses", startedAt: 1750000000 }));
    const { GET } = await import("@/app/api/live/route");
    const json = await (await GET()).json();
    expect(json.live).toBe(false);
    expect(json.room).toBeNull();
    expect(json.roomTitle).toBeNull();
    const { stripModel } = await import("@/components/LiveStrip");
    expect(stripModel({ live: json.live, room: json.room, roomTitle: json.roomTitle })).toBeNull();
  });

  it("an after-hours pointing at clair-senses reads null, while the live room still shows", async () => {
    kv.seed(JSON.stringify({
      live: true, room: "heart-field", startedAt: 1750000000,
      afterHours: { room: "clair-senses", at: 1750003600 },
    }));
    const { GET } = await import("@/app/api/live/route");
    const json = await (await GET()).json();
    expect(json.live).toBe(true);
    expect(json.room).toBe("heart-field");
    expect(json.afterHours).toBeNull();
  });

  it("a room that is not hidden still reads live with its title", async () => {
    kv.seed(JSON.stringify({ live: true, room: "weekly-reading", startedAt: 1750000000 }));
    const { GET } = await import("@/app/api/live/route");
    const json = await (await GET()).json();
    expect(json.live).toBe(true);
    expect(json.roomTitle).toBe("The Playground");
  });
});

describe("AfterHoursDoor draws nothing for a hidden room", () => {
  it("even a tier-A member, whose tier would open it, gets no door to a page that 404s", async () => {
    const AfterHoursDoor = (await import("@/components/rooms/AfterHoursDoor")).default;
    const at = Math.floor(Date.now() / 1000) + 45 * 60;
    const html = renderToStaticMarkup(
      h(AfterHoursDoor, {
        afterHours: { room: "clair-senses", roomTitle: "Clair Senses", package: "Weekly Intuitive", packageSlug: "weekly-intuitive", at },
        signedIn: true,
        viewerTier: "A",
      }),
    );
    expect(html).toBe("");
  });
});

describe("Love's Stage 2 card names the floor from STAGE2_FLOOR_NAME", () => {
  it("the card takes floorName and carries no Weekly Intuitive literal", () => {
    const src = read("src/app/a/site/reading/Stage2Card.tsx");
    expect(src).toContain("{floorName} and above can come in.");
    expect(src).not.toContain("Weekly Intuitive and above");
  });

  it("the server page threads STAGE2_FLOOR_NAME through SiteReadingRoom to the card", () => {
    const page = read("src/app/a/site/reading/page.tsx");
    expect(page).toContain('import { STAGE2_FLOOR_NAME } from "@/lib/stage2-access";');
    expect(page).toContain("<SiteReadingRoom floorName={STAGE2_FLOOR_NAME} />");
    expect(read("src/app/a/site/reading/SiteReadingRoom.tsx")).toContain("<Stage2Card floorName={floorName} />");
  });

  it("the two client files never import stage2-access (it reads the store, server only)", () => {
    expect(read("src/app/a/site/reading/Stage2Card.tsx")).not.toContain("stage2-access");
    expect(read("src/app/a/site/reading/SiteReadingRoom.tsx")).not.toContain("stage2-access");
  });

  it("STAGE2_FLOOR_NAME itself reads Weekly Intuitive (TASK-471, block 968,624 — the floor moved back for this room)", async () => {
    const { STAGE2_FLOOR_NAME } = await import("@/lib/stage2-access");
    expect(STAGE2_FLOOR_NAME).toBe("Weekly Intuitive");
  });
});
