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
 *    config. When S2 is promoted upstream to the template this half moves as a
 *    file, not a rewrite, and each clone brings only its own TIERS.
 *
 * THE GATE LAW (storefront-framework.md): the API is the gate, screens are
 * courtesy. The subject is the member's REGISTRY npub — the mutable record,
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
  B: { name: "Observer", priceUsd: 55, priceSats: 88_888 },
  C: { name: "Evening Star", priceUsd: 111, priceSats: 177_777 },
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
  /** TASK-462 (block 968,543): the LIVE standing grant this record sits on
   *  top of, when this record is itself a taster that outranked it. The gate
   *  falls back to it once THIS record's own `expiresAtMs` passes, so a
   *  higher, shorter pass never erases a lower membership underneath it.
   *  Never chained more than one level deep. Absent = nothing to fall back
   *  to (old records, and permanent purchases, never carry one). */
  under?: { tier: Tier; orderId: string; expiresAtMs?: number };
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

/** The gate's revoked/lapsed/`under`-fallback decision, pure — round 3
 *  (block 968,548) pulled this out of `getEntitlement` so `classStartingAudience`
 *  (`live.ts`) can run the SAME decision over a record it already has in
 *  hand (from `listEntitlements`) instead of re-implementing its own
 *  revoked/lapsed check that never knew about `under` (R3: a permanent
 *  member whose taster had lapsed was dropping out of every room's
 *  audience). A revoked grant reads as nothing — so does a lapsed taster
 *  with nothing live to fall back to. `under` itself must still be live (no
 *  expiry, or not yet past it); the fallback never chains past that one
 *  level. */
export function liveGrant(rec: Entitlement, now: number = Date.now()): Entitlement | null {
  if (rec.revokedAtMs) return null;
  if (rec.expiresAtMs == null || now <= rec.expiresAtMs) return rec;
  if (rec.under && (rec.under.expiresAtMs == null || now <= rec.under.expiresAtMs)) {
    return { ...rec, tier: rec.under.tier, orderId: rec.under.orderId, expiresAtMs: rec.under.expiresAtMs, under: undefined };
  }
  return null;
}

/** The live tier for a registry npub — the ONE gate every tier check
 *  funnels through, so a week pass closing needs no separate sweep. */
export async function getEntitlement(npub: string): Promise<Entitlement | null> {
  if (!safeNpub(npub)) return null;
  const rec = await readRec(npub);
  if (!rec) return null;
  return liveGrant(rec);
}

/**
 * TASK-462 round 4 (block 968,548): true ONLY when `orderId` names this
 * record's OWN order, that order has already lapsed, and a LIVE standing
 * grant is still under it — the exact shape of a refund arriving for a
 * taster pass that had already ended, with a real membership underneath it
 * that was never refunded. All of these must hold:
 *   - `safeNpub(npub)`
 *   - the RAW stored record (`readRec`) exists
 *   - the record has no `revokedAtMs`
 *   - `raw.orderId === orderId`
 *   - `liveGrant(raw, now)` is non-null AND its `orderId !== orderId` —
 *     the refunded order is the lapsed pass on top, and the member is
 *     standing on the grant under it.
 * Reads the RAW record, never `getEntitlement` — this path never WRITES,
 * so the raw record's shape never changes underneath it, which is what
 * makes a redelivered or late refund/dispute of the SAME order the same
 * no-op every time: nothing here depends on when it's called or how many
 * times. A refund of a STILL-LIVE pass, or of the standing grant's own
 * order, reads false — those still take today's blunt close.
 */
export async function isLapsedPassOrder(npub: string, orderId: string, now: number = Date.now()): Promise<boolean> {
  if (!safeNpub(npub)) return false;
  const raw = await readRec(npub);
  if (!raw || raw.revokedAtMs) return false;
  if (raw.orderId !== orderId) return false;
  const live = liveGrant(raw, now);
  return live != null && live.orderId !== orderId;
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
 * `opts.expiresAtMs` is the taster door (the $11/$22 one-week passes):
 * present = this grant closes on its own at that instant, no revoke needed.
 * The expiry only ever rides the WINNING tier of this call — a taster never
 * downgrades a standing permanent membership at the same or higher tier,
 * and a permanent purchase always clears any taster expiry it replaces. Two
 * tasters at the same tier now ADD instead of extend: an early renewal adds
 * the pass's own length — less the few milliseconds the read took — onto
 * the standing end; once expired, the gate above already reads it as
 * nothing, so the renewal starts fresh instead, no grace days owed.
 *
 * TASK-462 (block 968,543): when a taster's tier truly OUTRANKS a live
 * standing grant, that standing grant is not lost — it rides along as
 * `under`, and `getEntitlement` falls back to it once this taster closes.
 * Every other branch (same tier, lower tier, permanent) is untouched; it
 * only now carries `under` forward (or clears it on a permanent purchase).
 *
 * Fix round (F3, block 968,543): when the STANDING grant outranks THIS
 * purchase, the purchase isn't simply dropped either — the standing grant's
 * own orderId, tier and expiry stand exactly as they were (this purchase
 * never becomes the record of the money behind a tier it didn't win), but
 * the purchase itself becomes the new `under` when it beats whatever `under`
 * already stands (nothing there yet, a higher rank, or the same rank with
 * this purchase permanent against a taster `under`) — see `underBeats`.
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
  const outranked = existing != null && RANK[existing.tier] > RANK[tier];
  const keep = outranked ? existing!.tier : tier;

  let finalOrderId = orderId;
  let expiresAtMs: number | undefined;
  let under: Entitlement["under"];
  if (outranked) {
    // the standing grant outranks this purchase — its own orderId, expiry
    // stand exactly as they were
    finalOrderId = existing!.orderId;
    expiresAtMs = existing!.expiresAtMs;
    const incoming = { tier, orderId, expiresAtMs: opts?.expiresAtMs };
    under = underBeats(incoming, existing!.under) ? incoming : existing!.under;
  } else if (opts?.expiresAtMs == null) {
    // a permanent purchase at (or above) the standing tier — no more clock,
    // and nothing left to fall back FROM: a real purchase at this tier or
    // higher clears any taster `under` it replaces
    expiresAtMs = undefined;
    under = undefined;
  } else if (existing?.tier === tier && existing.expiresAtMs == null) {
    // already permanent at this tier — a taster can't downgrade it
    expiresAtMs = undefined;
    under = existing?.under;
  } else if (existing?.tier === tier && existing.expiresAtMs != null) {
    // renewal adds: standing end + this pass's own length, less the read's
    // few ms — a same-tier renewal keeps `under` exactly as it was
    expiresAtMs = existing.expiresAtMs + (opts.expiresAtMs - Date.now());
    under = existing?.under;
  } else {
    // this purchase OUTRANKS the standing grant and carries its own expiry —
    // the standing grant becomes what the gate falls back to once this
    // taster closes, so it is never simply overwritten and lost.
    expiresAtMs = opts.expiresAtMs;
    under = existing ? underFrom(existing) : undefined;
  }

  const rec: Entitlement = {
    npub,
    tier: keep,
    orderId: finalOrderId,
    grantedAtMs: existing?.grantedAtMs ?? Date.now(),
    mxid: opts?.mxid ?? existing?.mxid,
    expiresAtMs,
    under,
  };
  await write(rec);
  return rec;
}

type UnderCandidate = { tier: Tier; orderId: string; expiresAtMs?: number };

/**
 * Round 3 (F3 review, block 968,548): the ONE comparator for the `under`
 * slot. Two adversarial-review findings collapsed into one rule, in order:
 *   1. a LAPSED candidate never beats a LIVE one — dead access is worth
 *      nothing next to standing access, no matter its rank (review 3b: a
 *      stale `under` was winning over a fresh outranked purchase only
 *      because the old comparator never checked liveness at all);
 *   2. between two live (or two lapsed) candidates, a PERMANENT grant beats
 *      a taster — a membership must never be lost to a pass (review 3a: a
 *      lower-ranked but PERMANENT purchase was losing to a higher-ranked
 *      but still-a-pass `under`);
 *   3. then the higher RANK;
 *   4. then the later `expiresAtMs` (both tasters, same rank — the longer
 *      window wins);
 *   5. a genuine tie keeps `a`.
 * Pure — no read, no write, just the decision.
 */
function betterUnder(a: UnderCandidate, b: UnderCandidate, now: number = Date.now()): UnderCandidate {
  const liveA = a.expiresAtMs == null || now <= a.expiresAtMs;
  const liveB = b.expiresAtMs == null || now <= b.expiresAtMs;
  if (liveA !== liveB) return liveA ? a : b;
  const permA = a.expiresAtMs == null;
  const permB = b.expiresAtMs == null;
  if (permA !== permB) return permA ? a : b;
  if (RANK[a.tier] !== RANK[b.tier]) return RANK[a.tier] > RANK[b.tier] ? a : b;
  if (!permA && !permB && a.expiresAtMs !== b.expiresAtMs) return a.expiresAtMs! > b.expiresAtMs! ? a : b;
  return a;
}

/** TASK-462: the one grant to fall back to once a taster that outranked
 *  `existing` eventually closes. `existing` is always live here (it came
 *  through `getEntitlement`'s gate), so it always qualifies on its own; when
 *  it ALSO rides on its own `under` (a taster bought on top of a taster),
 *  only one level is ever kept — `betterUnder` picks which. */
function underFrom(existing: Entitlement, now: number = Date.now()): NonNullable<Entitlement["under"]> {
  const own: UnderCandidate = { tier: existing.tier, orderId: existing.orderId, expiresAtMs: existing.expiresAtMs };
  const nested = existing.under;
  if (!nested) return own;
  return betterUnder(own, nested, now);
}

/** Fix round (F3, block 968,543/968,548): does `incoming` — a purchase that
 *  did NOT win the top slot this call — beat the CURRENT `under`, and so
 *  become the new one? Nothing there, or a lapsed `current`, always loses to
 *  something; otherwise `incoming` must win `betterUnder` outright — a tie
 *  leaves the existing `under` exactly as it was. */
function underBeats(incoming: UnderCandidate, current: Entitlement["under"], now: number = Date.now()): boolean {
  if (!current) return true;
  const currentLive = current.expiresAtMs == null || now <= current.expiresAtMs;
  if (!currentLive) return true;
  return betterUnder(current, incoming, now) === incoming;
}

/**
 * Refund, dispute, or the artist's own hand → the door closes.
 * Spec: revocation ships WITH the grant, never later — refunds arrive in week
 * one, and a charged-back purchase must not keep access forever.
 *
 * Round 3 (block 968,548) NARROWED this back to base (`9db8532`) behavior,
 * byte-for-byte: ANY revoke of ANY order closes the member's access — a
 * taster pass sitting on a standing membership is not spared. Round 2 tried
 * an exact-orderId fallback here, but a successful fallback REWRITES this
 * record's own `orderId` to the `under`'s order, so a routinely-redelivered
 * `refunded` webhook (Square/BTCPay both do this) no longer matches on its
 * second delivery, falls through to this same close path, and closes a
 * member's PERMANENT membership that had already safely fallen back — a
 * confirmed blocker (two adversarial reviews on `ec85417`). AFTER SATURDAY:
 * a pass refund falling back to the standing membership instead of closing
 * it needs a consumed-order marker (a record of which order has already
 * been revoked) so a redelivered webhook reads as a no-op the second time,
 * not a second, now-mismatched attempt to find the taster's own order.
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
