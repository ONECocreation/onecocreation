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

/**
 * TASK-646 (block 976,007 · Pay It Forward step 1, card 15) — THE THREE
 * FIXED DOLLAR GIFTS. Each is a normal shelf item with a dollar price,
 * made by Love in her store desk; the desk derives the id from the title
 * she types (api/admin/store/route.ts), so the titles to type are
 * "Pay It Forward Gift 1", "Pay It Forward Gift 2" and "Pay It Forward
 * Gift 3" (proposed words, his and Love's to rule). THE AMOUNTS ARE NOT IN
 * CODE: each button reads its item's own dollar price, so Love changes a
 * gift by changing its price in the desk. Built for $11, $33 and $111
 * (Lumen's guess from the card; not ruled). Every gift gives to the
 * payforward jar (Gifts of Gratitude), and none sits on the shelf.
 */
export const GIFT_ITEMS = ["pay-it-forward-gift-1", "pay-it-forward-gift-2", "pay-it-forward-gift-3"] as const;

/** The jar the dollar gifts give to. */
export const GIFT_JAR = "payforward" as const;

/** Every gift item, sats jar or dollar gift: kept off the shelf grid and
 *  the Related row, its crumb pointing at the gift drawer. One set, read by
 *  ShelfSection, RelatedItems and store-sections. */
export const OFF_SHELF_IDS: ReadonlySet<string> = new Set<string>([...Object.values(JAR_ITEMS), ...GIFT_ITEMS]);

/** TASK-646 (block 976,007): the jar a shelf item gives to, or null. The
 *  books (src/lib/tips.ts) read a basket line through this one lookup. */
export function jarForItem(itemId: string): keyof typeof JAR_ITEMS | null {
  for (const [jar, id] of Object.entries(JAR_ITEMS) as [keyof typeof JAR_ITEMS, string][]) {
    if (id === itemId) return jar;
  }
  if ((GIFT_ITEMS as readonly string[]).includes(itemId)) return GIFT_JAR;
  return null;
}
