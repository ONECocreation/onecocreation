import Link from "next/link";
import { cartridge } from "@/brand/cartridge";
import SubscribeForm from "@/components/SubscribeForm";

/* eslint-disable @next/next/no-img-element */

/**
 * PackagesGrid (TASK-232, 0018.06.25 a₿ · block 967,125) — the house's SECOND
 * data-bound Puck block, riding T-231's RetreatsList pattern. It paints the
 * three-tier memberships grid — the same cards Packages()
 * (src/components/sections.tsx) renders on the hand-built fallback, live
 * names/prices from TIERS, art from the cartridge, and the switch-driven
 * doors (rails ON: "See the package" walks to the tier's own selling page;
 * rails OFF: the pinned waitlist door).
 *
 * WHY NOT AN ASYNC SERVER COMPONENT (T-231's ruling, cited): this file rides
 * the CLIENT bundle — puck-config.tsx imports it, and StyleEditor hands that
 * config to the client-side PuckEditor — so `render` cannot be async, and
 * the tier registry (entitlement.ts imports fs) can't be imported here at
 * all. The server page resolves the shelf (TIERS × TIER_PAGES × the store
 * switch) and injects it at render time through applyPackagesToPuck below —
 * the applyLionToPuck/applyRetreatsToPuck precedent. The dynamic parts never
 * fossilise in a seed: the stored doc carries no `shelf` prop, the injection
 * is render-time only, never written back.
 *
 * In the designer there is no injected shelf — the block shows an honest
 * placeholder line, never fake cards.
 */

/** One tier, resolved server-side from TIERS × TIER_PAGES — plain JSON-safe props. */
export interface PackageTierProps {
  tier: "A" | "B" | "C";
  slug: string;
  name: string;
  priceUsd: number;
  priceSats: number;
}

/** The live shelf the page injects: the store switch + the resolved tiers. */
export interface PackagesShelf {
  /** tierRailsOn(switches) — rails ON sells, rails OFF keeps the waitlist */
  railsOn: boolean;
  tiers: PackageTierProps[];
}

/* The per-tier waitlist door's props — byte-for-byte sections.tsx's
   packageWaitlistProps (that module is server-bound, so the contract is
   restated here; exported for tests/packages-puck.test.ts, which pins the
   two equal). */
export function packageGridWaitlistProps(tier: "A" | "B" | "C", slug: string | undefined) {
  return {
    source: `waitlist-${tier.toLowerCase()}`,
    label: "I'm interested",
    note: "Add me to the pre-list — pre-order coming soon.",
    next: slug ? `/packages/${slug}` : undefined,
  };
}

/* The card definitions — the feats arrays are transcribed VERBATIM from
   Packages() (sections.tsx, the fallback, which this lane must not edit);
   tests/packages-puck.test.ts source-pins the lockstep. The art rides the
   cartridge exactly like the fallback's cards. */
const CARDS = [
  { tier: "A", accent: "a", img: cartridge.tierArt.A, feats: ["Live weekly meetup in Love's room — 4× a month", "Explore your Clair Senses through breath", "Meditations, toning, light language", "A held energetic field, in community"] },
  { tier: "B", accent: "b", img: cartridge.tierArt.B, feats: ["Everything in Weekly Intuitive", "Weekly recorded reading + affirmations", "Weekly live meetup in Love's room", "Movement, meditation & navigation"] },
  { tier: "C", accent: "c", img: cartridge.tierArt.C, feats: ["Everything in Weekly Intuitive & Observer", "Monthly 1–1½ hr focused meeting", "Quantum healing & reference tools", "All classes + full community"] },
] as const;

/**
 * The render-time injection: every top-level PackagesGrid entry in `data`
 * gains the live shelf as its `shelf` prop. Top-level only (the seed places
 * the block at the root, where the grid sits today) — an entry Love nested
 * into a slot keeps the designer placeholder. Pure; the input is never
 * mutated.
 */
export function applyPackagesToPuck<T extends { content?: unknown[] }>(data: T, shelf: PackagesShelf): T {
  const current = Array.isArray(data.content) ? data.content : [];
  let touched = false;
  const content = current.map((b) => {
    const blk = b as { type?: string; props?: Record<string, unknown> };
    if (blk.type !== "PackagesGrid" || !blk.props) return b;
    touched = true;
    return { ...blk, props: { ...blk.props, shelf } };
  });
  return touched ? ({ ...data, content } as T) : data;
}

export function createPackagesGrid() {
  return {
    label: "Packages grid (live tiers)",
    fields: {},
    render: ({ shelf }: { shelf?: PackagesShelf }) => {
      /* the designer side of the glass: no live shelf here — say so, never
         fake one (honest states; T-231's note idiom) */
      if (!shelf || !Array.isArray(shelf.tiers)) {
        return (
          <section>
            <div className="wrap center">
              <div className="note">
                ── live packages grid: the three tier cards — names, prices, art, the switch-driven doors — render here on the published page ──
              </div>
            </div>
          </section>
        );
      }
      /* the tier grid, markup-verbatim from Packages() — the fallback and
         the block stay identical cards by transcription (source-pinned) */
      return (
        <section id="packages" className="lions-gate">
          {/* the scoped styles ride verbatim from Packages() (TASK-229's
              focus ring on the picture-door, TASK-254's .push>a.btn reach) —
              the same "own-CSS via a scoped <style>" idiom, never house.css */}
          <style>{`#packages .thumb-link{display:block}#packages .thumb-link:focus-visible{outline:2px solid var(--rose,#c56e8b);outline-offset:3px;border-radius:16px}#packages .push>a.btn{width:100%;text-align:center}`}</style>
          <div className="wrap">
            <nav className="tier-pills" aria-label="Membership plans">
              {shelf.tiers.map((t) => (
                <Link key={t.slug} className="tier-pill" href={`/packages/${t.slug}`}>
                  {t.name}
                </Link>
              ))}
            </nav>
            <div className="grid grid-3">
              {CARDS.map((c) => {
                const t = shelf.tiers.find((x) => x.tier === c.tier);
                if (!t) return null; /* derive-or-dash: a tier missing from the shelf renders nothing, never a guessed card */
                return (
                  <div className="card shine-hover" key={c.tier}>
                    <Link href={`/packages/${t.slug}`} className="thumb-link" aria-label={t.name}>
                      <img className="thumb" src={c.img} alt={t.name} />
                    </Link>
                    <div className="body">
                      <Link href={`/packages/${t.slug}`} className={`tier-name-pill tier-pill--${c.accent}`} style={{ textDecoration: "none" }}>{t.name}</Link>
                      <div className="price">${t.priceUsd}<small>/mo</small></div>
                      <div className="sats">⚡ ≈ {t.priceSats.toLocaleString()} sats / month</div>
                      <ul className="feat">{c.feats.map((f) => <li key={f}>{f}</li>)}</ul>
                      <div className="push" style={{ width: "100%" }}>
                        {shelf.railsOn ? (
                          <Link href={`/packages/${t.slug}`} className="btn btn-sm">See the package</Link>
                        ) : (
                          <SubscribeForm {...packageGridWaitlistProps(c.tier, t.slug)} />
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      );
    },
  };
}
