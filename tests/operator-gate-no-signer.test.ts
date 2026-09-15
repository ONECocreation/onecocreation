import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

/**
 * TASK-301 — OperatorGate tells the truth when no NIP-07 signer is
 * installed. Love pressed "Verify operator key" on her iPad (no signer
 * extension) and nothing happened; she found the email door herself.
 * Environment is `node` (no jsdom in this repo's vitest config — see
 * operator-gate-email-seat.test.ts for the same source-assertion
 * convention used for every other OperatorGate-adjacent pin), so this
 * reads the component source rather than rendering it.
 */
const src = readFileSync(
  path.join(process.cwd(), "src/components/OperatorGate.tsx"),
  "utf8",
);

describe("OperatorGate — honest when no signer extension is present", () => {
  it("reads window.nostr via the hydration-safe useHasSigner pattern (Kind0Doors, SignerDoors)", () => {
    expect(src).toContain("useSyncExternalStore");
    expect(src).toContain("() => !!window.nostr");
  });

  it("only flips on the confirmed-absent state, not the pre-hydration null", () => {
    expect(src).toContain("const noSigner = hasSigner === false;");
  });

  it("swaps the button copy to the honest label when no signer is present", () => {
    expect(src).toContain('"Needs a signer extension"');
    // still says the normal label when a signer IS present
    expect(src).toContain('"Verify operator key"');
  });

  it("marks the button aria-disabled but leaves it focusable (no `disabled` attribute tied to noSigner)", () => {
    expect(src).toContain("aria-disabled={noSigner}");
    // the only real `disabled` on the button is the busy (in-flight) state —
    // noSigner must never drive the plain HTML `disabled` attribute (the
    // negative lookbehind excludes the aria-disabled={noSigner} match above)
    expect(src).not.toMatch(/(?<!aria-)disabled=\{noSigner\}/);
    expect(src).toContain("disabled={busy}");
  });

  it("shows the exact honest line naming real signers and the email fallback", () => {
    expect(src).toContain(
      "Install a Nostr signer (Sidecar, Alby, nos2x) or sign in with email below.",
    );
  });

  it("only shows that line when noSigner is true", () => {
    const line = src.indexOf(
      "Install a Nostr signer (Sidecar, Alby, nos2x)",
    );
    const guard = src.lastIndexOf("{noSigner &&", line);
    expect(guard).toBeGreaterThan(-1);
    expect(line - guard).toBeLessThan(200);
  });

  it("keeps the email door as the obvious path underneath — no regression on the email-seat line", () => {
    expect(src).toContain("Sign in with your email");
    expect(src).toContain(
      "Signed in as {emailDoor?.handle}, but this address is not on the operator list.",
    );
  });
});
