import { describe, it, expect, beforeAll } from "vitest";
import { FREN_COOKIE, makeFrenToken, sessionsFromCookieHeader } from "@/lib/fren-auth";
import {
  FREN_COOKIE as FREN_COOKIE_EDGE,
  hasValidSessionEdge,
  verifySessionTokenEdge,
} from "@/lib/fren-auth-edge";

/**
 * TASK-259 — the middleware's cookie check moved from PRESENCE to
 * VALIDITY, and the middleware runs in the Edge runtime (no node:crypto,
 * no node:fs — see src/lib/fren-auth-edge.ts's own docblock for why the
 * Edge-safe verifier lives in its own leaf file rather than fren-auth.ts:
 * `next build` proved importing ANYTHING from fren-auth.ts into the
 * middleware drags in registry.ts's node-only `fs`/`path`). This pins the
 * Web-Crypto twin (`verifySessionTokenEdge` / `hasValidSessionEdge`)
 * against fren-auth.ts's own node path: the SAME token format, verified
 * two ways, that must always agree — a valid token passes both, a
 * tampered/expired/foreign-secret token fails both.
 */
describe("fren-auth-edge.ts's copied constants stay pinned to fren-auth.ts's own", () => {
  it("FREN_COOKIE is byte-identical in both files", () => {
    expect(FREN_COOKIE_EDGE).toBe(FREN_COOKIE);
  });
});

describe("the Edge-safe verifier agrees with the node verifier (TASK-259)", () => {
  beforeAll(() => {
    process.env.SEAT_SECRET = "test-seat-secret";
  });

  it("a fresh token verifies the same way on both runtimes", async () => {
    const token = makeFrenToken("firefly@example.com", "email");
    const edge = await verifySessionTokenEdge(token);
    const node = sessionsFromCookieHeader(`${FREN_COOKIE}=${token}`)[0] ?? null;
    expect(edge).toEqual({ handle: "firefly@example.com", space: "email" });
    expect(node && { handle: node.handle, space: node.space }).toEqual(edge);
  });

  it("a tampered signature fails on both runtimes", async () => {
    const token = makeFrenToken("firefly@example.com", "email");
    const parts = token.split(".");
    parts[parts.length - 1] = "0".repeat(64);
    const tampered = parts.join(".");
    expect(await verifySessionTokenEdge(tampered)).toBeNull();
    expect(sessionsFromCookieHeader(`${FREN_COOKIE}=${tampered}`)).toHaveLength(0);
  });

  it("an expired token fails on both runtimes", async () => {
    const handle = "firefly@example.com";
    const space = "email";
    const exp = Date.now() - 1000;
    // fren-auth's own hmac is node-only (not exported) — mint the expired
    // token by hand with the same secret so both verifiers see a real,
    // correctly-signed-but-expired token, never a shortcut.
    const crypto = await import("node:crypto");
    const sig = crypto
      .createHmac("sha256", process.env.SEAT_SECRET!)
      .update(`${handle}|${space}|${exp}`)
      .digest("hex");
    const expired = `${handle}.${space}.${exp}.${sig}`;
    expect(await verifySessionTokenEdge(expired)).toBeNull();
    expect(sessionsFromCookieHeader(`${FREN_COOKIE}=${expired}`)).toHaveLength(0);
  });

  it("a token signed with a foreign secret fails on both runtimes", async () => {
    const handle = "firefly@example.com";
    const space = "email";
    const exp = Date.now() + 1000 * 60;
    const crypto = await import("node:crypto");
    const sig = crypto
      .createHmac("sha256", "some-other-hosts-secret")
      .update(`${handle}|${space}|${exp}`)
      .digest("hex");
    const foreign = `${handle}.${space}.${exp}.${sig}`;
    expect(await verifySessionTokenEdge(foreign)).toBeNull();
    expect(sessionsFromCookieHeader(`${FREN_COOKIE}=${foreign}`)).toHaveLength(0);
  });

  it("a malformed token (too few parts) fails cleanly on the Edge path", async () => {
    expect(await verifySessionTokenEdge("not-a-real-token")).toBeNull();
  });
});

describe("hasValidSessionEdge — the middleware's own yes/no (TASK-259)", () => {
  beforeAll(() => {
    process.env.SEAT_SECRET = "test-seat-secret";
  });

  it("no cookie header at all: no session", async () => {
    expect(await hasValidSessionEdge(null)).toBe(false);
  });

  it("a present-but-invalid cookie (wrong host's secret) reads as no session — the door's own bug", async () => {
    const handle = "firefly@example.com";
    const space = "email";
    const exp = Date.now() + 1000 * 60;
    const crypto = await import("node:crypto");
    const sig = crypto
      .createHmac("sha256", "wrong-secret")
      .update(`${handle}|${space}|${exp}`)
      .digest("hex");
    const foreign = `${handle}.${space}.${exp}.${sig}`;
    expect(await hasValidSessionEdge(`${FREN_COOKIE}=${foreign}`)).toBe(false);
  });

  it("a valid token in the cookie header reads as a session", async () => {
    const token = makeFrenToken("firefly@example.com", "email");
    expect(await hasValidSessionEdge(`${FREN_COOKIE}=${token}; other=1`)).toBe(true);
  });

  it("multiple joined tokens: any one valid token is enough", async () => {
    const good = makeFrenToken("firefly@example.com", "email");
    const bad = "garbage.token.here.nope";
    expect(await hasValidSessionEdge(`${FREN_COOKIE}=${bad}~${good}`)).toBe(true);
  });
});

/* Number One follow-through (T-259 gate): no SEAT_SECRET on the edge = no
   session, never a thrown error out of the middleware. */
import { hasValidSessionEdge as hasValidSessionEdgeClosed } from "@/lib/fren-auth-edge";
describe("edge verifier fails closed", () => {
  it("a missing SEAT_SECRET reads as no session, not a throw", async () => {
    const saved = process.env.SEAT_SECRET;
    delete process.env.SEAT_SECRET;
    try {
      await expect(hasValidSessionEdgeClosed("pa-fren=a.email.9999999999999.deadbeef")).resolves.toBe(false);
    } finally {
      if (saved !== undefined) process.env.SEAT_SECRET = saved;
    }
  });
});
