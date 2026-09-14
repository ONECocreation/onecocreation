import { describe, it, expect, beforeEach } from "vitest";
import { createOperatorAuth, type OperatorFrenSession } from "@pacsarcade/operator-auth";
import { generateSecretKey, getPublicKey, nip19 } from "nostr-tools";

/**
 * TASK-226 — the email seat is found in ANY slot of the fren cookie, not
 * just the active one (slot 0). A door switch, a key login, or a store-
 * order claim can all re-order the cookie's up-to-8 tokens; before this
 * fix `operatorFromCookieHeader` only ever read
 * `frenSessionsFromCookieHeader(cookieHeader)[0]`, so Love's own email seat
 * "disappeared" from the operator console the moment it left slot 0 even
 * though she was still signed in.
 *
 * Config uses TEST_-prefixed env names so this never collides with the
 * site's real OPERATOR_NPUBS / OPERATOR_EMAILS / SEAT_SECRET.
 */

const NPUBS_ENV = "TEST_OPERATOR_NPUBS_226";
const EMAILS_ENV = "TEST_OPERATOR_EMAILS_226";
const SECRET_ENV = "TEST_SEAT_SECRET_226";
const COOKIE_NAME = "test-fe-operator-226";

function sessionsOf(...sessions: OperatorFrenSession[]) {
  return (): OperatorFrenSession[] => sessions;
}

function makeAuth(sessions: OperatorFrenSession[]) {
  return createOperatorAuth({
    npubsEnv: NPUBS_ENV,
    emailsEnv: EMAILS_ENV,
    secretEnv: SECRET_ENV,
    cookieName: COOKIE_NAME,
    frenSessionsFromCookieHeader: sessionsOf(...sessions),
  });
}

describe("operator-auth — the email seat, in any slot", () => {
  beforeEach(() => {
    process.env[SECRET_ENV] = "fixture-secret";
    process.env[EMAILS_ENV] = "love@onecocreation.com";
    delete process.env[NPUBS_ENV];
  });

  it("finds an allowlisted email seat sitting in slot 2, not just slot 0", () => {
    const auth = makeAuth([
      { handle: "guest-key-1", space: "primary" },
      { handle: "guest-key-2", space: "primary" },
      { handle: "love@onecocreation.com", space: "email" },
    ]);
    expect(auth.operatorFromCookieHeader("irrelevant=1")).toBe("love@onecocreation.com");
  });

  it("matches case-insensitively, wherever the seat sits", () => {
    const auth = makeAuth([
      { handle: "guest-key-1", space: "primary" },
      { handle: "LOVE@onecocreation.com", space: "email" },
    ]);
    expect(auth.operatorFromCookieHeader("irrelevant=1")).toBe("LOVE@onecocreation.com");
  });

  it("returns null for a non-allowlisted email, wherever it sits", () => {
    const auth = makeAuth([
      { handle: "someone-else@example.com", space: "email" },
    ]);
    expect(auth.operatorFromCookieHeader("irrelevant=1")).toBeNull();
  });

  it("a keyed operator cookie still wins over any email seat present", () => {
    const pubkey = getPublicKey(generateSecretKey());
    process.env[NPUBS_ENV] = nip19.npubEncode(pubkey);
    const auth = makeAuth([
      { handle: "someone-else@example.com", space: "email" },
      { handle: "love@onecocreation.com", space: "email" },
    ]);
    const token = auth.makeOperatorToken(pubkey);
    expect(auth.operatorFromCookieHeader(`${COOKIE_NAME}=${token}`)).toBe(pubkey);
  });

  it("hasOperatorEmailSeat reports true when the allowlisted seat is present in any slot", () => {
    const auth = makeAuth([
      { handle: "guest-key-1", space: "primary" },
      { handle: "guest-key-2", space: "primary" },
      { handle: "love@onecocreation.com", space: "email" },
    ]);
    expect(auth.hasOperatorEmailSeat("irrelevant=1")).toBe(true);
  });

  it("hasOperatorEmailSeat reports false for a signed-in but non-allowlisted email", () => {
    const auth = makeAuth([{ handle: "someone-else@example.com", space: "email" }]);
    expect(auth.hasOperatorEmailSeat("irrelevant=1")).toBe(false);
  });

  it("hasOperatorEmailSeat reports false with no fren sessions at all", () => {
    const auth = makeAuth([]);
    expect(auth.hasOperatorEmailSeat("irrelevant=1")).toBe(false);
  });
});
