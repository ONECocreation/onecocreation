/**
 * Puck store — this site's binding of @pacsarcade/page-store (the machinery
 * that used to live in this file, extracted behind sovereign storage
 * drivers). The contract is unchanged: DRAFT/LIVE staging, publish, page
 * management, the popup registry, and honest no-ops when the backend isn't
 * configured. Public routes read LIVE only, so visitors never see
 * unpublished work.
 *
 *   puck:draft:<slug>  — the studio's working copy. Autosaved on every edit.
 *   puck:page:<slug>   — LIVE. Only what /p/<slug> and real pages serve.
 *   puck:pages         — index set of every known slug (for Publish-all + picker)
 *
 * This site's driver config, from env:
 *
 *   PUCK_STORE_DRIVER      kv (default — today's behaviour, byte-identical)
 *                          | filesystem (local dev: saves actually persist)
 *                          | git (scoped design stub — throws, not implemented)
 *   PUCK_STORE_FS_DIR      filesystem driver's directory
 *                          (default data/puck-store/ under the repo root)
 *   PUCK_STORE_NAMESPACE   site namespace prepended to every key, with a
 *                          compat read of the legacy bare keys (default
 *                          unset: today's bare keys, byte-identical)
 *   KV_REST_API_URL / KV_REST_API_TOKEN — the kv driver's backend, unchanged
 */
import {
  createPageStore,
  type PageStoreDriverName,
} from "@pacsarcade/page-store";

const store = createPageStore({
  driver: (process.env.PUCK_STORE_DRIVER || undefined) as PageStoreDriverName | undefined,
  namespace: process.env.PUCK_STORE_NAMESPACE || undefined,
  fs: { dir: process.env.PUCK_STORE_FS_DIR || undefined },
});

export type { PuckPageData, PopupTrigger } from "@pacsarcade/page-store";

/** False in dev when KV_REST_API_* aren't set — every helper below then
 *  quietly no-ops/returns null, and the pages panel shows its controls
 *  disabled-with-reason instead of pretending to write. */
export const puckStoreReady = store.puckStoreReady;

export const getPuckPage = store.getPuckPage;
export const getPuckDraft = store.getPuckDraft;
export const setPuckDraft = store.setPuckDraft;
export const publishDraft = store.publishDraft;
export const publishAll = store.publishAll;
export const listPuckPages = store.listPuckPages;

export const renamePuckPage = store.renamePuckPage;
export const deletePuckPage = store.deletePuckPage;
export const duplicatePuckPage = store.duplicatePuckPage;
export const getPageOrder = store.getPageOrder;
export const setPageOrder = store.setPageOrder;

export const getPopupTriggers = store.getPopupTriggers;
export const setPopupTrigger = store.setPopupTrigger;
export const removePopupTrigger = store.removePopupTrigger;
