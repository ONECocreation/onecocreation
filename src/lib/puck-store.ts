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
 * DRAFT → LIVE. Same bare Upstash-REST kv() helper as letters.ts.
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
/* STUDIO P1: the pages panel's display order — seeds hold their canonical
   order as defaults, this key only records the operator's rearrangement */
const ORDER_KEY = "puck:page-order";

/** False in dev when KV_REST_API_* aren't set — every helper below then
 *  quietly no-ops/returns null, and the pages panel shows its controls
 *  disabled-with-reason instead of pretending to write. */
export function puckStoreReady(): boolean {
  return restEnv() !== null;
}

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

/* ── STUDIO P1: page management (the pages panel) ──────────────────────────
   Same silent-null contract as above: with no KV these simply no-op, and the
   API route reports readiness separately so the UI can be honest about it. */

/** Rename: move DRAFT + LIVE onto the new slug and update index + order. */
export async function renamePuckPage(oldSlug: string, newSlug: string): Promise<void> {
  const [draft, live] = await Promise.all([getPuckDraft(oldSlug), getPuckPage(oldSlug)]);
  if (draft) await kv(["SET", draftKey(newSlug), JSON.stringify(draft)]);
  if (live) await kv(["SET", liveKey(newSlug), JSON.stringify(live)]);
  await kv(["DEL", draftKey(oldSlug), liveKey(oldSlug)]);
  await kv(["SREM", INDEX_KEY, oldSlug]);
  await kv(["SADD", INDEX_KEY, newSlug]);
  const order = await getPageOrder();
  if (order?.includes(oldSlug)) await setPageOrder(order.map((s) => (s === oldSlug ? newSlug : s)));
}

/** Delete: remove DRAFT, LIVE, the index entry and any order entry. */
export async function deletePuckPage(slug: string): Promise<void> {
  await kv(["DEL", draftKey(slug), liveKey(slug)]);
  await kv(["SREM", INDEX_KEY, slug]);
  const order = await getPageOrder();
  if (order?.includes(slug)) await setPageOrder(order.filter((s) => s !== slug));
}

/** Duplicate: write dest's DRAFT from src's DRAFT ?? LIVE. Returns false
 *  when src has neither (the API route handles seed sources itself). */
export async function duplicatePuckPage(src: string, dest: string): Promise<boolean> {
  const data = (await getPuckDraft(src)) ?? (await getPuckPage(src));
  if (!data) return false;
  await setPuckDraft(dest, data);
  return true;
}

/** The operator's page order; [] when never set, null on read trouble. */
export async function getPageOrder(): Promise<string[] | null> {
  try {
    const raw = (await kv(["GET", ORDER_KEY])) as string | null;
    if (!raw) return [];
    const arr = JSON.parse(raw) as unknown;
    return Array.isArray(arr) ? arr.filter((s): s is string => typeof s === "string") : [];
  } catch {
    return null;
  }
}

export async function setPageOrder(order: string[]): Promise<void> {
  await kv(["SET", ORDER_KEY, JSON.stringify(order)]);
}

/* ── STUDIO P2: the popup registry ─────────────────────────────────────────
   Popups are full Puck documents in the `popup:<name>` slug lane (they ride
   the same draft/live keys as pages — colons are fine in KV keys). WHEN and
   WHERE each one shows is content, not code: this trigger map, overlaid on
   the code-side defaults (src/lib/puck-popups.ts). */

/** When/where a popup renders — editable in the studio's popups panel. */
export interface PopupTrigger {
  enabled: boolean;
  delayMs: number;
  oncePerSession: boolean;
  pages: string[];
}

const POPUP_CONFIG_KEY = "puck:popup-config";

/** The operator's trigger overrides; null on read trouble, {} when never set. */
export async function getPopupTriggers(): Promise<Record<string, PopupTrigger> | null> {
  try {
    const raw = (await kv(["GET", POPUP_CONFIG_KEY])) as string | null;
    if (!raw) return {};
    const obj = JSON.parse(raw) as unknown;
    return obj && typeof obj === "object" && !Array.isArray(obj)
      ? (obj as Record<string, PopupTrigger>)
      : {};
  } catch {
    return null;
  }
}

export async function setPopupTrigger(name: string, trigger: PopupTrigger): Promise<void> {
  const all = (await getPopupTriggers()) ?? {};
  all[name] = trigger;
  await kv(["SET", POPUP_CONFIG_KEY, JSON.stringify(all)]);
}

export async function removePopupTrigger(name: string): Promise<void> {
  const all = await getPopupTriggers();
  if (!all || !(name in all)) return;
  delete all[name];
  await kv(["SET", POPUP_CONFIG_KEY, JSON.stringify(all)]);
}
