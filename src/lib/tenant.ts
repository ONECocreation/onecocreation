/**
 * The ONE tenant constant (TASK-97, cut 0018.06.10 a₿) — a single
 * env-driven name behind every tenant-scoped KV key and HMAC label, so a
 * second StudioPac tenant sharing infrastructure gets its own keyspace
 * instead of colliding with One Cocreation's.
 *
 * Default 'onecocreation' is load-bearing: under the default every key is
 * byte-identical to the pre-namespacing literals, so existing data (the
 * saved brand palette, the pasted media GitHub token, the derived presence
 * room) keeps resolving untouched. tests/tenant-keys.test.ts proves it.
 *
 * Server-side only — reads process.env at module load.
 */
export const TENANT = process.env.TENANT?.trim() || "onecocreation";
