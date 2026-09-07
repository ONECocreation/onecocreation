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
