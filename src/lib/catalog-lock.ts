/**
 * TASK-163 (0018.06.17 a₿ · block 966080) — the catalog write lock.
 *
 * store.ts's catalog is a whole-document read-modify-write on KV key
 * `store:catalog`. Two settles in the same instant (T-145's spendInventory)
 * or an editor save beside a settle each read the same doc and the last
 * writer wins — a lost inventory decrement or a lost edit. withCatalog()
 * makes the read-mutate-write atomic:
 *
 * - ONE PROCESS: a process-local promise chain serializes every catalog
 *   mutation. On the file/blob dev paths (no vault) this chain IS the lock.
 * - MANY INSTANCES (prod vault): a short KV lock —
 *   `SET store:catalog:lock <token> NX PX 4000` — retried with jitter for
 *   up to ~2 s, then an honest give-up in words (nothing was saved). The
 *   release is a tiny Lua EVAL (compare-and-delete), so a lock is only
 *   ever released by the token that took it; the 4 s TTL self-heals any
 *   holder that dies mid-write.
 *
 * The module is generic over the doc shape and takes its io by injection,
 * so it never imports store.ts (which imports this) — no import cycle.
 */

export interface CatalogLockIo<T> {
  read: () => Promise<T>;
  write: (doc: T) => Promise<void>;
  /** store.ts's vault command sender — null result = vault not configured */
  kv: (cmd: unknown[]) => Promise<{ result: unknown } | null>;
  vaultConfigured: () => boolean;
}

const LOCK_KEY = "store:catalog:lock";
/** Short: a catalog write is one JSON doc — seconds is an eternity. */
const LOCK_TTL_MS = 4000;
/** Total patience for a busy catalog before giving up in words. */
const LOCK_WAIT_MS = 2000;
const RETRY_MIN_MS = 40;
const RETRY_JITTER_MS = 80;

/** Compare-and-delete: only the token's owner releases the lock. */
const RELEASE_LUA =
  "if redis.call('GET', KEYS[1]) == ARGV[1] then return redis.call('DEL', KEYS[1]) else return 0 end";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function newLockToken(): string {
  const bytes = new Uint8Array(12);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Build the `withCatalog(mutate)` a store module routes every catalog
 * mutation through: lock → read → mutate → write → release. The returned
 * promise resolves to the doc as written; if mutate throws, nothing is
 * written and the lock is still released.
 */
export function createWithCatalog<T>(
  io: CatalogLockIo<T>,
): (mutate: (doc: T) => T | Promise<T>) => Promise<T> {
  /* The process-local chain: every mutation in this process queues behind
     the last, vault or not. A rejection must not break the chain. */
  let chain: Promise<unknown> = Promise.resolve();

  async function acquireKv(): Promise<string | null> {
    const token = newLockToken();
    const deadline = Date.now() + LOCK_WAIT_MS;
    for (;;) {
      let res: { result: unknown } | null;
      try {
        res = await io.kv(["SET", LOCK_KEY, token, "NX", "PX", String(LOCK_TTL_MS)]);
      } catch {
        /* vault unreachable mid-call — read/write already fall back to the
           legacy paths in that case, so proceed on the local chain alone
           (today's behaviour) rather than refuse a write that would land. */
        return null;
      }
      if (res?.result === "OK") return token;
      if (Date.now() >= deadline) {
        throw new Error(
          "store: the catalog is busy with another change — nothing was saved; try again in a moment",
        );
      }
      await sleep(RETRY_MIN_MS + Math.floor(Math.random() * RETRY_JITTER_MS));
    }
  }

  async function releaseKv(token: string): Promise<void> {
    try {
      await io.kv(["EVAL", RELEASE_LUA, "1", LOCK_KEY, token]);
    } catch {
      /* best effort — the 4 s TTL lets a lost release heal itself */
    }
  }

  return function withCatalog(mutate: (doc: T) => T | Promise<T>): Promise<T> {
    const run = chain.then(async (): Promise<T> => {
      const token = io.vaultConfigured() ? await acquireKv() : null;
      try {
        const doc = await io.read();
        const next = await mutate(doc);
        await io.write(next);
        return next;
      } finally {
        if (token !== null) await releaseKv(token);
      }
    });
    chain = run.catch(() => {});
    return run;
  };
}
