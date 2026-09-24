import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * T-452 (block 968,393): the operator's revoke.
 *  - It reads THIS door's OWN grant (the key it revokes), never the highest
 *    across linked doors — or it would report "revoked C" and write an
 *    Evening Star closing letter while C stays live on a linked door.
 *  - The kick and the revoke are main's (this door's account leaves the
 *    gated rooms; the next sign-in re-invites what the member still holds).
 *    Two rebuilt drafts that kicked the whole linked group were rejected by
 *    review (one kicked nothing on a lower linked tier; the next could kick
 *    the bot seat when the Admiral's own sign-in is linked) — reaching every
 *    linked account is a follow-up lane.
 *  - With linked sign-ins no automatic "membership closed" letter goes out;
 *    the answer says what the member still reads as.
 */

const grants = new Map<string, "A" | "B" | "C">();
const groups = new Map<string, string[]>();
const revoked: string[] = [];
const letters: { to: string; tier: string }[] = [];
const kicked: string[] = [];
let groupTier: "A" | "B" | "C" | null = null;

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
vi.mock("@/lib/member-links", () => ({ memberGroup: vi.fn(async (s: string) => groups.get(s) ?? [s]) }));
vi.mock("@/lib/member-tier", () => ({
  tierForSubject: vi.fn(async () => groupTier),
  /* the real one walks the linked group for an email door (member-tier.ts) */
  emailForSubject: vi.fn(async (s: string) => {
    const door = (groups.get(s) ?? [s]).find((d) => d.endsWith("@email"));
    return door ? door.slice(0, -"@email".length) : null;
  }),
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
  groupTier = null;
});

describe("the operator's revoke (T-452)", () => {
  it("revoke Evening Star on a door linked to a Weekly Intuitive door: reports C, kicks this door's account, NO automatic letter", async () => {
    groups.set(EMAIL, [EMAIL, KEYDOOR]);
    grants.set(EMAIL, "C");
    groupTier = "A"; // what the group reads as after the revoke
    const { status, body } = await revoke(EMAIL);
    expect(status).toBe(200);
    expect(body.revoked).toBe("C");
    expect(body.stillHolds).toBe("A");
    expect(body.linked).toBe(1);
    expect(revoked).toEqual([EMAIL]);
    expect(kicked).toEqual([`@${EMAIL}`]);
    expect(letters).toEqual([]);
    expect(body.letter).toContain("still reads as A");
  });

  it("revoke Weekly Intuitive on a door linked to an Evening Star door: reports A (never the linked C)", async () => {
    groups.set(EMAIL, [EMAIL, KEYDOOR]);
    grants.set(EMAIL, "A");
    groupTier = "C";
    const { body } = await revoke(EMAIL);
    expect(body.revoked).toBe("A");
    expect(body.stillHolds).toBe("C");
    expect(letters).toEqual([]);
  });

  it("a door with no tier of its own is a 404 — even when a linked door holds one — and nothing happens", async () => {
    groups.set(EMAIL, [EMAIL, KEYDOOR]);
    groupTier = "C";
    const { status, body } = await revoke(EMAIL);
    expect(status).toBe(404);
    expect(body.reason).toBe("that door holds no tier of its own");
    expect(revoked).toEqual([]);
    expect(kicked).toEqual([]);
  });

  it("linked, but the other door holds nothing (an email linked only for letters): main's kind letter still goes out", async () => {
    groups.set(KEYDOOR, [KEYDOOR, EMAIL]);
    grants.set(KEYDOOR, "B");
    groupTier = null; // after the revoke, the group holds nothing
    const { status, body } = await revoke(KEYDOOR);
    expect(status).toBe(200);
    expect(body.linked).toBe(1);
    expect(body.stillHolds).toBeNull();
    expect(letters).toEqual([{ to: "sam@example.com", tier: "B" }]);
  });

  it("linked, and what they still hold can't be read: no letter (unknown is never 'closed')", async () => {
    const { tierForSubject } = await import("@/lib/member-tier");
    vi.mocked(tierForSubject).mockRejectedValueOnce(new Error("KV blip"));
    groups.set(EMAIL, [EMAIL, KEYDOOR]);
    grants.set(EMAIL, "C");
    const { status, body } = await revoke(EMAIL);
    expect(status).toBe(200);
    expect(letters).toEqual([]);
    expect(body.letter).toContain("no letter sent");
  });

  it("the only door: kicked, revoked, and the kind letter names the tier it held (main's path)", async () => {
    grants.set("solo@example.com@email", "B");
    const { status, body } = await revoke("solo@example.com@email");
    expect(status).toBe(200);
    expect(body.revoked).toBe("B");
    expect(body.linked).toBe(0);
    expect(kicked).toEqual(["@solo@example.com@email"]);
    expect(revoked).toEqual(["solo@example.com@email"]);
    expect(letters).toEqual([{ to: "solo@example.com", tier: "B" }]);
  });
});
