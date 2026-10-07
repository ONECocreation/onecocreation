/**
 * T-591: "Send me a copy". A one-soul letter (order receipt, offer letters,
 * join letters) has blanks the house fills at send time: {{lines}}, {{link}}
 * and the rest. A copy sent to yourself fills each blank with plain sample
 * words, so the copy reads like the real thing. Pure and client-safe.
 */
export const LETTER_SAMPLES: Record<string, string> = {
  who: "(sample) A kind soul, kind@example.com",
  lines: "(sample) Weekly Intuitive Membership, 11.11",
  doors: "(sample) The two answer buttons show here.",
  door: "(sample) The button to open what was bought shows here.",
  refund: "(sample) How the sats come back shows here.",
  room: "(sample) The reading room link shows here.",
  tier: "(sample) The membership tier shows here.",
  amount: "(sample) 11.11",
  writeback: "(sample) The note the buyer left shows here.",
  session: "(sample) Discovery Call",
  when: "(sample) Saturday at 1:11 PM Mountain",
  link: "(sample) The join link shows here.",
};

/** every {{blank}} filled with its sample words; a blank with no sample gets "(sample)" */
export function fillSamples(text: string): string {
  return text.replace(/\{\{\s*([a-z]+)\s*\}\}/gi, (_, name: string) => LETTER_SAMPLES[name.toLowerCase()] ?? "(sample)");
}
