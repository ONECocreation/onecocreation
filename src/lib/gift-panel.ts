import { JAR_ITEMS, GIFT_ITEMS } from "@/lib/jars";
import { getItem, isPurchasable, type StoreItem } from "@/lib/store";
import { getSiteConfig, siteSwitchesSync } from "@/lib/site-config";
import { liveAdapter, ensureSquareVault } from "@/lib/payments";

/**
 * TASK-646 (block 976,007 · Pay It Forward step 1) — THE GIFT PANEL'S GATE,
 * RAIL BY RAIL. Before this, the panel (on /pay-it-forward and in the store's
 * gift drawer) opened only through jarsOpen(): the jars switch AND the
 * bitcoin rail. With bitcoin off and the card rail live (the live site at
 * block 975,993) the page promised a gift and showed no button.
 *
 * Now:
 *  - the panel opens when the jars switch is on and at least one rail is
 *    live AND has something to give with;
 *  - the sats row shows only while bitcoin is live, for each jar whose shelf
 *    item is live (liveJarKeys()'s derive-or-dash, unchanged);
 *  - each dollar button shows only while the card rail is live and its own
 *    shelf item is live with a dollar price (the same derive-or-dash).
 *
 * jarsOpen() in payments.ts is left as it was (bitcoin only); it now means
 * "the sats row may show", and this module is the panel's one gate.
 */

export type GiftJarKey = keyof typeof JAR_ITEMS;

/** One dollar button: its item, and the price read from that item. */
export interface DollarGift {
  id: string;
  title: string;
  /** minor units (cents) */
  amount: number;
  currency: string;
}

export interface GiftPanel {
  /** any row at all: false = no panel, no box, no button */
  open: boolean;
  rails: { btc: boolean; card: boolean };
  /** the jars the sats row may give to (bitcoin live, item live) */
  satsJars: GiftJarKey[];
  /** the dollar buttons (card live, item live with a dollar price), by amount */
  dollarGifts: DollarGift[];
}

/** The decision, pure — pinned in tests/pif-card-gifts-646.test.ts. */
export function decideGiftPanel(input: {
  jarsSwitch: boolean;
  btc: boolean;
  card: boolean;
  /** jar keys whose shelf item is live */
  liveJars: GiftJarKey[];
  /** the three gift items as read from the shelf (null = not made yet) */
  giftItems: (StoreItem | null | undefined)[];
}): GiftPanel {
  const { jarsSwitch, btc, card } = input;
  const satsJars = jarsSwitch && btc ? input.liveJars : [];
  const dollarGifts: DollarGift[] = [];
  if (jarsSwitch && card) {
    for (const item of input.giftItems) {
      if (!item || !isPurchasable(item)) continue;
      const fiat = (item.sale ?? item.price).fiat;
      if (!fiat || !Number.isInteger(fiat.amount) || fiat.amount <= 0) continue;
      dollarGifts.push({ id: item.id, title: item.title, amount: fiat.amount, currency: fiat.currency });
    }
    // one currency on one row: the first gift's (in GIFT_ITEMS order) holds it
    const cur = dollarGifts[0]?.currency;
    dollarGifts.sort((a, b) => a.amount - b.amount);
    for (let i = dollarGifts.length - 1; i >= 0; i--) if (dollarGifts[i].currency !== cur) dollarGifts.splice(i, 1);
  }
  return {
    open: satsJars.length > 0 || dollarGifts.length > 0,
    rails: { btc, card },
    satsJars,
    dollarGifts,
  };
}

/** The panel for this request. WARM BEFORE YOU JUDGE (T-186's idiom): the
 *  switches and the square vault are read for THIS request first. */
export async function giftPanel(): Promise<GiftPanel> {
  await getSiteConfig();
  await ensureSquareVault();
  const jarsSwitch = siteSwitchesSync().features.jars;
  const btc = liveAdapter() !== null;
  const card = liveAdapter("square") !== null;
  const liveJars: GiftJarKey[] = [];
  if (jarsSwitch && btc) {
    for (const key of Object.keys(JAR_ITEMS) as GiftJarKey[]) {
      const item = await getItem(JAR_ITEMS[key]);
      if (item?.status === "live") liveJars.push(key);
    }
  }
  const giftItems = jarsSwitch && card ? await Promise.all(GIFT_ITEMS.map((id) => getItem(id))) : [];
  return decideGiftPanel({ jarsSwitch, btc, card, liveJars, giftItems });
}
