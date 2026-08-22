import type { KvDriverConfig, PageStoreDriver } from "./types";

/**
 * KV driver — bare Upstash REST over fetch, byte-identical to the kv()
 * helper the host's puck-store.ts always ran (same request shape, same
 * `puck-store: KV <status>` error, same silent null when unconfigured).
 *
 * Credentials resolve on EVERY call, never at construction: the host file
 * read restEnv() per operation, and a token landing in env mid-process
 * (or removed from it) must change behaviour immediately.
 */

/** The default resolver — Vercel's KV integration injects these. */
export function restEnvFromProcess(): { url: string; token: string } | null {
  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  return url && token ? { url, token } : null;
}

export function kvDriver(config?: KvDriverConfig): PageStoreDriver {
  const restEnv = config?.restEnv ?? restEnvFromProcess;

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

  return {
    ready: () => restEnv() !== null,
    async get(key) {
      return (await kv(["GET", key])) as string | null;
    },
    async set(key, value) {
      await kv(["SET", key, value]);
    },
    async del(...keys) {
      await kv(["DEL", ...keys]);
    },
    async sadd(key, member) {
      await kv(["SADD", key, member]);
    },
    async srem(key, member) {
      await kv(["SREM", key, member]);
    },
    async smembers(key) {
      const raw = (await kv(["SMEMBERS", key])) as string[] | null;
      return Array.isArray(raw) ? raw : [];
    },
  };
}
