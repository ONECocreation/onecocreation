import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import {
  MEMBER_COOKIE,
  memberFromRequest,
  makeMemberToken,
  verifyMemberLogin,
} from "@/lib/member-auth";
import {
  MEMBER_COOKIE as MEMBER_COOKIE_EDGE,
  verifySessionTokenEdge,
  hasValidSessionEdge,
} from "@/lib/member-auth-edge";
import {
  frenFromRequest,
  makeFrenToken,
  verifyFrenLogin,
  FREN_COOKIE,
} from "@/lib/fren-auth";

/**
 * TASK-279 (0018.06.25 a₿, HB-1, H105 A) — the recommended-but-optional
 * direct-coverage addition: new names, new paths, plus the two things the
 * shim design depends on staying true — the cookie STRING is untouched and
 * the compat re-exports are the SAME function objects, not copies (so
 * there's exactly one implementation, never two that could drift). Purely
 * additive — tests/fren-auth-edge.test.ts (unowned by this lane) is
 * untouched.
 */

describe("member-auth.ts / member-auth-edge.ts (TASK-279)", () => {
  it("MEMBER_COOKIE is the untouched, byte-identical cookie name on both sides", () => {
    expect(MEMBER_COOKIE).toBe("pa-fren");
    expect(MEMBER_COOKIE_EDGE).toBe("pa-fren");
    expect(MEMBER_COOKIE_EDGE).toBe(MEMBER_COOKIE);
  });

  it("fren-auth.ts's compat re-exports are the SAME function/constant objects as member-auth.ts's, not copies", () => {
    expect(frenFromRequest).toBe(memberFromRequest);
    expect(makeFrenToken).toBe(makeMemberToken);
    expect(verifyFrenLogin).toBe(verifyMemberLogin);
    expect(FREN_COOKIE).toBe(MEMBER_COOKIE);
  });

  it("member-auth-edge.ts's exported functions are callable (Edge path still works after the move)", async () => {
    expect(typeof verifySessionTokenEdge).toBe("function");
    expect(typeof hasValidSessionEdge).toBe("function");
    expect(await verifySessionTokenEdge("not-a-real-token")).toBeNull();
    expect(await hasValidSessionEdge(null)).toBe(false);
  });

  it("member-auth-edge.ts has NO import from ./member-auth or ./registry (the proven Edge-runtime build constraint)", () => {
    const path = fileURLToPath(new URL("../src/lib/member-auth-edge.ts", import.meta.url));
    const source = readFileSync(path, "utf8");
    // Strip comments/docblocks first so a docblock's prose mentions of
    // "member-auth" or "registry" (explaining WHY there's no import)
    // can't produce a false negative.
    const code = source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
    expect(code).not.toMatch(/from\s+["']\.\/member-auth["']/);
    expect(code).not.toMatch(/from\s+["']\.\/registry["']/);
  });
});
