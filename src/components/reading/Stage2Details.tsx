import { TIERS, type Tier } from "@/lib/entitlement";
import { TIER_PAGES } from "@/lib/tiers-content";

/**
 * STAGE 2 DETAILS (TASK-438, block 968,222; HOLD LIFTED block 968,269) —
 * the round-3 Stage 2 card body on /reading: the kicker, the heading, the
 * one line, and one row per way in. THE DERIVE-EVERY-WORD LAW: every name,
 * price and tagline rides the live sources (`TIERS` for the monthly names
 * and prices, `TIER_PAGES` for the taglines, the live store item for the
 * one-week pass's own name and price) — no amount and no weekday is ever
 * written out here, so a price change or a renamed tier shows up on its
 * own. Pure presentation (renderToStaticMarkup-pinned); ReadingStage owns
 * when this card is visible at all.
 */
export default function Stage2Details({ weekPass }: { weekPass: { name: string; price: string } | null }) {
  const tiers: Tier[] = ["A", "B", "C"];
  return (
    <>
      <p className="kicker">Stage 2 · after the reading</p>
      <h2 className="kit-h2">Join the discussion</h2>
      <p className="kit-body">Right after the reading, Love opens a live group video call. Come talk with her.</p>
      <ul className="kit-rows" aria-label="What opens Stage 2">
        {tiers.map((t) => (
          <li key={t}>
            <span>
              <b>{TIERS[t].name}</b>
              <em>{TIER_PAGES.find((p) => p.tier === t)!.tagline}</em>
            </span>
            <span className="kit-rows-end">{`$${TIERS[t].priceUsd} / month`}</span>
          </li>
        ))}
        {weekPass && (
          <li>
            <span>
              <b>{weekPass.name}</b>
              <em>{`One week of ${TIERS.A.name}, Stage 2 included.`}</em>
            </span>
            <span className="kit-rows-end">{`${weekPass.price} once`}</span>
          </li>
        )}
      </ul>
    </>
  );
}
