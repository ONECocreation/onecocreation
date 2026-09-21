#!/usr/bin/env node
/**
 * account-name-dupe-sweep.mjs (TASK-358, D5 — the Admiral's words, block
 * 967,926: "do the name claim sweep") — a report of every `accountName`
 * two or more email members already hold today, run BEFORE relying on the
 * `SET accountname:<want> <holder> NX` reservation (this same lane's
 * `profile/route.ts` change) to keep names unique. "Claim" with no
 * uniqueness was never a real claim — two email members can hold the
 * identical `@onecocreation` community name right now. Love resolves any
 * duplicates this prints, by hand.
 *
 * DEFAULT MODE IS READ-ONLY, on purpose: with no flags, this script issues
 * SCAN and GET ONLY. It never SETs, never DELs, never rewrites a profile
 * doc. It only prints.
 *
 * FOLLOW-UP (Number One's review, same block as D5): the route's own
 * reservation only ever fires on a name CHANGE — every name saved before
 * this lane shipped carries no reservation at all, and `profile/route.ts`
 * now heals that lazily (any GET/PUT that reads an already-set
 * `accountName` reserves it, NX, best-effort) as members visit. Members
 * who never visit `/me` again never get healed that way. `--backfill`
 * is the batch path for them:
 *
 *   KV_REST_API_URL=... KV_REST_API_TOKEN=... node scripts/account-name-dupe-sweep.mjs --backfill
 *
 * With `--backfill`, AFTER the same read-only duplicate report above, this
 * script walks every NON-duplicated accountName and issues exactly one
 * `SET accountname:<name> <email> NX` per name — reserving it if nobody
 * holds it yet, or printing who already does if someone (this same
 * member's own prior heal, or a legacy twin) beat it there. A DUPLICATED
 * name (two or more email members holding it) is never reserved for
 * either side under `--backfill` — it is printed and skipped, exactly
 * like default mode, so a human decides who keeps it before either twin
 * is reserved. `--backfill` still never issues DEL, never touches
 * `member:profile:*`, and never issues a SET without the NX flag — the
 * ONLY commands this script can ever send, in either mode, are SCAN, GET,
 * and `SET … NX`.
 *
 * This is first-of-kind in this repo — grepped clean at this lane's cut
 * (`grep -rn "KEYS\|SCAN" src/ scripts/` found zero real Redis/Upstash
 * SCAN or KEYS uses anywhere else). No SCAN precedent exists here to cite.
 *
 * NOT exercised end-to-end by any automated test in this repo: the local
 * fixture (scripts/fixture-kv.cjs) implements GET/SET/DEL/SADD/SMEMBERS/
 * SREM/INCR but has no SCAN op, so this script has nothing to run against
 * under `npx vitest run` or the shots harness (tests/me-constellation-
 * stars.test.ts pins its source shape instead — default mode never emits
 * SET, and every SET this file can ever emit carries NX). It is an
 * operator tool, run by hand against a real KV endpoint — never against
 * anything else. Running EITHER mode against production KV is the
 * Admiral's hand — the production KV token is not on this box (Vercel
 * Sensitive env is write-only).
 *
 * Optional: NEXT_PUBLIC_SPACE_NAME picks which key-space registry file (if
 * any, see below) to cross-check against; defaults to "onecocreation".
 */

import { readFile } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const url = process.env.KV_REST_API_URL;
const token = process.env.KV_REST_API_TOKEN;
if (!url || !token) {
  console.error(
    "account-name-dupe-sweep: KV_REST_API_URL and KV_REST_API_TOKEN are required (the vault's own REST creds) — refusing to guess",
  );
  process.exit(2);
}

const PROFILE_PREFIX = "member:profile:";
const accountNameKey = (name) => `accountname:${name}`;
const backfill = process.argv.includes("--backfill");

async function kv(cmd) {
  const res = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(cmd),
  });
  if (!res.ok) throw new Error(`account-name-dupe-sweep: KV ${res.status}`);
  return (await res.json()).result;
}

/** Every `member:profile:*` key, cursor-walked — SCAN only, never KEYS
 *  (KEYS blocks the whole store on a large keyspace; SCAN doesn't). */
async function scanAll(pattern) {
  const keys = [];
  let cursor = "0";
  do {
    const result = await kv(["SCAN", cursor, "MATCH", pattern, "COUNT", "200"]);
    const [next, batch] = Array.isArray(result) ? result : ["0", []];
    cursor = String(next);
    keys.push(...(batch ?? []));
  } while (cursor !== "0");
  return keys;
}

/** The key-space handle registry, if it's the local file driver (cheaply
 *  readable — a plain fs read, no credentials). The production driver may
 *  instead be Vercel Blob (registry.ts's `blobStoreEnabled()`), which this
 *  script does NOT reach — that needs its own token, not held here, and is
 *  named honestly below rather than guessed at. */
async function localKeyHandles(space) {
  const dataDir = join(dirname(fileURLToPath(import.meta.url)), "..", "data");
  const path = join(dataDir, `${space}-registry.json`);
  try {
    const raw = await readFile(path, "utf8");
    const reg = JSON.parse(raw);
    return new Set((reg?.entries ?? []).map((e) => e.handle));
  } catch {
    return null; // no local file — not an error, just nothing to cross-check
  }
}

async function main() {
  const space = process.env.NEXT_PUBLIC_SPACE_NAME ?? "onecocreation";

  console.log(`account-name-dupe-sweep: scanning ${PROFILE_PREFIX}* (read-only) …`);
  const keys = await scanAll(`${PROFILE_PREFIX}*`);

  /** accountName -> [email, ...] */
  const byName = new Map();
  for (const key of keys) {
    const raw = await kv(["GET", key]);
    if (!raw) continue;
    let doc;
    try {
      doc = JSON.parse(raw);
    } catch {
      continue;
    }
    const name = typeof doc?.accountName === "string" ? doc.accountName : "";
    if (!name) continue;
    const email = key.slice(PROFILE_PREFIX.length);
    if (!byName.has(name)) byName.set(name, []);
    byName.get(name).push(email);
  }

  let dupes = 0;
  for (const [name, emails] of byName) {
    if (emails.length > 1) {
      dupes++;
      console.log(`  DUPLICATE accountName "${name}" held by ${emails.length} email members: ${emails.join(", ")}`);
    }
  }

  const keyHandles = await localKeyHandles(space);
  if (keyHandles) {
    let collisions = 0;
    for (const name of byName.keys()) {
      if (keyHandles.has(name)) {
        collisions++;
        console.log(`  COLLISION accountName "${name}" is ALSO a live @${space} key handle: ${byName.get(name).join(", ")}`);
      }
    }
    if (collisions === 0) console.log(`  no accountName collides with a local @${space} key handle`);
  } else {
    console.log(
      `  (no local ${space}-registry.json to cross-check — this deployment's key-handle registry is Vercel Blob, ` +
        "which this script does not reach; run the availability check by hand for any name this prints, before resolving it)",
    );
  }

  if (dupes === 0) {
    console.log(`account-name-dupe-sweep: no duplicates — ${byName.size} named email members, all unique. Safe to ship the reservation.`);
  } else {
    console.log(`account-name-dupe-sweep: ${dupes} duplicate name(s) found above — resolve by hand before shipping the reservation commit.`);
  }

  if (!backfill) return;

  // --backfill: the batch heal for members who never visit /me again (the
  // route's own lazy heal, profile/route.ts, covers everyone who does).
  // Every command below is `SET … NX` — reserve if free, print who already
  // holds it otherwise. Never DEL, never a SET without NX, never touches
  // member:profile:* directly.
  console.log(`account-name-dupe-sweep: --backfill reserving every non-duplicated name …`);
  for (const [name, emails] of byName) {
    if (emails.length > 1) {
      console.log(`  SKIP "${name}" — duplicated among ${emails.length} members; resolve by hand, then re-run --backfill`);
      continue;
    }
    const holder = emails[0];
    const result = await kv(["SET", accountNameKey(name), holder, "NX"]);
    if (result === "OK") {
      console.log(`  reserved "${name}" → ${holder}`);
      continue;
    }
    const heldBy = (await kv(["GET", accountNameKey(name)])) ?? "unknown";
    const note = heldBy === holder ? " (already reserved — no action needed)" : " (DUPLICATE not caught above — resolve by hand)";
    console.log(`  refused "${name}" — already held by ${heldBy}${note}`);
  }
}

main().catch((err) => {
  console.error("account-name-dupe-sweep failed:", err?.message ?? err);
  process.exit(1);
});
