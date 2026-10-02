#!/usr/bin/env node
/** T-539: migrate-tier-expiry.mjs against scripts/fixture-kv.cjs (in-memory). Run: node scripts/migrate-tier-expiry.test.mjs */
import { createServer } from "node:net";
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { run, planRecord, LEGACY_END_MS } from "./migrate-tier-expiry.mjs";

const ROOT = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
let passed = 0, failed = 0;
const t = (name, cond, extra = "") => { if (cond) passed++; else { failed++; console.log(`FAIL  ${name} ${extra}`); } };

const port = await new Promise((res) => { const s = createServer(); s.listen(0, "127.0.0.1", () => { const p = s.address().port; s.close(() => res(p)); }); });
const child = spawn("node", [path.join(ROOT, "scripts", "fixture-kv.cjs")], { env: { ...process.env, FIXTURE_KV_PORT: String(port) }, stdio: "ignore" });
const url = `http://127.0.0.1:${port}`;
const kv = async (cmd) => (await (await fetch(url, { method: "POST", body: JSON.stringify(cmd) })).json()).result;
try {
  for (let i = 0; i < 50; i++) { try { await kv(["GET", "x"]); break; } catch { await new Promise((r) => setTimeout(r, 100)); } }
  const H = (c) => c.repeat(64);
  const LATER = LEGACY_END_MS + 86_400_000 * 40, EARLY = Date.UTC(2026, 9, 5);
  const seed = {
    [H("a")]: { npub: H("a"), tier: "A", orderId: "o1", grantedAtMs: 1 },
    [H("b")]: { npub: H("b"), tier: "B", orderId: "o2", grantedAtMs: 1, expiresAtMs: LATER },
    [H("c")]: { npub: H("c"), tier: "C", orderId: "o3", grantedAtMs: 1, expiresAtMs: EARLY, under: { tier: "A", orderId: "o4" } },
    [H("d")]: { npub: H("d"), tier: "A", orderId: "o5", grantedAtMs: 1, revokedAtMs: 5 },
    "pac@x.org@email": { npub: "pac@x.org@email", tier: "B", orderId: "o6", grantedAtMs: 1 },
  };
  for (const [n, r] of Object.entries(seed)) { await kv(["SET", `oco:tier:${n}`, JSON.stringify(r)]); await kv(["SADD", "oco:tiers:index", n]); }
  const read = async (n) => JSON.parse(await kv(["GET", `oco:tier:${n}`]));
  const lines = [];
  const log = (l) => { lines.push(l); console.log(l); };

  t("end is Oct 31 2026 23:59:59.999 PDT", new Date(LEGACY_END_MS).toISOString() === "2026-11-01T06:59:59.999Z");
  t("dry run: 3 would change (a, c.under, email)", (await run({ url, token: "t", log })).changed === 3);
  t("dry run writes nothing", (await read(H("a"))).expiresAtMs === undefined);
  t("apply changes 3", (await run({ url, token: "t", apply: true, log })).changed === 3);
  t("open-ended -> Oct 31", (await read(H("a"))).expiresAtMs === LEGACY_END_MS);
  t("email member -> Oct 31", (await read("pac@x.org@email")).expiresAtMs === LEGACY_END_MS);
  t("later expiry kept", (await read(H("b"))).expiresAtMs === LATER);
  t("taster expiry kept, open-ended under dated", (await read(H("c"))).expiresAtMs === EARLY && (await read(H("c"))).under.expiresAtMs === LEGACY_END_MS);
  t("revoked untouched", (await read(H("d"))).expiresAtMs === undefined);
  t("second apply is a no-op (idempotent)", (await run({ url, token: "t", apply: true, log })).changed === 0);
  t("planRecord is pure", planRecord(seed[H("a")]).rec !== seed[H("a")] && seed[H("a")].expiresAtMs === undefined);
} finally { child.kill(); }
console.log(`${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
