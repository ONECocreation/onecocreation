import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

/**
 * TASK-226 — OperatorGate's one honest line: when an email door is signed
 * in on this browser (from useFrenSession's `accounts`, which sees every
 * door, not just the active one) but /api/admin/session's `emailSeat` says
 * it isn't allowlisted, the gate says so by name instead of just repeating
 * the generic "sign in with your key" copy. Environment is `node` (no
 * jsdom in this repo's vitest config — see style-route.test.ts /
 * go-live-door.test.ts for the same source-assertion convention used for
 * every other OperatorGate-adjacent pin), so this reads the component
 * source rather than rendering it.
 */
const src = readFileSync(
  path.join(process.cwd(), "src/components/OperatorGate.tsx"),
  "utf8",
);

describe("OperatorGate — the email-seat honest line", () => {
  it("asks /api/admin/session for emailSeat", () => {
    expect(src).toContain('fetch("/api/admin/session")');
    expect(src).toContain("emailSeat");
  });

  it("reads every signed-in door via useFrenSession, not just the active one", () => {
    expect(src).toContain('from "@/hooks/useFrenSession"');
    expect(src).toContain("accounts.find");
    expect(src).toContain('a.space === "email"');
  });

  it("shows the exact honest line, naming no env and no value but the fren's own address", () => {
    expect(src).toContain("Signed in as {emailDoor?.handle}, but this address is not on the operator list.");
    // never leaks the allowlist env's name inside that line's own paragraph
    const line = src.slice(
      src.indexOf("Signed in as"),
      src.indexOf("Signed in as") + 200,
    );
    expect(line).not.toMatch(/OPERATOR_EMAILS|OPERATOR_NPUBS|SEAT_SECRET/);
  });

  it("only shows the line when emailSeat is false AND an email door exists", () => {
    expect(src).toContain("notOnTheList");
    expect(src).toMatch(/emailSeat === false && !!emailDoor/);
  });
});
