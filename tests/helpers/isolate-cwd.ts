import { mkdtempSync, mkdirSync, rmSync } from "fs";
import os from "os";
import path from "path";

/**
 * TASK-158 (0018.06.17 a₿) — the site-config fs driver resolves its path as
 * `path.join(process.cwd(), "data", "site-config.json")` (src/lib/site-
 * config.ts's filePath(), read fresh on every call — no env override to
 * ride instead). tests/site-config.test.ts, package-waitlist.test.ts and
 * jars.test.ts each compute their own `FILE` constant the same way, but at
 * MODULE TOP LEVEL — before any vitest hook can run. booking-api.test.ts's
 * mkdtemp-cwd pattern chdir's inside beforeEach, which is too late here:
 * the module-level `const FILE = path.join(process.cwd(), ...)` would
 * already have captured the wrong cwd by the time a hook fires.
 *
 * So this is synchronous and meant to be called as the first statement
 * after a test file's imports (imports are hoisted ahead of it regardless
 * of source order, so it still runs before any `path.join(process.cwd(),
 * ...)` constant declared further down the same file).
 *
 * Safe under vitest's default `forks` pool: each concurrently-running test
 * file already owns its own real OS process (`process.chdir()` is flatly
 * unsupported inside a `worker_threads` Worker — Node throws
 * ERR_WORKER_UNSUPPORTED_OPERATION — so the `forks` pool is the only one
 * this pattern could ever work under, and it's vitest 3's default). The
 * only remaining risk is a forked worker being REUSED for a later test
 * file after this one finishes, which would leak this file's tmp cwd
 * forward — hence `cleanup()` restores the prior cwd and MUST be called
 * from the test file's own `afterAll`.
 */
export function isolateCwd(prefix: string): { dir: string; cleanup: () => void } {
  const prevCwd = process.cwd();
  const dir = mkdtempSync(path.join(os.tmpdir(), prefix));
  mkdirSync(path.join(dir, "data"), { recursive: true });
  process.chdir(dir);
  return {
    dir,
    cleanup: () => {
      process.chdir(prevCwd);
      rmSync(dir, { recursive: true, force: true });
    },
  };
}
