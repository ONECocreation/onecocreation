import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";

/**
 * TASK-442 (0018.07.05 a₿ · block 968,282; brief block 968,279) — the sign-in
 * return path's open redirects close behind ONE validator. Pins, not renders
 * (node env, no DOM — the house's "pin the model" idiom):
 *
 *   1. REFUSED — safeNextPath returns null for control characters (URLSearchParams
 *      decodes %09 to a real tab BEFORE any check; the WHATWG parser then strips
 *      tab/CR/LF), DEL, a backslash anywhere (the parser treats `\` as `/`), and
 *      the dot-segment family whose normalisation lands on protocol-relative
 *      `//host`. Non-string input (a repeated ?next= arrives as an array) returns
 *      null and never throws.
 *   2. ARRIVES ENCODED — the same refusals through nextPathFromLocation, the
 *      percent-decoding door every client caller walks through.
 *   3. LEGIT BYTE-IDENTICAL — same-origin paths pass toBe(raw), never normalised
 *      (normalising turns /..//evil.example into //evil.example — a NEW hole).
 *   4. ONE VALIDATOR — signer-return's hand-rolled regex is gone (source pin),
 *      and the census of get("next") readers under src/ is exactly next-path.ts
 *      and signer-return/page.tsx (both feed safeNextPath).
 *   5. EXISTING PINS STAY GREEN UNMODIFIED — free-reading-path, door-machine,
 *      door-key-handoff, me-signed-out, rooms-door, room-doors: not a byte of
 *      their assertions moves; the suite only grows.
 */

const SRC = resolve(__dirname, "../src");
const readSrc = (...p: string[]) => readFileSync(join(SRC, ...p), "utf8");

/* the brief's refused set: tab/CR/LF (single and doubled), NUL, unit separator,
   DEL, a backslash anywhere, and every dot-segment path that normalises to //host */
const REFUSED = [
  "/\t/evil.example",
  "/\n/evil.example",
  "/\r/evil.example",
  "/\t\t/evil.example",
  "/\u0000/x",
  "/\u001f/x",
  "/\u007f/x",
  "/a\\b",
  "/..//evil.example",
  "/.//evil.example",
  "/%2e%2e//evil.example",
  "/a/..//evil.example",
];

/* the brief's legit set — every door a real sign-in return walks today */
const LEGIT = [
  "/rooms/weekly-reading",
  "/rooms/heart-field",
  "/rooms/x",
  "/live",
  "/live/stage",
  "/reading",
  "/reading#stage",
  "/me",
  "/a",
  "/a/studio?x=1",
  "/a/studio/room/abc%20def",
  "/welcome",
  "/welcome?next=%2Frooms%2Fx",
  "/packages/observer?ref=home",
];

describe("TASK-442 — refused: controls, DEL, backslash, the dot-segment // family", () => {
  it("safeNextPath returns null for every poisoned path", async () => {
    const { safeNextPath } = await import("@/lib/next-path");
    for (const raw of REFUSED) expect(safeNextPath(raw)).toBeNull();
  });

  it("non-string input returns null and never throws (the repeated-?next= array crash)", async () => {
    const { safeNextPath } = await import("@/lib/next-path");
    expect(safeNextPath(["/a", "/b"])).toBeNull();
    expect(safeNextPath(42)).toBeNull();
    expect(safeNextPath({})).toBeNull();
  });
});

describe("TASK-442 — arrives encoded: the decode happens before the check", () => {
  it("nextPathFromLocation refuses the percent-encoded payloads", async () => {
    const { nextPathFromLocation } = await import("@/lib/next-path");
    expect(nextPathFromLocation({ search: "?next=%2F%09%2Fevil.example" })).toBeNull();
    expect(nextPathFromLocation({ search: "?next=%2F%0A%2Fevil.example" })).toBeNull();
    expect(nextPathFromLocation({ search: "?next=%2F..%2F%2Fevil.example" })).toBeNull();
  });
});

describe("TASK-442 — legit same-origin paths pass byte-identical", () => {
  it("safeNextPath returns raw unchanged (toBe, never normalised)", async () => {
    const { safeNextPath } = await import("@/lib/next-path");
    for (const raw of LEGIT) expect(safeNextPath(raw)).toBe(raw);
  });

  it("the same list survives the query round-trip byte-identical", async () => {
    const { nextPathFromLocation } = await import("@/lib/next-path");
    for (const raw of LEGIT)
      expect(nextPathFromLocation({ search: "?next=" + encodeURIComponent(raw) })).toBe(raw);
  });
});

describe("TASK-442 — one validator", () => {
  it("signer-return's hand-rolled regex is gone; safeNextPath guards the value", () => {
    const strip = readSrc("app", "login", "signer-return", "page.tsx");
    expect(strip).toContain("safeNextPath(rawNext)");
    expect(strip).not.toContain("(?!\\/)");
  });

  it("the get(\"next\") census: exactly next-path.ts and signer-return read it", () => {
    const hits: string[] = [];
    const walk = (dir: string) => {
      for (const name of readdirSync(dir)) {
        const p = join(dir, name);
        if (statSync(p).isDirectory()) walk(p);
        else if (/\.tsx?$/.test(name) && readFileSync(p, "utf8").includes('get("next")'))
          hits.push(relative(SRC, p));
      }
    };
    walk(SRC);
    expect(hits.sort()).toEqual(["app/login/signer-return/page.tsx", "lib/next-path.ts"]);
  });
});
