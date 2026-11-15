import type { Metadata } from "next";
import Link from "next/link";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import StackedHero from "@/components/StackedHero";
import TipJar from "@/components/TipJar";
import { getSiteConfig } from "@/lib/site-config";
import { giftPanel, type GiftPanel } from "@/lib/gift-panel";

/**
 * TASK-636 (block 974,079 · 0018.09.13 a₿) — THE PUBLIC PAY IT FORWARD PAGE,
 * built as the approved mockup drew it (claim ad88a338; the Admiral's A on
 * desk card 972826: "Build it, with my two fixes"). The trial-ending letter's
 * "Pay it forward" button points at /support today (Love's BUILD-NOTES item
 * 6); this page is its target once the draft is re-pointed (a data edit in
 * /a/letters, a seam this lane names but does not touch).
 *
 * The words are reused, not written: the GiftDrawer block on /store carries
 * Love's approved Gifts of Gratitude copy (the heading, the two-line
 * explainer, the gifts-received line, the bitcoin note). NUMBER ONE'S FIX 2
 * (part of the A): the two reused lines that carried a dash are reworded so
 * no dash remains — "— how gifts were received will show here." became "How
 * gifts were received will show here.", and the bitcoin note's "wallet —
 * nothing held" became "wallet. Nothing held"; every other word stays
 * verbatim. GiftDrawer.tsx itself keeps Love's words untouched.
 *
 * THE DOUBLE GATE STAYS AS DRAWN (the mockup's Gate-disclosure): the jar
 * panel mounts only behind store/page.tsx's own gate — jarsOpen() (the
 * features.jars switch AND a live bitcoin rail, warmed before judged, the
 * T-186 idiom) AND liveJarKeys()'s per-item truth. Derive-or-dash: a closed
 * rail or a hidden jar renders NO panel and no empty box — the hero and the
 * how-a-gift-travels cards stand either way.
 *
 * NUMBER ONE'S FIX 1 (the row law) lives in TipJar.tsx: the Give button is
 * the same height as the sats pills and the custom amount box beside it.
 *
 * The layout rules ride house.css's banner-marked `pif-` section — the
 * design-drift ratchet gives a new .tsx a styleBlocks allowance of 3, so
 * the mockup's inline styles became classes (T-639's pattern).
 *
 * TASK-646 (block 976,007 · Pay It Forward step 1, card 15) — THE GATE IS
 * RAIL BY RAIL NOW: giftPanel() (@/lib/gift-panel). The panel opens when
 * the jars switch is on and at least one rail is live with something to
 * give: the sats row while bitcoin is live and the jar item is live, the
 * dollar row while the card rail is live and a gift item is live. THE WORDS
 * FOLLOW WHAT THE PAGE CAN DO (travelWords below): a dollar gift by card
 * when only the card row shows, sats when only the sats row shows, both
 * when both show, and no promise of a button when neither does. The card
 * sentence and every changed line are PROPOSALS, listed for his and Love's
 * word; nothing here is settled copy.
 */

export const metadata: Metadata = {
  title: "Pay It Forward — One Cocreation",
  description: "Gifts of Gratitude — fund a session or membership for someone who can't right now.",
};

/* the shelf judges the rails per request — never a cached build-time answer */
export const dynamic = "force-dynamic";

/** The first card's words, from what the panel can really do (T-646). The
 *  sats-only line is T-636's, verbatim; the other three are proposals. */
export function travelWords(rows: { sats: boolean; dollars: boolean }): string {
  if (rows.sats && rows.dollars) return "a dollar gift by card, or any amount from 111 sats on-chain, through your basket";
  if (rows.sats) return "any amount from 111 sats, given on-chain through your basket";
  if (rows.dollars) return "a dollar gift, paid by card through your basket";
  return "giving opens again soon";
}

function travelSteps(rows: { sats: boolean; dollars: boolean }) {
  return [
    { icon: "🎁", title: "You place a gift", words: travelWords(rows) },
    { icon: "🫙", title: "Love holds the jar", words: "the Gifts of Gratitude jar keeps its own line in the books" },
    { icon: "🌱", title: "Someone claims it", words: "a session or a membership, for a person who needs the work and can't right now" },
  ];
}

export default async function PayItForwardPage() {
  /* WARM BEFORE YOU JUDGE (T-186's idiom, cart/page.tsx:25-35): giftPanel()
     warms the switches and the square vault itself; the await here keeps
     this request's own switches the judged ones for anything else read. */
  await getSiteConfig();
  const panel: GiftPanel = await giftPanel();
  const rows = { sats: panel.satsJars.includes("payforward"), dollars: panel.dollarGifts.length > 0 };
  const payforwardOpen = rows.sats || rows.dollars;

  return (
    <>
      <SiteHeader />
      <main>
        {/* ── the hero ── */}
        <section className="pif-hero">
          <div className="wrap center reveal">
            <StackedHero kicker="Gifts of Gratitude" lines={[{ t: "PAY IT" }, { t: "FORWARD", tone: "teal" }]} constellation />
            <p className="lead pif-lead">
              Some gifts are not for Love at all. They travel past her, to the next
              person who needs the work and cannot reach it yet.
            </p>
          </div>
        </section>

        {/* ── how a gift travels ── */}
        <section className="pif-travel">
          <div className="wrap">
            <div className="center reveal pif-travel-head">
              <p className="kicker">How a Gift Travels</p>
            </div>
            <div className="reveal pif-travel-grid">
              {travelSteps(rows).map((s) => (
                <div key={s.title} className="card">
                  <div className="body pif-step-body">
                    <div className="pif-step-icon">{s.icon}</div>
                    <h3 className="pif-step-title">{s.title}</h3>
                    <p className="pif-step-words">{s.words}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── the jar, in the store gift drawer's own warm panel, double-gated ── */}
        {payforwardOpen && (
          <section className="pif-jar">
            <div className="wrap reveal">
              <div className="pif-jar-panel">
                <h2 className="pif-jar-title">Gifts of Gratitude</h2>
                <p className="pif-jar-note">
                  A gift bought forward for someone who needs it, held until they can claim it.
                </p>
                <p className="pif-jar-sub">
                  How gifts were received will show here.
                </p>
                <TipJar only={rows.sats ? ["payforward"] : []} dollarGifts={panel.dollarGifts} />
                {rows.sats && (
                  <p className="pif-jar-bitcoin">
                    Bitcoin gifts travel on-chain straight to Love&apos;s own wallet. Nothing
                    held, nothing routed by anyone else. Dollars are always welcome too: bitcoin is an
                    option here, never a demand.
                  </p>
                )}
                {rows.dollars && (
                  <p className="pif-jar-bitcoin">
                    Card gifts go through Square to Love&apos;s own Square account.
                  </p>
                )}
              </div>
            </div>
          </section>
        )}

        {/* ── the quiet way back (rides the same gate; the drawer only
               exists while the jars are open) ── */}
        {payforwardOpen && (
          <section className="pif-back">
            <div className="wrap center reveal">
              <p className="pif-back-line">
                The jars also ride the store&apos;s gift drawer.{" "}
                <Link href="/store#gifts" className="pif-back-link">open it in the store</Link>
              </p>
            </div>
          </section>
        )}
      </main>
      <SiteFooter />
    </>
  );
}
