import { promises as fs } from "fs";
import path from "path";

/**
 * Holds and bookings — the private half (spec: docs/booking-flow.md, step 3).
 *
 * ⛔ PRIVATE-DRIVER MANDATE. A booking names a customer and a time they will
 * be somewhere. That is PII, so it lives where orders live — the vault (KV /
 * redis in prod, files under data/ in dev) — and NEVER in the public blob
 * that carries services and availability.
 *
 * THE HOLD, and why it exists (spec §2): the gap between "picked" and "paid"
 * is where double-bookings are born, and on bitcoin it is worse — an on-chain
 * payment sits in `processing` for 10–60+ minutes. So a slot is claimed
 * BEFORE the charge is created, atomically, and released if payment never
 * lands.
 *
 *   pick → HOLD (ttl) → charge_created → settled → CONFIRMED
 *                    ↘ ttl expires / expired / underpaid → RELEASED
 *
 * Atomicity is HSETNX — set-if-absent on a hash field, one round trip, no
 * read-then-write race. Two people clicking the same 10:00 slot at the same
 * instant: exactly one wins.
 */

export type SlotState = "held" | "confirmed";

export interface SlotClaim {
  state: SlotState;
  bookingId: string;
  /** epoch ms a HOLD expires; absent on a confirmed booking (never expires) */
  untilMs?: number;
}

export interface BookingRecord {
  id: string;
  schemaVersion: 1;
  serviceId: string;
  serviceTitle: string;
  /** the slot, UTC — the only form that crosses a boundary */
  startUtc: string;
  endUtc: string;
  /** the artist's zone at time of booking, so a receipt can say both clocks */
  artistTz: string;
  state: "held" | "confirmed" | "released" | "canceled";
  orderId: string;
  customer: { name?: string; email?: string; note?: string; npub?: string; city?: string; state?: string; zip?: string };
  /** resolved at confirmation — never rendered on a public service page */
  meetingUrl?: string;
  /** Love's own session notes (discovery-call impressions etc.) — admin-only,
      never serialized to any public/member surface */
  adminNotes?: string;
  createdAtMs: number;
  confirmedAtMs?: number;
}

/* ── the vault (mirrors store.ts — same transports, same honesty) ────────── */

function restEnv(): { url: string; token: string } | null {
  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  return url && token ? { url, token } : null;
}

function vaultConfigured(): boolean {
  return restEnv() !== null || !!process.env.REDIS_URL;
}

/** Prod requires the vault; dev uses files. False = checkout honestly refuses. */
export function bookingsConfigured(): boolean {
  if (process.env.VERCEL === "1") return vaultConfigured();
  return true;
}

const CLAIMS = "booking:claims";
const recKey = (id: string) => `booking:rec:${id}`;
const REC_INDEX = "booking:index";

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
    if (!res.ok) throw new Error(`booking store: KV ${res.status}`);
    return (await res.json()) as { result: unknown };
  }
  try {
    const client = await getRedis();
    return { result: await client.sendCommand(cmd.map(String)) };
  } catch (err) {
    redisClient = null;
    throw new Error(`booking store: redis ${err instanceof Error ? err.message : "error"}`);
  }
}

/* ── dev file driver ─────────────────────────────────────────────────────── */

const claimsFile = () => path.join(process.cwd(), "data", "booking-claims.json");
const recsDir = () => path.join(process.cwd(), "data", "booking-recs");
const recFile = (id: string) => path.join(recsDir(), `${id}.json`);

async function readClaimsFile(): Promise<Record<string, SlotClaim>> {
  try {
    return JSON.parse(await fs.readFile(claimsFile(), "utf8")) as Record<string, SlotClaim>;
  } catch {
    return {};
  }
}

async function writeClaimsFile(all: Record<string, SlotClaim>): Promise<void> {
  await fs.mkdir(path.dirname(claimsFile()), { recursive: true });
  const tmp = claimsFile() + ".tmp";
  await fs.writeFile(tmp, JSON.stringify(all, null, 2), "utf8");
  await fs.rename(tmp, claimsFile());
}

/* ── claims ──────────────────────────────────────────────────────────────── */

/** One slot, one key. Service + instant is the natural identity. */
export const slotField = (serviceId: string, startUtc: string) => `${serviceId}|${startUtc}`;

const isLive = (c: SlotClaim, nowMs: number) =>
  c.state === "confirmed" || (c.untilMs != null && c.untilMs > nowMs);

/**
 * Every slot currently spoken for — held (unexpired) or confirmed.
 *
 * Lazy expiry: an expired hold is simply not returned. It is swept on the
 * next claim attempt rather than by a background job, because there is no
 * background job on serverless (spec residual #4) and a stale row that
 * nobody reads costs nothing.
 */
export async function takenSlots(nowMs = Date.now()): Promise<Set<string>> {
  const taken = new Set<string>();
  if (vaultConfigured()) {
    const res = await kv(["HGETALL", CLAIMS]);
    const raw = res?.result;
    // REST returns an object; node-redis returns a flat [k,v,k,v] array
    const entries: [string, string][] = Array.isArray(raw)
      ? (raw as string[]).reduce<[string, string][]>(
          (acc, v, i, arr) => (i % 2 === 0 ? [...acc, [v, arr[i + 1]]] : acc),
          [],
        )
      : Object.entries((raw ?? {}) as Record<string, string>);
    for (const [field, json] of entries) {
      try {
        if (isLive(JSON.parse(json) as SlotClaim, nowMs)) taken.add(field);
      } catch {
        /* a corrupt row must not take the whole calendar down */
      }
    }
    return taken;
  }
  for (const [field, claim] of Object.entries(await readClaimsFile())) {
    if (isLive(claim, nowMs)) taken.add(field);
  }
  return taken;
}

/**
 * Claim a slot, atomically. Returns false when someone else already holds or
 * owns it.
 *
 * HSETNX is the whole trick — set-if-absent in one round trip, so two
 * simultaneous clicks cannot both win. When it fails we look at what's there:
 * an EXPIRED hold is swept and retried once (a slot nobody paid for must not
 * be locked forever), a live hold or a confirmed booking is a genuine loss.
 *
 * ⚠ Known, documented race: between reading an expired claim and overwriting
 * it, a third party could claim the same slot — the window is sub-millisecond
 * and the loser is caught at settle by the reconcile view, per the spec's
 * "the paid booking wins" ruling. Closing it properly needs a Lua script or
 * WATCH/MULTI; noted rather than pretended away.
 */
export async function claimSlot(
  serviceId: string,
  startUtc: string,
  claim: SlotClaim,
  nowMs = Date.now(),
): Promise<boolean> {
  const field = slotField(serviceId, startUtc);
  const json = JSON.stringify(claim);

  if (vaultConfigured()) {
    const first = await kv(["HSETNX", CLAIMS, field, json]);
    if (Number(first?.result) === 1) return true;
    const existing = await kv(["HGET", CLAIMS, field]);
    if (typeof existing?.result !== "string") return false;
    let current: SlotClaim;
    try {
      current = JSON.parse(existing.result) as SlotClaim;
    } catch {
      return false;
    }
    if (isLive(current, nowMs)) return false;
    await kv(["HSET", CLAIMS, field, json]); // expired hold — sweep and take
    return true;
  }

  const all = await readClaimsFile();
  const current = all[field];
  if (current && isLive(current, nowMs)) return false;
  all[field] = claim;
  await writeClaimsFile(all);
  return true;
}

/** Read a slot's current claim — the cart checkout's "is this hold still
 *  mine and alive" question. Null = unclaimed. */
export async function getClaim(serviceId: string, startUtc: string): Promise<SlotClaim | null> {
  const field = slotField(serviceId, startUtc);
  if (vaultConfigured()) {
    const res = await kv(["HGET", CLAIMS, field]);
    if (typeof res?.result !== "string") return null;
    try {
      return JSON.parse(res.result) as SlotClaim;
    } catch {
      return null;
    }
  }
  return (await readClaimsFile())[field] ?? null;
}

/** Give a slot back — expiry, cancellation, refund. Idempotent. */
export async function releaseSlot(serviceId: string, startUtc: string): Promise<void> {
  const field = slotField(serviceId, startUtc);
  if (vaultConfigured()) {
    await kv(["HDEL", CLAIMS, field]);
    return;
  }
  const all = await readClaimsFile();
  delete all[field];
  await writeClaimsFile(all);
}

/** Promote a hold to a booking that never expires. */
async function confirmSlot(serviceId: string, startUtc: string, bookingId: string): Promise<void> {
  const field = slotField(serviceId, startUtc);
  const claim: SlotClaim = { state: "confirmed", bookingId };
  if (vaultConfigured()) {
    await kv(["HSET", CLAIMS, field, JSON.stringify(claim)]);
    return;
  }
  const all = await readClaimsFile();
  all[field] = claim;
  await writeClaimsFile(all);
}

/* ── booking records ─────────────────────────────────────────────────────── */

export function newBookingId(): string {
  const bytes = new Uint8Array(12);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

const safeId = (id: string) => /^[a-f0-9]{24}$/.test(id);

export async function createBooking(rec: BookingRecord): Promise<void> {
  if (!safeId(rec.id)) throw new Error("booking store: bad id");
  if (vaultConfigured()) {
    const res = await kv(["SET", recKey(rec.id), JSON.stringify(rec), "NX"]);
    if (res?.result === null) throw new Error("booking store: id collision");
    await kv(["SADD", REC_INDEX, rec.id]);
    return;
  }
  await fs.mkdir(recsDir(), { recursive: true });
  await fs.writeFile(recFile(rec.id), JSON.stringify(rec, null, 2), { flag: "wx" });
}

async function writeBooking(rec: BookingRecord): Promise<void> {
  if (vaultConfigured()) {
    await kv(["SET", recKey(rec.id), JSON.stringify(rec)]);
    return;
  }
  const tmp = recFile(rec.id) + ".tmp";
  await fs.writeFile(tmp, JSON.stringify(rec, null, 2), "utf8");
  await fs.rename(tmp, recFile(rec.id));
}

export async function getBooking(id: string): Promise<BookingRecord | null> {
  if (!safeId(id)) return null;
  if (vaultConfigured()) {
    const res = await kv(["GET", recKey(id)]);
    return typeof res?.result === "string" ? (JSON.parse(res.result) as BookingRecord) : null;
  }
  try {
    return JSON.parse(await fs.readFile(recFile(id), "utf8")) as BookingRecord;
  } catch {
    return null;
  }
}

/** Love's session notes — written from the calendar popup, admin-gated. */
export async function setBookingNotes(id: string, notes: string): Promise<BookingRecord | null> {
  const rec = await getBooking(id);
  if (!rec) return null;
  const trimmed = notes.trim().slice(0, 4000);
  if (trimmed) rec.adminNotes = trimmed;
  else delete rec.adminNotes;
  await writeBooking(rec);
  return rec;
}

export async function listBookings(): Promise<BookingRecord[]> {
  let ids: string[] = [];
  if (vaultConfigured()) {
    const res = await kv(["SMEMBERS", REC_INDEX]);
    ids = Array.isArray(res?.result) ? (res.result as string[]) : [];
  } else {
    try {
      ids = (await fs.readdir(recsDir())).filter((f) => f.endsWith(".json")).map((f) => f.slice(0, -5));
    } catch {
      ids = [];
    }
  }
  const recs = await Promise.all(ids.map((id) => getBooking(id)));
  return recs
    .filter((r): r is BookingRecord => r !== null)
    .sort((a, b) => a.startUtc.localeCompare(b.startUtc));
}

/* ── the settle hook ─────────────────────────────────────────────────────── */

/**
 * Money landed → the slot is really theirs (spec §2's fulfilment pipeline).
 *
 * Idempotent and re-derivable from order state, per the spec's serverless
 * ruling: the webhook and the reconcile poll both funnel here, and a retry
 * is a no-op. A booking already confirmed is left exactly as it was.
 */
export async function confirmBookingForOrder(
  orderId: string,
  bookingId: string,
  meetingUrl?: string,
): Promise<BookingRecord | null> {
  const rec = await getBooking(bookingId);
  if (!rec || rec.orderId !== orderId) return null;
  if (rec.state === "confirmed") return rec; // retry — no-op
  rec.state = "confirmed";
  rec.confirmedAtMs = Date.now();
  if (meetingUrl) rec.meetingUrl = meetingUrl;
  await writeBooking(rec);
  await confirmSlot(rec.serviceId, rec.startUtc, rec.id);
  return rec;
}

/** Payment died or was refunded → the time goes back on the board. */
/** Self-serve reschedule (Admiral, 0018.05.17): claim the NEW time first,
 *  then let the old one go — the member never risks losing both. */
export async function moveBooking(
  bookingId: string,
  slot: { startUtc: string; endUtc: string },
): Promise<{ ok: true; booking: BookingRecord } | { ok: false; reason: string }> {
  const rec = await getBooking(bookingId);
  if (!rec) return { ok: false, reason: "no such booking" };
  const claimed = await claimSlot(rec.serviceId, slot.startUtc, {
    state: rec.state === "confirmed" ? "confirmed" : "held",
    bookingId,
    ...(rec.state === "confirmed" ? {} : { untilMs: Date.now() + 72 * 3600 * 1000 }),
  });
  if (!claimed) return { ok: false, reason: "someone just took that time — pick another" };
  const oldStart = rec.startUtc;
  rec.startUtc = slot.startUtc;
  rec.endUtc = slot.endUtc;
  await writeBooking(rec);
  await releaseSlot(rec.serviceId, oldStart);
  return { ok: true, booking: rec };
}

export async function releaseBookingForOrder(
  bookingId: string,
  reason: "released" | "canceled" = "released",
): Promise<BookingRecord | null> {
  const rec = await getBooking(bookingId);
  if (!rec) return null;
  if (rec.state === reason) return rec;
  rec.state = reason;
  await writeBooking(rec);
  await releaseSlot(rec.serviceId, rec.startUtc);
  return rec;
}
