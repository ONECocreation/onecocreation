import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { rmSync } from "node:fs";
import path from "node:path";
import { generateSecretKey, getPublicKey, nip19 } from "nostr-tools";
import { decideHandleClaim, type HandleClaimVerdict } from "@/lib/registry";
import { isolateCwd } from "./helpers/isolate-cwd";

/* Real bech32 npubs (the fixture convention tests/qa-door-route.test.ts
   already uses) — a hand-typed "npub1bbbb…" string fails NPUB_RE's own
   bech32 charset (no b/i/o/1 in the data part), which is a DIFFERENT
   failure than the one this file means to test. */
const NPUB_A = nip19.npubEncode(getPublicKey(generateSecretKey()));
const NPUB_B = nip19.npubEncode(getPublicKey(generateSecretKey()));

/**
 * TASK-478 (block 968,624+) — the nostr-key twin of the email double-
 * submit fix (member-profile-name-claim.test.ts): registry.ts's
 * `claimHandle` used the SAME unconditional "already claimed" refusal —
 * a retried claim from the SAME npub (a double submit) read as a
 * stranger's conflict. `decideHandleClaim` is the pure verdict
 * (registry.ts): given the existing entry (or null) and the asking
 * npub, "claim" | "mine" | "taken".
 *
 * Not on Love's own repro path (she signs in by email, never a nostr
 * key — ACTIONS.md's LATER section: "Love's Nostr key, to claim her
 * name" is still future work) but the SAME component (SignInCard.tsx /
 * DoorSheet.tsx's shared `claimName`) drives both branches from one
 * form, and this exact class of bug is otherwise waiting for her there
 * too — fixed now, cheaply, alongside its twin.
 */

describe("decideHandleClaim — the pure verdict behind the double-submit fix", () => {
  it("no existing entry -> claim", () => {
    expect(decideHandleClaim(null, NPUB_A)).toBe("claim");
  });

  it("the SAME npub already holds it -> mine (idempotent success, never a refusal)", () => {
    expect(decideHandleClaim({ npub: NPUB_A }, NPUB_A)).toBe("mine");
  });

  it("a DIFFERENT npub holds it -> taken (the real conflict)", () => {
    expect(decideHandleClaim({ npub: NPUB_A }, NPUB_B)).toBe("taken");
  });

  it("every verdict is one of exactly three words", () => {
    const verdicts: HandleClaimVerdict[] = ["claim", "mine", "taken"];
    expect(verdicts).toContain(decideHandleClaim(null, NPUB_A));
    expect(verdicts).toContain(decideHandleClaim({ npub: NPUB_A }, NPUB_A));
    expect(verdicts).toContain(decideHandleClaim({ npub: NPUB_A }, NPUB_B));
  });
});

describe("claimHandle (file driver) — the double submit reads as success, a stranger's claim still refuses", () => {
  const iso = isolateCwd("task-478-registry-");

  beforeAll(() => {
    delete process.env.BLOB_READ_WRITE_TOKEN;
    delete process.env.VERCEL;
    delete process.env.REGISTRY_DRIVER;
  });

  afterAll(() => {
    iso.cleanup();
  });

  beforeEach(() => {
    rmSync(path.join(iso.dir, "data"), { recursive: true, force: true });
  });

  it("a fresh claim succeeds", async () => {
    const { claimHandle } = await import("@/lib/registry");
    const res = await claimHandle("moonrise", NPUB_A, "onecocreation", null);
    expect(res.ok).toBe(true);
  });

  it("a double submit from the SAME npub for the SAME name — idempotent success, never 'That name is taken'", async () => {
    const { claimHandle } = await import("@/lib/registry");
    const first = await claimHandle("racedhandle", NPUB_A, "onecocreation", null);
    expect(first.ok).toBe(true);
    const retry = await claimHandle("racedhandle", NPUB_A, "onecocreation", null);
    expect(retry.ok).toBe(true);
    if (retry.ok) expect(retry.entry.npub).toBe(NPUB_A);
  });

  it("a DIFFERENT npub claiming the SAME name is refused with the plain 'That name is taken. Try another.'", async () => {
    const { claimHandle } = await import("@/lib/registry");
    await claimHandle("takenhandle", NPUB_A, "onecocreation", null);
    const res = await claimHandle("takenhandle", NPUB_B, "onecocreation", null);
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.reason).toBe("That name is taken. Try another.");
      expect(res.reason).not.toMatch(/—/);
    }
  });

  it("iOS autocapitalizes/adds a trailing space — the claim still normalizes to the same lowercase, trimmed handle a plain claim would produce", async () => {
    const { claimHandle } = await import("@/lib/registry");
    const res = await claimHandle(" MoonChild ", NPUB_A, "onecocreation", null);
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.entry.handle).toBe("moonchild");
    // the SAME npub retapping with different capitalization/whitespace of
    // the identical name is still "mine" once normalized, never a refusal
    const retap = await claimHandle("MOONCHILD", NPUB_A, "onecocreation", null);
    expect(retap.ok).toBe(true);
  });

  it("iOS autocapitalizes/adds a trailing space claiming a name someone ELSE already holds — normalization still catches the real conflict", async () => {
    const { claimHandle } = await import("@/lib/registry");
    await claimHandle("starlight", NPUB_A, "onecocreation", null);
    const res = await claimHandle(" StarLight ", NPUB_B, "onecocreation", null);
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.reason).toBe("That name is taken. Try another.");
  });
});
