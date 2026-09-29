import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { promises as fs } from "fs";
import path from "path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { generateSecretKey, getPublicKey, nip19 } from "nostr-tools";
import { isolateCwd } from "./helpers/isolate-cwd";
import { parseYoutubeInput } from "@/lib/youtube-id";
import type { AboutVideo } from "@/lib/about-content";

/**
 * TASK-496 (block 969,088+) - the REPLAYS page: Love's links of what has
 * been read, playable on the site ("maybe just the link is there ... an
 * area with all the links of what's been read and they just click on it";
 * named "Replays"; ONE page, podcast style, under Community; the list
 * ships EMPTY - the Admiral pastes the first link himself). Pins:
 *
 *  · the config doc - `replays` is a whole-list AboutVideo[] on the
 *    site-config doc; absent AND a saved empty list BOTH mean the designed
 *    empty state (there is no seed, nothing to fall back to); a malformed
 *    patch is refused 400 IN WORDS before persist; no operator cookie is
 *    401; the sanitize backstop drops garbage rows from a hand-edited doc
 *  · ONE parser - the /a card imports parseYoutubeInput from
 *    @/lib/youtube-id (source pin, no second parser can drift in); the
 *    four shapes that matter here (watch, youtu.be, shorts → portrait
 *    default, embed) land on the id
 *  · the player - youtube-nocookie.com/embed/<id> with
 *    autoplay=1&playsinline=1&rel=0 and NO mute= (a replay the visitor
 *    tapped to hear); the iframe is mounted only while its row is open
 *  · the empty state renders - absent config and a saved empty list both
 *    render the quiet words and the /reading door, never an iframe
 *  · /reading carries the Replays door; the Community menu carries the
 *    Replays row (code default + PAGE_CATALOG + KNOWN_NAV_HREFS, the
 *    two-hand-sync seam NavMenu.tsx:47-53 names)
 *
 * The fs site-config driver rides this file's own throwaway cwd (the
 * isolateCwd idiom from about-playlist.test.ts, whose sibling this suite
 * is); the operator cookie is minted with the real makeOperatorToken.
 */

const { cleanup: cleanupCwd } = isolateCwd("oc-replays-");

const FILE = path.join(process.cwd(), "data", "site-config.json");
/* isolateCwd chdir'd this process into the throwaway dir, so source reads
   anchor at this file's own location (tests/ under the real repo root),
   never at process.cwd(). */
const TESTS_DIR = path.dirname(decodeURIComponent(new URL(import.meta.url).pathname));
const readSrc = (rel: string) => fs.readFile(path.join(TESTS_DIR, "..", rel), "utf8");

const FIXTURE: AboutVideo[] = [
  { id: "dQw4w9WgXcQ", title: "The first reading, kept", ratio: "16/9" },
  { id: "2LrWVQDnLd0", title: "A short from the porch", ratio: "9/16" },
];

let getSiteConfig: (typeof import("@/lib/site-config"))["getSiteConfig"];
let saveSiteConfig: (typeof import("@/lib/site-config"))["saveSiteConfig"];
let replaysPatchError: (typeof import("@/lib/site-config"))["replaysPatchError"];
let sitePUT: (typeof import("@/app/api/admin/site/route"))["PUT"];
let cookie: string;

beforeAll(async () => {
  process.env.NEXT_PUBLIC_SPACE_NAME = "onecocreation";
  delete process.env.KV_REST_API_URL;
  delete process.env.KV_REST_API_TOKEN;
  delete process.env.BLOB_READ_WRITE_TOKEN;
  delete process.env.REGISTRY_DRIVER;
  process.env.SEAT_SECRET = "replays-test-secret";
  const pk = getPublicKey(generateSecretKey());
  process.env.OPERATOR_NPUBS = nip19.npubEncode(pk);
  const { makeOperatorToken } = await import("@/lib/operator-auth");
  cookie = `fe-operator=${makeOperatorToken(pk)}`;
  await fs.rm(FILE, { force: true });
  ({ getSiteConfig, saveSiteConfig, replaysPatchError } = await import("@/lib/site-config"));
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

describe("TASK-496 - the replays doc: whole-list, absent and empty both mean the empty state", () => {
  it("no saved replays → absent, and the page's own pick lands on the empty list (no seed behind it)", async () => {
    await fs.rm(FILE, { force: true });
    const config = await getSiteConfig();
    expect(config.replays).toBeUndefined();
    // the exact expression src/app/replays/page.tsx renders from
    expect(config.replays ?? []).toEqual([]);
  });

  it("a saved list wins, round-trips through the real PUT route, and a later replays-less patch never wipes it", async () => {
    const res = await put({ replays: FIXTURE });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.config.replays).toEqual(FIXTURE);

    await saveSiteConfig({ payments: { stripe: true } }); // any other save
    const config = await getSiteConfig();
    expect(config.replays).toEqual(FIXTURE); // Love's list untouched
  });

  it("a saved EMPTY list survives sanitize (the designed empty state is a real saved state)", async () => {
    const res = await put({ replays: [] });
    expect(res.status).toBe(200);
    const config = await getSiteConfig();
    expect(config.replays).toEqual([]);
  });

  it("sanitize backstop: a hand-edited doc keeps the good entries, drops the garbage", async () => {
    await fs.mkdir(path.dirname(FILE), { recursive: true });
    await fs.writeFile(
      FILE,
      JSON.stringify({
        replays: [
          { id: "dQw4w9WgXcQ", title: "  A real one  ", ratio: "16/9" },
          { id: "not-an-id", title: "bad id", ratio: "16/9" },
          { id: "2LrWVQDnLd0", title: "bad ratio", ratio: "4/3" },
          { id: "Gt24u_BAybA", ratio: "9/16" }, // no title
        ],
      }),
      "utf8",
    );
    const config = await getSiteConfig();
    expect(config.replays).toEqual([{ id: "dQw4w9WgXcQ", title: "A real one", ratio: "16/9" }]);
    await fs.rm(FILE, { force: true });
    await getSiteConfig(); // re-warm to defaults
  });
});

describe("TASK-496 - patch validation refuses a malformed replays patch IN WORDS", () => {
  it("a clean patch passes; an empty list is legitimate", () => {
    expect(replaysPatchError(FIXTURE)).toBeNull();
    expect(replaysPatchError([])).toBeNull();
  });

  it("the refusals name the problem", () => {
    expect(replaysPatchError(null)).toMatch(/must be a list/);
    expect(replaysPatchError("no")).toMatch(/must be a list/);
    expect(replaysPatchError([{ id: "short", title: "x", ratio: "16/9" }])).toMatch(/11-character YouTube id/);
    expect(replaysPatchError([{ id: "2LrWVQDnLd0", title: "  ", ratio: "16/9" }])).toMatch(/title is required/);
    expect(replaysPatchError([{ id: "2LrWVQDnLd0", title: "x", ratio: "4/3" }])).toMatch(/landscape \(16\/9\) or portrait \(9\/16\)/);
  });

  it("the route itself: 400 with words on garbage, and a stranger (no operator cookie) is 401", async () => {
    const bad = await put({ replays: [{ id: "nope", title: "x", ratio: "16/9" }] });
    expect(bad.status).toBe(400);
    const badBody = await bad.json();
    expect(badBody.ok).toBe(false);
    expect(badBody.reason).toMatch(/11-character YouTube id/);

    const stranger = await sitePUT(new Request("http://localhost/api/admin/site", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ replays: FIXTURE }),
    }));
    expect(stranger.status).toBe(401);
  });
});

describe("TASK-496 - ONE parser, reused (no second YouTube parser can drift in)", () => {
  it("the /a card imports parseYoutubeInput from @/lib/youtube-id (source pin)", async () => {
    const card = await readSrc("src/app/a/site/replays/ReplaysCard.tsx");
    expect(card).toMatch(/import\s*\{\s*parseYoutubeInput\s*\}\s*from\s*"@\/lib\/youtube-id"/);
    // and the public page never re-parses - it reads saved ids only
    const player = await readSrc("src/components/replays/ReplaysList.tsx");
    expect(player).not.toContain("youtube.com/watch");
    expect(player).not.toContain("youtu.be/");
  });

  it("the four shapes that matter here land on the id; a Shorts paste flags portrait", () => {
    const ID = "2LrWVQDnLd0";
    expect(parseYoutubeInput(`https://www.youtube.com/watch?v=${ID}`)).toEqual({ id: ID, likelyShort: false });
    expect(parseYoutubeInput(`https://youtu.be/${ID}`)).toEqual({ id: ID, likelyShort: false });
    expect(parseYoutubeInput(`https://www.youtube.com/shorts/${ID}`)).toEqual({ id: ID, likelyShort: true });
    expect(parseYoutubeInput(`https://www.youtube.com/embed/${ID}`)).toEqual({ id: ID, likelyShort: false });
  });
});

describe("TASK-496 - the player: youtube-nocookie, tapped-to-hear (autoplay, NO mute), mounted only while open", () => {
  it("the embed URL is the nocookie host with autoplay=1&playsinline=1&rel=0 and never mute=", async () => {
    const { replayEmbedUrl } = await import("@/components/replays/ReplaysList");
    const url = replayEmbedUrl("dQw4w9WgXcQ");
    expect(url).toBe("https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?autoplay=1&playsinline=1&rel=0");
    expect(url).not.toContain("mute=");
  });

  it("a closed list renders one row per saved entry, title first, and NO iframe (the open row's player mounts only while open)", async () => {
    const { default: ReplaysList } = await import("@/components/replays/ReplaysList");
    const html = renderToStaticMarkup(createElement(ReplaysList, { replays: FIXTURE }));
    expect(html).toContain("The first reading, kept");
    expect(html).toContain("A short from the porch");
    expect(html).not.toContain("<iframe");
    expect(html).not.toContain("youtube-nocookie");
  });
});

describe("TASK-496 - the designed empty state (the list ships EMPTY; this surface is first-class)", () => {
  async function renderPage() {
    vi.resetModules();
    vi.doMock("next/navigation", () => ({ usePathname: () => "/replays" }));
    /* PaletteVars is an ASYNC server component - vitest has no Next
       runtime to await it mid-render (renderToStaticMarkup suspends on
       it), so the pin stubs it out; what this suite pins is the page's
       OWN content (the empty state, the rows, the doors), not the palette
       style tag. */
    vi.doMock("@/components/PaletteVars", () => ({ default: () => null }));
    try {
      const mod = await import("@/app/replays/page");
      const element = await mod.default();
      return renderToStaticMarkup(element);
    } finally {
      vi.doUnmock("next/navigation");
      vi.doUnmock("@/components/PaletteVars");
      vi.resetModules();
    }
  }

  it("absent config renders the quiet words and the /reading door, never an iframe", async () => {
    await fs.rm(FILE, { force: true });
    const html = await renderPage();
    expect(html).toContain("Replays");
    expect(html).toContain("Nothing here yet");
    expect(html).toContain('href="/reading"');
    expect(html).not.toContain("<iframe");
  });

  it("a saved EMPTY list renders the same empty state (absent and empty are one state)", async () => {
    await saveSiteConfig({ replays: [] });
    const html = await renderPage();
    expect(html).toContain("Nothing here yet");
    expect(html).toContain('href="/reading"');
    expect(html).not.toContain("<iframe");
    await fs.rm(FILE, { force: true });
  });

  it("a saved list renders the rows instead of the empty words", async () => {
    await saveSiteConfig({ replays: FIXTURE });
    const html = await renderPage();
    expect(html).toContain("The first reading, kept");
    expect(html).not.toContain("Nothing here yet");
    expect(html).not.toContain("<iframe"); // all folded until a tap
    await fs.rm(FILE, { force: true });
  });
});

describe("TASK-496 - the /reading door and the Community menu row", () => {
  it("/reading carries the Replays door to /replays (source pin)", async () => {
    const page = await readSrc("src/app/reading/page.tsx");
    expect(page).toContain('href="/replays"');
    expect(page).toContain("The replays keep every recorded reading");
  });

  it("buildDefaultMenu's Community subs carry Replays → /replays after Read with Love", async () => {
    const { buildDefaultMenu } = await import("@/components/NavMenu");
    const { defaultSiteConfig } = await import("@/lib/site-config");
    const community = buildDefaultMenu(defaultSiteConfig()).find((m) => m.label === "Community");
    const subs = community?.subs ?? [];
    const idx = subs.findIndex((s) => s.label === "Replays");
    expect(idx).toBeGreaterThan(-1);
    expect(subs[idx].href).toBe("/replays");
    expect(subs[idx - 1]?.label).toBe("Read with Love");
  });

  it("/replays is in BOTH PAGE_CATALOG (ungated, same standing as Free meditation) and KNOWN_NAV_HREFS", async () => {
    const { PAGE_CATALOG } = await import("@/components/NavMenu");
    const { KNOWN_NAV_HREFS } = await import("@/lib/site-config");
    const entry = PAGE_CATALOG.find((p) => p.href === "/replays");
    expect(entry).toBeTruthy();
    expect(entry?.label).toBe("Replays");
    expect(entry?.feature).toBeUndefined();
    expect(KNOWN_NAV_HREFS).toContain("/replays");
  });
});

describe("TASK-496 - the /a room (the RoomsCard layout idiom, the AboutVideosCard data flow)", () => {
  it("SiteReplaysRoom mounts ReplaysCard; the card speaks /api/admin/site and the replays key (source pins)", async () => {
    const room = await readSrc("src/app/a/site/replays/SiteReplaysRoom.tsx");
    expect(room).toContain("<ReplaysCard />");
    const card = await readSrc("src/app/a/site/replays/ReplaysCard.tsx");
    expect(card).toContain('fetch("/api/admin/site"');
    expect(card).toContain("replays");
  });

  it("the /a room is class-based, zero style= literals (the /a uniformity law; operator-census is fewer-never-more)", async () => {
    for (const rel of [
      "src/app/a/site/replays/page.tsx",
      "src/app/a/site/replays/SiteReplaysRoom.tsx",
      "src/app/a/site/replays/ReplaysCard.tsx",
    ]) {
      const src = await readSrc(rel);
      expect(src, `${rel} carries a style= literal`).not.toContain("style=");
    }
  });

  it("no em dash anywhere in the lane's new copy", async () => {
    for (const rel of [
      "src/app/replays/page.tsx",
      "src/components/replays/ReplaysList.tsx",
      "src/app/a/site/replays/page.tsx",
      "src/app/a/site/replays/SiteReplaysRoom.tsx",
      "src/app/a/site/replays/ReplaysCard.tsx",
    ]) {
      const src = await readSrc(rel);
      expect(src, `${rel} carries an em dash`).not.toContain("\u2014");
    }
  });
});
