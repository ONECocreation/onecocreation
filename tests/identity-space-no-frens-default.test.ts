import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

/**
 * TASK-277 (0018.06.25 a₿ · block 967,125) — HB-3 verification. The census
 * (T-263) flagged "SPACE_NAME default... falls back to frens.earth" but at
 * this tip T-270 already fixed it: SPACE_HOSTS lists only onecocreation.com/
 * www.onecocreation.com (both -> space "onecocreation"), so OC_DEFAULT/
 * SPACE_NAME/spaceForHost() all resolve to "onecocreation", never "frens".
 * This pin makes that truth a test instead of a one-time grep read, so a
 * future edit to identity-config.ts (or a stray `?? "frens"` default
 * anywhere in src/lib) trips a gate rather than reintroducing HB-3 silently.
 *
 * Scope note: this file does NOT flag `src/lib/console.ts:106` (a named
 * historical officer SEED entry `space: "frens"`, T-270's voice lane) nor
 * `src/components/MemberProfile.tsx:255`'s `space === "frens"` branch (a live
 * per-visitor comparison, not a default/fallback — T-278's rename lane owns
 * that file). Only the unambiguous nullish-coalescing default shape
 * `?? "frens"` is swept, since a bare `: "frens"` also matches ordinary
 * object-literal data entries and would false-positive on those.
 */

const LIB_DIR = fileURLToPath(new URL("../src/lib", import.meta.url));

function collectFiles(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const full = path.join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) out.push(...collectFiles(full));
    else if (/\.(ts|tsx)$/.test(name)) out.push(full);
  }
  return out;
}

describe("identity-config — no default/fallback resolves to the template's \"frens\" space (HB-3, T-277)", () => {
  it("SPACE_NAME resolves to onecocreation, not frens", async () => {
    const { SPACE_NAME } = await import("@/lib/identity-config");
    expect(SPACE_NAME).toBe("onecocreation");
  });

  it("spaceForHost() falls back to onecocreation for an unknown host, never frens", async () => {
    const { spaceForHost } = await import("@/lib/identity-config");
    expect(spaceForHost("some-unknown-host.example").space).toBe("onecocreation");
    expect(spaceForHost(null).space).toBe("onecocreation");
    expect(spaceForHost(undefined).space).toBe("onecocreation");
  });

  it("KNOWN_SPACES (this deployment's only claimable doors) never lists frens", async () => {
    const { KNOWN_SPACES } = await import("@/lib/identity-config");
    expect(KNOWN_SPACES).not.toContain("frens");
  });

  it("carries no `?? \"frens\"` nullish-coalescing default anywhere in src/lib", () => {
    const offenders: string[] = [];
    for (const file of collectFiles(LIB_DIR)) {
      const src = readFileSync(file, "utf8");
      if (/\?\?\s*"frens"/.test(src)) offenders.push(path.relative(LIB_DIR, file));
    }
    expect(offenders).toEqual([]);
  });
});
