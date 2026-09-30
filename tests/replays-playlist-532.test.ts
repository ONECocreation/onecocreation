import { describe, it, expect, beforeAll, beforeEach, afterEach, afterAll } from "vitest";
import { promises as fs } from "fs";
import path from "path";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import { generateSecretKey, getPublicKey, nip19 } from "nostr-tools";
import { TENANT } from "@/lib/tenant";
import type { AboutVideo } from "@/lib/about-content";

/**
 * TASK-532 (blocks 969,313 + 969,334) — the YouTube PLAYLIST as a replays
 * source. Pins:
 *
 *  · parseYoutubePlaylistInput (NEW in youtube-id.ts): playlist links
 *    (youtube.com/playlist?list=, watch?...&list=, m. host) and the bare id
 *    parse; PL ids AND UU ids (a channel's uploads list — PROVEN at cut,
 *    2026-09-30: feeds/videos.xml?playlist_id=UU<channel> answered HTTP 200
 *    text/xml for two real channels; LL/OL/RD/FL stayed 404 on every real
 *    attempt, so they are refused and the card says PL/UU only); every
 *    hostile shape refuses null. parseYoutubeInput's contract is UNCHANGED:
 *    a playlist link still refuses there; Love's real part-one live link
 *    still parses.
 *  · parsePlaylistFeed (replays-source.ts): strict, dependency-free; the
 *    recorded real feed (tests/fixtures/playlist-feed-532.xml, fetched live
 *    at cut) parses; ONLY yt:videoId (regex-checked), title (entities
 *    decoded, control chars stripped, ~120 cap) and published (must parse)
 *    are read; hostile rows are skipped; zero valid entries is null (a
 *    failure, never an empty list rendered as if whole).
 *  · mergeReplays: manual rows pinned on top in the saved order, playlist
 *    items not already listed newest first by published (the feed's own
 *    order is NOT monotonic — the fixture proves it), deduped by id.
 *  · fetchPlaylistFeed: the URL is the constant host + path + the strictly
 *    validated id, NEVER a stored URL; redirect:"error"; a timeout signal;
 *    XML content-type only; ~512KB cap; every failure is null.
 *  · loadReplays: the last-good cache law (fresh cache never fetches; a
 *    stale cache refetches once and serves last-good on ANY failure;
 *    allowFetch:false NEVER fetches — the signed-out crawler law); it never
 *    throws into the page.
 *  · the operator route /api/admin/replays-playlist: operator-gated like
 *    /api/admin/site, a malformed link refused 400 IN WORDS, a save probes
 *    the feed once and reports the count honestly, clear wipes doc+cache.
 *
 * KV is a fake key->value transport on global.fetch (the
 * tests/admin-stage1-route.test.ts idiom); the YouTube probe rides the same
 * stub (URL-branched), so no test ever touches the network.
 */

const TESTS_DIR = path.dirname(decodeURIComponent(new URL(import.meta.url).pathname));
const FIXTURE_XML_PATH = path.join(TESTS_DIR, "fixtures", "playlist-feed-532.xml");
const readSrc = (rel: string) => fs.readFile(path.join(TESTS_DIR, "..", rel), "utf8");

const DOC_KEY = `replays:playlist:${TENANT}`;
const CACHE_KEY = `replays:playlist-cache:${TENANT}`;
const PL = "PLBCF2DAC6FFB574DE";
const UU = "UUdBK94H6oZT2Q7l0-b0xmMg";

const MANUAL: AboutVideo[] = [
  { id: "dQw4w9WgXcQ", title: "Pinned first by hand", ratio: "16/9" },
  { id: "2LrWVQDnLd0", title: "Pinned second by hand", ratio: "9/16" },
];

let fixtureXml: string;
let operatorCookie: string;

beforeAll(async () => {
  fixtureXml = await fs.readFile(FIXTURE_XML_PATH, "utf8");
  process.env.SEAT_SECRET = "replays-playlist-532-secret";
  const pk = getPublicKey(generateSecretKey());
  process.env.OPERATOR_NPUBS = nip19.npubEncode(pk);
  const { makeOperatorToken } = await import("@/lib/operator-auth");
  operatorCookie = `fe-operator=${makeOperatorToken(pk)}`;
});

/* ---- the fake transport: KV commands AND the pinned feed URL, one stub ---- */
const realFetch = global.fetch;
let kvStore: Map<string, string>;
let feedHandler: () => Response;

function fakeTransport() {
  kvStore = new Map();
  feedHandler = () => new Response(fixtureXml, { status: 200, headers: { "Content-Type": "text/xml; charset=UTF-8" } });
  const fetchMock = async (url: string | URL, init?: RequestInit) => {
    const u = String(url);
    if (u.startsWith("https://www.youtube.com/feeds/")) return feedHandler();
    const cmd = JSON.parse(String(init?.body)) as unknown[];
    const [op, key, value] = cmd as [string, string, string?];
    if (op === "SET") {
      kvStore.set(key, value as string);
      return new Response(JSON.stringify({ result: "OK" }), { status: 200 });
    }
    if (op === "DEL") {
      const had = kvStore.delete(key);
      return new Response(JSON.stringify({ result: had ? 1 : 0 }), { status: 200 });
    }
    return new Response(JSON.stringify({ result: kvStore.has(key) ? kvStore.get(key) : null }), { status: 200 });
  };
  return fetchMock as unknown as typeof fetch;
}

beforeEach(() => {
  process.env.KV_REST_API_URL = "https://kv.test.local/exec";
  process.env.KV_REST_API_TOKEN = "test-token";
  global.fetch = fakeTransport();
});

afterEach(() => {
  global.fetch = realFetch;
  delete process.env.KV_REST_API_URL;
  delete process.env.KV_REST_API_TOKEN;
});

afterAll(() => {
  global.fetch = realFetch;
});

describe("parseYoutubePlaylistInput - the truth table", () => {
  it("accepts the playlist link, the watch-plus-list link, the m. host, and the bare id", async () => {
    const { parseYoutubePlaylistInput } = await import("@/lib/youtube-id");
    expect(parseYoutubePlaylistInput(`https://www.youtube.com/playlist?list=${PL}`)).toBe(PL);
    expect(parseYoutubePlaylistInput(`https://m.youtube.com/playlist?list=${PL}`)).toBe(PL);
    expect(parseYoutubePlaylistInput(`https://www.youtube.com/watch?v=dQw4w9WgXcQ&list=${PL}`)).toBe(PL);
    expect(parseYoutubePlaylistInput(PL)).toBe(PL);
    expect(parseYoutubePlaylistInput(`  ${PL}  `)).toBe(PL);
  });

  it("accepts UU ids (a channel's uploads list) - PROVEN at cut: the feed answered 200 text/xml", async () => {
    const { parseYoutubePlaylistInput } = await import("@/lib/youtube-id");
    expect(parseYoutubePlaylistInput(UU)).toBe(UU);
    expect(parseYoutubePlaylistInput(`https://www.youtube.com/playlist?list=${UU}`)).toBe(UU);
  });

  it("refuses every hostile or unproven shape", async () => {
    const { parseYoutubePlaylistInput } = await import("@/lib/youtube-id");
    const refusals = [
      "",
      "   ",
      "PLshort",
      `LLdBK94H6oZT2Q7l0-b0xmMg`, // liked-videos prefix: unproven (404 at cut)
      `OLAK5uy_k-crafted00`, // unproven
      `RD2LrWVQDnLd0`, // a mix, not a playlist
      `FLdBK94H6oZT2Q7l0-b0xmMg`, // unproven
      "dQw4w9WgXcQ", // a video id
      `${PL}<script>alert(1)</script>`,
      `https://evil.example/playlist?list=${PL}`,
      `https://youtu.be/${PL}`,
      "javascript:alert(1)",
      "ftp://youtube.com/playlist?list=" + PL,
      "https://www.youtube.com/watch?v=dQw4w9WgXcQ", // no list=
      "https://www.youtube.com/playlist", // no list param at all
      "https://www.youtube.com/feeds/videos.xml?playlist_id=" + PL, // the feed URL itself is not a door
      "not a link at all",
    ];
    for (const raw of refusals) {
      expect(parseYoutubePlaylistInput(raw), JSON.stringify(raw)).toBeNull();
    }
  });
});

describe("parseYoutubeInput's contract is UNCHANGED", () => {
  it("a playlist link still refuses there; Love's real part-one live link still parses", async () => {
    const { parseYoutubeInput } = await import("@/lib/youtube-id");
    expect(parseYoutubeInput(`https://www.youtube.com/playlist?list=${PL}`)).toBeNull();
    expect(parseYoutubeInput(`https://www.youtube.com/watch?v=dQw4w9WgXcQ&list=${PL}`)).toEqual({ id: "dQw4w9WgXcQ", likelyShort: false });
    expect(parseYoutubeInput("https://www.youtube.com/live/dx6NoLOAWTE?is=y9Hvz7lJMnGiSvaN")).toEqual({ id: "dx6NoLOAWTE", likelyShort: false });
  });
});

describe("parsePlaylistFeed - strict parsing of the recorded real feed", () => {
  it("parses all 10 entries of the recorded fixture: ids, decoded titles, parsed published", async () => {
    const { parsePlaylistFeed } = await import("@/lib/replays-source");
    const items = parsePlaylistFeed(fixtureXml);
    expect(items).not.toBeNull();
    expect(items!.length).toBe(10);
    expect(items![0]).toEqual({
      id: "GvgqDSnpRQM",
      title: "Andrew Willis, Skatepark Engineer",
      publishedMs: Date.parse("2013-10-18T07:03:29+00:00"),
    });
    for (const item of items!) {
      expect(item.id).toMatch(/^[A-Za-z0-9_-]{11}$/);
      expect(item.title.length).toBeGreaterThan(0);
    }
  });

  it("decodes the five XML entities and strips control characters from titles", async () => {
    const { parsePlaylistFeed } = await import("@/lib/replays-source");
    const xml = `<feed><entry><yt:videoId>dQw4w9WgXcQ</yt:videoId><title>Tom &amp; Jerry &lt;3 &quot;Love&apos;s&quot; reading</title><published>2026-09-01T12:00:00+00:00</published></entry></feed>`;
    const items = parsePlaylistFeed(xml);
    expect(items![0].title).toBe(`Tom & Jerry <3 "Love's" reading`);
  });

  it("skips a row with a missing or malformed videoId; an unparseable published sorts last (null)", async () => {
    const { parsePlaylistFeed } = await import("@/lib/replays-source");
    const xml = `<feed>
      <entry><title>No id at all</title><published>2026-09-01T12:00:00+00:00</published></entry>
      <entry><yt:videoId>not-an-id!</yt:videoId><title>Bad id</title><published>2026-09-01T12:00:00+00:00</published></entry>
      <entry><yt:videoId>dQw4w9WgXcQ</yt:videoId><title>Good row, bad date</title><published>not-a-date</published></entry>
    </feed>`;
    const items = parsePlaylistFeed(xml);
    expect(items).toEqual([{ id: "dQw4w9WgXcQ", title: "Good row, bad date", publishedMs: null }]);
  });

  it("zero valid entries is null (a failure), never an empty list rendered as if whole; garbage XML is null", async () => {
    const { parsePlaylistFeed } = await import("@/lib/replays-source");
    expect(parsePlaylistFeed("<html><body>Error 404</body></html>")).toBeNull();
    expect(parsePlaylistFeed("")).toBeNull();
    expect(parsePlaylistFeed("<feed></feed>")).toBeNull();
  });

  it("a script-ish title is inert text: React escapes it, no tag is ever minted", async () => {
    const { parsePlaylistFeed, mergeReplays } = await import("@/lib/replays-source");
    const { default: ReplaysList } = await import("@/components/replays/ReplaysList");
    const xml = `<feed><entry><yt:videoId>dQw4w9WgXcQ</yt:videoId><title>&lt;script&gt;alert(1)&lt;/script&gt;</title><published>2026-09-01T12:00:00+00:00</published></entry></feed>`;
    const items = parsePlaylistFeed(xml)!;
    expect(items[0].title).toBe("<script>alert(1)</script>");
    const merged = mergeReplays([], items);
    const html = renderToStaticMarkup(createElement(ReplaysList, { replays: merged, signedIn: false, initialId: merged[0].id }));
    expect(html).not.toContain("<script>alert(1)</script>");
    expect(html).toContain("&lt;script&gt;");
  });
});

describe("mergeReplays - manual pinned on top, playlist newest first, deduped by id", () => {
  it("the ruled order (ruling 2)", async () => {
    const { mergeReplays } = await import("@/lib/replays-source");
    const items = [
      { id: "old11111111", title: "Older playlist video", publishedMs: Date.parse("2026-01-01T00:00:00Z") },
      { id: "new11111111", title: "Newer playlist video", publishedMs: Date.parse("2026-09-01T00:00:00Z") },
      { id: "dQw4w9WgXcQ", title: "Already pinned by hand", publishedMs: Date.parse("2026-12-01T00:00:00Z") },
      { id: "nodate11111", title: "No date", publishedMs: null },
    ];
    const merged = mergeReplays(MANUAL, items);
    expect(merged.map((v) => v.id)).toEqual(["dQw4w9WgXcQ", "2LrWVQDnLd0", "new11111111", "old11111111", "nodate11111"]);
    expect(merged.find((v) => v.id === "new11111111")).toMatchObject({ ratio: "16/9" });
    // the manual row keeps its own title and ratio (never the feed's words)
    expect(merged[0]).toEqual(MANUAL[0]);
  });
});

describe("fetchPlaylistFeed - constant host, redirect error, timeout, XML only, size cap", () => {
  it("the URL is the one constant spelling, built from the validated id only", async () => {
    const { playlistFeedUrl } = await import("@/lib/replays-source");
    expect(playlistFeedUrl(PL)).toBe(`https://www.youtube.com/feeds/videos.xml?playlist_id=${PL}`);
    expect(() => playlistFeedUrl("https://evil.example/x")).toThrow();
  });

  it("a good answer returns the text; the request pins redirect:error and a timeout signal", async () => {
    const { fetchPlaylistFeed } = await import("@/lib/replays-source");
    const seen: { url: string; init?: RequestInit }[] = [];
    const stub = async (url: string | URL, init?: RequestInit) => {
      seen.push({ url: String(url), init });
      return new Response("<feed/>", { status: 200, headers: { "Content-Type": "text/xml; charset=UTF-8" } });
    };
    const text = await fetchPlaylistFeed(PL, stub as unknown as typeof fetch);
    expect(text).toBe("<feed/>");
    expect(seen[0].url).toBe(`https://www.youtube.com/feeds/videos.xml?playlist_id=${PL}`);
    expect(seen[0].init?.redirect).toBe("error");
    expect(seen[0].init?.signal).toBeTruthy();
  });

  it("non-200, a non-XML content-type, an oversize body, and a throw (redirect/timeout) are all null", async () => {
    const { fetchPlaylistFeed } = await import("@/lib/replays-source");
    const as = (r: () => Promise<Response>) => r as unknown as typeof fetch;
    expect(await fetchPlaylistFeed(PL, as(async () => new Response("nope", { status: 404, headers: { "Content-Type": "text/html" } })))).toBeNull();
    expect(await fetchPlaylistFeed(PL, as(async () => new Response("<feed/>", { status: 200, headers: { "Content-Type": "text/html" } })))).toBeNull();
    expect(await fetchPlaylistFeed(PL, as(async () => new Response("x".repeat(600 * 1024), { status: 200, headers: { "Content-Type": "text/xml" } })))).toBeNull();
    expect(await fetchPlaylistFeed(PL, as(async () => { throw new Error("redirects are not followed"); }))).toBeNull();
  });
});

describe("loadReplays - the last-good law, and never a throw into the page", () => {
  async function deps(over: Partial<Record<"doc" | "cache", string>>) {
    const { PLAYLIST_DOC_KEY, PLAYLIST_CACHE_KEY } = await import("@/lib/replays-source");
    const written: Record<string, string> = {};
    const kvGet = async (key: string) => (key === PLAYLIST_DOC_KEY ? over.doc ?? null : key === PLAYLIST_CACHE_KEY ? over.cache ?? null : null);
    const kvSet = async (key: string, value: string) => {
      written[key] = value;
    };
    return { kvGet, kvSet, written, PLAYLIST_CACHE_KEY };
  }

  it("no saved playlist: the manual rows alone, no fetch", async () => {
    const { loadReplays } = await import("@/lib/replays-source");
    const { kvGet, kvSet } = await deps({});
    let fetches = 0;
    const merged = await loadReplays({ replays: MANUAL }, { kvGet, kvSet, fetchImpl: (async () => { fetches++; throw new Error("must not fetch"); }) as unknown as typeof fetch });
    expect(merged).toEqual(MANUAL);
    expect(fetches).toBe(0);
  });

  it("a fresh cache never fetches", async () => {
    const { loadReplays } = await import("@/lib/replays-source");
    const now = Date.parse("2026-09-30T12:00:00Z");
    const cache = JSON.stringify({ id: PL, fetchedAtMs: now - 60_000, items: [{ id: "new11111111", title: "Cached", publishedMs: now - 86400_000 }] });
    const { kvGet, kvSet } = await deps({ doc: JSON.stringify({ id: PL, savedAtMs: now }), cache });
    let fetches = 0;
    const merged = await loadReplays({ replays: MANUAL }, { nowMs: now, kvGet, kvSet, fetchImpl: (async () => { fetches++; throw new Error("must not fetch"); }) as unknown as typeof fetch });
    expect(merged.map((v) => v.id)).toEqual(["dQw4w9WgXcQ", "2LrWVQDnLd0", "new11111111"]);
    expect(fetches).toBe(0);
  });

  it("a stale cache refetches once, rewrites the cache, and merges the fresh items", async () => {
    const { loadReplays } = await import("@/lib/replays-source");
    const now = Date.parse("2026-09-30T12:00:00Z");
    const cache = JSON.stringify({ id: PL, fetchedAtMs: now - 3600_000, items: [{ id: "old11111111", title: "Stale", publishedMs: 1 }] });
    const { kvGet, kvSet, written, PLAYLIST_CACHE_KEY } = await deps({ doc: JSON.stringify({ id: PL, savedAtMs: now }), cache });
    const fetchImpl = async () => new Response(fixtureXml, { status: 200, headers: { "Content-Type": "text/xml" } });
    const merged = await loadReplays({ replays: MANUAL }, { nowMs: now, kvGet, kvSet, fetchImpl: fetchImpl as unknown as typeof fetch });
    expect(merged.length).toBe(2 + 10);
    expect(merged[0].id).toBe("dQw4w9WgXcQ");
    expect(merged.some((v) => v.id === "GvgqDSnpRQM")).toBe(true);
    expect(written[PLAYLIST_CACHE_KEY]).toBeTruthy();
    expect(JSON.parse(written[PLAYLIST_CACHE_KEY]).fetchedAtMs).toBe(now);
  });

  it("any fetch failure serves the last-good cache; with none, the manual rows alone", async () => {
    const { loadReplays } = await import("@/lib/replays-source");
    const now = Date.parse("2026-09-30T12:00:00Z");
    const failing = (async () => new Response("nope", { status: 404, headers: { "Content-Type": "text/html" } })) as unknown as typeof fetch;
    const cache = JSON.stringify({ id: PL, fetchedAtMs: now - 3600_000, items: [{ id: "good1111111", title: "Last good", publishedMs: 1 }] });
    const a = await deps({ doc: JSON.stringify({ id: PL, savedAtMs: now }), cache });
    const merged = await loadReplays({ replays: MANUAL }, { nowMs: now, kvGet: a.kvGet, kvSet: a.kvSet, fetchImpl: failing });
    expect(merged.map((v) => v.id)).toEqual(["dQw4w9WgXcQ", "2LrWVQDnLd0", "good1111111"]);
    const b = await deps({ doc: JSON.stringify({ id: PL, savedAtMs: now }) });
    const manualOnly = await loadReplays({ replays: MANUAL }, { nowMs: now, kvGet: b.kvGet, kvSet: b.kvSet, fetchImpl: failing });
    expect(manualOnly).toEqual(MANUAL);
  });

  it("allowFetch:false NEVER fetches, even with a stale cache (the signed-out crawler law)", async () => {
    const { loadReplays } = await import("@/lib/replays-source");
    const now = Date.parse("2026-09-30T12:00:00Z");
    const cache = JSON.stringify({ id: PL, fetchedAtMs: now - 3600_000, items: [{ id: "good1111111", title: "Last good", publishedMs: 1 }] });
    const { kvGet, kvSet } = await deps({ doc: JSON.stringify({ id: PL, savedAtMs: now }), cache });
    let fetches = 0;
    const merged = await loadReplays({ replays: MANUAL }, { nowMs: now, allowFetch: false, kvGet, kvSet, fetchImpl: (async () => { fetches++; throw new Error("must not fetch"); }) as unknown as typeof fetch });
    expect(merged.map((v) => v.id)).toEqual(["dQw4w9WgXcQ", "2LrWVQDnLd0", "good1111111"]);
    expect(fetches).toBe(0);
  });

  it("a fetch that parses to ZERO valid entries keeps the non-empty last-good and never overwrites it with empty", async () => {
    const { loadReplays } = await import("@/lib/replays-source");
    const now = Date.parse("2026-09-30T12:00:00Z");
    const cache = JSON.stringify({ id: PL, fetchedAtMs: now - 3600_000, items: [{ id: "good1111111", title: "Last good", publishedMs: 1 }] });
    const { kvGet, kvSet, written, PLAYLIST_CACHE_KEY } = await deps({ doc: JSON.stringify({ id: PL, savedAtMs: now }), cache });
    const emptyFeed = (async () => new Response("<feed></feed>", { status: 200, headers: { "Content-Type": "text/xml" } })) as unknown as typeof fetch;
    const merged = await loadReplays({ replays: MANUAL }, { nowMs: now, kvGet, kvSet, fetchImpl: emptyFeed });
    expect(merged.map((v) => v.id)).toEqual(["dQw4w9WgXcQ", "2LrWVQDnLd0", "good1111111"]);
    expect(written[PLAYLIST_CACHE_KEY]).toBeUndefined();
  });

  it("a garbage doc, a doc id that fails validation, and a throwing KV read all fail closed to the manual rows", async () => {
    const { loadReplays } = await import("@/lib/replays-source");
    let fetches = 0;
    const fetchImpl = (async () => { fetches++; throw new Error("must not fetch"); }) as unknown as typeof fetch;
    for (const doc of ["{not json", JSON.stringify({ id: "https://evil.example/x" }), JSON.stringify({ id: "LLunproven000000000" }), JSON.stringify({ savedAtMs: 1 })]) {
      const { kvGet, kvSet } = await deps({ doc });
      const merged = await loadReplays({ replays: MANUAL }, { kvGet, kvSet, fetchImpl });
      expect(merged, doc).toEqual(MANUAL);
    }
    const throwing = await loadReplays({ replays: MANUAL }, { kvGet: (async () => { throw new Error("vault down"); }), fetchImpl });
    expect(throwing).toEqual(MANUAL);
    expect(fetches).toBe(0);
  });
});

describe("the operator route /api/admin/replays-playlist", () => {
  async function routePut(body: unknown, cookie?: string) {
    const { PUT } = await import("@/app/api/admin/replays-playlist/route");
    return PUT(new Request("http://test.local/api/admin/replays-playlist", {
      method: "PUT",
      headers: { "Content-Type": "application/json", ...(cookie ? { cookie } : {}) },
      body: JSON.stringify(body),
    }));
  }
  async function routeGet(cookie?: string) {
    const { GET } = await import("@/app/api/admin/replays-playlist/route");
    return GET(new Request("http://test.local/api/admin/replays-playlist", { headers: cookie ? { cookie } : {} }));
  }

  it("GET and PUT are operator-gated exactly like /api/admin/site (401 for a stranger)", async () => {
    expect((await routeGet()).status).toBe(401);
    expect((await routePut({ playlist: PL })).status).toBe(401);
  });

  it("GET reads null when nothing is saved", async () => {
    const res = await routeGet(operatorCookie);
    expect(res.status).toBe(200);
    expect((await res.json()).playlist).toBeNull();
  });

  it("a malformed link is refused 400 IN WORDS, and nothing is written", async () => {
    const res = await routePut({ playlist: "https://evil.example/playlist?list=" + PL }, operatorCookie);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(typeof body.reason).toBe("string");
    expect(kvStore.has(DOC_KEY)).toBe(false);
  });

  it("a good save writes the doc, probes the feed once, and reports the count", async () => {
    const res = await routePut({ playlist: `https://www.youtube.com/playlist?list=${PL}` }, operatorCookie);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.playlist).toEqual({ id: PL });
    expect(body.found).toBe(10);
    expect(JSON.parse(kvStore.get(DOC_KEY)!)).toMatchObject({ id: PL });
    expect(JSON.parse(kvStore.get(CACHE_KEY)!)).toMatchObject({ id: PL });
    expect((await routeGet(operatorCookie)).status).toBe(200);
    expect(((await (await routeGet(operatorCookie)).json()).playlist)).toEqual({ id: PL });
  });

  it("a save YouTube cannot answer is still saved, and says so honestly (found 0, the failure in words)", async () => {
    feedHandler = () => new Response("nope", { status: 404, headers: { "Content-Type": "text/html" } });
    const res = await routePut({ playlist: PL }, operatorCookie);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.found).toBe(0);
    expect(typeof body.note).toBe("string");
    expect(kvStore.has(CACHE_KEY)).toBe(false);
  });

  it("clear wipes the doc AND the cache", async () => {
    await routePut({ playlist: PL }, operatorCookie);
    expect(kvStore.has(DOC_KEY)).toBe(true);
    const res = await routePut({ playlist: null }, operatorCookie);
    expect(res.status).toBe(200);
    expect(kvStore.has(DOC_KEY)).toBe(false);
    expect(kvStore.has(CACHE_KEY)).toBe(false);
    expect(((await (await routeGet(operatorCookie)).json()).playlist)).toBeNull();
  });
});

describe("the loader's own source pins", () => {
  it("the doc stores ONLY the id (never a URL), and the fetch host is the one constant", async () => {
    const src = await readSrc("src/lib/replays-source.ts");
    expect(src).toContain("https://www.youtube.com/feeds/videos.xml?playlist_id=");
    // no stored URL can ever aim the fetch: the doc shape has no url field
    expect(src).not.toMatch(/doc\.url|playlist\.url|storedUrl/);
  });

  it("the lockfile never moved (no new dependency: the parser is dependency-free)", async () => {
    const pkg = JSON.parse(await readSrc("package.json"));
    expect(JSON.stringify(pkg.dependencies)).not.toContain("xml");
  });
});
