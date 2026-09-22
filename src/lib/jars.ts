/**
 * TASK-411 (block 968,170 a₿ · fix round: slop finding 1 = security
 * finding 4) — THE JARS' SHELF IDS, ONE SOURCE. Each tip jar is a store
 * item; the jar key → item id map lives here exactly once, in a neutral
 * module (no "use client", no server-only imports) so BOTH consumers read
 * the same truth: TipJar.tsx (client — give() posts this id to /api/cart)
 * and sections.tsx's liveJarKeys() (server — the derive-or-dash gate that
 * decides which jars are offered at all). A server page cannot call a
 * client-module export (payments.ts:656's own note); a neutral module is
 * how the two sides can never drift. The lane's pin file
 * (tests/support-jars-basket.test.ts, pin 4) pins THIS map against the
 * JARS table's words — one map, one module, pinned once.
 *
 * AMENDMENT 1's derived ids: the store desk has no id field — the operator
 * types the TITLE and api/admin/store/route.ts:56 derives the id from it
 * (tip-love / tip-one-cocreation / gifts-of-gratitude). The receipt names
 * the gift by the item's title; the titles themselves live in TipJar's
 * JARS table.
 */
export const JAR_ITEMS: Record<"love" | "onecocreation" | "payforward", string> = {
  love: "tip-love",
  onecocreation: "tip-one-cocreation",
  payforward: "gifts-of-gratitude",
};
