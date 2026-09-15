#!/usr/bin/env node
/**
 * TASK-282 shots (pickup-feedback tune 2) — throwaway in-memory
 * Upstash-REST-shaped KV for the production server under test. Lifted
 * verbatim from the task-277/task-280/task-276 archived harnesses (all
 * three carry the byte-identical file) — fixture only, lives for the shot
 * run, never a repo dependency, never the vault.
 *
 *   POST /  body: ["GET",k] | ["SET",k,v,...] | ["DEL",k] | ["SADD",k,m] | ["SMEMBERS",k]
 *   → { result: … }
 *
 * ONE deviation from the archived copies: the silent numeric port
 * fallback they all shipped is gone. TASK-282's law is "ports come ONLY
 * from --ports" — a silent default port is exactly the kind of hardcoded
 * value that rule exists to end (T-232 lost a shot run to a port
 * collision from a value like that).
 * scripts/shots-fixture.sh always sets FIXTURE_KV_PORT explicitly; if it's
 * ever missing, this fails loud instead of quietly binding a stray port.
 */
const http = require("node:http");

const KV_PORT = Number(process.env.FIXTURE_KV_PORT);
if (!KV_PORT) {
  console.error("fixture-kv.cjs: FIXTURE_KV_PORT env is required (no hardcoded fallback — see header)");
  process.exit(2);
}

const store = new Map();
const sets = new Map();
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
      } catch {
        /* result stays null */
      }
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ result }));
    });
  })
  .listen(KV_PORT, "127.0.0.1");
