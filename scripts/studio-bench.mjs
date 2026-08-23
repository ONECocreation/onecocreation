#!/usr/bin/env node
/**
 * studio-bench.mjs — the studio demo bench's ONE boot command (TASK-24/S26
 * lane 1, 0018.06.01 a₿, block 963,695). Pac opens the studio on his own
 * machine — no cloud, no KV, no GitHub assets repo:
 *
 *   npm run studio:bench         boot; seed only if bench-data/ is absent
 *   npm run studio:bench:fresh   wipe bench-data/ and reseed, then boot
 *
 * What it does, in order:
 *
 *   1. node scripts/setup.mjs    — first run only: writes .env.local with a
 *                                  fresh SEAT_SECRET (idempotent; never
 *                                  touches an existing .env.local)
 *   2. node scripts/bench-seed.mjs — ONLY when bench-data/ is absent/empty,
 *                                  or always under --fresh. THE HONEST
 *                                  DEFAULT IS SEED-IF-ABSENT: the bench is
 *                                  for editing, and Pac's staged + published
 *                                  work must survive a restart. A reset is
 *                                  an explicit act (`:fresh`), never a
 *                                  surprise on boot.
 *   3. next dev with the bench env pinned:
 *        PUCK_STORE_DRIVER=filesystem   pages save to disk, not KV
 *        PUCK_STORE_FS_DIR=bench-data   …this directory (git-ignored)
 *        STUDIO_BENCH=1                 the lane-3 feedback rail wakes
 *        NEXT_PUBLIC_BENCH_CARTRIDGE    the bench's cartridge (S29: blank,
 *                                       or BENCH_CARTRIDGE's pick) — the
 *                                       NEXT_PUBLIC_ twin is what the
 *                                       render gate reads; see cartridge.ts
 *      Real env vars beat .env.local in Next's loading order, so a
 *      PUCK_STORE_DRIVER=kv line in .env.local cannot hijack the bench.
 *
 * Auth is NOT touched: the bench signs in through the real operator gate —
 * OPERATOR_NPUBS / OPERATOR_EMAILS + SEAT_SECRET in the operator's own
 * .env.local (see BENCH.md). No flags, no bypass, no code path that only
 * exists here. Node stdlib only; Ctrl+C forwards to the dev server.
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { spawn, spawnSync } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const benchDir = join(root, "bench-data");
const fresh = process.argv.includes("--fresh");

/* S29 lane 1 — the bench wears the BLANK cartridge (the Admiral's ruling:
   a clean template carries no branding). BENCH_CARTRIDGE picks another
   ("mono", …); the valid ids are DERIVED from the registry's own union in
   src/brand/cartridge.ts — never re-typed here. The render gate reads the
   NEXT_PUBLIC_ twin (only NEXT_PUBLIC_ vars resolve identically on server
   and in the browser — a server-only env would hydrate Love over blank),
   so this script mirrors the pick into it in the same breath that pins
   STUDIO_BENCH=1. A typo warns and falls back to blank, never to Love. */
const CARTRIDGE_IDS = (
  readFileSync(join(root, "src", "brand", "cartridge.ts"), "utf8")
    .match(/export type CartridgeId = ([^;]+);/)?.[1]
    .match(/"([^"]+)"/g) ?? []
).map((s) => s.slice(1, -1));
let benchCartridge = process.env.BENCH_CARTRIDGE || "blank";
if (!CARTRIDGE_IDS.includes(benchCartridge)) {
  console.log(`[studio-bench] BENCH_CARTRIDGE="${benchCartridge}" is not a registry id (${CARTRIDGE_IDS.join(", ")}) — wearing "blank" instead`);
  benchCartridge = "blank";
}

const run = (args) => {
  const r = spawnSync(process.execPath, args, { cwd: root, stdio: "inherit" });
  if (r.status !== 0) process.exit(r.status ?? 1);
};

/* 1 — first-run env (idempotent: exits silently when .env.local exists) */
run([join(root, "scripts", "setup.mjs")]);

/* 2 — seed-if-absent, or always under --fresh */
const benchEmpty =
  !existsSync(benchDir) || readdirSync(benchDir).length === 0;
if (fresh || benchEmpty) {
  run([join(root, "scripts", "bench-seed.mjs")]);
} else {
  console.log("[studio-bench] bench-data/ found — keeping your edits (reset with: npm run studio:bench:fresh)");
}

/* 3 — the dev server, bench env pinned. Spawn next through node itself so
   there is no .bin shim to miss on any platform. */
console.log(`[studio-bench] booting — sign in at http://localhost:3000/studio (BENCH.md has the env recipe)`);
console.log(`[studio-bench] wearing the "${benchCartridge}" cartridge — switch with: BENCH_CARTRIDGE=mono npm run studio:bench`);
const child = spawn(
  process.execPath,
  [join(root, "node_modules", "next", "dist", "bin", "next"), "dev"],
  {
    cwd: root,
    stdio: "inherit",
    env: {
      ...process.env,
      PUCK_STORE_DRIVER: "filesystem",
      PUCK_STORE_FS_DIR: "bench-data",
      STUDIO_BENCH: "1",
      NEXT_PUBLIC_BENCH_CARTRIDGE: benchCartridge,
    },
  },
);

for (const sig of ["SIGINT", "SIGTERM"]) {
  process.on(sig, () => child.kill(sig));
}
child.on("exit", (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  else process.exit(code ?? 0);
});
