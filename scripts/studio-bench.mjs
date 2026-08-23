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
 *      Real env vars beat .env.local in Next's loading order, so a
 *      PUCK_STORE_DRIVER=kv line in .env.local cannot hijack the bench.
 *
 * Auth is NOT touched: the bench signs in through the real operator gate —
 * OPERATOR_NPUBS / OPERATOR_EMAILS + SEAT_SECRET in the operator's own
 * .env.local (see BENCH.md). No flags, no bypass, no code path that only
 * exists here. Node stdlib only; Ctrl+C forwards to the dev server.
 */
import { existsSync, readdirSync } from "node:fs";
import { spawn, spawnSync } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const benchDir = join(root, "bench-data");
const fresh = process.argv.includes("--fresh");

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
console.log("[studio-bench] booting — sign in at http://localhost:3000/studio (BENCH.md has the env recipe)");
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
