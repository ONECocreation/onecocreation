/* eslint-disable @typescript-eslint/no-explicit-any -- Square's JSON is read defensively field by field */
import crypto from "crypto";
import { ensureSquareVault, squareEnv, squareFetch } from "./payments";
import { TIERS, RANK_OF, isTier, getEntitlement, grantTier, revokeTier, normalizeNpub, type Tier } from "./entitlement";
import { getEntry } from "./registry";
import { emailForSubject } from "./member-tier";
import { getSiteConfig } from "./site-config";
import { storeUnavailable, kvGet, kvSet, kvDel, kvSetNx, kvHit, kvSadd, kvSmembers } from "./sub-kv";

/**
 * T-541a: REAL MONTHLY MEMBERSHIPS on the Square Subscriptions API.
 *
 * The law: Square owns the money, the site owns access. The site never sees
 * a card (the Web Payments SDK hands us a one-time token), never decides a
 * charge, and never trusts an event body: every Square event, and every
 * member action, ends in `refresh()`, the ONE place Square's state becomes
 * our `expiresAtMs`. Identity is ours by construction: the member's session
 * makes the Square customer (reference_id = the member subject), and the
 * `subscriptionId -> member` row lives in OUR table; nothing Square-side is
 * ever read back as "who".
 *
 * Proven calls (spike S1, API 2025-01-23, ~/dev/briefings/oc-subscriptions-969584/spike):
 *  - RELATIVE plan variations need `phases:[{ordinal, order_template_id}]`,
 *    a DRAFT order built from the plan's item variation (one per RELATIVE
 *    phase; a phase with discount_ids carries those discounts, option A / C).
 *  - invoice orders carry NO metadata: renewals key by subscription_id.
 *  - SwapPlan lands at charged_through_date, no invoice, no proration.
 *  - cancel sets canceled_date = charged_through_date; status stays ACTIVE.
 *    A later cancel clears a pending swap; undo does not bring it back.
 */

export const SUB_API_VERSION = "2025-01-23";
/** Grace after paid-through on a MISSED payment: one constant, Love may change it. */
export const GRACE_MS = 3 * 24 * 60 * 60 * 1000;
export const SUB_TZ = "America/Los_Angeles";

export type SubStatus = "pending" | "active" | "past_due" | "cancelling" | "canceled" | "paused" | "refunded";
export type PlanVariant = "standard" | "A" | "B" | "C";
export const VARIANTS: readonly PlanVariant[] = ["standard", "A", "B", "C"];
export const isVariant = (v: unknown): v is PlanVariant => typeof v === "string" && (VARIANTS as readonly string[]).includes(v);

export interface SubRecord {
  subscriptionId: string;
  /** the session subject `handle@space`: who, always from the session */
  subject: string;
  /** the entitlement key (registry npub hex, or the email subject) */
  grantKey: string;
  tier: Tier;
  variant: PlanVariant;
  planVariationId: string;
  squareCustomerId: string;
  cardId: string;
  status: SubStatus;
  /** end of the last paid period (end of Square's charged_through_date, LA) */
  chargedThroughMs?: number;
  expiresAtMs?: number;
  canceledAtMs?: number;
  pendingSwap?: { tier: Tier; variationId: string; scheduled: boolean };
  refundedInvoiceId?: string;
  createdAtMs: number;
  updatedAtMs: number;
}

interface PendingSub {
  subject: string; grantKey: string; tier: Tier; variant: PlanVariant; variationId: string;
  idempotencyKey: string; squareCustomerId: string; cardId: string; createdAtMs: number;
}

export class SubError extends Error {
  constructor(public code: string, public status: number, message?: string) {
    super(message ?? code);
  }
}

/** The grant's order id: a stable audit trail from the entitlement to the subscription. */
export const subOrderId = (subscriptionId: string) => `sub:${subscriptionId}`;
const LIVE: readonly SubStatus[] = ["pending", "active", "past_due", "cancelling", "paused"];
export const isLiveStatus = (s: SubStatus) => LIVE.includes(s);

/* ── keys ───────────────────────────────────────────────────────────────── */

const K = {
  rec: (id: string) => `oco:sub:rec:${id}`,
  bySubject: (s: string) => `oco:sub:by-subject:${s}`,
  hist: (s: string) => `oco:sub:hist:${s}`,
  custOf: (s: string) => `oco:sub:cust-of:${s}`,
  pending: (k: string) => `oco:sub:pending:${k}`,
  pendingBySubject: (s: string) => `oco:sub:pending-by:${s}`,
  byCustomer: (c: string) => `oco:sub:by-customer:${c}`,
  index: "oco:sub:index",
  planMap: "oco:sub:planmap",
  event: (id: string) => `oco:sub:event:${id}`,
  lock: (s: string) => `oco:sub:lock:${s}`,
  rate: (s: string, b: string) => `oco:sub:rate:${b}:${s}`,
};

/* ── pure helpers (exported for tests) ──────────────────────────────────── */

const pad = (n: number) => String(n).padStart(2, "0");

function tzOffsetMs(ts: number, tz: string): number {
  const f = new Intl.DateTimeFormat("en-US", {
    timeZone: tz, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  });
  const p = Object.fromEntries(f.formatToParts(new Date(ts)).map((x) => [x.type, x.value]));
  const asUtc = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second);
  return asUtc - Math.floor(ts / 1000) * 1000;
}

/** First millisecond of a `YYYY-MM-DD` date in `tz`. */
export function startOfDayMs(date: string, tz: string = SUB_TZ): number {
  const [y, m, d] = date.split("-").map(Number);
  const guess = Date.UTC(y, m - 1, d, 0, 0, 0, 0);
  return guess - tzOffsetMs(guess, tz);
}

/** Last millisecond of a `YYYY-MM-DD` date in `tz`. */
export function endOfDayMs(date: string, tz: string = SUB_TZ): number {
  const [y, m, d] = date.split("-").map(Number);
  const guess = Date.UTC(y, m - 1, d, 23, 59, 59, 999);
  return guess - tzOffsetMs(guess, tz);
}

export function todayIn(tz: string = SUB_TZ, now: number = Date.now()): string {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" })
      .formatToParts(new Date(now)).map((x) => [x.type, x.value]),
  );
  return `${p.year}-${p.month}-${p.day}`;
}

export function addMonths(date: string, n: number): string {
  const [y, m, d] = date.split("-").map(Number);
  const total = y * 12 + (m - 1) + n;
  const ny = Math.floor(total / 12);
  const nm = total % 12;
  const last = new Date(Date.UTC(ny, nm + 1, 0)).getUTCDate();
  return `${ny}-${pad(nm + 1)}-${pad(Math.min(d, last))}`;
}

/** The list-price difference to charge on an upgrade, in cents ($55-$33 = $22). */
export function upgradeDifferenceCents(from: Tier, to: Tier): number {
  return Math.round((TIERS[to].priceUsd - TIERS[from].priceUsd) * 100);
}

export interface Derived {
  status: SubStatus;
  chargedThroughMs?: number;
  canceledAtMs?: number;
  expiresAtMs: number;
}

/**
 * Square's subscription -> our status + paid-through + expiry. PURE: no
 * read, no write. `prevChargedThroughMs` keeps the paid-through monotonic
 * (a CANCELED subscription may stop reporting charged_through_date).
 * Grace applies ONLY to a missed payment (active and past the due date with
 * the charge not yet through); a cancel or a pause gets none.
 */
export function deriveSubscription(sub: any, now: number, prevChargedThroughMs?: number): Derived {
  const tz: string = typeof sub?.timezone === "string" && sub.timezone ? sub.timezone : SUB_TZ;
  const dateOk = (v: unknown): v is string => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v);
  let dueMs: number | undefined;
  let paid: number | undefined;
  if (dateOk(sub?.charged_through_date)) {
    dueMs = startOfDayMs(sub.charged_through_date, tz);
    paid = endOfDayMs(sub.charged_through_date, tz);
  } else if (dateOk(sub?.start_date) && sub?.status !== "PENDING") {
    // a free first period (option A): nothing charged yet, the first
    // period runs one month from the start
    const end = addMonths(sub.start_date, 1);
    dueMs = startOfDayMs(end, tz);
    paid = endOfDayMs(end, tz);
  }
  if (prevChargedThroughMs != null && (paid == null || prevChargedThroughMs > paid)) {
    paid = prevChargedThroughMs;
    dueMs = dueMs ?? prevChargedThroughMs;
  }
  const sq: string = sub?.status ?? "";
  const canceledAtMs = dateOk(sub?.canceled_date) ? endOfDayMs(sub.canceled_date, tz) : undefined;
  let status: SubStatus;
  if (sq === "CANCELED" || sq === "DEACTIVATED") status = "canceled";
  else if (sq === "PAUSED") status = "paused";
  else if (sq === "PENDING") status = "pending";
  else if (canceledAtMs != null) status = now > canceledAtMs ? "canceled" : "cancelling";
  else if (dueMs != null && now >= dueMs) status = "past_due";
  else status = "active";
  const expiresAtMs = paid == null ? 0 : paid + (status === "past_due" ? GRACE_MS : 0);
  return { status, chargedThroughMs: paid, canceledAtMs, expiresAtMs };
}

/* ── store ──────────────────────────────────────────────────────────────── */

export async function getRecord(subscriptionId: string): Promise<SubRecord | null> {
  if (!/^[A-Za-z0-9-]{8,64}$/.test(subscriptionId)) return null;
  const raw = await kvGet(K.rec(subscriptionId));
  if (!raw) return null;
  try { return JSON.parse(raw) as SubRecord; } catch { return null; }
}

async function putRecord(rec: SubRecord): Promise<void> {
  rec.updatedAtMs = Date.now();
  await kvSet(K.rec(rec.subscriptionId), JSON.stringify(rec));
}

export async function getRecordForSubject(subject: string): Promise<SubRecord | null> {
  const id = await kvGet(K.bySubject(subject));
  return id ? getRecord(id) : null;
}

export async function listRecords(): Promise<SubRecord[]> {
  const ids = await kvSmembers(K.index);
  const all = await Promise.all(ids.map(getRecord));
  return all.filter((r): r is SubRecord => r !== null).sort((a, b) => b.createdAtMs - a.createdAtMs);
}

/** A subscriber (live or still inside paid time) at or above `tier`: a one-time
 *  purchase of the same or a lower tier is refused so nobody pays twice. */
export async function subscriptionBlocksPurchase(subject: string, tier: Tier): Promise<boolean> {
  const rec = await getRecordForSubject(subject);
  if (!rec || rec.status === "refunded") return false;
  const open = isLiveStatus(rec.status) || (rec.expiresAtMs ?? 0) > Date.now();
  return open && RANK_OF[rec.tier] >= RANK_OF[tier];
}

/** T-541b: has this member ever had a subscription? (promo variants are first-time only) */
export async function hasSubscriptionHistory(subject: string): Promise<boolean> {
  try { return (await kvSmembers(K.hist(subject))).length > 0; } catch { return false; }
}

export async function subscriptionsEnabled(): Promise<boolean> {
  try { return (await getSiteConfig()).features.subscriptions === true; } catch { return false; }
}

/** Per-member fixed-window rate limit; true = over the limit. */
export async function rateLimited(subject: string, bucket: string, max: number, windowSec: number): Promise<boolean> {
  try { return (await kvHit(K.rate(subject, bucket), windowSec)) > max; } catch { return false; }
}

/* ── the plan map (operator settings, never code) ───────────────────────── */

export interface PlanMap {
  /** tier -> variant -> Square plan VARIATION id */
  tiers: Partial<Record<Tier, Partial<Record<PlanVariant, string>>>>;
  /** variants members may pick (default only "standard"); A/B/C are promos the operator opens */
  open: PlanVariant[];
}

const ID_RE = /^[A-Za-z0-9_-]{8,64}$/;

export function sanitizePlanMap(raw: unknown): PlanMap {
  const out: PlanMap = { tiers: {}, open: ["standard"] };
  const o = (raw && typeof raw === "object" ? raw : {}) as Record<string, any>;
  for (const t of ["A", "B", "C"] as Tier[]) {
    const row = o.tiers?.[t];
    if (!row || typeof row !== "object") continue;
    const clean: Partial<Record<PlanVariant, string>> = {};
    for (const v of VARIANTS) if (typeof row[v] === "string" && ID_RE.test(row[v])) clean[v] = row[v];
    if (Object.keys(clean).length) out.tiers[t] = clean;
  }
  if (Array.isArray(o.open)) {
    const open = VARIANTS.filter((v) => o.open.includes(v));
    out.open = open.length ? open : ["standard"];
  }
  if (!out.open.includes("standard")) out.open.unshift("standard");
  return out;
}

export async function getPlanMap(): Promise<PlanMap> {
  const raw = await kvGet(K.planMap);
  if (!raw) return { tiers: {}, open: ["standard"] };
  try { return sanitizePlanMap(JSON.parse(raw)); } catch { return { tiers: {}, open: ["standard"] }; }
}

export async function savePlanMap(raw: unknown): Promise<PlanMap> {
  const map = sanitizePlanMap(raw);
  await kvSet(K.planMap, JSON.stringify(map));
  return map;
}

/* ── Square ─────────────────────────────────────────────────────────────── */

async function sq(method: string, path: string, body?: unknown) {
  await ensureSquareVault();
  const env = squareEnv();
  if (!env) throw new SubError("square_not_configured", 503, "Square is not configured");
  let res: Response;
  try {
    res = await squareFetch(path, env, {
      method,
      headers: { "Square-Version": SUB_API_VERSION },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new SubError("square_unreachable", 502, "Square could not be reached");
  }
  let json: any = {};
  try { json = await res.json(); } catch { /* empty body */ }
  return { ok: res.ok, status: res.status, json, env };
}

async function locationId(): Promise<string> {
  await ensureSquareVault();
  const env = squareEnv();
  if (!env) throw new SubError("square_not_configured", 503, "Square is not configured");
  return env.locationId;
}

const squareCode = (json: any): string => String(json?.errors?.[0]?.code ?? "");

/** Deterministic Square idempotency key (45-char cap). */
export function idemKey(seed: string, suffix: string): string {
  return crypto.createHash("sha256").update(`${seed}|${suffix}`).digest("hex").slice(0, 40);
}

interface PlanVariationInfo {
  planId?: string;
  phases: { ordinal: number; relative: boolean; discountIds: string[] }[];
}

async function readVariation(variationId: string): Promise<PlanVariationInfo> {
  const r = await sq("GET", `/v2/catalog/object/${variationId}`);
  const d = r.json?.object?.subscription_plan_variation_data;
  if (!r.ok || !d) throw new SubError("plan_not_found", 502, "that plan variation is not in Square");
  const phases = (d.phases ?? []).map((p: any, i: number) => ({
    ordinal: typeof p.ordinal === "number" ? p.ordinal : i,
    relative: p.pricing?.type === "RELATIVE",
    discountIds: Array.isArray(p.pricing?.discount_ids) ? (p.pricing.discount_ids as string[]) : [],
  }));
  return { planId: d.subscription_plan_id, phases };
}

async function itemVariationOfPlan(planId: string): Promise<string> {
  const p = await sq("GET", `/v2/catalog/object/${planId}`);
  const itemId = p.json?.object?.subscription_plan_data?.eligible_item_ids?.[0];
  if (!itemId) throw new SubError("plan_item_missing", 502, "the plan has no eligible item");
  const i = await sq("GET", `/v2/catalog/object/${itemId}`);
  const iv = i.json?.object?.item_data?.variations?.[0]?.id;
  if (!iv) throw new SubError("plan_item_missing", 502, "the plan's item has no variation");
  return iv;
}

/** One DRAFT order template per RELATIVE phase; STATIC phases need none. */
async function buildPhases(variationId: string, seed: string): Promise<{ ordinal: number; order_template_id: string }[] | undefined> {
  const info = await readVariation(variationId);
  const rel = info.phases.filter((p) => p.relative);
  if (!rel.length) return undefined;
  if (!info.planId) throw new SubError("plan_not_found", 502);
  const itemVar = await itemVariationOfPlan(info.planId);
  const out: { ordinal: number; order_template_id: string }[] = [];
  for (const ph of rel) {
    const r = await sq("POST", "/v2/orders", {
      idempotency_key: idemKey(seed, `tmpl-${ph.ordinal}`),
      order: {
        location_id: await locationId(),
        state: "DRAFT",
        line_items: [{ catalog_object_id: itemVar, quantity: "1" }],
        ...(ph.discountIds.length ? { discounts: ph.discountIds.map((id) => ({ catalog_object_id: id, scope: "ORDER" })) } : {}),
      },
    });
    const id = r.json?.order?.id;
    if (!r.ok || !id) throw new SubError("square_error", 502, "could not prepare the plan");
    out.push({ ordinal: ph.ordinal, order_template_id: id });
  }
  return out;
}

async function readSquareSubscription(id: string): Promise<any> {
  const r = await sq("GET", `/v2/subscriptions/${id}?include=actions`);
  if (!r.ok || !r.json?.subscription) throw new SubError("square_error", 502, "could not read the subscription");
  return r.json.subscription;
}

/* ── identity ───────────────────────────────────────────────────────────── */

/** The entitlement key for a session subject `handle@space`. */
export async function grantKeyOf(subject: string): Promise<string | null> {
  const at = subject.lastIndexOf("@");
  if (at <= 0) return null;
  const handle = subject.slice(0, at);
  const space = subject.slice(at + 1);
  if (!handle || !space) return null;
  if (space === "email") return subject; // email members key by the subject string itself
  const entry = await getEntry(handle, space);
  return normalizeNpub(entry?.npub);
}

async function withLock<T>(subject: string, fn: () => Promise<T>): Promise<T> {
  if (!(await kvSetNx(K.lock(subject), "1", 60))) throw new SubError("busy", 409, "another change is in progress, try again in a moment");
  try { return await fn(); } finally { await kvDel(K.lock(subject)).catch(() => {}); }
}

/* ── refresh: the ONE place Square's state becomes our expiry ───────────── */

/**
 * Re-read the subscription from Square and make our record + entitlement
 * agree with it. Idempotent and order-proof: it never reads an event body,
 * the entitlement gets an ABSOLUTE expiry through `grantTier(..., {absolute})`
 * (max, never ADD), and the stored paid-through only moves forward.
 */
export async function refresh(subscriptionId: string): Promise<SubRecord | null> {
  const rec = await getRecord(subscriptionId);
  if (!rec) return null;
  const sub = await readSquareSubscription(subscriptionId);
  const now = Date.now();
  const d = deriveSubscription(sub, now, rec.chargedThroughMs);

  const next: SubRecord = { ...rec };
  // the swap landed: Square now bills the new variation
  if (next.pendingSwap && sub.plan_variation_id === next.pendingSwap.variationId) {
    next.planVariationId = next.pendingSwap.variationId;
    next.pendingSwap = undefined;
  } else if (!next.pendingSwap) {
    next.planVariationId = sub.plan_variation_id ?? next.planVariationId;
  }
  const swapAction = (sub.actions ?? []).find((a: any) => a.type === "SWAP_PLAN");
  if (next.pendingSwap && swapAction?.new_plan_variation_id === next.pendingSwap.variationId) next.pendingSwap.scheduled = true;

  if (rec.status !== "refunded") {
    next.status = d.status;
    next.canceledAtMs = d.canceledAtMs;
    next.chargedThroughMs = d.chargedThroughMs ?? next.chargedThroughMs;
    next.expiresAtMs = Math.max(rec.expiresAtMs ?? 0, d.expiresAtMs);
    if (d.expiresAtMs > now) {
      await grantTier(next.grantKey, next.tier, subOrderId(next.subscriptionId), { expiresAtMs: d.expiresAtMs, absolute: true });
    }
  }
  await putRecord(next);

  // a swap that failed after the difference was paid is retried here
  if (next.pendingSwap && !next.pendingSwap.scheduled && next.status !== "cancelling" && next.status !== "canceled" && next.status !== "refunded") {
    try { await scheduleSwap(next); } catch { /* retried on the next refresh */ }
  }
  return (await getRecord(subscriptionId)) ?? next;
}

async function scheduleSwap(rec: SubRecord): Promise<void> {
  const ps = rec.pendingSwap;
  if (!ps) return;
  const phases = await buildPhases(ps.variationId, `swap:${rec.subscriptionId}:${ps.variationId}`);
  const r = await sq("POST", `/v2/subscriptions/${rec.subscriptionId}/swap-plan`, {
    new_plan_variation_id: ps.variationId,
    ...(phases ? { phases } : {}),
  });
  if (!r.ok) throw new SubError("swap_failed", 502, "could not schedule the plan change");
  ps.scheduled = true;
  await putRecord(rec);
}

/* ── member actions ─────────────────────────────────────────────────────── */

function requireTier(tier: unknown): Tier {
  if (!isTier(tier)) throw new SubError("bad_tier", 400, "pick a membership");
  return tier;
}

export async function subscribe(
  subject: string,
  tier: Tier,
  variant: PlanVariant,
  cardToken: string,
  idempotencyKey: string,
  opts?: { email?: string; verificationToken?: string },
): Promise<SubRecord> {
  requireTier(tier);
  if (storeUnavailable()) throw new SubError("store_unavailable", 503, "memberships are not available right now");
  if (!isVariant(variant)) throw new SubError("bad_variant", 400, "unknown offer");
  if (typeof cardToken !== "string" || !/^[A-Za-z0-9:_-]{6,200}$/.test(cardToken)) throw new SubError("bad_card", 400, "card token missing");
  const grantKey = await grantKeyOf(subject);
  if (!grantKey) throw new SubError("no_seat", 403, "sign in with your own seat first");

  return withLock(subject, async () => {
    const cur = await getRecordForSubject(subject);
    if (cur && isLiveStatus(cur.status)) {
      const fresh = (await refresh(cur.subscriptionId).catch(() => null)) ?? cur;
      if (isLiveStatus(fresh.status)) {
        throw new SubError(RANK_OF[fresh.tier] >= RANK_OF[tier] ? "already_subscribed" : "use_upgrade", 409,
          RANK_OF[fresh.tier] >= RANK_OF[tier] ? "you already have this membership or a higher one" : "use Upgrade to move up");
      }
    }
    const map = await getPlanMap();
    if (!map.open.includes(variant)) throw new SubError("offer_closed", 400, "that offer is not open");
    const variationId = map.tiers[tier]?.[variant];
    if (!variationId) throw new SubError("plan_not_configured", 503, "that membership is not set up yet");
    if (variant !== "standard" && (await kvSmembers(K.hist(subject))).length > 0) {
      throw new SubError("offer_used", 409, "that offer is for first-time members");
    }

    const email = (await emailForSubject(subject).catch(() => null)) ?? opts?.email?.trim() ?? "";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new SubError("email_required", 400, "an email address is needed for receipts");
    const handle = subject.slice(0, subject.lastIndexOf("@"));

    // customer: ours by reference_id = the member subject
    let customerId: string | undefined;
    const found = await sq("POST", "/v2/customers/search", { query: { filter: { reference_id: { exact: subject } } } });
    customerId = found.json?.customers?.[0]?.id;
    if (!customerId) {
      const c = await sq("POST", "/v2/customers", {
        idempotency_key: idemKey(idempotencyKey, "cust"),
        reference_id: subject,
        given_name: handle.includes("@") ? handle.split("@")[0] : handle,
        email_address: email,
      });
      customerId = c.json?.customer?.id;
      if (!c.ok || !customerId) throw new SubError("square_error", 502, "could not set up your account");
    }
    const card = await sq("POST", "/v2/cards", {
      idempotency_key: idemKey(idempotencyKey, "card"),
      source_id: cardToken,
      ...(opts?.verificationToken ? { verification_token: opts.verificationToken } : {}),
      card: { customer_id: customerId },
    });
    const cardId = card.json?.card?.id;
    if (!card.ok || !cardId) throw new SubError("card_declined", 402, "that card could not be saved, try another card");

    // write the intent BEFORE Square can create anything: a subscription whose
    // reply we lose can then be adopted from its webhook (see adoptOrphan)
    const pending: PendingSub = { subject, grantKey, tier, variant, variationId, idempotencyKey, squareCustomerId: customerId, cardId, createdAtMs: Date.now() };
    await kvSet(K.pending(idempotencyKey), JSON.stringify(pending));
    await kvSet(K.pendingBySubject(subject), idempotencyKey);
    await kvSadd(K.custOf(subject), customerId);
    const phases = await buildPhases(variationId, idempotencyKey);
    const created = await sq("POST", "/v2/subscriptions", {
      idempotency_key: idemKey(idempotencyKey, "sub"),
      location_id: await locationId(),
      plan_variation_id: variationId,
      customer_id: customerId,
      card_id: cardId,
      start_date: todayIn(SUB_TZ),
      timezone: SUB_TZ,
      source: { name: "onecocreation.com" },
      ...(phases ? { phases } : {}),
    });
    const sub = created.json?.subscription;
    if (!created.ok || !sub?.id) {
      throw new SubError(squareCode(created.json) === "CARD_DECLINED" ? "card_declined" : "square_error", created.status === 402 ? 402 : 502, "the membership could not be started");
    }
    const now = Date.now();
    const rec: SubRecord = {
      subscriptionId: sub.id, subject, grantKey, tier, variant, planVariationId: variationId,
      squareCustomerId: customerId, cardId, status: "pending", createdAtMs: now, updatedAtMs: now,
    };
    await putRecord(rec);
    await kvSet(K.bySubject(subject), sub.id);
    await kvSadd(K.hist(subject), sub.id);
    await kvSadd(K.byCustomer(customerId), sub.id);
    await kvSadd(K.index, sub.id);
    await kvDel(K.pending(idempotencyKey)).catch(() => {});
    await kvDel(K.pendingBySubject(subject)).catch(() => {});
    return (await refresh(sub.id)) ?? rec;
  });
}

async function mine(subject: string): Promise<SubRecord> {
  const rec = await getRecordForSubject(subject);
  if (!rec || rec.subject !== subject) throw new SubError("no_subscription", 404, "no membership found");
  return rec;
}

export async function cancel(subject: string): Promise<SubRecord> {
  const rec = await mine(subject);
  return withLock(subject, async () => {
    if (!isLiveStatus(rec.status)) throw new SubError("not_active", 409, "this membership is not active");
    const r = await sq("POST", `/v2/subscriptions/${rec.subscriptionId}/cancel`, {});
    if (!r.ok) throw new SubError("square_error", 502, "could not cancel, try again");
    // Square clears a pending swap on cancel; the paid-for tier stays to paid-through
    const cur = (await getRecord(rec.subscriptionId)) ?? rec;
    if (cur.pendingSwap) { cur.pendingSwap = undefined; await putRecord(cur); }
    return (await refresh(rec.subscriptionId)) ?? cur;
  });
}

export async function undoCancel(subject: string): Promise<SubRecord> {
  const rec = await mine(subject);
  return withLock(subject, async () => {
    const sub = await readSquareSubscription(rec.subscriptionId);
    if (!sub.canceled_date || sub.status !== "ACTIVE") throw new SubError("not_cancelling", 409, "this membership is not set to end");
    const r = await sq("PUT", `/v2/subscriptions/${rec.subscriptionId}`, { subscription: { canceled_date: "", version: sub.version } });
    if (!r.ok) throw new SubError("square_error", 502, "could not keep your membership, try again");
    const after = (await refresh(rec.subscriptionId)) ?? rec;
    // the undo does not bring a scheduled swap back: the refresh retries it
    return after;
  });
}

export async function upgrade(subject: string, newTier: Tier): Promise<SubRecord> {
  requireTier(newTier);
  const first = await mine(subject);
  return withLock(subject, async () => {
    const rec = (await refresh(first.subscriptionId)) ?? first;
    if (rec.status === "cancelling") throw new SubError("undo_cancel_first", 409, "keep your membership first, then upgrade");
    if (rec.status === "past_due") throw new SubError("payment_needed", 409, "settle your open payment first");
    if (rec.status !== "active") throw new SubError("not_active", 409, "this membership is not active");
    if (RANK_OF[newTier] <= RANK_OF[rec.tier]) throw new SubError("not_an_upgrade", 400, "pick a higher membership");
    const map = await getPlanMap();
    const variationId = map.tiers[newTier]?.standard;
    if (!variationId) throw new SubError("plan_not_configured", 503, "that membership is not set up yet");

    // 1. the difference now, as a one-time payment on the card on file
    const cents = upgradeDifferenceCents(rec.tier, newTier);
    const pay = await sq("POST", "/v2/payments", {
      idempotency_key: idemKey(`upg:${rec.subscriptionId}:${newTier}:${rec.chargedThroughMs ?? 0}`, "pay"),
      source_id: rec.cardId,
      customer_id: rec.squareCustomerId,
      location_id: await locationId(),
      amount_money: { amount: cents, currency: "USD" },
      autocomplete: true,
      reference_id: `sub-upgrade:${rec.subscriptionId}`.slice(0, 40),
      note: `Upgrade to ${TIERS[newTier].name}`,
    });
    if (!pay.ok || pay.json?.payment?.status !== "COMPLETED") throw new SubError("payment_failed", 402, "the upgrade payment did not go through");

    // 2. higher tier at once, to paid-through; the new price from the next billing
    const next: SubRecord = { ...rec, tier: newTier, variant: "standard", pendingSwap: { tier: newTier, variationId, scheduled: false } };
    await putRecord(next);
    try { await scheduleSwap(next); } catch { /* the refresh below retries it */ }
    return (await refresh(rec.subscriptionId)) ?? next;
  });
}

/** What the member sees: no card ids, no customer ids. */
export function publicView(rec: SubRecord | null) {
  if (!rec) return null;
  return {
    status: rec.status,
    tier: rec.tier,
    tierName: TIERS[rec.tier].name,
    variant: rec.variant,
    chargedThroughMs: rec.chargedThroughMs ?? null,
    expiresAtMs: rec.expiresAtMs ?? null,
    canceledAtMs: rec.canceledAtMs ?? null,
    pendingSwapTier: rec.pendingSwap?.tier ?? null,
    upgrades: (["A", "B", "C"] as Tier[])
      .filter((t) => RANK_OF[t] > RANK_OF[rec.tier])
      .map((t) => ({ tier: t, name: TIERS[t].name, differenceCents: upgradeDifferenceCents(rec.tier, t) })),
  };
}

/** GET: my state; a live record is re-read from Square when it is over a minute old. */
export async function mySubscription(subject: string): Promise<SubRecord | null> {
  const rec = await getRecordForSubject(subject);
  if (!rec || rec.subject !== subject) return null;
  if (isLiveStatus(rec.status) && Date.now() - rec.updatedAtMs > 60_000) {
    try { return (await refresh(rec.subscriptionId)) ?? rec; } catch { return rec; }
  }
  return rec;
}

/* ── webhook handling ───────────────────────────────────────────────────── */

export interface SquareSubEvent {
  type: string;
  eventId?: string;
  subscriptionId?: string;
  invoiceId?: string;
  orderId?: string;
  refund?: boolean;
}

/** First delivery of an event id wins; a replay is a no-op (7 days). */
export async function claimEvent(eventId: string): Promise<boolean> {
  return kvSetNx(K.event(eventId), "1", 7 * 24 * 3600);
}
export async function releaseEvent(eventId: string): Promise<void> {
  await kvDel(K.event(eventId)).catch(() => {});
}

async function listSubscriptionInvoices(rec: SubRecord): Promise<any[]> {
  const r = await sq("POST", "/v2/invoices/search", {
    query: { filter: { location_ids: [await locationId()], customer_ids: [rec.squareCustomerId] } },
  });
  return ((r.json?.invoices ?? []) as any[]).filter((i) => i.subscription_id === rec.subscriptionId);
}

const dueDate = (i: any): string => i?.payment_requests?.[0]?.due_date ?? "";

/**
 * A refund closes access for the REFUNDED period only: it revokes when the
 * refunded invoice is fully refunded AND is the latest paid period of this
 * subscription. A refund of an older period, or a partial refund, never
 * touches a current paid month (SECURITY-SCOPE risk 4/11).
 */
export async function applyRefund(rec: SubRecord, ref: { invoiceId?: string; orderId?: string }): Promise<"revoked" | "ignored"> {
  const invoices = await listSubscriptionInvoices(rec);
  const target = invoices.find((i) => (ref.invoiceId && i.id === ref.invoiceId) || (ref.orderId && i.order_id === ref.orderId));
  if (!target || target.status !== "REFUNDED") return "ignored";
  const paidish = invoices.filter((i) => ["PAID", "REFUNDED", "PARTIALLY_REFUNDED"].includes(i.status));
  const latest = paidish.map(dueDate).sort().pop() ?? "";
  if (dueDate(target) < latest) return "ignored";
  const cur = (await getRecord(rec.subscriptionId)) ?? rec;
  cur.status = "refunded";
  cur.refundedInvoiceId = target.id;
  await putRecord(cur);
  const ent = await getEntitlement(cur.grantKey);
  if (ent && ent.orderId === subOrderId(cur.subscriptionId)) await revokeTier(cur.grantKey);
  await sq("POST", `/v2/subscriptions/${cur.subscriptionId}/cancel`, {}).catch(() => {}); // stop charging
  return "revoked";
}

/**
 * An unknown subscription id on a verified event: re-read it at Square; adopt
 * it ONLY when its customer carries a reference_id (the session subject we
 * set) AND that customer id is one we stored for that subject AND we hold a
 * pending intent for that subject (tier and grant key come from OUR intent,
 * never from Square). Anything else is ignored.
 */
async function adoptOrphan(subId: string): Promise<SubRecord | null> {
  if (!/^[A-Za-z0-9-]{8,64}$/.test(subId)) return null;
  try {
    const sub = await readSquareSubscription(subId);
    const c = await sq("GET", `/v2/customers/${sub.customer_id}`);
    const subject: unknown = c.json?.customer?.reference_id;
    if (!c.ok || typeof subject !== "string" || !subject) return null;
    if (!(await kvSmembers(K.custOf(subject))).includes(sub.customer_id)) return null;
    const key = await kvGet(K.pendingBySubject(subject));
    const raw = key ? await kvGet(K.pending(key)) : null;
    if (!raw) return null;
    const p = JSON.parse(raw) as PendingSub;
    if (p.subject !== subject || p.squareCustomerId !== sub.customer_id || p.variationId !== sub.plan_variation_id) return null;
    const now = Date.now();
    const rec: SubRecord = {
      subscriptionId: subId, subject, grantKey: p.grantKey, tier: p.tier, variant: p.variant, planVariationId: p.variationId,
      squareCustomerId: p.squareCustomerId, cardId: p.cardId, status: "pending", createdAtMs: now, updatedAtMs: now,
    };
    await putRecord(rec);
    await kvSet(K.bySubject(subject), subId);
    await kvSadd(K.hist(subject), subId);
    await kvSadd(K.byCustomer(p.squareCustomerId), subId);
    await kvSadd(K.index, subId);
    await kvDel(K.pending(p.idempotencyKey)).catch(() => {});
    await kvDel(K.pendingBySubject(subject)).catch(() => {});
    console.info("adopted an orphaned subscription from its event");
    return rec;
  } catch (e) {
    void e;
    return null;
  }
}

/** Cron-safe sweep: refresh every record, bounded. Returns counts. */
export async function reconcileAll(limit = 50): Promise<{ checked: number; failed: number; total: number }> {
  const all = (await listRecords()).filter((r) => r.status !== "refunded" && (isLiveStatus(r.status) || (r.expiresAtMs ?? 0) > Date.now() - 7 * 86400_000));
  let failed = 0;
  const batch = all.slice(0, limit);
  for (const r of batch) {
    try { await refresh(r.subscriptionId); } catch { failed++; }
  }
  return { checked: batch.length, failed, total: all.length };
}

/**
 * One verified, de-duplicated Square event -> OUR record by subscription id
 * -> refresh(). Unknown subscription ids are ignored (logged without PII).
 * Returns what it did, for the route and the tests.
 */
export async function handleSubscriptionEvent(ev: SquareSubEvent): Promise<"ignored" | "refreshed" | "revoked"> {
  let subId = ev.subscriptionId;
  const invoiceId = ev.invoiceId;
  if (!subId && invoiceId) {
    const r = await sq("GET", `/v2/invoices/${invoiceId}`);
    subId = r.json?.invoice?.subscription_id;
  }
  let rec = subId ? await getRecord(subId) : null;
  if (!rec && subId) rec = await adoptOrphan(subId);
  if (!rec && ev.refund && ev.orderId) {
    // a refund names the invoice's order: find it among our customers' invoices
    for (const r of await listRecords()) {
      if ((await listSubscriptionInvoices(r)).some((i) => i.order_id === ev.orderId)) { rec = r; break; }
    }
  }
  if (!rec) {
    console.info("subscription event for an unknown subscription ignored:", ev.type);
    return "ignored";
  }
  if (ev.refund) {
    const outcome = await applyRefund(rec, { invoiceId, orderId: ev.orderId });
    if (outcome === "revoked") return "revoked";
  }
  await refresh(rec.subscriptionId);
  return "refreshed";
}

/* ── operator: list the account's plans so the Admiral can pick ─────────── */

export interface PlanListing {
  planId: string;
  name: string;
  variations: {
    id: string;
    name: string;
    phases: { ordinal: number; cadence: string; periods: number | null; pricing: "RELATIVE" | "STATIC"; priceCents: number | null; discountIds: string[] }[];
  }[];
}

export async function listSquarePlans(): Promise<PlanListing[]> {
  const r = await sq("POST", "/v2/catalog/search", { object_types: ["SUBSCRIPTION_PLAN"], include_related_objects: true });
  if (!r.ok) throw new SubError("square_error", 502, "could not read the plans from Square");
  const objects: any[] = r.json?.objects ?? [];
  const related: any[] = r.json?.related_objects ?? [];
  // item prices for RELATIVE phases, and discounts, from one batch read
  const wanted = new Set<string>();
  for (const o of objects) {
    for (const id of o.subscription_plan_data?.eligible_item_ids ?? []) wanted.add(id);
    for (const v of o.subscription_plan_data?.subscription_plan_variations ?? [])
      for (const p of v.subscription_plan_variation_data?.phases ?? []) for (const d of p.pricing?.discount_ids ?? []) wanted.add(d);
  }
  const lookup = new Map<string, any>(related.map((x) => [x.id, x]));
  const missing = [...wanted].filter((id) => !lookup.has(id));
  if (missing.length) {
    const b = await sq("POST", "/v2/catalog/batch-retrieve", { object_ids: missing });
    for (const x of (b.json?.objects ?? []) as any[]) lookup.set(x.id, x);
  }
  return objects.map((o) => {
    const itemId = o.subscription_plan_data?.eligible_item_ids?.[0];
    const itemPrice: number | null = lookup.get(itemId)?.item_data?.variations?.[0]?.item_variation_data?.price_money?.amount ?? null;
    return {
      planId: o.id,
      name: o.subscription_plan_data?.name ?? "",
      variations: (o.subscription_plan_data?.subscription_plan_variations ?? []).map((v: any) => ({
        id: v.id,
        name: v.subscription_plan_variation_data?.name ?? "",
        phases: (v.subscription_plan_variation_data?.phases ?? []).map((p: any) => {
          const rel = p.pricing?.type === "RELATIVE";
          let cents: number | null = rel ? itemPrice : (p.pricing?.price_money?.amount ?? null);
          if (rel && cents != null) {
            for (const did of p.pricing?.discount_ids ?? []) {
              const dd = lookup.get(did)?.discount_data;
              if (dd?.discount_type === "FIXED_PERCENTAGE") cents = Math.round(cents * (1 - Number(dd.percentage) / 100));
              else if (dd?.discount_type === "FIXED_AMOUNT") cents = Math.max(0, cents - (dd.amount_money?.amount ?? 0));
            }
          }
          return {
            ordinal: p.ordinal ?? 0,
            cadence: p.cadence ?? "",
            periods: typeof p.periods === "number" ? p.periods : null,
            pricing: rel ? "RELATIVE" : "STATIC",
            priceCents: cents,
            discountIds: p.pricing?.discount_ids ?? [],
          };
        }),
      })),
    };
  });
}
