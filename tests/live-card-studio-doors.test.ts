import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { generateSecretKey, getPublicKey, nip19 } from "nostr-tools";
import { isolateCwd } from "./helpers/isolate-cwd";

/**
 * TASK-235 (0018.06.23 a₿) — the opened "Read live on the site" card grows
 * a Next row once the meeting rail is the studio (`vdo`, T-245's flip):
 * Love's own studio camera (`studioVdo.push`, the seat the stage's
 * `?view=host` watches), and the two scene doors StudioRoom otherwise
 * carries alone — Waiting scene and On camera. Both write through the
 * SAME door, a new `action: "scene"` block on `POST /api/admin/live`
 * that patches the studio doc (never the live flag, never the matrix bot
 * — its own store, its own gate check only). Pins:
 *
 *  · the route: sets activeScene + startsAt ≈ now+20 min for the waiting
 *    scene, activeScene only (startsAt untouched) for on camera, rejects
 *    a bad scene id (400), refuses without the operator cookie (401),
 *    and GET carries the scene state back;
 *  · source pins on go-live-room.tsx: the doors sit inside the
 *    `meeting.rail === "vdo"` branch, `studioVdo.push` is the href, no
 *    `btn-gold` anywhere in the file (gold is money-and-join only).
 *
 * The studio doc rides the dev-file driver (no KV env here) — isolateCwd
 * the same way tests/studio-overlay.test.ts does, so this suite never
 * touches the real data/studio.json.
 */

const ROOT = process.cwd();
const read = (rel: string) => readFileSync(path.join(ROOT, rel), "utf8");

const iso = isolateCwd("task-235-live-scene-");
afterAll(() => iso.cleanup());

let operatorCookie: string;

beforeAll(async () => {
  process.env.SEAT_SECRET = "task-235-test-seat-secret";
  delete process.env.KV_REST_API_URL;
  delete process.env.KV_REST_API_TOKEN;
  const pk = getPublicKey(generateSecretKey());
  process.env.OPERATOR_NPUBS = nip19.npubEncode(pk);
  const { makeOperatorToken } = await import("@/lib/operator-auth");
  operatorCookie = `fe-operator=${makeOperatorToken(pk)}`;
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

async function getAdminLive(cookie?: string) {
  const { GET } = await import("@/app/api/admin/live/route");
  return GET(
    new Request("http://test.local/api/admin/live", { headers: cookie ? { cookie } : {} }),
  );
}

describe("POST /api/admin/live — action: scene (TASK-235)", () => {
  it("401 without the operator cookie", async () => {
    const r = await postAdminLive({ action: "scene", scene: "solo" });
    expect(r.status).toBe(401);
    const d = await r.json();
    expect(d.ok).toBe(false);
  });

  it("400 on an unknown scene, operator cookie present", async () => {
    const r = await postAdminLive({ action: "scene", scene: "not-a-real-scene" }, operatorCookie);
    expect(r.status).toBe(400);
    const d = await r.json();
    expect(d.ok).toBe(false);
  });

  it("the waiting scene: activeScene = starting, startsAt ≈ now + 20 min", async () => {
    const before = Date.now();
    const r = await postAdminLive({ action: "scene", scene: "starting", startsInMinutes: 20 }, operatorCookie);
    expect(r.status).toBe(200);
    const d = await r.json();
    expect(d.ok).toBe(true);
    expect(d.scene.active).toBe("starting");
    const gotMs = Date.parse(d.scene.startsAt);
    expect(gotMs).toBeGreaterThanOrEqual(before + 19 * 60_000);
    expect(gotMs).toBeLessThanOrEqual(before + 21 * 60_000);
  });

  it("on camera: activeScene = solo, startsAt carries forward untouched", async () => {
    const r = await postAdminLive({ action: "scene", scene: "solo" }, operatorCookie);
    expect(r.status).toBe(200);
    const d = await r.json();
    expect(d.ok).toBe(true);
    expect(d.scene.active).toBe("solo");
    // the prior test's startsAt survives — this action never touches it
    expect(d.scene.startsAt).not.toBe("");
  });

  it("GET carries the scene state back — the same doc the POSTs just wrote", async () => {
    const r = await getAdminLive(operatorCookie);
    expect(r.status).toBe(200);
    const d = await r.json();
    expect(d.ok).toBe(true);
    expect(d.scene).toEqual({ active: "solo", startsAt: expect.any(String) });
    expect(d.scene.startsAt).not.toBe("");
  });

  it("GET 401s without the operator cookie, same as every /a route", async () => {
    const r = await getAdminLive();
    expect(r.status).toBe(401);
  });
});

describe("source pins — go-live-room.tsx (TASK-235)", () => {
  const src = read("src/app/a/live/go-live-room.tsx");

  it("the studio doors sit inside the meeting.rail === \"vdo\" branch", () => {
    expect(src).toContain('meeting.rail === "vdo"');
  });

  it("the studio camera door's href is studioVdo.push — the seat the stage's ?view=host watches", () => {
    expect(src).toContain("href={studioVdo.push}");
    expect(src).toContain("opens your camera in a new tab; the stage watches this seat");
  });

  it("Waiting scene and On camera write through action: \"scene\"", () => {
    expect(src).toContain('actScene("starting", 20)');
    expect(src).toContain('actScene("solo")');
    expect(src).toContain('action: "scene"');
  });

  it("never btn-gold — gold is money-and-join only, these are house buttons", () => {
    expect(src).not.toContain("btn-gold");
  });
});
