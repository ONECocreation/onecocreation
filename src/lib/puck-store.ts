/**
 * Puck store — KV persistence for the visual editor. PUCK P5 adds DRAFT/LIVE
 * staging (Admiral, 2026-08-11: "a draft mode to leave it staged and push the
 * full site at one time... or at least edit a page at a time").
 *
 *   puck:draft:<slug>  — the studio's working copy. Autosaved on every edit.
 *   puck:page:<slug>   — LIVE. Only what /p/<slug> and real pages serve.
 *   puck:pages         — index set of every known slug (for Publish-all + picker)
 *
 * Public routes read LIVE only, so visitors never see unpublished work. The
 * studio loads DRAFT (falling back to LIVE, then a page seed). Publish copies
 * DRAFT → LIVE. Same bare Upstash-REST kv() helper as copy.ts/letters.ts.
 */

function restEnv(): { url: string; token: string } | null {
  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  return url && token ? { url, token } : null;
}

async function kv(cmd: unknown[]): Promise<unknown> {
  const rest = restEnv();
  if (!rest) return null;
  const res = await fetch(rest.url, {
    method: "POST",
    headers: { Authorization: `Bearer ${rest.token}`, "Content-Type": "application/json" },
    body: JSON.stringify(cmd),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`puck-store: KV ${res.status}`);
  return ((await res.json()) as { result: unknown }).result;
}

const liveKey = (slug: string) => `puck:page:${slug}`;
const draftKey = (slug: string) => `puck:draft:${slug}`;
const INDEX_KEY = "puck:pages";

export interface PuckPageData {
  content: unknown[];
  root: unknown;
  zones?: Record<string, unknown[]>;
}

async function readKey(key: string): Promise<PuckPageData | null> {
  try {
    const raw = (await kv(["GET", key])) as string | null;
    return raw ? (JSON.parse(raw) as PuckPageData) : null;
  } catch {
    return null;
  }
}

/** LIVE — what the public sees. Unchanged contract: /p/<slug> and real pages read this. */
export async function getPuckPage(slug: string): Promise<PuckPageData | null> {
  return readKey(liveKey(slug));
}

/** DRAFT — the studio's working copy. */
export async function getPuckDraft(slug: string): Promise<PuckPageData | null> {
  return readKey(draftKey(slug));
}

/** Save the studio's working copy (does NOT touch LIVE). */
export async function setPuckDraft(slug: string, data: PuckPageData): Promise<void> {
  await kv(["SET", draftKey(slug), JSON.stringify(data)]);
  await kv(["SADD", INDEX_KEY, slug]);
}

/** Publish: copy this page's DRAFT onto LIVE. Returns false if there's no draft. */
export async function publishDraft(slug: string): Promise<boolean> {
  const draft = await getPuckDraft(slug);
  if (!draft) return false;
  await kv(["SET", liveKey(slug), JSON.stringify(draft)]);
  await kv(["SADD", INDEX_KEY, slug]);
  return true;
}

/** Publish every page that has a draft (the "push the full site at once" button). */
export async function publishAll(): Promise<string[]> {
  const slugs = await listPuckPages();
  const done: string[] = [];
  for (const slug of slugs) {
    if (await publishDraft(slug)) done.push(slug);
  }
  return done;
}

/** All known slugs (draft or live) — for the page switcher and Publish-all. */
export async function listPuckPages(): Promise<string[]> {
  try {
    const raw = (await kv(["SMEMBERS", INDEX_KEY])) as string[] | null;
    return Array.isArray(raw) ? raw.sort() : [];
  } catch {
    return [];
  }
}
