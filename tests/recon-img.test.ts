import { describe, it, expect, beforeAll } from "vitest";
import { generateSecretKey, getPublicKey, nip19 } from "nostr-tools";

/**
 * G3 (TASK-105): /api/recon-img refuses everything but an operator's request
 * for an allowlisted image. The GET handler is called directly with a plain
 * Request; the operator cookie is minted with the real makeOperatorToken
 * (the same HMAC the app verifies), against a throwaway test key whose npub
 * is pinned into OPERATOR_NPUBS — note the allowlist takes NPUBS (bech32),
 * not hex, per packages/operator-auth/src/index.ts operatorHexKeys().
 */

let authed: (path: string) => Request;

beforeAll(() => {
  const pk = getPublicKey(generateSecretKey());
  process.env.SEAT_SECRET = "test-seat-secret";
  process.env.OPERATOR_NPUBS = nip19.npubEncode(pk);
  // imported lazily so the env is pinned before any module-level read
  return import("@/lib/operator-auth").then(({ makeOperatorToken }) => {
    const cookie = `fe-operator=${makeOperatorToken(pk)}`;
    authed = (path: string) =>
      new Request(`http://localhost/api/recon-img?path=${encodeURIComponent(path)}`, {
        headers: { cookie },
      });
  });
});

const GET = async () => (await import("@/app/api/recon-img/route")).GET;

describe("recon-img gate", () => {
  it("refuses an unauthenticated request (401)", async () => {
    const res = await (await GET())(
      new Request("http://localhost/api/recon-img?path=shots/scroll-series/about-1.jpg"),
    );
    expect(res.status).toBe(401);
  });
});

describe("recon-img fence", () => {
  it("refuses plain traversal (../)", async () => {
    const res = await (await GET())(authed("../package.json"));
    expect(res.status).toBe(403);
  });

  it("refuses encoded traversal (%2e%2e)", async () => {
    const res = await (await GET())(authed("%2e%2e/%2e%2e/package.json"));
    expect(res.status).toBe(403);
  });

  it("refuses double-encoded traversal (%252e%252e)", async () => {
    const res = await (await GET())(authed("%252e%252e%252fpackage.json"));
    expect(res.status).toBe(403);
  });

  it("refuses backslash traversal", async () => {
    const res = await (await GET())(authed("..\\package.json"));
    expect(res.status).toBe(403);
  });

  it("refuses absolute paths", async () => {
    const res = await (await GET())(authed("/etc/passwd"));
    expect(res.status).toBe(403);
  });

  it("refuses paths outside the allowlisted prefixes", async () => {
    const res = await (await GET())(authed("pages/about.md"));
    expect(res.status).toBe(403);
  });

  it("refuses non-image extensions even inside the allowlist", async () => {
    const res = await (await GET())(authed("assets/readme.md"));
    expect(res.status).toBe(403);
  });

  it("serves a real capture shot (200, image/jpeg)", async () => {
    const res = await (await GET())(authed("shots/scroll-series/about-1.jpg"));
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("image/jpeg");
    const body = await res.arrayBuffer();
    expect(body.byteLength).toBeGreaterThan(1000);
  });
});
