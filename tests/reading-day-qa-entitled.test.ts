import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { tierForSubject } from "@/lib/member-tier";
import { qaEntitled } from "@/lib/qa-entitlement";

/**
 * TASK-475 (block 968,624) — proves `ReadingDay.tsx`'s ONE-LINE fix: the
 * `qaEntitled` prop it hands `ReadingDayBody` now comes from
 * `qa-entitlement.ts`'s `qaEntitled(subject, tier)`, called with the
 * EXACT `${handle}@${space}` subject spelling every other tier check on
 * this site uses (`member-tier.ts`'s own idiom) — not the bare
 * `tierSatisfies(tier, "C")` this lane replaces (the brief's show
 * stopper: tier C alone locked out every Q&A buyer while Evening Star
 * read "Coming soon").
 *
 * `@/lib/qa-entitlement` is the one mocked boundary here — the entitlement
 * DECISION itself (tier vs. a settled order) is already proven directly
 * in `tests/qa-entitlement.test.ts` and `tests/qa-door-route.test.ts`;
 * this file only proves the WIRING.
 */

vi.mock("@/lib/member-tier", () => ({ tierForSubject: vi.fn() }));
vi.mock("@/lib/qa-entitlement", () => ({ qaEntitled: vi.fn() }));
const mockTier = vi.mocked(tierForSubject);
const mockQaEntitled = vi.mocked(qaEntitled);

const authState = vi.hoisted(() => ({ signedIn: true }));
vi.mock("@/lib/member-auth", () => ({
  sessionsFromCookieHeader: () =>
    authState.signedIn ? [{ token: "fixture-token", handle: "qa-wiring-tester", space: "onecocreation" }] : [],
}));
vi.mock("next/headers", () => ({ headers: async () => ({ get: () => null }) }));

describe("ReadingDay.tsx wires qa-entitlement.ts's qaEntitled(subject, tier)", () => {
  const prevEnv = { ...process.env };

  beforeEach(() => {
    mockTier.mockReset();
    mockQaEntitled.mockReset();
    delete process.env.KV_REST_API_URL;
    delete process.env.KV_REST_API_TOKEN;
    delete process.env.BLOB_READ_WRITE_TOKEN;
    delete process.env.REDIS_URL;
  });

  afterEach(() => {
    process.env = { ...prevEnv };
  });

  it("calls qaEntitled with the exact subject and resolved tier, and threads its answer through — tier A alone plus a settled order still opens the row", async () => {
    authState.signedIn = true;
    mockTier.mockResolvedValue("A");
    mockQaEntitled.mockResolvedValue(true);
    const ReadingDay = (await import("@/components/reading/ReadingDay")).default;
    const el = await ReadingDay();
    expect(mockQaEntitled).toHaveBeenCalledWith("qa-wiring-tester@onecocreation", "A");
    const props = el!.props as { qaEntitled: boolean };
    expect(props.qaEntitled).toBe(true);
  });

  it("qaEntitled answering false locks the row, even at a tier that would open other rooms", async () => {
    authState.signedIn = true;
    mockTier.mockResolvedValue("B");
    mockQaEntitled.mockResolvedValue(false);
    const ReadingDay = (await import("@/components/reading/ReadingDay")).default;
    const el = await ReadingDay();
    const props = el!.props as { qaEntitled: boolean };
    expect(props.qaEntitled).toBe(false);
  });

  it("signed out: qaEntitled is never even called, no order ledger read for a visitor with no subject", async () => {
    authState.signedIn = false;
    const ReadingDay = (await import("@/components/reading/ReadingDay")).default;
    const el = await ReadingDay();
    expect(mockQaEntitled).not.toHaveBeenCalled();
    const props = el!.props as { qaEntitled: boolean };
    expect(props.qaEntitled).toBe(false);
  });
});
