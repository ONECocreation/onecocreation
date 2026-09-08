/**
 * Whole dollars when the amount is whole (Admiral, 0018.06.17 a₿: "flat dollars, no cents"),
 * cents only when they carry information. Minor units in, words out.
 *   dollars(5500, "USD") → "$55"     dollars(5550, "USD") → "$55.50"     dollars(5500, "EUR") → "55 EUR"
 */
export function dollars(amount: number, currency = "USD"): string {
  const whole = amount % 100 === 0;
  const n = whole ? String(amount / 100) : (amount / 100).toFixed(2);
  return currency === "USD" ? `$${n}` : `${n} ${currency}`;
}

/**
 * The editor's other half (TASK-145, 0018.06.17 a₿): dollars-and-cents text
 * → integer minor units, the exact shape price.fiat carries. "33.33" → 3333,
 * "11.1" → 1110, "55" → 5500; anything that isn't dollars-and-cents → null,
 * so validation can say so in words instead of silently rounding.
 */
export function cents(text: string): number | null {
  const t = text.trim();
  if (!/^\d+(\.\d{1,2})?$/.test(t)) return null;
  return Math.round(Number(t) * 100);
}

/* ── TASK-186 (0018.06.18 a₿) — ONE CURRENCY AT A TIME ────────────────────
 * Love's word via the Admiral: "the basket showed items in sats; show one or
 * the other; give the customer the choice at checkout; Love liked fiat first
 * with an 'or sats' second; could be a user preference." THE ONE DISPLAY LAW
 * every price surface reads through: the PREFERRED denomination first, the
 * other as "or 21,000 sats" / "or $11" — only when both exist AND both rails
 * are live (T-157's law rides: a dark rail shows no price in its currency,
 * never an invented one). A single-denomination price shows alone. NEVER "≈"
 * — no invented rate; both numbers are Love's own. Derive-or-dash: nothing
 * showable → "—". */

/** the visitor's chosen denomination — the `oc-money` cookie/localStorage
 *  value, and the member profile's additive field */
export type MoneyPrefer = "fiat" | "sats";

/** which payment rails can actually charge right now (T-157's rail truth) */
export type MoneyRails = { btc: boolean; card: boolean };

/** the shape a price carries — the store's Price, or anything with the same bones */
export interface PriceLike {
  sats?: number;
  fiat?: { amount: number; currency: string };
}

/** sats words: "11,111 sats" — the house's own grouping, en-US */
export function satsWords(sats: number): string {
  return `${sats.toLocaleString("en-US")} sats`;
}

/** the default denomination when the visitor has never chosen: fiat when the
 *  card rail is live, else sats (Love's liked default, via the Admiral) */
export function defaultPreferOf(rails: MoneyRails): MoneyPrefer {
  return rails.card ? "fiat" : "sats";
}

/**
 * THE ONE DISPLAY LAW. Preferred denomination first; the other rides as
 * "or …" — ONLY when both denominations exist and both rails are live.
 * Everything else collapses to the one honest line (or a dash).
 */
export function priceWords(
  price: PriceLike,
  rails: MoneyRails,
  prefer: MoneyPrefer,
): { primary: string; secondary: string | null } {
  const sats = rails.btc && price.sats != null ? satsWords(price.sats) : null;
  const fiat = rails.card && price.fiat ? dollars(price.fiat.amount, price.fiat.currency) : null;
  if (sats && fiat) {
    return prefer === "fiat"
      ? { primary: fiat, secondary: `or ${sats}` }
      : { primary: sats, secondary: `or ${fiat}` };
  }
  if (sats) return { primary: sats, secondary: null };
  if (fiat) return { primary: fiat, secondary: null };
  return { primary: "—", secondary: null };
}
