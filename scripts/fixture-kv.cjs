#!/usr/bin/env node
/**
 * TASK-282 shots (pickup-feedback tune 2) — throwaway in-memory
 * Upstash-REST-shaped KV for the production server under test. Lifted
 * verbatim from the task-277/task-280/task-276 archived harnesses (all
 * three carry the byte-identical file) — fixture only, lives for the shot
 * run, never a repo dependency, never the vault.
 *
 *   POST /  body: ["GET",k] | ["SET",k,v,...] | ["DEL",k] | ["SADD",k,m] | ["SMEMBERS",k]
 *     | ["SREM",k,m] | ["INCR",k] | ["HGET",k,f] | ["HSET",k,f,v] | ["HSETNX",k,f,v]
 *     | ["HDEL",k,f] | ["HGETALL",k] | ["KEYS"] | ["EXISTS",k] | ["EXPIRE",k,...] | ["PEXPIRE",k,...]
 *   → { result: … }
 *
 * ONE deviation from the archived copies: the silent numeric port
 * fallback they all shipped is gone. TASK-282's law is "ports come ONLY
 * from --ports" — a silent default port is exactly the kind of hardcoded
 * value that rule exists to end (T-232 lost a shot run to a port
 * collision from a value like that).
 * scripts/shots-fixture.sh always sets FIXTURE_KV_PORT explicitly; if it's
 * ever missing, this fails loud instead of quietly binding a stray port.
 *
 * TASK-399 named these validation gaps so a walk never reads them as
 * bugs: SET's `EX`/`PX`/`NX PX` options (email-auth.ts's code TTL,
 * mail.ts's onceWithin guard) are accepted — same as SET's existing `NX`
 * flag, just more array positions — and IGNORED; no TTL is ever set, so
 * this fixture cannot prove timed code-expiry or a timed mail-guard
 * release. INCR is stateless — always answers `1` (mail.ts's hourly
 * send-cap meter never counts up here). EXPIRE/PEXPIRE are acknowledged
 * stubs, same shape, no TTL tracked. KEYS ignores its pattern argument
 * (no caller sends one).
 */
const http = require("node:http");

const KV_PORT = Number(process.env.FIXTURE_KV_PORT);
if (!KV_PORT) {
  console.error("fixture-kv.cjs: FIXTURE_KV_PORT env is required (no hardcoded fallback — see header)");
  process.exit(2);
}

const store = new Map();
const sets = new Map();
const hashes = new Map();
http
  .createServer((req, res) => {
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", () => {
      let result = null;
      try {
        const cmd = JSON.parse(body).map(String);
        const [op, key, val, flag] = cmd;
        if (op === "GET") result = store.get(key) ?? null;
        else if (op === "SET") {
          if (flag === "NX" && store.has(key)) result = null;
          else {
            store.set(key, val);
            result = "OK";
          }
        } else if (op === "DEL") {
          store.delete(key);
          sets.delete(key);
          hashes.delete(key);
          result = 1;
        } else if (op === "SADD") {
          if (!sets.has(key)) sets.set(key, new Set());
          sets.get(key).add(val);
          result = 1;
        } else if (op === "SMEMBERS") result = [...(sets.get(key) ?? [])];
        else if (op === "SREM") {
          sets.get(key)?.delete(val);
          result = 1;
        } else if (op === "INCR") result = 1;
        else if (op === "HGET") result = hashes.get(key)?.get(val) ?? null;
        else if (op === "HSET") {
          // Upstash shape: returns the count of NEW fields (1 created, 0
          // overwritten) — the value updates either way (AMENDMENT R1;
          // callers at booking-orders.ts:220/:265 overwrite and never
          // read the result, so this is safe to be exact about).
          if (!hashes.has(key)) hashes.set(key, new Map());
          const hSet = hashes.get(key);
          const isNewField = !hSet.has(val);
          hSet.set(val, flag);
          result = isNewField ? 1 : 0;
        } else if (op === "HSETNX") {
          if (!hashes.has(key)) hashes.set(key, new Map());
          const h = hashes.get(key);
          if (h.has(val)) result = 0;
          else {
            h.set(val, flag);
            result = 1;
          }
        } else if (op === "HDEL") {
          // No ghost keys (AMENDMENT R2): removing a hash's last field
          // removes the hash entry itself — EXISTS then answers 0 and
          // KEYS omits it, matching real KV (releaseSlot sends this,
          // booking-orders.ts:249-253).
          const hDel = hashes.get(key);
          const removed = hDel?.delete(val) ? 1 : 0;
          if (hDel && hDel.size === 0) hashes.delete(key);
          result = removed;
        } else if (op === "HGETALL") result = hashes.has(key) ? [...hashes.get(key).entries()].flat() : [];
        else if (op === "KEYS") result = [...new Set([...store.keys(), ...sets.keys(), ...hashes.keys()])];
        else if (op === "EXISTS") result = store.has(key) || sets.has(key) || hashes.has(key) ? 1 : 0;
        else if (op === "EXPIRE") result = 1;
        else if (op === "PEXPIRE") result = 1;
      } catch {
        /* result stays null */
      }
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ result }));
    });
  })
  .listen(KV_PORT, "127.0.0.1");
