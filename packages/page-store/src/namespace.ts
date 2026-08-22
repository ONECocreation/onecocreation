import type { PageStoreDriver } from "./types";

/**
 * Site namespacing — the brand-collision fix, as a driver decorator so it
 * applies to every backend uniformly.
 *
 * Two sites sharing one KV collide on bare keys like `puck:page:home`. With
 * a namespace configured, every key becomes `<namespace>:<key>`:
 *
 *   WRITE — under the namespace only (set, sadd). New state never lands on
 *           the legacy bare keys again.
 *   READ  — namespace first, then the legacy bare key (get); set reads
 *           UNION both (smembers) so the page index keeps listing pages
 *           that only exist under legacy keys. This is the compat read that
 *           keeps already-live pages resolving the moment a site opts in —
 *           no migration runbook, no downtime.
 *   ERASE — both (del, srem). A rename/delete must not leave a legacy ghost
 *           behind that the compat read would resurrect.
 *
 * Empty/absent namespace returns the inner driver untouched — today's keys,
 * byte-identical.
 */
export function withNamespace(inner: PageStoreDriver, namespace?: string): PageStoreDriver {
  const ns = (namespace ?? "").trim();
  if (!ns) return inner;
  const nk = (key: string) => `${ns}:${key}`;
  return {
    ready: () => inner.ready(),
    async get(key) {
      return (await inner.get(nk(key))) ?? (await inner.get(key));
    },
    set: (key, value) => inner.set(nk(key), value),
    del: (...keys) => inner.del(...keys.flatMap((k) => [nk(k), k])),
    sadd: (key, member) => inner.sadd(nk(key), member),
    async srem(key, member) {
      await inner.srem(nk(key), member);
      await inner.srem(key, member);
    },
    async smembers(key) {
      const [namespaced, legacy] = await Promise.all([inner.smembers(nk(key)), inner.smembers(key)]);
      return [...new Set([...namespaced, ...legacy])];
    },
  };
}
