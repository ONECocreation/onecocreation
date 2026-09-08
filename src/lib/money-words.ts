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
