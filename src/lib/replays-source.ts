import { kv } from "@/lib/store";
import { TENANT } from "@/lib/tenant";
import { YOUTUBE_ID_RE, YOUTUBE_PLAYLIST_ID_RE } from "@/lib/youtube-id";
import type { AboutVideo } from "@/lib/about-content";

/**
 * TASK-532 (blocks 969,313 + 969,334) — THE REPLAYS SOURCE: the manual
 * rows (site-config's `replays`, Love's own order, pinned on top) plus ONE
 * YouTube playlist auto-fill behind them. YouTube's public playlist feed
 * (feeds/videos.xml?playlist_id=<id>, no key, fetched live at draft time
 * and again at cut) serves the latest 15 entries in PLAYLIST order with
 * NON-monotonic <published> dates, so "newest first" is an explicit sort
 * here, never the feed's own order (ruling 2).
 *
 * HARD RULES (each pinned in tests/replays-playlist-532.test.ts):
 *  · the fetch URL is ONLY the constant host + path + the strictly
 *    validated id (YOUTUBE_PLAYLIST_ID_RE) — never a stored URL; the doc
 *    holds the id alone, so a hand-edited doc can never aim the fetch.
 *  · redirect:"error", a 4s timeout, an XML content-type check, and a
 *    ~512KB size cap bound every fetch.
 *  · parsing is strict and dependency-free: ONLY yt:videoId (must match
 *    YOUTUBE_ID_RE), title (five XML entities decoded, control characters
 *    stripped, 120-char cap) and published (must parse as a date, else the
 *    row sorts last) are read; media:description and every link/thumbnail
 *    are ignored. Zero valid entries is a FAILURE (null), never an empty
 *    list rendered as if whole.
 *  · the last-good cache (its own KV doc): fresh (< ~10 min) never
 *    fetches; stale refetches once and ANY failure serves the last good;
 *    with none, the manual rows alone. loadReplays NEVER throws into the
 *    page. allowFetch:false NEVER fetches — the signed-out crawler law
 *    (SECURITY.md (d)): the public render reads the cache only, so a
 *    crawler cannot turn this page into a fetch amplifier.
 *
 * KV: TWO docs of this lane's own (ruling 3 — site-config.ts is UNTOUCHED,
 * it is T-499's ground): `replays:playlist:<TENANT>` (the saved id) and
 * `replays:playlist-cache:<TENANT>` (the last good fetch). The stage1.ts
 * idiom: reads fail closed to null, writes THROW on an unconfigured vault
 * (a failed save never reads as success).
 */

export interface PlaylistItem {
  /** the 11-char video id, YOUTUBE_ID_RE-checked */
  id: string;
  /** entities decoded, control chars stripped, 120-char cap */
  title: string;
  /** Date.parse(published), or null when the date will not parse (sorts last) */
  publishedMs: number | null;
}

/** The saved doc: the id ALONE (never a URL — a hand-edited doc must not
    be able to aim the fetch) plus when Love saved it. */
export interface PlaylistDoc {
  id: string;
  savedAtMs: number;
}

export interface PlaylistCache {
  id: string;
  fetchedAtMs: number;
  items: PlaylistItem[];
}

export const PLAYLIST_DOC_KEY = `replays:playlist:${TENANT}`;
export const PLAYLIST_CACHE_KEY = `replays:playlist-cache:${TENANT}`;

const FEED_BASE = "https://www.youtube.com/feeds/videos.xml?playlist_id=";
const FETCH_TIMEOUT_MS = 4000;
const MAX_FEED_CHARS = 512 * 1024;
const TITLE_CAP = 120;
const REFRESH_MS = 10 * 60 * 1000;

/** The ONE spelling of the feed URL: the constant base plus a strictly
    validated id. Throws on anything else — callers validate first (the
    admin route parses with parseYoutubePlaylistInput; the stored doc is
    re-validated on read), so a throw here means a programming error, not
    visitor input. */
export function playlistFeedUrl(id: string): string {
  if (!YOUTUBE_PLAYLIST_ID_RE.test(id)) throw new Error("replays-source: not a playlist id");
  return `${FEED_BASE}${id}`;
}

/** The five XML entities, decoded — the feed is text, never markup, and
    React escapes on render regardless. */
function decodeEntities(s: string): string {
  return s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

function cleanTitle(raw: string): string {
  const decoded = decodeEntities(raw).replace(/[\u0000-\u001f\u007f]/g, "");
  const trimmed = decoded.trim();
  return trimmed.length > TITLE_CAP ? trimmed.slice(0, TITLE_CAP).trimEnd() : trimmed;
}

/** Strict, dependency-free feed parsing. Splits on <entry>, takes ONLY
    yt:videoId / title / published from each, skips any row whose videoId
    fails YOUTUBE_ID_RE, and returns null (a failure) when NO valid entry
    survives — a 404 HTML page, garbage XML, and an emptied playlist are
    all the same honest failure to the caller. */
export function parsePlaylistFeed(xml: string): PlaylistItem[] | null {
  if (!xml || typeof xml !== "string") return null;
  const items: PlaylistItem[] = [];
  const entries = xml.split("<entry>").slice(1);
  for (const chunk of entries) {
    const entry = chunk.split("</entry>")[0] ?? "";
    const idMatch = entry.match(/<yt:videoId>([^<]+)<\/yt:videoId>/);
    const id = idMatch?.[1]?.trim() ?? "";
    if (!YOUTUBE_ID_RE.test(id)) continue;
    // the atom <title> only — anything from <media:group> on is unread
    const head = entry.split("<media:group")[0] ?? "";
    const titleMatch = head.match(/<title>([\s\S]*?)<\/title>/);
    const title = cleanTitle(titleMatch?.[1] ?? "") || "Untitled replay";
    const publishedMatch = head.match(/<published>([^<]+)<\/published>/);
    const parsed = publishedMatch ? Date.parse(publishedMatch[1].trim()) : NaN;
    items.push({ id, title, publishedMs: Number.isNaN(parsed) ? null : parsed });
  }
  return items.length > 0 ? items : null;
}

/** The ruled merge (ruling 2): the manual rows pinned on top in the
    operator's saved order, then the playlist's items not already listed,
    newest first by published (unparseable dates last), deduped by id.
    Playlist rows wear ratio "16/9" so they fit AboutVideo and ReplaysList
    unchanged. */
export function mergeReplays(manual: AboutVideo[], items: PlaylistItem[]): AboutVideo[] {
  const seen = new Set(manual.map((v) => v.id));
  const sorted = items
    .filter((item) => !seen.has(item.id))
    .slice()
    .sort((a, b) => (b.publishedMs ?? -1) - (a.publishedMs ?? -1));
  const extra: AboutVideo[] = [];
  for (const item of sorted) {
    if (seen.has(item.id)) continue; // a dupe inside the feed itself: the newest wins
    seen.add(item.id);
    extra.push({ id: item.id, title: item.title, ratio: "16/9" });
  }
  return [...manual, ...extra];
}

/** The bounded fetch. Every failure — timeout, redirect, non-200, a
    non-XML content-type, an oversize body, a network throw — is null;
    the caller decides the fallback. `fetchImpl` is injectable for tests;
    the default is resolved at CALL time so a test's global stub rides. */
export async function fetchPlaylistFeed(id: string, fetchImpl: typeof fetch = fetch): Promise<string | null> {
  try {
    const res = await fetchImpl(playlistFeedUrl(id), {
      redirect: "error",
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      cache: "no-store",
    });
    if (!res.ok) return null;
    const contentType = res.headers.get("content-type") ?? "";
    if (!/xml/i.test(contentType)) return null;
    const text = await res.text();
    if (text.length > MAX_FEED_CHARS) return null;
    return text;
  } catch {
    return null;
  }
}

/* ---- the KV docs (the stage1.ts idiom: reads fail closed, writes throw) ---- */

type KvGet = (key: string) => Promise<string | null>;
type KvSet = (key: string, value: string) => Promise<void>;
type KvDel = (key: string) => Promise<void>;

async function defaultKvGet(key: string): Promise<string | null> {
  try {
    const res = await kv(["GET", key]);
    return typeof res?.result === "string" && res.result ? res.result : null;
  } catch {
    return null;
  }
}

async function defaultKvSet(key: string, value: string): Promise<void> {
  const res = await kv(["SET", key, value]);
  if (res === null) throw new Error("replays playlist vault is not configured — nothing was written");
}

async function defaultKvDel(key: string): Promise<void> {
  const res = await kv(["DEL", key]);
  if (res === null) throw new Error("replays playlist vault is not configured — nothing was written");
}

/** The saved doc, re-validated on EVERY read: a hand-edited doc whose id
    fails YOUTUBE_PLAYLIST_ID_RE reads as NO playlist, never a fetch aim. */
function parseDoc(raw: string | null): PlaylistDoc | null {
  if (!raw) return null;
  try {
    const o = JSON.parse(raw) as unknown;
    if (!o || typeof o !== "object") return null;
    const id = (o as Record<string, unknown>).id;
    if (typeof id !== "string" || !YOUTUBE_PLAYLIST_ID_RE.test(id)) return null;
    return { id, savedAtMs: typeof (o as Record<string, unknown>).savedAtMs === "number" ? (o as { savedAtMs: number }).savedAtMs : 0 };
  } catch {
    return null;
  }
}

function parseCache(raw: string | null): PlaylistCache | null {
  if (!raw) return null;
  try {
    const o = JSON.parse(raw) as unknown;
    if (!o || typeof o !== "object") return null;
    const c = o as Record<string, unknown>;
    if (typeof c.id !== "string" || !YOUTUBE_PLAYLIST_ID_RE.test(c.id)) return null;
    if (typeof c.fetchedAtMs !== "number" || !Array.isArray(c.items)) return null;
    const items: PlaylistItem[] = [];
    for (const rawItem of c.items as unknown[]) {
      const it = rawItem as Record<string, unknown>;
      if (typeof it?.id !== "string" || !YOUTUBE_ID_RE.test(it.id)) continue;
      if (typeof it?.title !== "string" || !it.title) continue;
      items.push({
        id: it.id,
        title: it.title.slice(0, TITLE_CAP),
        publishedMs: typeof it.publishedMs === "number" ? it.publishedMs : null,
      });
    }
    return { id: c.id, fetchedAtMs: c.fetchedAtMs, items };
  } catch {
    return null;
  }
}

/** The operator route's read: the saved playlist, or null. */
export async function getSavedPlaylist(kvGet: KvGet = defaultKvGet): Promise<PlaylistDoc | null> {
  return parseDoc(await kvGet(PLAYLIST_DOC_KEY));
}

/** The operator route's save: the doc lands (a failed write THROWS — a
    failed save never reads as success); null CLEARS doc and cache both. */
export async function savePlaylist(
  id: string | null,
  nowMs: number = Date.now(),
  kvSet: KvSet = defaultKvSet,
  kvDel: KvDel = defaultKvDel,
): Promise<void> {
  if (id === null) {
    await kvDel(PLAYLIST_DOC_KEY);
    await kvDel(PLAYLIST_CACHE_KEY);
    return;
  }
  await kvSet(PLAYLIST_DOC_KEY, JSON.stringify({ id, savedAtMs: nowMs } satisfies PlaylistDoc));
}

/** The operator route's cache write after a successful probe (the page's
    next render is then fresh and never re-fetches). */
export async function writePlaylistCache(
  cache: PlaylistCache,
  kvSet: KvSet = defaultKvSet,
): Promise<void> {
  await kvSet(PLAYLIST_CACHE_KEY, JSON.stringify(cache));
}

export interface LoadReplaysOptions {
  nowMs?: number;
  /** false NEVER fetches — the signed-out render passes this (SECURITY.md
      (d): a crawler must not be able to make this page fetch). */
  allowFetch?: boolean;
  fetchImpl?: typeof fetch;
  kvGet?: KvGet;
  kvSet?: KvSet;
}

/** THE ONE loader the /replays page (and T-534's recap half) calls:
    manual rows + the playlist auto-fill, under every fallback the brief
    names. NEVER throws — any failure degrades toward the manual rows. */
export async function loadReplays(
  config: { replays?: AboutVideo[] },
  opts: LoadReplaysOptions = {},
): Promise<AboutVideo[]> {
  const manual = config.replays ?? [];
  const nowMs = opts.nowMs ?? Date.now();
  const kvGet = opts.kvGet ?? defaultKvGet;
  const kvSet = opts.kvSet ?? defaultKvSet;
  try {
    const doc = parseDoc(await kvGet(PLAYLIST_DOC_KEY));
    if (!doc) return manual;
    const cache = parseCache(await kvGet(PLAYLIST_CACHE_KEY));
    const lastGood = cache && cache.id === doc.id && cache.items.length > 0 ? cache : null;
    const fresh = lastGood !== null && nowMs - lastGood.fetchedAtMs < REFRESH_MS;
    if (fresh) return mergeReplays(manual, lastGood.items);
    if (opts.allowFetch === false) {
      // the crawler law: stale cache serves last-good, no fetch, ever
      return lastGood ? mergeReplays(manual, lastGood.items) : manual;
    }
    const xml = await fetchPlaylistFeed(doc.id, opts.fetchImpl ?? fetch);
    const items = xml ? parsePlaylistFeed(xml) : null;
    if (items) {
      await kvSet(PLAYLIST_CACHE_KEY, JSON.stringify({ id: doc.id, fetchedAtMs: nowMs, items } satisfies PlaylistCache));
      return mergeReplays(manual, items);
    }
    return lastGood ? mergeReplays(manual, lastGood.items) : manual;
  } catch {
    return manual;
  }
}
