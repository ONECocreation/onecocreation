import Link from "next/link";
import { TIERS, type Tier } from "@/lib/entitlement";
import { TIER_PAGES } from "@/lib/tiers-content";

/**
 * STAGE 2 DETAILS (TASK-438, block 968,222; HOLD LIFTED block 968,269) —
 * the round-3 Stage 2 card body: the kicker, the heading, the one line,
 * and one row per way in. TASK-449 (block 968,364; AMENDMENT 1 block
 * 968,366): the card's only consumer is the Playground now, the tier
 * NAMES are links to their package pages (`TIER_PAGES`, derive-or-dash —
 * no page, the plain name, never a 404), and the rows alone are exported
 * as `Stage2Rows` for the gate cards (compose() draws the rows directly
 * under each gate's own heading — never a doubled header).
 *
 * THE DERIVE-EVERY-WORD LAW: every name, price and tagline rides the live
 * sources (`TIERS` for the monthly names and prices, `TIER_PAGES` for the
 * taglines, the live store item for the one-week pass's own name and
 * price) — no amount and no weekday is ever written out here, so a price
 * change or a renamed tier shows up on its own. Pure presentation
 * (renderToStaticMarkup-pinned).
 */

/** One row per way in — the shareable part (TASK-449). */
export function Stage2Rows({ weekPass }: { weekPass: { name: string; price: string } | null }) {
  const tiers: Tier[] = ["A", "B", "C"];
  const weekPage = TIER_PAGES.find((p) => p.tier === "A");
  return (
    <ul className="kit-rows" aria-label="What opens the Playground">
      {tiers.map((t) => {
        const page = TIER_PAGES.find((p) => p.tier === t);
        return (
          <li key={t}>
            <span>
              <b>{page ? <Link href={`/packages/${page.slug}`}>{TIERS[t].name}</Link> : TIERS[t].name}</b>
              <em>{page!.tagline}</em>
            </span>
            <span className="kit-rows-end">{`$${TIERS[t].priceUsd} / month`}</span>
          </li>
        );
      })}
      {weekPass && (
        <li>
          <span>
            <b>{weekPage ? <Link href={`/packages/${weekPage.slug}`}>{weekPass.name}</Link> : weekPass.name}</b>
            <em>{`One week of ${TIERS.A.name}, the Playground included.`}</em>
          </span>
          <span className="kit-rows-end">{`${weekPass.price} once`}</span>
        </li>
      )}
    </ul>
  );
}

export default function Stage2Details({ weekPass }: { weekPass: { name: string; price: string } | null }) {
  return (
    <>
      <p className="kicker">Stage 2 · after the reading</p>
      <h2 className="kit-h2">Join the discussion</h2>
      <p className="kit-body">Right after the reading, Love opens a live group video call. Come talk with her.</p>
      <Stage2Rows weekPass={weekPass} />
    </>
  );
}
