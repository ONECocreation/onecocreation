#!/usr/bin/env node
/**
 * T-539 one-shot migration (block 969,584 ruling): every tier record with NO
 * expiry ends at October 31, 2026, end of day Pacific. DRY-RUN BY DEFAULT.
 *
 *   KV_REST_API_URL=... KV_REST_API_TOKEN=... node scripts/migrate-tier-expiry.mjs          # prints the plan
 *   KV_REST_API_URL=... KV_REST_API_TOKEN=... node scripts/migrate-tier-expiry.mjs --apply  # writes
 *
 * Reads ONLY the process environment (never .env.local). Upstash-REST shape,
 * same keys as src/lib/entitlement.ts: `oco:tier:<npub>` records, the
 * `oco:tiers:index` set.
 *
 * Rules (planRecord):
 *  - revoked records: untouched (access already closed).
 *  - no expiresAtMs: set to the Oct 31 end.
 *  - expiresAtMs already set (a taster, or a record this script or a 30-day
 *    purchase already dated): kept as is, EVEN IF later than Oct 31.
 *  - `under` (the standing grant beneath a taster, TASK-462): a legacy
 *    open-ended `under` gets the Oct 31 end too, whether or not the top
 *    record itself had an expiry, otherwise the fallback would outlive the
 *    ruling. A dated `under` is kept.
 *  Idempotent: a second run finds nothing to change.
 */
import { fileURLToPath } from "node:url";

/** 2026-10-31 23:59:59.999 America/Los_Angeles (PDT, UTC-7). */
export const LEGACY_END_MS = Date.UTC(2026, 10, 1, 6, 59, 59, 999);

/** Pure: returns { rec, changed, note } for one stored record. */
export function planRecord(rec, endMs = LEGACY_END_MS) {
  if (rec.revokedAtMs) return { rec, changed: false, note: "revoked, untouched" };
  const next = { ...rec };
  const notes = [];
  if (rec.expiresAtMs == null) {
    next.expiresAtMs = endMs;
    notes.push("open-ended -> Oct 31");
  }
  if (rec.under && rec.under.expiresAtMs == null) {
    next.under = { ...rec.under, expiresAtMs: endMs };
    notes.push("under open-ended -> Oct 31");
  }
  return { rec: next, changed: notes.length > 0, note: notes.join("; ") || "has expiry, kept" };
}

const abbr = (n) => (n.length > 16 ? `${n.slice(0, 8)}...${n.slice(-6)}` : n);
const when = (ms) => (ms == null ? "none" : new Date(ms).toISOString());

export async function run({ url, token, apply = false, log = console.log }) {
  const kv = async (cmd) => {
    const res = await fetch(url, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(cmd),
    });
    if (!res.ok) throw new Error(`KV ${res.status}`);
    return (await res.json()).result;
  };
  const npubs = ((await kv(["SMEMBERS", "oco:tiers:index"])) ?? []).sort();
  let changed = 0;
  for (const npub of npubs) {
    const raw = await kv(["GET", `oco:tier:${npub}`]);
    if (typeof raw !== "string") continue;
    const rec = JSON.parse(raw);
    const plan = planRecord(rec);
    log(`${abbr(npub)}  tier ${rec.tier}  expiry ${when(rec.expiresAtMs)} -> ${when(plan.rec.expiresAtMs)}  [${plan.note}]`);
    if (!plan.changed) continue;
    changed++;
    if (apply) await kv(["SET", `oco:tier:${npub}`, JSON.stringify(plan.rec)]);
  }
  log(`${apply ? "APPLIED" : "DRY RUN"}: ${changed} of ${npubs.length} record(s) ${apply ? "updated" : "would change"}.`);
  return { total: npubs.length, changed };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  if (!url || !token) {
    console.error("KV_REST_API_URL and KV_REST_API_TOKEN must be in the environment.");
    process.exit(2);
  }
  await run({ url, token, apply: process.argv.includes("--apply") });
}
