import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { promises as fs } from "fs";
import path from "path";
import { generateSecretKey, getPublicKey, nip19 } from "nostr-tools";
import { isolateCwd } from "./helpers/isolate-cwd";
import { parseYoutubeInput, YOUTUBE_ID_RE } from "@/lib/youtube-id";
import { ABOUT_VIDEOS, type AboutVideo } from "@/lib/about-content";

/**
 * TASK-161 (0018.06.17 a₿ · block 966,080) — the About playlist in Love's
 * hands. Pins:
 *  · parseYoutubeInput — the six accepted shapes (watch, youtu.be, shorts,
 *    embed, live, bare id) all land on the same 11-char id, Shorts flagged
 *    portrait; anything else refused with null
 *  · aboutPatchError + the real /api/admin/site PUT — a malformed `about`
 *    patch is refused IN WORDS (400), a clean one saves
 *  · config-first-then-seed — absent `about` = the ABOUT_VIDEOS seed stands;
 *    a saved list (even EMPTY) wins; a later about-less patch never wipes it
 *
 * The fs site-config driver rides this file's own throwaway cwd (the
 * isolateCwd idiom from site-config.test.ts); the operator cookie is minted
 * with the real makeOperatorToken (the booking-api idiom).
 */

const { cleanup: cleanupCwd } = isolateCwd("oc-about-playlist-");

const FILE = path.join(process.cwd(), "data", "site-config.json");

const FIXTURE: AboutVideo[] = [
  { id: "dQw4w9WgXcQ", title: "A fixture song", ratio: "16/9" },
  { id: "2LrWVQDnLd0", title: "What Breath in discomfort?", ratio: "9/16" },
  { id: "Gt24u_BAybA", title: "CANNABIS | A Message from The Lemurians", ratio: "16/9" },
];

let getSiteConfig: (typeof import("@/lib/site-config"))["getSiteConfig"];
let saveSiteConfig: (typeof import("@/lib/site-config"))["saveSiteConfig"];
let aboutPatchError: (typeof import("@/lib/site-config"))["aboutPatchError"];
let sitePUT: (typeof import("@/app/api/admin/site/route"))["PUT"];
let cookie: string;

beforeAll(async () => {
  process.env.NEXT_PUBLIC_SPACE_NAME = "onecocreation";
  delete process.env.KV_REST_API_URL;
  delete process.env.KV_REST_API_TOKEN;
  delete process.env.BLOB_READ_WRITE_TOKEN;
  delete process.env.REGISTRY_DRIVER;
  process.env.SEAT_SECRET = "about-playlist-test-secret";
  const pk = getPublicKey(generateSecretKey());
  process.env.OPERATOR_NPUBS = nip19.npubEncode(pk);
  const { makeOperatorToken } = await import("@/lib/operator-auth");
  cookie = `fe-operator=${makeOperatorToken(pk)}`;
  await fs.rm(FILE, { force: true });
  ({ getSiteConfig, saveSiteConfig, aboutPatchError } = await import("@/lib/site-config"));
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

describe("TASK-161 — YouTube input → the 11-char id (the six shapes)", () => {
  const ID = "2LrWVQDnLd0";
  const shapes: [string, string, boolean][] = [
    // [what Love pastes, the id, portrait-by-default?]
    [`https://www.youtube.com/watch?v=${ID}`, ID, false],
    [`https://youtu.be/${ID}?si=abc123`, ID, false],
    [`https://www.youtube.com/shorts/${ID}`, ID, true],
    [`https://www.youtube.com/embed/${ID}`, ID, false],
    [`https://m.youtube.com/watch?v=${ID}&t=42s`, ID, false],
    [ID, ID, false],
  ];
  it.each(shapes)("shape %#: %s → the id", (raw, id, likelyShort) => {
    expect(parseYoutubeInput(raw)).toEqual({ id, likelyShort });
  });

  it("a youtube.com/live/<id> link lands too", () => {
    expect(parseYoutubeInput(`https://www.youtube.com/live/${ID}`)).toEqual({ id: ID, likelyShort: false });
  });

  it("refusals: another host, and a playlist link (not a video)", () => {
    expect(parseYoutubeInput("https://vimeo.com/123456789")).toBeNull();
    expect(parseYoutubeInput("https://www.youtube.com/playlist?list=PLrAXtmErZgOeiKm4sgNOknGvNjby9efdf")).toBeNull();
  });

  it("refusals: bare words, and a watch link whose v= isn't an id", () => {
    expect(parseYoutubeInput("love's latest video")).toBeNull();
    expect(parseYoutubeInput("https://www.youtube.com/watch?v=tooshort")).toBeNull();
  });

  it("the id kernel is exactly 11 of [A-Za-z0-9_-]", () => {
    expect(YOUTUBE_ID_RE.test("2LrWVQDnLd0")).toBe(true);
    expect(YOUTUBE_ID_RE.test("2LrWVQDnLd")).toBe(false); // 10
    expect(YOUTUBE_ID_RE.test("2LrWVQDnLd00")).toBe(false); // 12
    expect(YOUTUBE_ID_RE.test("2LrWVQDnLd!")).toBe(false); // bad char
  });
});

describe("TASK-161 — the seed keeps the list shape (one truth, both sources)", () => {
  it("every ABOUT_VIDEOS entry already satisfies the saved-list shape", () => {
    for (const v of ABOUT_VIDEOS) {
      expect(v.id).toMatch(YOUTUBE_ID_RE);
      expect(v.title.trim().length).toBeGreaterThan(0);
      expect(["16/9", "9/16"]).toContain(v.ratio);
    }
  });
});

describe("TASK-161 — patch validation refuses a malformed about IN WORDS", () => {
  it("a clean patch passes", () => {
    expect(aboutPatchError({ videos: FIXTURE })).toBeNull();
    expect(aboutPatchError({ videos: [] })).toBeNull(); // empty is legitimate
  });
  it("the refusals name the problem", () => {
    expect(aboutPatchError(null)).toMatch(/videos list/);
    expect(aboutPatchError({ videos: "no" })).toMatch(/must be a list/);
    expect(aboutPatchError({ videos: [{ id: "short", title: "x", ratio: "16/9" }] })).toMatch(/11-character YouTube id/);
    expect(aboutPatchError({ videos: [{ id: "2LrWVQDnLd0", title: "  ", ratio: "16/9" }] })).toMatch(/title is required/);
    expect(aboutPatchError({ videos: [{ id: "2LrWVQDnLd0", title: "x", ratio: "4/3" }] })).toMatch(/landscape \(16\/9\) or portrait \(9\/16\)/);
  });
  it("the route itself: 400 with words on garbage, 200 + saved on a clean list", async () => {
    const bad = await put({ about: { videos: [{ id: "nope", title: "x", ratio: "16/9" }] } });
    expect(bad.status).toBe(400);
    const badBody = await bad.json();
    expect(badBody.ok).toBe(false);
    expect(badBody.reason).toMatch(/11-character YouTube id/);

    const good = await put({ about: { videos: FIXTURE } });
    expect(good.status).toBe(200);
    const goodBody = await good.json();
    expect(goodBody.ok).toBe(true);
    expect(goodBody.config.about.videos).toEqual(FIXTURE);
  });
  it("the route still refuses a stranger (no operator cookie)", async () => {
    const res = await sitePUT(new Request("http://localhost/api/admin/site", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ about: { videos: FIXTURE } }),
    }));
    expect(res.status).toBe(401);
  });
});

describe("TASK-161 — config first, the seed behind (derive-or-dash)", () => {
  it("no saved about → absent, and the page's own pick lands on the seed", async () => {
    await fs.rm(FILE, { force: true });
    const config = await getSiteConfig();
    expect(config.about).toBeUndefined();
    // the exact expression src/app/about/page.tsx renders from
    expect(config.about?.videos ?? ABOUT_VIDEOS).toBe(ABOUT_VIDEOS);
  });

  it("a saved list wins; a later about-less patch never wipes it", async () => {
    await saveSiteConfig({ about: { videos: FIXTURE } });
    let config = await getSiteConfig();
    expect(config.about?.videos).toEqual(FIXTURE);
    expect(config.about?.videos ?? ABOUT_VIDEOS).toEqual(FIXTURE);

    await saveSiteConfig({ payments: { stripe: true } }); // any other save
    config = await getSiteConfig();
    expect(config.about?.videos).toEqual(FIXTURE); // Love's list untouched
    expect(config.payments.stripe).toBe(true);
  });

  it("a saved EMPTY list is honoured (the honest no-videos line), not the seed", async () => {
    await saveSiteConfig({ about: { videos: [] } });
    const config = await getSiteConfig();
    expect(config.about?.videos).toEqual([]);
    expect(config.about?.videos ?? ABOUT_VIDEOS).toEqual([]);
  });

  it("sanitize backstop: a hand-edited doc keeps the good entries, drops the garbage", async () => {
    await fs.mkdir(path.dirname(FILE), { recursive: true });
    await fs.writeFile(
      FILE,
      JSON.stringify({
        about: {
          videos: [
            { id: "dQw4w9WgXcQ", title: "  A real one  ", ratio: "16/9" },
            { id: "not-an-id", title: "bad id", ratio: "16/9" },
            { id: "2LrWVQDnLd0", title: "bad ratio", ratio: "4/3" },
            { id: "Gt24u_BAybA", ratio: "9/16" }, // no title
          ],
          zzz: true,
        },
      }),
      "utf8",
    );
    const config = await getSiteConfig();
    expect(config.about?.videos).toEqual([{ id: "dQw4w9WgXcQ", title: "A real one", ratio: "16/9" }]);
    expect(config.about && "zzz" in config.about).toBe(false);
    await fs.rm(FILE, { force: true });
    await getSiteConfig(); // re-warm to defaults
  });
});
