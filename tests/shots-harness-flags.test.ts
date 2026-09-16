import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * TASK-294 — the pin for the three flags folded into
 * scripts/shots-fixture.sh (`--seed-puck`, `--seed-store`, `--full-page`)
 * and the T-301 fix (OPERATOR_NPUBS set in EVERY --cookie mode, not just
 * operator/member). Greps only — no puppeteer, no port, no server. A
 * regression in the shell wiring (a flag silently dropped from the arg
 * parse, or OPERATOR_NPUBS sliding back behind an `if [ -n ... ]` guard for
 * some modes) is caught here without paying for a real shots run.
 */

const ROOT = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
const SH = path.join(ROOT, "scripts", "shots-fixture.sh");
const CJS = path.join(ROOT, "scripts", "shots-fixture.cjs");

const sh = readFileSync(SH, "utf8");
const cjs = readFileSync(CJS, "utf8");

describe("shots-fixture.sh flags (TASK-294)", () => {
  it("--seed-puck is parsed, documented in USAGE, and its dump path uses vitest, not plain node", () => {
    expect(sh).toContain("--seed-puck) SEED_PUCK=");
    expect(sh).toMatch(/usage: scripts\/shots-fixture\.sh.*--seed-puck/);
    // the dump MUST run through vitest — plain `node --input-type=module`
    // cannot import puck-seeds.ts (it pulls in a .tsx block file; node's
    // native TS/JSX type-stripping does not support .tsx). Pin the
    // mechanism, not just the flag.
    expect(sh).toContain("npx vitest run");
    expect(sh).toContain('from "@/lib/puck-seeds"');
    expect(sh).toContain('puck:page:" + process.argv[2]');
  });

  it("--seed-store is parsed, documented in USAGE, and seeds store:catalog", () => {
    expect(sh).toContain("--seed-store) SEED_STORE=");
    expect(sh).toMatch(/usage: scripts\/shots-fixture\.sh.*--seed-store/);
    expect(sh).toContain('"SET", "store:catalog"');
  });

  it("--seed-kv (TASK-326) is parsed, documented in USAGE, repeatable, and refuses a null result", () => {
    expect(sh).toContain("--seed-kv) SEED_KV+=");
    expect(sh).toMatch(/usage: scripts\/shots-fixture\.sh.*--seed-kv/);
    // a command the fixture KV didn't take answers {"result":null} — that
    // must fail the run, never pass silently (a shot of an unseeded state
    // that BELIEVES it was seeded is worse than no shot)
    expect(sh).toContain("*'\"result\":null'*");
  });

  it("--full-page is parsed, documented in USAGE, and forwarded to the driver", () => {
    expect(sh).toContain("--full-page) FULL_PAGE=1");
    expect(sh).toMatch(/usage: scripts\/shots-fixture\.sh.*--full-page/);
    expect(sh).toContain('DRIVER_ARGS+=(--full-page 1)');
  });

  it("the puppeteer driver reads --full-page and suffixes filenames -full", () => {
    expect(cjs).toContain('args["full-page"] === "1"');
    expect(cjs).toContain('fullPage: FULL_PAGE');
    expect(cjs).toContain('const fullSuffix = FULL_PAGE ? "-full" : ""');
  });

  it("T-301: OPERATOR_NPUBS is set in COMMON_ENV unconditionally — every --cookie mode gets a real operator npub, never gated behind an if", () => {
    // the mint step (MINT_JS) must run unguarded by a cookie-mode check —
    // regression would look like reintroducing `if [ "$COOKIE_MODE" != "none" ]`
    // around the whole mint block the way TASK-282 originally shipped it.
    expect(sh).not.toMatch(/if \[ "\$COOKIE_MODE" != "none" \]; then\s*\n\s*MINT_JS=/);
    // the mint script always mints a throwaway operator keypair, not just
    // inside an `operator` mode branch
    expect(sh).toContain("const envSk = generateSecretKey();");
    expect(sh).toContain("const out = { operatorNpub: envNpub };");
    // COMMON_ENV must carry OPERATOR_NPUBS as a plain array element, not
    // behind a conditional `COMMON_ENV+=` append
    expect(sh).toContain('OPERATOR_NPUBS="$OPERATOR_NPUB")');
    expect(sh).not.toMatch(/if \[ -n "\$OPERATOR_NPUB" \]; then\s*\n\s*COMMON_ENV\+=\(OPERATOR_NPUBS/);
  });
});
