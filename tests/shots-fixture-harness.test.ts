import { describe, it, expect } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

/**
 * TASK-282 (pickup-feedback tune 2) — the pin for scripts/shots-fixture.sh
 * + scripts/shots-fixture.cjs: both files exist, the shell wrapper refuses
 * to run without --ports (exit 2, a usage line), and the puppeteer driver
 * never hardcodes a port. "Ports come ONLY from --ports" is the whole
 * reason this harness replaced the archived per-lane copies (T-232 lost a
 * shot run to a port collision from exactly that kind of silent default).
 */

const ROOT = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
const SH = path.join(ROOT, "scripts", "shots-fixture.sh");
const CJS = path.join(ROOT, "scripts", "shots-fixture.cjs");
const KV = path.join(ROOT, "scripts", "fixture-kv.cjs");

// Every lane port this harness (or the archives it unified) has ever used —
// if any of these literal numbers shows up in the driver again, someone
// reintroduced a hardcoded port.
const KNOWN_PORT_LITERALS = [
  "4298", "4299", "4300", "4301", // this lane
  "3311", // fixture-kv's old silent fallback
  "4276", "4277", "4278", "4279", // task-276/277
  "4284", "4285", "4286", "4287", // task-280
];

describe("shots-fixture harness", () => {
  it("the shell wrapper and the puppeteer driver both exist", () => {
    expect(existsSync(SH)).toBe(true);
    expect(existsSync(CJS)).toBe(true);
    expect(existsSync(KV)).toBe(true);
  });

  it("refuses to run without --ports: exit code 2, a usage line on stderr", () => {
    const result = spawnSync("bash", [SH], { encoding: "utf8" });
    expect(result.status).toBe(2);
    expect(result.stderr).toMatch(/usage: scripts\/shots-fixture\.sh/);
  });

  it("refuses a --ports span that isn't exactly four ports: exit code 2", () => {
    const result = spawnSync(
      "bash",
      [SH, "--ports", "4298-4302", "--out", "/tmp/oc-shots-pin-test", "--routes", "/"],
      { encoding: "utf8" }
    );
    expect(result.status).toBe(2);
    expect(result.stderr).toMatch(/four ports/);
  });

  it("the .cjs driver carries no literal port number — every address arrives via --base/--tenant-base", () => {
    const src = readFileSync(CJS, "utf8");
    for (const literal of KNOWN_PORT_LITERALS) {
      expect(src, `found the literal port ${literal} in shots-fixture.cjs`).not.toContain(literal);
    }
    // it never binds a port itself — it's a client, not a server
    expect(src).not.toMatch(/\.listen\(/);
    // the only way it learns a server address is the --base/--tenant-base args
    expect(src).toContain('args["tenant-base"]');
    expect(src).toContain("args.base");
  });

  it("fixture-kv.cjs also carries no hardcoded port fallback", () => {
    const src = readFileSync(KV, "utf8");
    for (const literal of KNOWN_PORT_LITERALS) {
      expect(src, `found the literal port ${literal} in fixture-kv.cjs`).not.toContain(literal);
    }
    expect(src).toMatch(/FIXTURE_KV_PORT/);
  });
});
