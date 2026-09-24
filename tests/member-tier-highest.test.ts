import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * T-452 (block 968,393, the Admiral): `tierForSubject` returns the HIGHEST
 * live tier across the member's linked group, not the first one found. "A
 * member with two linked sign-ins can be judged by the lower membership,
 * because the site takes the first one it finds (member-tier.ts). An Evening
 * Star member could be refused at an Evening Star door."
 *
 * The three seams are mocked at the module boundary (matrix-identity's own
 * idiom): the link group, the registry, and the grant read. tierSatisfies and
 * TIERS stay REAL, so the ranking under test is the house's one ranking.
 */

const groups = new Map<string, string[]>();
const npubs = new Map<string, string>(); // "handle@space" -> hex
const grants = new Map<string, "A" | "B" | "C">(); // grant key -> tier
const reads: string[] = [];
let throwOn: string | null = null;

vi.mock("@/lib/member-links", () => ({
  memberGroup: vi.fn(async (subject: string) => groups.get(subject) ?? [subject]),
}));

vi.mock("@/lib/registry", () => ({
  getEntry: vi.fn(async (handle: string, space: string) => {
    const hex = npubs.get(`${handle}@${space}`);
    return hex ? { handle, npub: hex, status: "committed" } : null;
  }),
}));

vi.mock("@/lib/entitlement", async (importOriginal) => {
  const real = await importOriginal<typeof import("@/lib/entitlement")>();
  return {
    ...real,
    normalizeNpub: (v: string | undefined) => (v && /^[0-9a-f]{64}$/.test(v) ? v : null),
    tierFor: vi.fn(async (key: string) => {
      reads.push(key);
      if (throwOn === key) throw new Error("KV blip");
      return grants.get(key) ?? null;
    }),
  };
});

const { tierForSubject } = await import("@/lib/member-tier");

const HEX_A = "a".repeat(64);
const HEX_B = "b".repeat(64);

beforeEach(() => {
  groups.clear();
  npubs.clear();
  grants.clear();
  reads.length = 0;
  throwOn = null;
});

describe("tierForSubject — the highest live tier across linked sign-ins (T-452)", () => {
  it("THE BUG: the member's own key door holds Weekly Intuitive, the linked email holds Evening Star → Evening Star", async () => {
    groups.set("firefly@onecocreation", ["firefly@onecocreation", "firefly@example.com@email"]);
    npubs.set("firefly@onecocreation", HEX_A);
    grants.set(HEX_A, "A");
    grants.set("firefly@example.com@email", "C");
    expect(await tierForSubject("firefly@onecocreation")).toBe("C");
  });

  it("the order the group lists its doors never matters", async () => {
    grants.set("x@email", "B");
    grants.set("y@email", "C");
    grants.set("z@email", "A");
    for (const order of [
      ["x@email", "y@email", "z@email"],
      ["z@email", "x@email", "y@email"],
      ["y@email", "z@email", "x@email"],
    ]) {
      groups.set(order[0], order);
      expect(await tierForSubject(order[0]), order.join(",")).toBe("C");
    }
  });

  it("a lower tier on a later door never lowers a higher one found first", async () => {
    groups.set("m@email", ["m@email", "n@email"]);
    grants.set("m@email", "B");
    grants.set("n@email", "A");
    expect(await tierForSubject("m@email")).toBe("B");
  });

  it("doors with no tier are skipped; no tier anywhere → null (unchanged)", async () => {
    groups.set("p@email", ["p@email", "q@email"]);
    grants.set("q@email", "A");
    expect(await tierForSubject("p@email")).toBe("A");
    groups.set("r@email", ["r@email", "s@email"]);
    expect(await tierForSubject("r@email")).toBeNull();
  });

  it("a single-door member reads exactly as before", async () => {
    grants.set("solo@email", "B");
    expect(await tierForSubject("solo@email")).toBe("B");
  });

  it("a key door still reads its registry npub's grant first, then its own subject string (unchanged)", async () => {
    groups.set("key@onecocreation", ["key@onecocreation"]);
    npubs.set("key@onecocreation", HEX_B);
    grants.set("key@onecocreation", "A"); // subject-string grant
    grants.set(HEX_B, "B"); // npub grant wins for that door, as before
    expect(await tierForSubject("key@onecocreation")).toBe("B");
    expect(reads).toEqual([HEX_B]);
  });

  it("stops at the top of the ladder: once Evening Star is found, no further door is read", async () => {
    groups.set("t@email", ["t@email", "u@email", "v@email"]);
    grants.set("t@email", "C");
    grants.set("u@email", "A");
    expect(await tierForSubject("t@email")).toBe("C");
    expect(reads).toEqual(["t@email"]);
  });

  it("a failed lookup is a LOWER BOUND: the highest tier actually read stands (never a new 503 against the first-found rule)", async () => {
    groups.set("w@email", ["w@email", "k@email"]);
    grants.set("w@email", "A");
    throwOn = "k@email";
    expect(await tierForSubject("w@email")).toBe("A");
  });

  it("…and a failed signed-in door no longer hides a linked door's tier", async () => {
    groups.set("f@email", ["f@email", "g@email"]);
    grants.set("g@email", "C");
    throwOn = "f@email";
    expect(await tierForSubject("f@email")).toBe("C");
  });

  it("nothing read AND a lookup failed → the error rises (callers fail closed, e.g. /api/stage2's 503)", async () => {
    groups.set("e@email", ["e@email", "k@email"]);
    throwOn = "k@email";
    await expect(tierForSubject("e@email")).rejects.toThrow("KV blip");
  });

  it("a stored value that isn't a real tier never ranks above a real one", async () => {
    groups.set("z@email", ["z@email", "y@email"]);
    grants.set("z@email", "B");
    (grants as Map<string, string>).set("y@email", "Z");
    expect(await tierForSubject("z@email")).toBe("B");
  });
});
