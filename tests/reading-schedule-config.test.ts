import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { promises as fs } from "fs";
import path from "path";
import { generateSecretKey, getPublicKey, nip19 } from "nostr-tools";
import { isolateCwd } from "./helpers/isolate-cwd";
import type { ReadingSchedule } from "@/lib/reading-schedule";

/**
 * TASK-381 — the reading schedule riding SiteConfig: RULED D2 (whole-object
 * replace) and D3 (the route refuses a malformed patch in words). Pins:
 *  · readingPatchError + the real /api/admin/site PUT — a malformed
 *    `reading` patch is refused IN WORDS (400), a clean one saves, a
 *    partial one is refused rather than partially merged
 *  · absent `reading` reads back as `undefined` — this file stores no
 *    default of its own (reading-schedule.ts's DEFAULT_READING_SCHEDULE is
 *    a READER's fallback, applied one level up)
 *  · a saved schedule (even `on: false`, even a non-default zone) survives
 *    a save → read, and other config groups never disturb it or get
 *    disturbed by it
 *  · the sanitize backstop: a hand-edited garbage doc reads back as
 *    `undefined`, not a crash and not a refusal (a read has no one to tell)
 *
 * Storage setup copies tests/site-config.test.ts's own isolateCwd idiom
 * (:1-13 there) and tests/about-playlist.test.ts's real-route idiom (the
 * minted operator cookie, :41-67 there) rather than re-deriving either.
 */

const { cleanup: cleanupCwd } = isolateCwd("oc-reading-config-");

const FILE = path.join(process.cwd(), "data", "site-config.json");

/** A non-default schedule on purpose — Friday evening, Eastern, 90 minutes
 *  — so a fixture landing back on America/Denver by accident would be
 *  caught, not mistaken for the reader-side default. */
const FIXTURE: ReadingSchedule = { on: true, weekday: 5, time: "18:30", tz: "America/New_York", durationMin: 90 };

let getSiteConfig: (typeof import("@/lib/site-config"))["getSiteConfig"];
let saveSiteConfig: (typeof import("@/lib/site-config"))["saveSiteConfig"];
let readingPatchError: (typeof import("@/app/api/admin/site/route"))["readingPatchError"];
let sitePUT: (typeof import("@/app/api/admin/site/route"))["PUT"];
let cookie: string;

beforeAll(async () => {
  process.env.NEXT_PUBLIC_SPACE_NAME = "onecocreation";
  delete process.env.KV_REST_API_URL;
  delete process.env.KV_REST_API_TOKEN;
  delete process.env.BLOB_READ_WRITE_TOKEN;
  delete process.env.REGISTRY_DRIVER;
  process.env.SEAT_SECRET = "reading-config-test-secret";
  const pk = getPublicKey(generateSecretKey());
  process.env.OPERATOR_NPUBS = nip19.npubEncode(pk);
  const { makeOperatorToken } = await import("@/lib/operator-auth");
  cookie = `fe-operator=${makeOperatorToken(pk)}`;
  await fs.rm(FILE, { force: true });
  ({ getSiteConfig, saveSiteConfig } = await import("@/lib/site-config"));
  ({ PUT: sitePUT, readingPatchError } = await import("@/app/api/admin/site/route"));
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

describe("readingPatchError — refuses a malformed reading schedule in words (D3)", () => {
  it("a clean schedule passes, on:true or on:false alike", () => {
    expect(readingPatchError(FIXTURE)).toBeNull();
    expect(readingPatchError({ ...FIXTURE, on: false })).toBeNull();
  });

  it("the refusals name the problem", () => {
    expect(readingPatchError(null)).toMatch(/must be an object/);
    expect(readingPatchError({ ...FIXTURE, on: "yes" })).toMatch(/on\/off must be true or false/);
    expect(readingPatchError({ ...FIXTURE, weekday: 9 })).toMatch(/0 \(Sunday\) to 6 \(Saturday\)/);
    expect(readingPatchError({ ...FIXTURE, time: "9:5" })).toMatch(/HH:MM in 24-hour time/);
    expect(readingPatchError({ ...FIXTURE, tz: "Not/AZone" })).toMatch(/real time zone name/);
    expect(readingPatchError({ ...FIXTURE, durationMin: 800 })).toMatch(/1 to 720/);
  });

  it("a partial object (missing fields) is refused, not silently completed", () => {
    expect(readingPatchError({ on: true })).toMatch(/0 \(Sunday\) to 6 \(Saturday\)/);
    expect(readingPatchError({})).toMatch(/on\/off must be true or false/);
  });
});

describe("the route itself: 400 with words on garbage, 200 + saved on a clean schedule", () => {
  it("a malformed patch is refused before anything is persisted", async () => {
    const bad = await put({ reading: { ...FIXTURE, weekday: 12 } });
    expect(bad.status).toBe(400);
    const badBody = await bad.json();
    expect(badBody.ok).toBe(false);
    expect(badBody.reason).toMatch(/0 \(Sunday\) to 6 \(Saturday\)/);
  });

  it("a clean patch saves and reads back exactly", async () => {
    const good = await put({ reading: FIXTURE });
    expect(good.status).toBe(200);
    const goodBody = await good.json();
    expect(goodBody.ok).toBe(true);
    expect(goodBody.config.reading).toEqual(FIXTURE);
  });

  it("a partial reading patch is refused outright, never partially merged into the stored one", async () => {
    // FIXTURE is already saved (previous test) — a bad partial patch must
    // leave it untouched, not merge {on:true} field-by-field over it.
    const bad = await put({ reading: { on: true } });
    expect(bad.status).toBe(400);
    const config = await getSiteConfig();
    expect(config.reading).toEqual(FIXTURE); // unchanged
  });

  it("a features-, payments-, meeting-, nav- or about-only save is never blocked by the reading check", async () => {
    const res = await put({ payments: { stripe: true } });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
  });

  it("the route still refuses a stranger (no operator cookie)", async () => {
    const res = await sitePUT(new Request("http://localhost/api/admin/site", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reading: FIXTURE }),
    }));
    expect(res.status).toBe(401);
  });
});

describe("config first — absent reading reads back as undefined (no default lives here)", () => {
  it("no saved reading → undefined, not a fabricated default", async () => {
    await fs.rm(FILE, { force: true });
    const config = await getSiteConfig();
    expect(config.reading).toBeUndefined();
  });

  it("a saved schedule wins; a later reading-less patch never wipes it", async () => {
    await saveSiteConfig({ reading: FIXTURE });
    let config = await getSiteConfig();
    expect(config.reading).toEqual(FIXTURE);

    await saveSiteConfig({ payments: { square: false } }); // any other group
    config = await getSiteConfig();
    expect(config.reading).toEqual(FIXTURE); // Love's schedule untouched
    expect(config.payments.square).toBe(false);
  });

  it("a features-only save keeps a stored reading; a reading save keeps features, payments, meeting, nav and about", async () => {
    await fs.rm(FILE, { force: true });
    await getSiteConfig(); // re-warm to defaults
    await saveSiteConfig({ reading: FIXTURE, features: { store: true } });
    await saveSiteConfig({ nav: { items: [{ id: "about", label: "About", href: "/about" }] } });
    await saveSiteConfig({ about: { videos: [] } });

    // a features-only save (no `reading` key at all) must not disturb it
    await saveSiteConfig({ features: { classes: true } });
    let config = await getSiteConfig();
    expect(config.reading).toEqual(FIXTURE);
    expect(config.features.store).toBe(true);
    expect(config.features.classes).toBe(true);

    // and a reading save, in turn, must not disturb features/payments/meeting/nav/about
    const OTHER: ReadingSchedule = { on: false, weekday: 1, time: "09:00", tz: "America/Los_Angeles", durationMin: 45 };
    await saveSiteConfig({ reading: OTHER });
    config = await getSiteConfig();
    expect(config.reading).toEqual(OTHER);
    expect(config.features.store).toBe(true);
    expect(config.features.classes).toBe(true);
    expect(config.nav?.items?.[0]?.href).toBe("/about");
    expect(config.about?.videos).toEqual([]);
  });

  it("on: false and a non-default zone both survive a save → read", async () => {
    const schedule: ReadingSchedule = { on: false, weekday: 6, time: "07:07", tz: "Pacific/Honolulu", durationMin: 15 };
    await saveSiteConfig({ reading: schedule });
    const config = await getSiteConfig();
    expect(config.reading).toEqual(schedule);
    expect(config.reading?.on).toBe(false);
    expect(config.reading?.tz).toBe("Pacific/Honolulu");
  });

  it("sanitize backstop: a hand-edited garbage doc reads back as undefined, not a crash", async () => {
    await fs.mkdir(path.dirname(FILE), { recursive: true });
    await fs.writeFile(
      FILE,
      JSON.stringify({ reading: { on: true, weekday: "Wednesday", time: "1:11pm", tz: 42, durationMin: -5 } }),
      "utf8",
    );
    const config = await getSiteConfig();
    expect(config.reading).toBeUndefined();
    await fs.rm(FILE, { force: true });
    await getSiteConfig(); // re-warm to defaults for whatever runs after
  });
});
