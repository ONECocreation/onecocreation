import { promises as fs } from "fs";
import path from "path";
import { put, get } from "@vercel/blob";
import { blobStoreEnabled } from "./registry";
import { kv } from "./store";
import { squareEnv, squareFetch } from "./payments";

/**
 * SQUARE CATALOG DISPLAY — one-way (Admiral's walk, the money-desk build
 * that replaced the dead "soon" chip on /a/money).
 *
 * THE RULE, said plainly: our own store.ts catalog stays canonical, full
 * stop. This file:
 *   - NEVER writes to Square (read-only calls only — GET /v2/catalog/list).
 *   - NEVER upserts a Square item into store.ts's catalog (no upsertItem()
 *     call anywhere in this file) — a Square-sourced item is never given a
 *     local StoreItem id or a place in the canonical shelf.
 *   - NEVER syncs back the other direction — there is no write path here at
 *     all, one-way by construction, not by discipline alone.
 * A Square item shown by this file is a DISPLAY-LAYER-ONLY record on the
 * admin desk (/a/money), marked "via Square" — nothing here writes it into
 * the storefront; that's a bigger product decision left for a later build.
 *
 * WHY one-way, not two-way sync: a two-way sync invites exactly the class of
 * bug this codebase works hard to avoid elsewhere (see store.ts's own
 * "THE VAULT IS THE CATALOG'S TRUTH" note on blob read-modify-write races) —
 * two systems both claiming to be the truth for the same item's price/stock
 * is a guaranteed eventual desync. One direction, one truth (ours), Square's
 * catalog is read fresh (never cached past a few minutes, never trusted
 * from a stale client payload) so "one-way" doesn't mean "stale."
 *
 * Settings storage: the house dual-driver single-doc pattern (KV → Vercel
 * Blob → dev file), same shape store.ts's other single-doc settings use.
 */

export interface SquareCatalogSettings {
  enabled: boolean;
  /** empty = show every fetched item; non-empty = an admin-curated allowlist */
  selectedIds: string[];
}

const DEFAULT_SETTINGS: SquareCatalogSettings = { enabled: false, selectedIds: [] };

const SETTINGS_BLOB = "store/square-catalog-settings.json";
const settingsFile = () => path.join(process.cwd(), "data", "store-square-catalog-settings.json");
const SETTINGS_KV = "store:square-catalog-settings";

function sanitizeSettings(raw: unknown): SquareCatalogSettings {
  if (!raw || typeof raw !== "object") return DEFAULT_SETTINGS;
  const r = raw as Partial<SquareCatalogSettings>;
  const selectedIds = Array.isArray(r.selectedIds)
    ? [...new Set(r.selectedIds.filter((id): id is string => typeof id === "string" && id.trim().length > 0))].slice(0, 500)
    : [];
  return { enabled: !!r.enabled, selectedIds };
}

async function readSettingsDoc(): Promise<SquareCatalogSettings> {
  try {
    const kvRes = await kv(["GET", SETTINGS_KV]);
    if (kvRes?.result) return sanitizeSettings(JSON.parse(kvRes.result as string));
  } catch {
    /* vault unreachable → legacy paths below */
  }
  if (blobStoreEnabled()) {
    try {
      const res = await get(SETTINGS_BLOB, { access: "public" });
      if (res && res.statusCode === 200) {
        return sanitizeSettings(JSON.parse(await new Response(res.stream).text()));
      }
    } catch {
      /* fall through to the default */
    }
    return DEFAULT_SETTINGS;
  }
  try {
    return sanitizeSettings(JSON.parse(await fs.readFile(settingsFile(), "utf8")));
  } catch {
    return DEFAULT_SETTINGS;
  }
}

async function writeSettingsDoc(doc: SquareCatalogSettings): Promise<void> {
  const json = JSON.stringify(doc, null, 2);
  try {
    const res = await kv(["SET", SETTINGS_KV, json]);
    if (res) return;
  } catch {
    /* vault write failed → fall through so dev/file still works */
  }
  if (blobStoreEnabled()) {
    await put(SETTINGS_BLOB, json, {
      access: "public",
      allowOverwrite: true,
      addRandomSuffix: false,
      contentType: "application/json",
    });
    return;
  }
  await fs.mkdir(path.dirname(settingsFile()), { recursive: true });
  const tmp = settingsFile() + ".tmp";
  await fs.writeFile(tmp, json, "utf8");
  await fs.rename(tmp, settingsFile());
}

export async function getSquareCatalogSettings(): Promise<SquareCatalogSettings> {
  return readSettingsDoc();
}

export async function saveSquareCatalogSettings(raw: unknown): Promise<SquareCatalogSettings> {
  const clean = sanitizeSettings(raw);
  await writeSettingsDoc(clean);
  return clean;
}

// ---------------------------------------------------------------------------
// The live Square Catalog read (GET /v2/catalog/list?types=ITEM — the
// documented, real Catalog API "list" call; read-only, no write counterpart
// used anywhere in this file).
// ---------------------------------------------------------------------------

export interface SquareCatalogDisplayItem {
  id: string;
  name: string;
  description?: string;
  /** integer minor units — the exact shape Square's Money type carries */
  amount: number;
  currency: string;
}

/** Pure — maps ONE Square CatalogObject into our display shape, or null if
 *  it can't be shown honestly (wrong type, deleted, no name, no price on
 *  any variation). Split out so it's unit-testable without a network call. */
export function mapCatalogObjectToDisplayItem(obj: unknown): SquareCatalogDisplayItem | null {
  if (!obj || typeof obj !== "object") return null;
  const o = obj as Record<string, unknown>;
  if (o.type !== "ITEM" || o.is_deleted === true) return null;
  const id = typeof o.id === "string" ? o.id : null;
  const itemData = o.item_data as Record<string, unknown> | undefined;
  const name = typeof itemData?.name === "string" ? itemData.name.trim() : "";
  if (!id || !name) return null;
  const variations = Array.isArray(itemData?.variations) ? (itemData!.variations as unknown[]) : [];
  let priceMoney: { amount?: unknown; currency?: unknown } | undefined;
  for (const v of variations) {
    const vd = (v as Record<string, unknown> | undefined)?.item_variation_data as Record<string, unknown> | undefined;
    const pm = vd?.price_money as { amount?: unknown; currency?: unknown } | undefined;
    if (pm && typeof pm.amount === "number" && typeof pm.currency === "string") {
      priceMoney = pm;
      break;
    }
  }
  if (!priceMoney || typeof priceMoney.amount !== "number" || typeof priceMoney.currency !== "string") return null;
  const description = typeof itemData?.description === "string" && itemData.description.trim() ? itemData.description.trim() : undefined;
  return { id, name, description, amount: priceMoney.amount, currency: priceMoney.currency };
}

export interface SquareCatalogFetchResult {
  configured: boolean;
  items: SquareCatalogDisplayItem[];
  /** populated on any non-success path — never a silent empty list */
  reason?: string;
}

let catalogCache: { at: number; items: SquareCatalogDisplayItem[] } | null = null;
/** brief + re-checkable, same convention as squareBitcoinEnabled's cache */
const CATALOG_TTL_MS = 5 * 60 * 1000;

export async function fetchSquareCatalogItems(force = false): Promise<SquareCatalogFetchResult> {
  const env = squareEnv();
  if (!env) return { configured: false, items: [], reason: "Square isn't configured" };
  if (!force && catalogCache && Date.now() - catalogCache.at < CATALOG_TTL_MS) {
    return { configured: true, items: catalogCache.items };
  }
  try {
    const res = await squareFetch("/v2/catalog/list?types=ITEM", env);
    if (!res.ok) {
      return { configured: true, items: [], reason: `Square catalog read failed (${res.status})` };
    }
    const body = (await res.json()) as { objects?: unknown[] };
    const items = (body.objects ?? [])
      .map(mapCatalogObjectToDisplayItem)
      .filter((i): i is SquareCatalogDisplayItem => i !== null);
    catalogCache = { at: Date.now(), items };
    return { configured: true, items };
  } catch (err) {
    return { configured: true, items: [], reason: `Square unreachable — ${err instanceof Error ? err.message : "network error"}` };
  }
}
