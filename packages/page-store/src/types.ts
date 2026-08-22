/**
 * Shared types + the driver contract for @pacsarcade/page-store.
 *
 * A driver is a string-valued key/value store with native string SETS — the
 * exact six-op surface the studio's document store needs (GET/SET/DEL plus
 * SADD/SREM/SMEMBERS for the page index). Nothing Puck-shaped crosses the
 * boundary: serialisation lives in the store layer, storage lives here.
 */

export interface PuckPageData {
  content: unknown[];
  root: unknown;
  zones?: Record<string, unknown[]>;
}

/** When/where a popup renders — editable in the studio's popups panel. */
export interface PopupTrigger {
  enabled: boolean;
  delayMs: number;
  oncePerSession: boolean;
  pages: string[];
}

export interface PageStoreDriver {
  /** False when the driver's backend isn't configured (e.g. KV_REST_API_*
   *  unset). Every store helper then quietly no-ops/returns null, and the
   *  pages panel shows its controls disabled-with-reason instead of
   *  pretending to write. Checked per call, never cached. */
  ready(): boolean;
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
  del(...keys: string[]): Promise<void>;
  sadd(key: string, member: string): Promise<void>;
  srem(key: string, member: string): Promise<void>;
  smembers(key: string): Promise<string[]>;
}

export type PageStoreDriverName = "kv" | "filesystem" | "git";

export interface PageStoreConfig {
  /** Which storage backend to use. Default "kv" — today's behaviour. */
  driver?: PageStoreDriverName;
  /** Site namespace prepended to every key as `<namespace>:<key>` —
   *  write-under-namespace, read-namespace-then-legacy (see namespace.ts).
   *  Default undefined/empty: today's bare keys, byte-identical. */
  namespace?: string;
  kv?: KvDriverConfig;
  fs?: FilesystemDriverConfig;
  git?: GitDriverConfig;
}

export interface KvDriverConfig {
  /** Resolves the Upstash REST credentials. Called on EVERY operation (not
   *  cached at construction) so credentials landing in env mid-process are
   *  picked up — the exact behaviour the host file always had. Defaults to
   *  reading KV_REST_API_URL / KV_REST_API_TOKEN from process.env. */
  restEnv?: () => { url: string; token: string } | null;
}

export interface FilesystemDriverConfig {
  /** Directory holding one JSON file per key. Default: data/puck-store/
   *  under the process working directory — created lazily on first write. */
  dir?: string;
}

/**
 * GIT DRIVER — SCOPED DESIGN STUB. The interface and the commit-message
 * convention below are the deliverable; the implementation deliberately does
 * not exist yet (a half-shipped git driver is worse than none). Selecting
 * driver "git" throws loudly at createPageStore() instead of silently
 * discarding work.
 *
 * The design, for whoever builds it: a page document IS a file, so the store
 * maps keys to paths under `repoDir` — `pages/<slug>.draft.json`,
 * `pages/<slug>.live.json`, `index.json`, `page-order.json`,
 * `popup-config.json` — and every mutating store op is one commit on
 * `branch` (default the repo's current branch), pushed to `remote` when set
 * (push failure must surface, never queue silently). The git driver is the
 * only driver whose writes are durable AND reviewable, so it is the natural
 * home for a second operator's edits converging by merge instead of
 * last-write-wins.
 *
 * Commit-message convention (the contract a real implementation must keep —
 * conventional-commits flavour, matching house style):
 *
 *   draft(<slug>): save                     — setPuckDraft (autosave; noisy
 *                                             by design, drafts are cheap)
 *   publish(<slug>): draft → live           — publishDraft
 *   publish: all (<n> pages)                — publishAll, ONE commit
 *   pages: rename <old> → <new>             — renamePuckPage
 *   pages: delete <slug>                    — deletePuckPage
 *   pages: duplicate <src> → <dest>         — duplicatePuckPage
 *   pages: reorder                          — setPageOrder
 *   popups: trigger <name>                  — setPopupTrigger
 *   popups: untrigger <name>                — removePopupTrigger
 *
 * Author identity comes from authorName/authorEmail (default: the repo's
 * git config), so Love's studio commits read as Love's commits in the log.
 */
export interface GitDriverConfig {
  repoDir: string;
  branch?: string;
  remote?: string;
  authorName?: string;
  authorEmail?: string;
}
