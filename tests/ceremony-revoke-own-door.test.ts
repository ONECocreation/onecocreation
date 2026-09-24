import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * T-452 (block 968,393): the operator's revoke.
 *  - It reads THIS door's OWN grant (the key it revokes), never the highest
 *    across linked doors — or it would report "revoked C" and send an
 *    Evening Star closing letter while C stays live on a linked door.
 *  - Everything is read BEFORE anything is written (the linked group,
 *    strictly, and the other grants): a failed read answers 503 with nothing
 *    changed.
 *  - EVERY sign-in of the member leaves every gated room (each door has its
 *    own Matrix account); the next login re-invites exactly what the group
 *    still holds. The implementation review caught the first draft keeping
 *    every room when a linked door held a LOWER tier.
 *  - The kind letter goes only when the group now holds less than the tier
 *    revoked.
 * Seams mocked at the module boundary; tierSatisfies / isTier stay REAL.
 */

const grants = new Map<string, string>();
const groups = new Map<string, string[]>();
const revoked: string[] = [];
const letters: { to: string; tier: string }[] = [];
const kicked: string[] = [];
let groupReadFails = false;

vi.mock("@/lib/operator-auth", () => ({ operatorFromCookieHeader: () => "operator-fixture" }));
vi.mock("@/lib/matrix-rooms", () => ({ ROOMS: [] }));
vi.mock("@/lib/registry", () => ({ getEntry: vi.fn(async () => null) }));
vi.mock("@/lib/entitlement", async (importOriginal) => {
  const real = await importOriginal<typeof import("@/lib/entitlement")>();
  return {
    ...real,
    normalizeNpub: () => null,
    tierFor: vi.fn(async (k: string) => grants.get(k) ?? null),
    revokeTier: vi.fn(async (k: string) => {
      revoked.push(k);
      grants.delete(k);
    }),
  };
});
vi.mock("@/lib/member-links", () => ({
  memberGroupStrict: vi.fn(async (s: string) => {
    if (groupReadFails) throw new Error("links KV down");
    return groups.get(s) ?? [s];
  }),
}));
vi.mock("@/lib/member-tier", () => ({
  emailForSubject: vi.fn(async (s: string) => (s.endsWith("@email") ? s.slice(0, -"@email".length) : null)),
}));
vi.mock("@/lib/matrix", () => ({
  mxidForSubject: (s: string) => `@${s}`,
  removeFromTierRooms: vi.fn(async (mxid: string) => {
    kicked.push(mxid);
    return [{ room: "#inner-sanctum", ok: true }];
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

const EMAIL = "sam@example.com@email";
const KEYDOOR = "sam@onecocreation";

beforeEach(() => {
  grants.clear();
  groups.clear();
  revoked.length = 0;
  letters.length = 0;
  kicked.length = 0;
  groupReadFails = false;
  groups.set(EMAIL, [EMAIL, KEYDOOR]);
  groups.set(KEYDOOR, [KEYDOOR, EMAIL]);
});

describe("the operator's revoke (T-452)", () => {
  it("THE REVIEW'S BLOCKER: revoke Evening Star while a linked door holds Weekly Intuitive → every sign-in leaves every gated room, and the letter names Evening Star", async () => {
    grants.set(EMAIL, "C");
    grants.set(KEYDOOR, "A");
    const { status, body } = await revoke(EMAIL);
    expect(status).toBe(200);
    expect(body.revoked).toBe("C");
    expect(body.stillHolds).toBe("A");
    expect(revoked).toEqual([EMAIL]);
    expect(kicked.sort()).toEqual([`@${EMAIL}`, `@${KEYDOOR}`].sort());
    expect(letters).toEqual([{ to: "sam@example.com", tier: "C" }]);
  });

  it("revoke Weekly Intuitive while a linked door holds Evening Star → reports A, no closing letter (the rooms re-invite on their next sign-in)", async () => {
    grants.set(EMAIL, "A");
    grants.set(KEYDOOR, "C");
    const { status, body } = await revoke(EMAIL);
    expect(status).toBe(200);
    expect(body.revoked).toBe("A");
    expect(body.stillHolds).toBe("C");
    expect(letters).toEqual([]);
    expect(body.letter).toContain("still hold C");
  });

  it("a door with no tier of its own is a 404 — even when a linked door holds one — and nothing is written", async () => {
    grants.set(KEYDOOR, "C");
    const { status, body } = await revoke(EMAIL);
    expect(status).toBe(404);
    expect(body.reason).toBe("that door holds no tier of its own");
    expect(revoked).toEqual([]);
    expect(kicked).toEqual([]);
  });

  it("the linked group can't be read → 503 BEFORE any write: nothing revoked, nobody kicked, no letter", async () => {
    grants.set(EMAIL, "B");
    groupReadFails = true;
    const { status } = await revoke(EMAIL);
    expect(status).toBe(503);
    expect(revoked).toEqual([]);
    expect(kicked).toEqual([]);
    expect(letters).toEqual([]);
  });

  it("the only door: revoked, its rooms closed, the kind letter names the tier it held", async () => {
    groups.clear();
    grants.set("solo@example.com@email", "B");
    const { status, body } = await revoke("solo@example.com@email");
    expect(status).toBe(200);
    expect(body.revoked).toBe("B");
    expect(body.stillHolds).toBeNull();
    expect(kicked).toEqual(["@solo@example.com@email"]);
    expect(letters).toEqual([{ to: "solo@example.com", tier: "B" }]);
  });
});
