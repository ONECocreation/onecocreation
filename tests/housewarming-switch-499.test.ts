import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { promises as fs } from "fs";
import path from "path";
import { generateSecretKey, getPublicKey, nip19 } from "nostr-tools";
import { isolateCwd } from "./helpers/isolate-cwd";

/**
 * TASK-499 (block 969,306+, K126 AMENDMENT 1 item 9: "Move the countdown
 * off the housewarming") — the week without a Housewarming. One new
 * boolean on the site-config doc (`housewarming`, ABSENT MEANS ON), one
 * new refusal block on the operator-gated PUT, one new switch card on
 * /a/site/reading; when the switch is OFF the public /reading hides
 * Part 1 everywhere a visitor can meet it and the top countdown targets
 * the reading's own time (`schedule.time`), never 12:12.
 *
 * This suite pins, in order:
 *  · sanitize/patch round-trips through the REAL /api/admin/site route
 *    (the about-playlist.test.ts isolateCwd + real-route idiom):
 *    absent stays undefined; false and true round-trip; a non-boolean
 *    drops to undefined; PUT { housewarming: "yes" } is refused 400 IN
 *    WORDS; PUT { housewarming: false } saves and reads back; a PUT with
 *    no operator cookie is 401; an unrelated (features-only) PUT leaves a
 *    saved false untouched.
 *  · /reading page source pins: the switch read, the off-branch
 *    countdown target, the part-1 doors omission, the ?part=1
 *    neutralization.
 *  · ReadingDayBody with housewarmingStartsAtMs: null renders three
 *    rows, the first The Reading, no Housewarming word.
 *  · the deck with part1On={false} and selection 1 renders Part 2's
 *    screen, never Part 1's "not live yet" words.
 *  · readingDayPartsMarksLookup with the flag false emits three pills
 *    (Reading, Book Talk, Q&A with Love, in order, each with its href);
 *    with it true, today's four.
 *  · normalizeHousewarmingResponse: absent / malformed / failed-fetch
 *    all read ON (true) — the calendar failing to learn the switch must
 *    never hide a part that exists.
 */

const { cleanup: cleanupCwd } = isolateCwd("oc-housewarming-switch-");

const FILE = path.join(process.cwd(), "data", "site-config.json");

let getSiteConfig: (typeof import("@/lib/site-config"))["getSiteConfig"];
let saveSiteConfig: (typeof import("@/lib/site-config"))["saveSiteConfig"];
let housewarmingPatchError: (typeof import("@/app/api/admin/site/route"))["housewarmingPatchError"];
let sitePUT: (typeof import("@/app/api/admin/site/route"))["PUT"];
let cookie: string;

beforeAll(async () => {
  process.env.NEXT_PUBLIC_SPACE_NAME = "onecocreation";
  delete process.env.KV_REST_API_URL;
  delete process.env.KV_REST_API_TOKEN;
  delete process.env.BLOB_READ_WRITE_TOKEN;
  delete process.env.REGISTRY_DRIVER;
  process.env.SEAT_SECRET = "housewarming-switch-test-secret";
  const pk = getPublicKey(generateSecretKey());
  process.env.OPERATOR_NPUBS = nip19.npubEncode(pk);
  const { makeOperatorToken } = await import("@/lib/operator-auth");
  cookie = `fe-operator=${makeOperatorToken(pk)}`;
  await fs.rm(FILE, { force: true });
  ({ getSiteConfig, saveSiteConfig } = await import("@/lib/site-config"));
  ({ PUT: sitePUT, housewarmingPatchError } = await import("@/app/api/admin/site/route"));
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

describe("TASK-499 — the config field: absent means ON, a real boolean round-trips, garbage drops", () => {
  it("a fresh doc carries no housewarming key at all (every stored doc in production is already valid)", async () => {
    await fs.rm(FILE, { force: true });
    const config = await getSiteConfig();
    expect(config.housewarming).toBeUndefined();
    // the exact read every consumer makes: absent means ON
    expect(config.housewarming !== false).toBe(true);
  });

  it("false and true both round-trip through saveSiteConfig", async () => {
    await saveSiteConfig({ housewarming: false });
    let config = await getSiteConfig();
    expect(config.housewarming).toBe(false);
    expect(config.housewarming !== false).toBe(false);

    await saveSiteConfig({ housewarming: true });
    config = await getSiteConfig();
    expect(config.housewarming).toBe(true);
    expect(config.housewarming !== false).toBe(true);
  });

  it("sanitize backstop: a hand-edited doc's non-boolean drops to undefined (reads ON, never a crash)", async () => {
    await fs.mkdir(path.dirname(FILE), { recursive: true });
    await fs.writeFile(FILE, JSON.stringify({ housewarming: "yes" }), "utf8");
    const config = await getSiteConfig();
    expect(config.housewarming).toBeUndefined();
    expect(config.housewarming !== false).toBe(true);
    await fs.rm(FILE, { force: true });
    await getSiteConfig(); // re-warm to defaults
  });

  it("an unrelated (features-only) save never erases a saved false", async () => {
    await saveSiteConfig({ housewarming: false });
    await saveSiteConfig({ features: { store: true } });
    const config = await getSiteConfig();
    expect(config.housewarming).toBe(false);
  });
});

describe("TASK-499 — the route block: refused IN WORDS before persist, operator-gated", () => {
  it("housewarmingPatchError is pure: booleans pass, everything else is refused in words", () => {
    expect(housewarmingPatchError(true)).toBeNull();
    expect(housewarmingPatchError(false)).toBeNull();
    expect(housewarmingPatchError("yes")).toMatch(/the housewarming switch must be true or false/);
    expect(housewarmingPatchError(1)).toMatch(/the housewarming switch must be true or false/);
    expect(housewarmingPatchError(null)).toMatch(/the housewarming switch must be true or false/);
    expect(housewarmingPatchError(undefined)).toMatch(/the housewarming switch must be true or false/);
  });

  it("PUT { housewarming: \"yes\" } is refused 400 IN WORDS, and nothing is persisted", async () => {
    await fs.rm(FILE, { force: true });
    await getSiteConfig();
    const res = await put({ housewarming: "yes" });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.reason).toMatch(/the housewarming switch must be true or false/);
    const config = await getSiteConfig();
    expect(config.housewarming).toBeUndefined();
  });

  it("PUT { housewarming: false } saves and reads back; PUT { housewarming: true } flips it back", async () => {
    const off = await put({ housewarming: false });
    expect(off.status).toBe(200);
    const offBody = await off.json();
    expect(offBody.ok).toBe(true);
    expect(offBody.config.housewarming).toBe(false);
    expect((await getSiteConfig()).housewarming).toBe(false);

    const on = await put({ housewarming: true });
    expect(on.status).toBe(200);
    expect((await getSiteConfig()).housewarming).toBe(true);
  });

  it("a PUT with no operator cookie is 401 (the switch is never a public write)", async () => {
    const res = await sitePUT(new Request("http://localhost/api/admin/site", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ housewarming: false }),
    }));
    expect(res.status).toBe(401);
  });

  it("an unrelated (features-only) PUT through the route leaves a saved false untouched", async () => {
    await put({ housewarming: false });
    const other = await put({ features: { store: true } });
    expect(other.status).toBe(200);
    expect((await getSiteConfig()).housewarming).toBe(false);
  });
});
