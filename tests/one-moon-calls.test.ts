import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { certCase } from "@/lib/certs";
import { bftScene } from "@/lib/bb/scene";
import { moonPhase } from "@/lib/bb/bft";

/**
 * TASK-362 (0018.07.02 a₿ · block 967,918) — "we only have one moon. and we
 * can see it outside." (the Admiral, retiring the two-moons doctrine). This
 * lane made `certCase`/`bftScene`'s `atMs` param additive-optional and
 * threaded real wall time through `certs.ts` and `scene.ts`'s calls to
 * `moonPhase` (which was already sky-anchored — the callers weren't). Pins:
 *
 *  1. `certCase(h)` output is byte-identical with `atMs` omitted (no test,
 *     including `specimenShelf()`'s deterministic tier search, may change).
 *  2. `certCase(h, atMs)` / `bftScene(h, atMs)` follow `moonPhase(h, atMs)` —
 *     an explicit wall time actually moves the moon they read.
 *  3. A source-level sweep: no `moonPhase(` call in `src/` outside
 *     `src/lib/bb/bft.ts` (the definition) is single-argument — every call
 *     site either passes an explicit second argument or forwards its own
 *     optional `atMs` through. This is the lint the brief's "what is
 *     lintable?" section names (item 2) — pinned here as a real check too.
 */

// a height whose flat estimate-clock instant and an arbitrary far-future
// wall time land in different lunar phases, so a passed `atMs` is provably
// read (not silently ignored).
const HEIGHT = 840_000; // the 2024 halving — deterministic, well inside range
const ESTIMATE_MS = Date.UTC(2009, 0, 3) + HEIGHT * 600_000; // certCase/bftScene's own default math
const FAR_FUTURE_MS = Date.UTC(2099, 0, 1);

describe("one-moon calls (T-362) — additive-optional atMs, no doctrine drift", () => {
  it("certCase(h) is unchanged when atMs is omitted", () => {
    const withoutArg = certCase(HEIGHT);
    const explicitUndefined = certCase(HEIGHT, undefined);
    const explicitDefaultMs = certCase(HEIGHT, ESTIMATE_MS);
    expect(explicitUndefined).toEqual(withoutArg);
    expect(explicitDefaultMs).toEqual(withoutArg);
  });

  it("certCase(h, atMs) follows moonPhase(h, atMs)", () => {
    const atEstimate = certCase(HEIGHT, ESTIMATE_MS);
    const atFarFuture = certCase(HEIGHT, FAR_FUTURE_MS);
    const moonAtEstimate = moonPhase(HEIGHT, ESTIMATE_MS);
    const moonAtFarFuture = moonPhase(HEIGHT, FAR_FUTURE_MS);
    // sanity: the two instants really do land in different phases, or this
    // test would pass for the wrong reason
    expect(moonAtEstimate.index).not.toBe(moonAtFarFuture.index);
    expect(atEstimate.moon).toBe(moonAtEstimate.emoji);
    expect(atFarFuture.moon).toBe(moonAtFarFuture.emoji);
  });

  it("bftScene(h, atMs) follows moonPhase(h, atMs)", () => {
    const sceneAtEstimate = bftScene(HEIGHT, ESTIMATE_MS);
    const sceneAtFarFuture = bftScene(HEIGHT, FAR_FUTURE_MS);
    const moonAtEstimate = moonPhase(HEIGHT, ESTIMATE_MS);
    const moonAtFarFuture = moonPhase(HEIGHT, FAR_FUTURE_MS);
    expect(sceneAtEstimate.moonIndex).toBe(moonAtEstimate.index);
    expect(sceneAtFarFuture.moonIndex).toBe(moonAtFarFuture.index);
    expect(sceneAtEstimate.moonIndex).not.toBe(sceneAtFarFuture.moonIndex);
  });

  it("bftScene(h) omitted-atMs matches bftScene(h, undefined)", () => {
    expect(bftScene(HEIGHT, undefined)).toEqual(bftScene(HEIGHT));
  });
});

describe("source sweep — no single-argument moonPhase( call outside bft.ts", () => {
  // walk src/ for .ts/.tsx files, same tactic other suites in this repo use
  // (readFileSync a source file and assert on its text) rather than a shell
  // grep, so this runs anywhere `npx vitest run` does.
  function walk(dir: string): string[] {
    const out: string[] = [];
    for (const entry of readdirSync(dir)) {
      const p = join(dir, entry);
      const st = statSync(p);
      if (st.isDirectory()) out.push(...walk(p));
      else if (/\.(ts|tsx)$/.test(entry)) out.push(p);
    }
    return out;
  }

  it("every moonPhase( call site outside bft.ts passes a second argument", () => {
    const files = walk(join(process.cwd(), "src"));
    const offenders: string[] = [];
    for (const file of files) {
      const rel = relative(process.cwd(), file);
      if (rel === join("src", "lib", "bb", "bft.ts")) continue; // the definition itself
      const src = readFileSync(file, "utf8");
      // match `moonPhase(` calls and capture everything up to the matching
      // top-level close paren is overkill here — every real call site in
      // this codebase is a single-line `moonPhase(height[, atMs])` or
      // `moonPhase(currentBlock, nowMs)` shape, so a comma-inside-the-call
      // check on the same statement is sufficient and avoids a hand-rolled
      // parser for a source-lint test.
      const re = /moonPhase\(([^()]*)\)/g;
      let m: RegExpExecArray | null;
      while ((m = re.exec(src))) {
        const args = m[1].trim();
        if (args.length === 0) continue; // moonPhase() with no args isn't a real call in this repo
        if (!args.includes(",")) {
          offenders.push(`${rel}: moonPhase(${args})`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  it("confirms the three known call sites still exist and are two-argument", () => {
    const certsSrc = readFileSync(join(process.cwd(), "src/lib/certs.ts"), "utf8");
    const sceneSrc = readFileSync(join(process.cwd(), "src/lib/bb/scene.ts"), "utf8");
    const buddySrc = readFileSync(join(process.cwd(), "src/components/bb/BuddyDevice.tsx"), "utf8");
    expect(certsSrc).toMatch(/moonPhase\(height,\s*atMs\)/);
    expect(sceneSrc).toMatch(/moonPhase\(height,\s*atMs\)/);
    expect(buddySrc).toMatch(/moonPhase\(currentBlock,\s*nowMs\)/);
  });
});
