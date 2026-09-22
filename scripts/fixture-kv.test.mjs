#!/usr/bin/env node
/**
 * TASK-399 — command-behaviour coverage for scripts/fixture-kv.cjs (the
 * scripts/*.test.mjs house shape). tests/shots-fixture-harness.test.ts
 * pins existence, the --ports law, and the no-hardcoded-port-literal rule
 * — never command behaviour; this file is that other half.
 *
 * AMENDMENT R6 (Astra review, Number One): the lintable is a contract,
 * not a grep — the fixture's own docblock carries the supported-command
 * list, and this file drives EVERY command on that list: the pre-existing
 * five (GET/SET/DEL/SADD/SMEMBERS) + SREM + INCR + the new hash/KEYS/
 * EXISTS/EXPIRE/PEXPIRE family. The `src/lib` caller grep in the brief is
 * supporting evidence, not the assertion.
 *
 * No lane port (AMENDMENT R3): TASK-282's law stands (FIXTURE_KV_PORT is
 * required, no fallback), so this test cannot pass a fixed port either.
 * It probes a free one itself — bind a throwaway net server on 127.0.0.1,
 * read the OS-assigned port, close that server, then spawn the real
 * fixture with that port explicit in FIXTURE_KV_PORT. The readiness poll
 * is bounded (≤5s total) and fails with a plain message the moment the
 * child exits early (a lost probe-to-spawn race), never a hang; every
 * individual request against the fixture is itself bounded (≤2s). The
 * child is killed in a `finally`, win or lose, so no orphan is left
 * listening.
 *
 * Run from the repo root:  node scripts/fixture-kv.test.mjs
 */
import { createServer } from "node:net";
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
const KV_SCRIPT = path.join(ROOT, "scripts", "fixture-kv.cjs");
const REQUEST_TIMEOUT_MS = 2000;
const READY_TIMEOUT_MS = 5000;

let passed = 0,
  failed = 0;
function t(name, cond, extra = "") {
  if (cond) passed++;
  else {
    failed++;
    console.log(`FAIL  ${name}${extra ? ` — ${extra}` : ""}`);
  }
}

/** Bind on port 0 (OS-assigned), read it back, close, hand it off. */
function probeFreePort() {
  return new Promise((resolve, reject) => {
    const srv = createServer();
    srv.on("error", reject);
    srv.listen(0, "127.0.0.1", () => {
      const { port } = srv.address();
      srv.close((err) => (err ? reject(err) : resolve(port)));
    });
  });
}

/**
 * Poll until the freshly-spawned fixture answers, or give up. Fails fast
 * with a plain message — never spins the full timeout — the moment the
 * child process exits, which is what a lost probe-to-spawn race (someone
 * else grabbed the port between probe and spawn) looks like.
 */
async function waitReady(child, port, childErrRef) {
  const deadline = Date.now() + READY_TIMEOUT_MS;
  let exitInfo = null;
  const onExit = (code, signal) => {
    exitInfo = `code=${code} signal=${signal}`;
  };
  child.once("exit", onExit);
  try {
    while (Date.now() < deadline) {
      if (exitInfo) {
        throw new Error(
          `fixture-kv.cjs exited before answering (${exitInfo})${childErrRef.text ? `: ${childErrRef.text.trim()}` : " — a lost probe-to-spawn race is the likely cause"}`,
        );
      }
      try {
        await fetch(`http://127.0.0.1:${port}/`, {
          method: "POST",
          body: "[]",
          signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        });
        return;
      } catch {
        await new Promise((r) => setTimeout(r, 50));
      }
    }
    throw new Error(`fixture-kv.cjs never answered on port ${port} within ${READY_TIMEOUT_MS}ms`);
  } finally {
    child.off("exit", onExit);
  }
}

async function kv(port, cmd) {
  const res = await fetch(`http://127.0.0.1:${port}/`, {
    method: "POST",
    body: JSON.stringify(cmd),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  return res.json();
}

async function main() {
  const port = await probeFreePort();
  const child = spawn(process.execPath, [KV_SCRIPT], {
    env: { ...process.env, FIXTURE_KV_PORT: String(port) },
    stdio: ["ignore", "ignore", "pipe"],
  });
  const childErrRef = { text: "" };
  child.stderr.on("data", (d) => (childErrRef.text += d));
  child.on("error", (e) => {
    childErrRef.text += `[spawn error] ${e.message}\n`;
  });

  try {
    await waitReady(child, port, childErrRef);

    // ── the old five still answer (the walk's contract — shots-fixture
    //    keeps working) ─────────────────────────────────────────────────
    t("SET/GET round-trip: SET", (await kv(port, ["SET", "k1", "v1"])).result === "OK");
    t("SET/GET round-trip: GET reads it back", (await kv(port, ["GET", "k1"])).result === "v1");
    t("SET NX on an existing key → null", (await kv(port, ["SET", "k1", "v2", "NX"])).result === null);
    t("… the NX'd write never overwrote", (await kv(port, ["GET", "k1"])).result === "v1");
    t("DEL on a plain value → 1", (await kv(port, ["DEL", "k1"])).result === 1);
    t("… GET after DEL → null", (await kv(port, ["GET", "k1"])).result === null);
    t("SADD → 1", (await kv(port, ["SADD", "s1", "m1"])).result === 1);
    await kv(port, ["SADD", "s1", "m2"]);
    {
      const members = (await kv(port, ["SMEMBERS", "s1"])).result;
      t(
        "SMEMBERS round-trip holds both added members",
        Array.isArray(members) && members.length === 2 && members.includes("m1") && members.includes("m2"),
      );
    }

    // ── AMENDMENT R4: the checklist covers the OLD branches too ──────────
    await kv(port, ["SADD", "s2", "ma"]);
    await kv(port, ["SADD", "s2", "mb"]);
    t("SREM removes a member → 1", (await kv(port, ["SREM", "s2", "ma"])).result === 1);
    {
      const members = (await kv(port, ["SMEMBERS", "s2"])).result;
      t("… SMEMBERS after no longer includes it", Array.isArray(members) && !members.includes("ma") && members.includes("mb"));
    }
    t("INCR answers the stub's 1", (await kv(port, ["INCR", "ctr"])).result === 1);
    t("… INCR again still answers 1 — stateless, pinned as a stub", (await kv(port, ["INCR", "ctr"])).result === 1);
    await kv(port, ["SADD", "s3", "m"]);
    t("DEL on a set key → 1", (await kv(port, ["DEL", "s3"])).result === 1);
    {
      const members = (await kv(port, ["SMEMBERS", "s3"])).result;
      t("… SMEMBERS after DEL of a set reads []", Array.isArray(members) && members.length === 0);
    }

    // ── SET's ignored-but-accepted extra options (AMENDMENT R5) ──────────
    t(
      "SET accepts EX-shaped extra args without erroring (email-auth.ts's shape)",
      (await kv(port, ["SET", "opts1", "v", "EX", "1"])).result === "OK",
    );
    t("… GET still reads it back (no TTL enforced by this fixture)", (await kv(port, ["GET", "opts1"])).result === "v");
    t(
      "SET NX PX (mail.ts onceWithin's exact shape) on a fresh key → OK",
      (await kv(port, ["SET", "opts2", "1", "NX", "PX", "5000"])).result === "OK",
    );
    t(
      "… SET NX PX on the SAME key again → null (NX still honored; PX simply ignored)",
      (await kv(port, ["SET", "opts2", "1", "NX", "PX", "5000"])).result === null,
    );

    // ── HSETNX: the claimSlot "slot taken" semantics ──────────────────────
    t("HSETNX on a fresh field → 1", (await kv(port, ["HSETNX", "h1", "f1", "first"])).result === 1);
    t("HSETNX on the same field again → 0 (never overwrites)", (await kv(port, ["HSETNX", "h1", "f1", "second"])).result === 0);
    t("… the first value is kept, not the second", (await kv(port, ["HGET", "h1", "f1"])).result === "first");

    // ── HGET / HSET — AMENDMENT R1: HSET returns the NEW-field count ─────
    t("HGET on a missing field → null", (await kv(port, ["HGET", "h1", "nope"])).result === null);
    t("HSET on a brand-new field → 1 (a field was created)", (await kv(port, ["HSET", "h3", "fx", "v1"])).result === 1);
    t("HSET on that SAME field again → 0 (overwrite, not new)", (await kv(port, ["HSET", "h3", "fx", "v2"])).result === 0);
    t("… HGET returns the SECOND value — the write still happened", (await kv(port, ["HGET", "h3", "fx"])).result === "v2");

    // ── HGETALL / HDEL ──────────────────────────────────────────────────
    {
      const absent = (await kv(port, ["HGETALL", "h-nope"])).result;
      t("HGETALL on an absent hash → []", Array.isArray(absent) && absent.length === 0);
    }
    await kv(port, ["HSET", "h2", "fa", "va"]);
    await kv(port, ["HSET", "h2", "fb", "vb"]);
    {
      const flat = (await kv(port, ["HGETALL", "h2"])).result;
      const pairs = [];
      for (let i = 0; i < flat.length; i += 2) pairs.push(`${flat[i]}=${flat[i + 1]}`);
      t(
        "HGETALL → the flat [field, value, …] Upstash shape (content asserted, not order)",
        Array.isArray(flat) && flat.length === 4 && pairs.includes("fa=va") && pairs.includes("fb=vb"),
      );
    }
    t("HDEL an existing field (hash still has another) → 1", (await kv(port, ["HDEL", "h2", "fa"])).result === 1);
    t("HDEL the same field again → 0", (await kv(port, ["HDEL", "h2", "fa"])).result === 0);
    t("… the hash itself survives (fb remains) → EXISTS 1", (await kv(port, ["EXISTS", "h2"])).result === 1);

    // ── AMENDMENT R2: no ghost keys — HDEL of a hash's LAST field removes
    //    the hash entry itself ───────────────────────────────────────────
    await kv(port, ["HSET", "h-ghost", "only-field", "v"]);
    t("HDEL the last field of a hash → 1", (await kv(port, ["HDEL", "h-ghost", "only-field"])).result === 1);
    t("… no ghost key left behind: EXISTS now 0", (await kv(port, ["EXISTS", "h-ghost"])).result === 0);
    {
      const keys = (await kv(port, ["KEYS"])).result;
      t("… no ghost key left behind: KEYS omits it", !keys.includes("h-ghost"));
    }

    // ── DEL clears all three stores (named decision D) ────────────────────
    t("DEL on a hash key → 1", (await kv(port, ["DEL", "h1"])).result === 1);
    {
      const flat = (await kv(port, ["HGETALL", "h1"])).result;
      t("… HGETALL after reads [] — the cross-store clear", Array.isArray(flat) && flat.length === 0);
    }

    // ── KEYS / EXISTS across all three stores ──────────────────────────
    await kv(port, ["SET", "kk", "v"]);
    await kv(port, ["SADD", "ss", "m"]);
    await kv(port, ["HSET", "hh", "f", "v"]);
    await kv(port, ["SET", "dup", "x"]);
    await kv(port, ["SADD", "dup", "m"]);
    {
      const keys = (await kv(port, ["KEYS"])).result;
      t(
        "KEYS → the union of all three stores",
        Array.isArray(keys) &&
          keys.includes("kk") &&
          keys.includes("ss") &&
          keys.includes("hh") &&
          keys.includes("s1") &&
          keys.includes("h2"),
      );
      t("… a key deleted earlier (h1) is gone from KEYS too", !keys.includes("h1"));
      t(
        "… de-duplicated: a key living in two stores at once (dup) appears exactly once",
        keys.filter((k) => k === "dup").length === 1,
      );
    }
    t("EXISTS on a plain-value key → 1", (await kv(port, ["EXISTS", "kk"])).result === 1);
    t("EXISTS on a set key → 1", (await kv(port, ["EXISTS", "ss"])).result === 1);
    t("EXISTS on a hash key → 1", (await kv(port, ["EXISTS", "hh"])).result === 1);
    t("EXISTS on a never-seen key → 0", (await kv(port, ["EXISTS", "never-was-a-key"])).result === 0);

    // ── EXPIRE / PEXPIRE — acknowledged stubs (named decision A) ─────────
    t("EXPIRE → 1 (stub acknowledged, no TTL state kept)", (await kv(port, ["EXPIRE", "kk", "60"])).result === 1);
    t("PEXPIRE → 1 (stub acknowledged, no TTL state kept)", (await kv(port, ["PEXPIRE", "kk", "60000"])).result === 1);

    // ── fail-soft shape, unchanged ───────────────────────────────────────
    t("an unknown command → result: null", (await kv(port, ["BOGUS", "x"])).result === null);
  } finally {
    if (child.exitCode === null && child.signalCode === null) {
      child.kill();
      await new Promise((resolve) => child.once("exit", resolve));
    }
  }

  if (failed > 0 && childErrRef.text) console.log(`\nfixture-kv.cjs stderr:\n${childErrRef.text}`);
  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
