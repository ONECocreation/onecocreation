import { GIFT_ITEMS } from "@/lib/jars";

/**
 * TASK-646 (block 976,007 · Pay It Forward step 1, the brief's part 8) —
 * WHICH LIVE RAIL CAN CARRY THIS BASKET, said before the press.
 *
 * /api/cart/checkout already refuses a basket its rail cannot carry (a
 * pay-what-you-can offer to a card: 409 "only settles in sats"; a line with
 * no sats price to bitcoin: 409 "has no sats price"). The fren only met
 * that answer after pressing Checkout. With dollar gifts on the shelf, two
 * baskets can now be carried by no live rail at all:
 *
 *  - a dollar gift (card only) beside a sats gift or any offer (bitcoin
 *    only), with both rails live;
 *  - a dollar gift with bitcoin the only live rail.
 *
 * This reads the same two laws from the basket's own lines (never a third
 * reading of the money) and returns the rails that can carry it, plus one
 * plain sentence when the answer needs saying. CartPanel shows the sentence
 * in place of a Checkout button that could only fail. The checkout route is
 * unchanged: it still refuses on its own.
 *
 * The sentences are new public words: PROPOSALS, listed for his and Love's
 * word.
 */

export interface BasketRailLine {
  itemId: string;
  /** the line's sats price (null = none) */
  sats: number | null;
  /** a pay-what-you-can offer, always sats */
  offerSats: number | null;
  fiat: { amount: number; currency: string } | null;
}

export interface BasketRails {
  /** bitcoin is live and every line carries sats (a price or an offer) */
  btc: boolean;
  /** the card rail is live and every line carries one fiat price, no offer */
  card: boolean;
  /** a plain sentence when the fren needs one; null when nothing needs saying */
  note: string | null;
}

const isGift = (l: BasketRailLine) => (GIFT_ITEMS as readonly string[]).includes(l.itemId);

export function basketRails(lines: readonly BasketRailLine[], rails: { btc: boolean; card: boolean }): BasketRails {
  const satsOk = (l: BasketRailLine) => l.offerSats != null || l.sats != null;
  const cardOk = (l: BasketRailLine) => l.offerSats == null && l.fiat != null;
  const currencies = new Set(lines.filter(cardOk).map((l) => l.fiat!.currency));
  const btc = rails.btc && lines.every(satsOk);
  const card = rails.card && lines.every(cardOk) && currencies.size <= 1;

  if (lines.length === 0 || (!rails.btc && !rails.card)) return { btc, card, note: null };
  if (btc && card) return { btc, card, note: null };
  if (btc || card) {
    // one rail carries it while both are live: say which, so the $ / sats
    // toggle never points at the one that would refuse
    if (rails.btc && rails.card) {
      return { btc, card, note: card ? "This basket checks out by card." : "This basket checks out by bitcoin." };
    }
    return { btc, card, note: null };
  }

  const dollarOnly = lines.filter((l) => !satsOk(l));
  const satsOnly = lines.filter((l) => !cardOk(l));
  const dollarWord = dollarOnly.some(isGift) ? "A dollar gift" : "An item priced only in dollars";
  const satsWord = satsOnly.some((l) => l.offerSats != null) ? "a sats gift or offer" : "an item priced only in sats";
  let note: string;
  if (dollarOnly.length > 0 && satsOnly.length > 0 && rails.btc && rails.card) {
    note = `${dollarWord} pays by card and ${satsWord} pays by bitcoin, so they cannot share one checkout. Remove one, check out, then add it back.`;
  } else if (dollarOnly.length > 0 && !rails.card) {
    note = `${dollarWord} pays by card, and card checkout is closed right now. Remove it to check out the rest.`;
  } else if (satsOnly.length > 0 && !rails.btc) {
    /* his Mark 2 (block 976,021): no sats word while bitcoin is off, so this
       sentence names the rail, never the unit */
    const btcWord = satsOnly.some((l) => l.offerSats != null) ? "A bitcoin gift or offer" : "An item that pays only by bitcoin";
    note = `${btcWord} is in this basket, and bitcoin checkout is closed right now. Remove it to check out the rest.`;
  } else {
    note = "These items cannot share one checkout. Remove one, check out, then add it back.";
  }
  return { btc, card, note };
}
