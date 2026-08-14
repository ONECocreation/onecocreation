import { promises as fs } from "fs";
import path from "path";
import { nip19 } from "nostr-tools";

/**
 * TIERED ENTITLEMENT — the packages, wired to the framework's real gate.
 *
 * Two halves live here on purpose:
 *
 * 1. CONTENT (One Cocreation's own) — TIERS, the names and prices Love sells.
 * 2. MECHANISM (framework-shaped) — grant, revoke, look up a paid tier.
 *    Nothing below knows anything about Love specifically; it reads TIERS as
 *    config. When S2 is promoted upstream to frens.earth this half moves as a
 *    file, not a rewrite, and each clone brings only its own TIERS.
 *
 * THE GATE LAW (storefront-framework.md): the API is the gate, screens are
 * courtesy. The subject is the fren's REGISTRY npub — the mutable record,
 * never an on-chain anchor — so a lost nsec loses the key, not the paid
 * tiers: the operator rebinds the record and the tier follows it.
 *
 * ⛔ PRIVATE DRIVER. Who paid for what is nobody's business but Love's, so
 * this is the vault (KV / redis in prod, files under data/ in dev) — never
 * the public blob the artist roster uses.
 */

export type Tier = "A" | "B" | "C";

/* ── CONTENT: Love's packages ───────────────────────────────────────────── */
export const TIERS: Record<Tier, { name: string; priceUsd: number; priceSats: number }> = {
  /* Angel-number sats, proposed 0018.05.09 — NOT naive USD×rate. Love's
     confirmation pending (checklist): C may become 111,111, the
     mirror-digits Evening Star, instead of 177,777. */
  /* Names without "The" — the Admiral's call 0018.05.15. */
  A: { name: "Weekly Intuitive", priceUsd: 33, priceSats: 55_555 },
  B: { name: "Observer", priceUsd: 55.55, priceSats: 88_888 },
  C: { name: "Evening Star", priceUsd: 111.11, priceSats: 177_777 },
};

const RANK: Record<Tier, number> = { A: 1, B: 2, C: 3 };

/** Does `held` satisfy the `required` tier? Progressive: C ⊇ B ⊇ A. */
export function tierSatisfies(held: Tier | null, required: Tier): boolean {
  if (!held) return false;
  return RANK[held] >= RANK[required];
}

export const isTier = (v: unknown): v is Tier => v === "A" || v === "B" || v === "C";

export interface Entitlement {
  /** registry npub (hex) — the gate's subject */
  npub: string;
  tier: Tier;
  /** the order that paid for it — the audit trail back to the money */
  orderId: string;
  grantedAtMs: number;
  /** matrix id, once the member has linked or been provisioned one */
  mxid?: string;
  revokedAtMs?: number;
  /** a TASTER grant only — e.g. the $11 one-week pass. Absent = the open-
   *  ended monthly membership. Read as expired (no access) once past. */
  expiresAtMs?: number;
}

/* ── the vault (same transports as orders and bookings) ─────────────────── */

function restEnv(): { url: string; token: string } | null {
  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  return url && token ? { url, token } : null;
}

const vaultConfigured = () => restEnv() !== null || !!process.env.REDIS_URL;

/** Prod requires the vault; dev uses files. False = grants honestly refuse. */
export function entitlementsConfigured(): boolean {
  if (process.env.VERCEL === "1") return vaultConfigured();
  return true;
}

const key = (npub: string) => `oco:tier:${npub}`;
const INDEX = "oco:tiers:index";

type RedisLike = { sendCommand: (cmd: string[]) => Promise<unknown> };
let redisClient: RedisLike | null = null;

async function getRedis(): Promise<RedisLike> {
  if (redisClient) return redisClient;
  const { createClient } = await import("redis");
  const client = createClient({ url: process.env.REDIS_URL, socket: { connectTimeout: 5000 } });
  client.on("error", () => {
    redisClient = null;
  });
  await client.connect();
  redisClient = client as unknown as RedisLike;
  return redisClient;
}

async function kv(cmd: unknown[]): Promise<{ result: unknown } | null> {
  if (!vaultConfigured()) return null;
  const rest = restEnv();
  if (rest) {
    const res = await fetch(rest.url, {
      method: "POST",
      headers: { Authorization: `Bearer ${rest.token}`, "Content-Type": "application/json" },
      body: JSON.stringify(cmd),
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`entitlements: KV ${res.status}`);
    return (await res.json()) as { result: unknown };
  }
  try {
    const client = await getRedis();
    return { result: await client.sendCommand(cmd.map(String)) };
  } catch (err) {
    redisClient = null;
    throw new Error(`entitlements: redis ${err instanceof Error ? err.message : "error"}`);
  }
}

const dir = () => path.join(process.cwd(), "data", "entitlements");
const file = (npub: string) => path.join(dir(), `${npub}.json`);
// hex pubkeys are the canonical grant key; email members grant under their
// "address@email" subject — the identity that survives on their orders
const safeNpub = (n: string) => /^[a-f0-9]{64}$/i.test(n) || /^[^\s@]+@[^\s@]+@email$/.test(n);

/** hex or bech32 npub → canonical hex (null when it's neither). */
export function normalizeNpub(n: string | undefined | null): string | null {
  if (!n) return null;
  if (/^[a-f0-9]{64}$/i.test(n)) return n.toLowerCase();
  try {
    const d = nip19.decode(n);
    return d.type === "npub" ? (d.data as string) : null;
  } catch {
    return null;
  }
}

async function readRec(npub: string): Promise<Entitlement | null> {
  if (vaultConfigured()) {
    const res = await kv(["GET", key(npub)]);
    return typeof res?.result === "string" ? (JSON.parse(res.result) as Entitlement) : null;
  }
  try {
    return JSON.parse(await fs.readFile(file(npub), "utf8")) as Entitlement;
  } catch {
    return null;
  }
}

async function write(rec: Entitlement): Promise<void> {
  if (vaultConfigured()) {
    await kv(["SET", key(rec.npub), JSON.stringify(rec)]);
    await kv(["SADD", INDEX, rec.npub]);
    return;
  }
  await fs.mkdir(dir(), { recursive: true });
  const tmp = file(rec.npub) + ".tmp";
  await fs.writeFile(tmp, JSON.stringify(rec, null, 2), "utf8");
  await fs.rename(tmp, file(rec.npub));
}

/* ── reads ──────────────────────────────────────────────────────────────── */

/** The live tier for a registry npub. A revoked grant reads as nothing —
 *  so does a lapsed taster (expiresAtMs in the past): the ONE gate every
 *  tier check funnels through, so a week pass closing needs no separate
 *  sweep. */
export async function getEntitlement(npub: string): Promise<Entitlement | null> {
  if (!safeNpub(npub)) return null;
  const rec = await readRec(npub);
  if (!rec || rec.revokedAtMs) return null;
  if (rec.expiresAtMs != null && Date.now() > rec.expiresAtMs) return null;
  return rec;
}

/** Just the tier — what a gate check actually wants. */
export async function tierFor(npub: string): Promise<Tier | null> {
  return (await getEntitlement(npub))?.tier ?? null;
}

/** Everyone Love has granted, newest first — the console's members view. */
export async function listEntitlements(): Promise<Entitlement[]> {
  let npubs: string[] = [];
  if (vaultConfigured()) {
    const res = await kv(["SMEMBERS", INDEX]);
    npubs = Array.isArray(res?.result) ? (res.result as string[]) : [];
  } else {
    try {
      npubs = (await fs.readdir(dir())).filter((f) => f.endsWith(".json")).map((f) => f.slice(0, -5));
    } catch {
      npubs = [];
    }
  }
  const all = await Promise.all(npubs.map(readRec));
  return all
    .filter((e): e is Entitlement => e !== null)
    .sort((a, b) => b.grantedAtMs - a.grantedAtMs);
}

/* ── writes ─────────────────────────────────────────────────────────────── */

/**
 * Money landed → the tier is theirs.
 *
 * Idempotent, so the webhook and the reconcile poll may both call it. An
 * UPGRADE keeps the higher tier: a later grant never demotes someone who
 * already paid for more — an Evening Star who buys a Weekly Intuitive as a
 * gift for themselves must not lose the Evening Star.
 *
 * `opts.expiresAtMs` is the taster door (the $11/$22.22 one-week passes):
 * present = this grant closes on its own at that instant, no revoke needed.
 * The expiry only ever rides the WINNING tier of this call — a taster never
 * downgrades a standing permanent membership at the same or higher tier,
 * and a permanent purchase always clears any taster expiry it replaces. Two
 * tasters at the same tier extend to the later of the two (a renewed week).
 */
export async function grantTier(
  npub: string,
  tier: Tier,
  orderId: string,
  opts?: { mxid?: string; expiresAtMs?: number },
): Promise<Entitlement | null> {
  if (!safeNpub(npub) || !isTier(tier)) return null;
  const existing = await getEntitlement(npub);
  if (existing && existing.orderId === orderId && existing.tier === tier) return existing; // retry
  const keep = existing && RANK[existing.tier] > RANK[tier] ? existing.tier : tier;

  let expiresAtMs: number | undefined;
  if (keep !== tier) {
    // the standing grant outranks this purchase — its own expiry (if any) stands
    expiresAtMs = existing?.expiresAtMs;
  } else if (opts?.expiresAtMs == null) {
    // a permanent purchase at (or above) the standing tier — no more clock
    expiresAtMs = undefined;
  } else if (existing?.tier === tier && existing.expiresAtMs == null) {
    // already permanent at this tier — a taster can't downgrade it
    expiresAtMs = undefined;
  } else if (existing?.tier === tier && existing.expiresAtMs != null) {
    expiresAtMs = Math.max(existing.expiresAtMs, opts.expiresAtMs); // renewal stacks
  } else {
    expiresAtMs = opts.expiresAtMs;
  }

  const rec: Entitlement = {
    npub,
    tier: keep,
    orderId,
    grantedAtMs: existing?.grantedAtMs ?? Date.now(),
    mxid: opts?.mxid ?? existing?.mxid,
    expiresAtMs,
  };
  await write(rec);
  return rec;
}

/**
 * Refund, dispute, or the artist's own hand → the door closes.
 * Spec: revocation ships WITH the grant, never later — refunds arrive in week
 * one, and a charged-back purchase must not keep access forever.
 */
export async function revokeTier(npub: string): Promise<Entitlement | null> {
  const rec = await getEntitlement(npub);
  if (!rec) return null;
  const revoked: Entitlement = { ...rec, revokedAtMs: Date.now() };
  await write(revoked);
  return revoked;
}

/** Remember a member's matrix id without touching their tier. */
export async function linkMxid(npub: string, mxid: string): Promise<Entitlement | null> {
  const rec = await getEntitlement(npub);
  if (!rec) return null;
  const next = { ...rec, mxid };
  await write(next);
  return next;
}
