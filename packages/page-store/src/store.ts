import type { PageStoreConfig, PageStoreDriver, PopupTrigger, PuckPageData } from "./types";
import { kvDriver } from "./kv-driver";
import { filesystemDriver } from "./fs-driver";
import { withNamespace } from "./namespace";

/**
 * The page store — KV persistence for the visual editor, with DRAFT/LIVE
 * staging (Admiral, 2026-08-11: "a draft mode to leave it staged and push
 * the full site at one time... or at least edit a page at a time").
 *
 *   puck:draft:<slug>  — the studio's working copy. Autosaved on every edit.
 *   puck:page:<slug>   — LIVE. Only what /p/<slug> and real pages serve.
 *   puck:pages         — index set of every known slug (for Publish-all + picker)
 *
 * Public routes read LIVE only, so visitors never see unpublished work. The
 * studio loads DRAFT (falling back to LIVE, then a page seed). Publish copies
 * DRAFT → LIVE.
 *
 * Extracted from onecocreation's src/lib/puck-store.ts behind the driver
 * contract (types.ts). The kv default is byte-identical to that file — same
 * keys, same op order, same silent-null degradation when unconfigured.
 */

const liveKey = (slug: string) => `puck:page:${slug}`;
const draftKey = (slug: string) => `puck:draft:${slug}`;
const INDEX_KEY = "puck:pages";
/* STUDIO P1: the pages panel's display order — seeds hold their canonical
   order as defaults, this key only records the operator's rearrangement */
const ORDER_KEY = "puck:page-order";
const POPUP_CONFIG_KEY = "puck:popup-config";

export interface PageStore {
  /** False when the driver's backend isn't configured — every helper below
   *  then quietly no-ops/returns null, and the pages panel shows its
   *  controls disabled-with-reason instead of pretending to write. */
  puckStoreReady(): boolean;

  /** LIVE — what the public sees. Unchanged contract: /p/<slug> and real pages read this. */
  getPuckPage(slug: string): Promise<PuckPageData | null>;
  /** DRAFT — the studio's working copy. */
  getPuckDraft(slug: string): Promise<PuckPageData | null>;
  /** Save the studio's working copy (does NOT touch LIVE). */
  setPuckDraft(slug: string, data: PuckPageData): Promise<void>;
  /** Publish: copy this page's DRAFT onto LIVE. Returns false if there's no draft. */
  publishDraft(slug: string): Promise<boolean>;
  /** Publish every page that has a draft (the "push the full site at once" button). */
  publishAll(): Promise<string[]>;
  /** All known slugs (draft or live) — for the page switcher and Publish-all. */
  listPuckPages(): Promise<string[]>;

  /** Rename: move DRAFT + LIVE onto the new slug and update index + order. */
  renamePuckPage(oldSlug: string, newSlug: string): Promise<void>;
  /** Delete: remove DRAFT, LIVE, the index entry and any order entry. */
  deletePuckPage(slug: string): Promise<void>;
  /** Duplicate: write dest's DRAFT from src's DRAFT ?? LIVE. Returns false
   *  when src has neither (the API route handles seed sources itself). */
  duplicatePuckPage(src: string, dest: string): Promise<boolean>;

  /** The operator's page order; [] when never set, null on read trouble. */
  getPageOrder(): Promise<string[] | null>;
  setPageOrder(order: string[]): Promise<void>;

  /** The operator's popup trigger overrides; null on read trouble, {} when never set. */
  getPopupTriggers(): Promise<Record<string, PopupTrigger> | null>;
  setPopupTrigger(name: string, trigger: PopupTrigger): Promise<void>;
  removePopupTrigger(name: string): Promise<void>;
}

function buildDriver(config: PageStoreConfig): PageStoreDriver {
  const name = config.driver ?? "kv";
  const base =
    name === "kv"
      ? kvDriver(config.kv)
      : name === "filesystem"
        ? filesystemDriver(config.fs)
        : (() => {
            /* git is a SCOPED DESIGN STUB (see GitDriverConfig in types.ts).
               Selecting it fails loudly here rather than silently discarding
               an operator's work into a driver that doesn't exist. */
            throw new Error(
              "page-store: the git driver is a scoped design stub, not an " +
                "implementation — the interface + commit-message convention " +
                "live in types.ts (GitDriverConfig). Use kv or filesystem.",
            );
          })();
  return withNamespace(base, config.namespace);
}

export function createPageStore(config: PageStoreConfig = {}): PageStore {
  const driver = buildDriver(config);

  async function readKey(key: string): Promise<PuckPageData | null> {
    try {
      const raw = await driver.get(key);
      return raw ? (JSON.parse(raw) as PuckPageData) : null;
    } catch {
      return null;
    }
  }

  async function getPuckPage(slug: string): Promise<PuckPageData | null> {
    return readKey(liveKey(slug));
  }

  async function getPuckDraft(slug: string): Promise<PuckPageData | null> {
    return readKey(draftKey(slug));
  }

  async function setPuckDraft(slug: string, data: PuckPageData): Promise<void> {
    await driver.set(draftKey(slug), JSON.stringify(data));
    await driver.sadd(INDEX_KEY, slug);
  }

  async function publishDraft(slug: string): Promise<boolean> {
    const draft = await getPuckDraft(slug);
    if (!draft) return false;
    await driver.set(liveKey(slug), JSON.stringify(draft));
    await driver.sadd(INDEX_KEY, slug);
    return true;
  }

  async function listPuckPages(): Promise<string[]> {
    try {
      const raw = await driver.smembers(INDEX_KEY);
      return raw.sort();
    } catch {
      return [];
    }
  }

  async function publishAll(): Promise<string[]> {
    const slugs = await listPuckPages();
    const done: string[] = [];
    for (const slug of slugs) {
      if (await publishDraft(slug)) done.push(slug);
    }
    return done;
  }

  /* ── STUDIO P1: page management (the pages panel) ──────────────────────
     Same silent-null contract as above: with no backend these simply no-op,
     and the API route reports readiness separately so the UI can be honest
     about it. */

  async function renamePuckPage(oldSlug: string, newSlug: string): Promise<void> {
    const [draft, live] = await Promise.all([getPuckDraft(oldSlug), getPuckPage(oldSlug)]);
    if (draft) await driver.set(draftKey(newSlug), JSON.stringify(draft));
    if (live) await driver.set(liveKey(newSlug), JSON.stringify(live));
    await driver.del(draftKey(oldSlug), liveKey(oldSlug));
    await driver.srem(INDEX_KEY, oldSlug);
    await driver.sadd(INDEX_KEY, newSlug);
    const order = await getPageOrder();
    if (order?.includes(oldSlug)) await setPageOrder(order.map((s) => (s === oldSlug ? newSlug : s)));
  }

  async function deletePuckPage(slug: string): Promise<void> {
    await driver.del(draftKey(slug), liveKey(slug));
    await driver.srem(INDEX_KEY, slug);
    const order = await getPageOrder();
    if (order?.includes(slug)) await setPageOrder(order.filter((s) => s !== slug));
  }

  async function duplicatePuckPage(src: string, dest: string): Promise<boolean> {
    const data = (await getPuckDraft(src)) ?? (await getPuckPage(src));
    if (!data) return false;
    await setPuckDraft(dest, data);
    return true;
  }

  async function getPageOrder(): Promise<string[] | null> {
    try {
      const raw = await driver.get(ORDER_KEY);
      if (!raw) return [];
      const arr = JSON.parse(raw) as unknown;
      return Array.isArray(arr) ? arr.filter((s): s is string => typeof s === "string") : [];
    } catch {
      return null;
    }
  }

  async function setPageOrder(order: string[]): Promise<void> {
    await driver.set(ORDER_KEY, JSON.stringify(order));
  }

  /* ── STUDIO P2: the popup registry ─────────────────────────────────────
     Popups are full Puck documents in the `popup:<name>` slug lane (they
     ride the same draft/live keys as pages — colons are fine in keys).
     WHEN and WHERE each one shows is content, not code: this trigger map,
     overlaid on the host's code-side defaults. */

  async function getPopupTriggers(): Promise<Record<string, PopupTrigger> | null> {
    try {
      const raw = await driver.get(POPUP_CONFIG_KEY);
      if (!raw) return {};
      const obj = JSON.parse(raw) as unknown;
      return obj && typeof obj === "object" && !Array.isArray(obj)
        ? (obj as Record<string, PopupTrigger>)
        : {};
    } catch {
      return null;
    }
  }

  async function setPopupTrigger(name: string, trigger: PopupTrigger): Promise<void> {
    const all = (await getPopupTriggers()) ?? {};
    all[name] = trigger;
    await driver.set(POPUP_CONFIG_KEY, JSON.stringify(all));
  }

  async function removePopupTrigger(name: string): Promise<void> {
    const all = await getPopupTriggers();
    if (!all || !(name in all)) return;
    delete all[name];
    await driver.set(POPUP_CONFIG_KEY, JSON.stringify(all));
  }

  return {
    puckStoreReady: () => driver.ready(),
    getPuckPage,
    getPuckDraft,
    setPuckDraft,
    publishDraft,
    publishAll,
    listPuckPages,
    renamePuckPage,
    deletePuckPage,
    duplicatePuckPage,
    getPageOrder,
    setPageOrder,
    getPopupTriggers,
    setPopupTrigger,
    removePopupTrigger,
  };
}
