/**
 * Tiered entitlement gate (Phase 3) — the CORE of the packages.
 *
 * Reuses the house's artist-registry LEVEL-LOCKED door pattern: a member's
 * paid tier is checked before content, classes, and community rooms render.
 * Progressive: C ⊇ B ⊇ A.
 *
 * STATUS: STUB. The tier claim will be signed after a BTCPay invoice settles
 * (ENTITLEMENT_SECRET) and carried like the frens key = consent. For now the
 * helpers exist so pages can be written against the real shape.
 */

export type Tier = "A" | "B" | "C";

export const TIERS: Record<Tier, { name: string; priceUsd: number; priceSats: number }> = {
  A: { name: "The Weekly Intuitive", priceUsd: 33, priceSats: 33_000 },
  B: { name: "The Observer", priceUsd: 55.55, priceSats: 55_550 },
  C: { name: "The Evening Star", priceUsd: 111.11, priceSats: 111_110 },
};

const RANK: Record<Tier, number> = { A: 1, B: 2, C: 3 };

/** Does `held` satisfy the `required` tier? (C unlocks B and A.) */
export function tierSatisfies(held: Tier | null, required: Tier): boolean {
  if (!held) return false;
  return RANK[held] >= RANK[required];
}

export interface Entitlement {
  npub: string; // the member's nostr identity
  tier: Tier;
  grantedAt: string; // ISO
  paidInvoiceId: string;
}

/** Placeholder read — real version verifies a signed tier claim. */
export async function getEntitlement(_npub: string): Promise<Entitlement | null> {
  return null; // scaffold: nobody is entitled until BTCPay + signing are wired
}
