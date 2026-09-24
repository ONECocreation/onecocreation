import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * T-452 (block 968,393): the operator's revoke reads THIS door's OWN grant —
 * the key it revokes — never tierForSubject (the highest across linked
 * doors). Otherwise it reported "revoked C" and sent an Evening Star closing
 * letter while the C grant stayed live on a linked door. A member who still
 * holds a tier through a linked sign-in keeps their rooms and gets no
 * "membership closed" letter; the answer names what they still hold.
 */

const grants = new Map<string, "A" | "B" | "C">();
const revoked: string[] = [];
const letters: { to: string; tier: string }[] = [];
const kicked: string[] = [];
let linkedTier: "A" | "B" | "C" | null = null;

vi.mock("@/lib/operator-auth", () => ({ operatorFromCookieHeader: () => "operator-fixture" }));
vi.mock("@/lib/matrix-rooms", () => ({ ROOMS: [] }));
vi.mock("@/lib/registry", () => ({ getEntry: vi.fn(async () => null) }));
vi.mock("@/lib/entitlement", () => ({
  normalizeNpub: () => null,
  tierFor: vi.fn(async (k: string) => grants.get(k) ?? null),
  revokeTier: vi.fn(async (k: string) => {
    revoked.push(k);
    grants.delete(k);
  }),
}));
vi.mock("@/lib/member-tier", () => ({
  /* the group view after the revoke: the named door's own grant, else a linked door's */
  tierForSubject: vi.fn(async (s: string) => grants.get(s) ?? linkedTier),
  emailForSubject: vi.fn(async (s: string) => (s.endsWith("@email") ? s.slice(0, -"@email".length) : null)),
}));
vi.mock("@/lib/matrix", () => ({
  mxidForSubject: (s: string) => `@${s}`,
  removeFromTierRooms: vi.fn(async (mxid: string) => {
    kicked.push(mxid);
    return ["#evening-star"];
  }),
}));
vi.mock("@/lib/entitlement-fulfil", () => ({
  sendRevokeLetter: vi.fn(async (to: string, tier: string) => {
    letters.push({ to, tier });
  }),
}));

process.env.MATRIX_BOT_TOKEN = "bot-fixture";

async function revoke(subject: string) {
  const { POST } = await import("@/app/api/admin/matrix/ceremony/route");
  const res = await POST(
    new Request("http://localhost/api/admin/matrix/ceremony", {
      method: "POST",
      headers: { "Content-Type": "application/json", cookie: "fe-operator=fixture" },
      body: JSON.stringify({ action: "revoke", subject }),
    }),
  );
  return { status: res.status, body: await res.json() };
}

beforeEach(() => {
  grants.clear();
  revoked.length = 0;
  letters.length = 0;
  kicked.length = 0;
  linkedTier = null;
});

describe("the operator's revoke reads the door's OWN grant (T-452)", () => {
  it("revoking an A door whose linked door holds C: reports A, keeps the rooms, sends NO closing letter", async () => {
    grants.set("soul@example.com@email", "A");
    linkedTier = "C";
    const { status, body } = await revoke("soul@example.com@email");
    expect(status).toBe(200);
    expect(body.revoked).toBe("A");
    expect(body.stillHolds).toBe("C");
    expect(revoked).toEqual(["soul@example.com@email"]);
    expect(kicked).toEqual([]);
    expect(letters).toEqual([]);
  });

  it("a door with no tier of its own is a 404 — even when a linked door holds one", async () => {
    linkedTier = "C";
    const { status, body } = await revoke("other@example.com@email");
    expect(status).toBe(404);
    expect(body.reason).toBe("that door holds no tier of its own");
    expect(revoked).toEqual([]);
  });

  it("the only door: revoked, rooms closed, the kind letter names the tier it held", async () => {
    grants.set("solo@example.com@email", "B");
    const { status, body } = await revoke("solo@example.com@email");
    expect(status).toBe(200);
    expect(body.revoked).toBe("B");
    expect(body.stillHolds).toBeNull();
    expect(kicked).toEqual(["@solo@example.com@email"]);
    expect(letters).toEqual([{ to: "solo@example.com", tier: "B" }]);
  });
});
