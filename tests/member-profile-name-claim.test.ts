import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { decideNameClaim, type NameClaimVerdict } from "@/app/api/member/profile/route";

/**
 * TASK-478 (block 968,624+) — Love's Friday walk, S5: "The name could not
 * be claimed. Try another." on her iPhone/iPad, right after "Email me a
 * code" — 0:53:42 in briefings/walk-968624/walk.txt. Traced to
 * profile/route.ts's PUT: `SET accountname:<name> … NX` refuses whenever
 * the key already exists, with NO check for who holds it — so a double
 * submit (a re-tap before the first request's response painted, common
 * on iOS Safari's own lag) reads the SAME member's own already-successful
 * claim as a stranger's conflict.
 *
 * `decideNameClaim` is the pure core of the fix (profile/route.ts:88-91):
 * given who currently holds the reservation and who is asking, decide
 * "claim" (nobody holds it), "mine" (the SAME requester — idempotent
 * success, never 409), or "taken" (a DIFFERENT holder — the real
 * conflict). tests/me-constellation-stars.test.ts describe("E") exercises
 * this wired into the real route (KV fixture, both directions); this file
 * pins the decision itself, pure, no KV.
 */

describe("decideNameClaim — the pure verdict behind the double-submit fix", () => {
  it("nobody holds the name yet -> claim", () => {
    expect(decideNameClaim(null, "pac@example.com")).toBe("claim");
  });

  it("the SAME requester already holds it -> mine (idempotent success, never a refusal)", () => {
    expect(decideNameClaim("pac@example.com", "pac@example.com")).toBe("mine");
  });

  it("a DIFFERENT holder -> taken (the real conflict)", () => {
    expect(decideNameClaim("someone-else@example.com", "pac@example.com")).toBe("taken");
  });

  it("every verdict is one of exactly three words — a fourth outcome would be a silent new branch nobody reviewed", () => {
    const verdicts: NameClaimVerdict[] = ["claim", "mine", "taken"];
    expect(verdicts).toContain(decideNameClaim(null, "x"));
    expect(verdicts).toContain(decideNameClaim("x", "x"));
    expect(verdicts).toContain(decideNameClaim("x", "y"));
  });
});

describe("the 409 wording — plain, no em dash (block 968,624)", () => {
  it("NAME_TAKEN_REASON reads plainly and carries no em dash", async () => {
    const src = readFileSync(path.join(__dirname, "..", "src", "app", "api", "member", "profile", "route.ts"), "utf8");
    const m = src.match(/const NAME_TAKEN_REASON = "([^"]+)";/);
    expect(m?.[1]).toBe("That name is taken. Try another.");
    expect(m?.[1]).not.toMatch(/—/);
  });

  it("registry.ts's handle-claim reason matches the SAME words, so an email member's collision and a key member's collision read in one voice", () => {
    const src = readFileSync(path.join(__dirname, "..", "src", "lib", "registry.ts"), "utf8");
    const m = src.match(/const HANDLE_TAKEN_REASON = "([^"]+)";/);
    expect(m?.[1]).toBe("That name is taken. Try another.");
    expect(m?.[1]).not.toMatch(/—/);
  });

  it("every client fallback ('the server answered with no reason') is plain words too — no em dash", () => {
    for (const rel of [
      "src/components/door/SignInCard.tsx",
      "src/components/door/DoorSheet.tsx",
      "src/components/welcome/WelcomeFlow.tsx",
    ]) {
      const src = readFileSync(path.join(__dirname, "..", rel), "utf8");
      const fallbacks = [...src.matchAll(/\?\? "([^"]*claimed[^"]*)"/g)].map((m) => m[1]);
      expect(fallbacks.length, `${rel} should still carry its claim-fallback string`).toBeGreaterThan(0);
      for (const f of fallbacks) expect(f, `${rel}: "${f}"`).not.toMatch(/—/);
    }
  });
});
