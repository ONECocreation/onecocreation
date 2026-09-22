import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from "vitest";
import { grantTier, getEntitlement } from "@/lib/entitlement";

/**
 * TASK-403 — B-1: an early renewal adds days to the standing expiry instead
 * of losing them (`src/lib/entitlement.ts:238-239`, the ONE retrued branch).
 * `grantTier` had no test file at all before this lane (`grep -rln
 * "grantTier" tests` was empty at cut).
 *
 * House idioms: the KV fixture is `tests/discovery-checkout.test.ts:188-230`'s
 * `vi.stubGlobal("fetch", …)` pattern, trimmed to the GET/SET/SADD `grantTier`
 * actually speaks (`entitlement.ts:140/:152/:153`) — inside
 * `scripts/fixture-kv.cjs`'s own command surface, named in SUMMARY's Seams
 * (K98 tune 2: an inline fake that speaks more of the protocol than the
 * shared fixture is a named seam; this one speaks less, named anyway). The
 * fake-timer idiom is `tests/reading-letters.test.ts:267-268`'s
 * `vi.useFakeTimers()` + `vi.setSystemTime(T)`.
 *
 * Every row asserts against the PERSISTED record — a fresh `getEntitlement`
 * read after each `grantTier` call, never the in-memory return value alone —
 * against literal millisecond numbers, never a test-side recomputation of
 * the source's own formula (AMENDMENT block-968,141, Astra §4 / Lintable).
 *
 * AMENDMENT (Number One, after `walk-968036/ASTRA-REVIEW-T403.md`, block
 * 968,141) folded in:
 *   R1 — the recovered length is honest to the read: the caller encodes
 *     `now + days` BEFORE `grantTier` awaits the KV read (`:224`), so
 *     `opts.expiresAtMs − Date.now()` recovers the pass's own length minus
 *     the few ms that read took. Fake timers hold this exact in every row
 *     here — the KV stub below touches no real timer, so nothing drifts
 *     between the await and the read.
 *   R2 — the retry guard (`:225`) is pinned for exactly what it does: an
 *     immediate retry of the CURRENT, still-standing same-tier order returns
 *     unchanged. Historical/interleaved replay (an older orderId after a
 *     newer grant already replaced it, `:244-247`) is NOT exercised here and
 *     is not guaranteed — see SUMMARY.
 *   R3 — two more rows (permanent resists a taster, `:235-237`; a
 *     different-length renewal so a hard-coded seven days cannot pass) plus
 *     the equality-boundary row (`:172` is `>`, never `>=` — pinned without
 *     touching the gate).
 */

const KV_URL = "http://kv.fixture.t403";
const NPUB = "a".repeat(64); // safeNpub (:124): a 64-char hex string is the clean fixture
const DAY = 86_400_000;
const T0 = 1_700_000_000_000; // an arbitrary fixed instant — block-time house, no civil dates

let kvStore: Map<string, string>;
let kvSets: Map<string, Set<string>>;

beforeAll(() => {
  delete process.env.VERCEL;
  delete process.env.REDIS_URL;
  process.env.KV_REST_API_URL = KV_URL;
  process.env.KV_REST_API_TOKEN = "fixture-kv-token-t403";

  // grantTier's whole writer surface is GET (:140) / SET (:152) / SADD
  // (:153) — nothing else — so the fake speaks only those three, inside
  // scripts/fixture-kv.cjs's own command surface.
  vi.stubGlobal("fetch", async (url: unknown, init?: RequestInit) => {
    const u = String(url);
    if (u !== KV_URL) throw new Error(`unexpected fetch: ${u}`);
    const cmd = (JSON.parse(String(init?.body)) as unknown[]).map(String);
    const [op, ...args] = cmd;
    let result: unknown = null;
    if (op === "GET") {
      result = kvStore.get(args[0]) ?? null;
    } else if (op === "SET") {
      kvStore.set(args[0], args[1]);
      result = "OK";
    } else if (op === "SADD") {
      const s = kvSets.get(args[0]) ?? new Set<string>();
      s.add(args[1]);
      kvSets.set(args[0], s);
      result = 1;
    } else {
      throw new Error(`fixture KV: unhandled op ${op}`);
    }
    return new Response(JSON.stringify({ result }), { status: 200 });
  });
});

beforeEach(() => {
  kvStore = new Map();
  kvSets = new Map();
  vi.useFakeTimers();
  vi.setSystemTime(T0);
});

afterEach(() => {
  vi.useRealTimers();
});

/** The PERSISTED record — a fresh read through the module's own gate, never
 *  the `grantTier` return value alone (AMENDMENT Lintable). */
async function persisted() {
  const rec = await getEntitlement(NPUB);
  expect(rec).not.toBeNull();
  return rec!;
}

describe("grantTier — B-1: an early renewal adds days, never loses them", () => {
  it("early renewal adds the pass's own length onto the standing end (RED on the untouched branch: yielded T0+950,400,000 — the 3 remaining days, 259,200,000 ms, lost)", async () => {
    await grantTier(NPUB, "A", "order-1", { expiresAtMs: T0 + 7 * DAY }); // expiry T0+604,800,000
    vi.setSystemTime(T0 + 4 * DAY); // 4 days in — 3 days still standing
    await grantTier(NPUB, "A", "order-2", { expiresAtMs: T0 + 4 * DAY + 7 * DAY }); // the caller's honest now+7d
    const rec = await persisted();
    expect(rec.expiresAtMs).toBe(T0 + 1_209_600_000); // old end (T0+604,800,000) + this pass's own 7 days
  });

  it("a different-length renewal adds ITS OWN length, not a hard-coded seven days (a 30-day pass onto a 7-day remainder)", async () => {
    await grantTier(NPUB, "A", "order-1", { expiresAtMs: T0 + 7 * DAY }); // expiry T0+604,800,000
    vi.setSystemTime(T0 + 2 * DAY); // 2 days in — 5 days still standing
    await grantTier(NPUB, "A", "order-2", { expiresAtMs: T0 + 2 * DAY + 30 * DAY }); // a 30-day pass
    const rec = await persisted();
    expect(rec.expiresAtMs).toBe(T0 + 3_196_800_000); // old end (7d) + this pass's own 30 days = 37 days
  });

  it("the standing expiry is not expired at the gate read when now equals it exactly (:172 is `>`, never `>=`) — the renewal still adds, it does not restart", async () => {
    await grantTier(NPUB, "A", "order-1", { expiresAtMs: T0 + 7 * DAY }); // expiry T0+604,800,000, grantedAtMs T0
    vi.setSystemTime(T0 + 7 * DAY); // the exact expiry instant — equality, not past it
    await grantTier(NPUB, "A", "order-2", { expiresAtMs: T0 + 7 * DAY + 7 * DAY });
    const rec = await persisted();
    // grantedAtMs only survives from the original grant when getEntitlement's
    // gate read the standing record as non-null at this exact instant — the
    // distinguishing signal, since the expiry arithmetic alone coincides at
    // the boundary whether the record is read as standing or as lapsed
    // (when now === existing.expiresAtMs, adding (opts − now) onto existing
    // equals opts either way — grantedAtMs is what actually tells them apart).
    expect(rec.grantedAtMs).toBe(T0);
    expect(rec.expiresAtMs).toBe(T0 + 1_209_600_000);
  });

  it("a lapsed renewal restarts fresh — the old days do not resurrect", async () => {
    await grantTier(NPUB, "A", "order-1", { expiresAtMs: T0 + 7 * DAY }); // expiry T0+604,800,000
    vi.setSystemTime(T0 + 10 * DAY); // 10 days in — 3 days PAST the end
    await grantTier(NPUB, "A", "order-2", { expiresAtMs: T0 + 10 * DAY + 7 * DAY });
    const rec = await persisted();
    expect(rec.expiresAtMs).toBe(T0 + 1_468_800_000); // now+7d only — the lapsed 7 days are gone
  });

  it("a different tier is untouched — the standing tier and its expiry stand exactly", async () => {
    await grantTier(NPUB, "B", "order-1", { expiresAtMs: T0 + 7 * DAY }); // E = T0+604,800,000
    await grantTier(NPUB, "A", "order-2", { expiresAtMs: T0 + 3 * DAY }); // a lower tier arrives
    const rec = await persisted();
    expect(rec.tier).toBe("B");
    expect(rec.expiresAtMs).toBe(T0 + 604_800_000);
  });

  it("a permanent grant clears a taster's expiry", async () => {
    await grantTier(NPUB, "A", "order-1", { expiresAtMs: T0 + 7 * DAY }); // a taster first
    await grantTier(NPUB, "A", "order-2", {}); // then a permanent purchase, same tier
    const rec = await persisted();
    expect(rec.expiresAtMs).toBeUndefined();
  });

  it("a permanent grant resists a taster — a later taster purchase cannot add an expiry back", async () => {
    await grantTier(NPUB, "A", "order-1", {}); // permanent first
    await grantTier(NPUB, "A", "order-2", { expiresAtMs: T0 + 7 * DAY }); // then a taster, same tier
    const rec = await persisted();
    expect(rec.expiresAtMs).toBeUndefined();
  });

  it("the retry guard: an immediate retry of the current, still-standing same orderId+tier returns unchanged (historical/interleaved replay is not exercised here)", async () => {
    await grantTier(NPUB, "A", "order-1", { expiresAtMs: T0 + 7 * DAY });
    const before = await persisted();
    vi.setSystemTime(T0 + 1 * DAY);
    await grantTier(NPUB, "A", "order-1", { expiresAtMs: T0 + 999 * DAY }); // same order, same tier — a webhook's second knock
    const after = await persisted();
    expect(after.expiresAtMs).toBe(before.expiresAtMs);
    expect(after.grantedAtMs).toBe(before.grantedAtMs);
    expect(after.expiresAtMs).toBe(T0 + 604_800_000); // literal check — the retry never re-enters the ladder at all
  });
});
