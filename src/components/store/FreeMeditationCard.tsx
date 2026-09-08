"use client";

import Link from "next/link";
import { useState } from "react";

/* eslint-disable @next/next/no-img-element */

/**
 * THE FREE MEDITATION AS A SHELF CARD (TASK-176, 0018.06.18 a₿ · block
 * 966098) — "Unzip Into the New You" rides the meditations shelf FIRST,
 * on the same ONE house flip contract (.flip-card, house.css) every
 * StoreItemCard turns on. A DEDICATED card, not a StoreItemCard variant:
 * the gift is no catalog item — there is no StoreItem, no price, no rails
 * judgment, no checkout — so faking one through storeCardModel would be a
 * phantom. The words are DERIVED from the lead-magnet's own: the title and
 * the blurb are the /meditation page's (sections.tsx FreeMeditation), the
 * picture is that page's own photograph; the price line reads the truth —
 * "free · a gift". Both faces' doors go to /meditation, the gift's own
 * page. Rendered only when the gift exists on the site (ShelfSection's
 * hasFreeMeditation — derive-or-dash); ENGLISH-PIN.
 */

/** the gift's derived face — the lead-magnet's own words, one place */
export const FREE_MEDITATION = {
  title: "Unzip Into the New You",
  /* the /meditation page's own promise, tightened to the card's one line */
  blurb: "A free guided meditation — plus a weekly note of inspiration, with love.",
  story: "Join the newsletter and this free guided meditation is yours — delivered straight to your inbox, no strings, only love.",
  img: "/images/dusk-lake-storm-light.webp",
  href: "/meditation",
  priceLabel: "free · a gift",
} as const;

export default function FreeMeditationCard({ delay = 0 }: { delay?: number }) {
  const [flipped, setFlipped] = useState(false);
  const flip = () => setFlipped((f) => !f);
  const m = FREE_MEDITATION;

  return (
    /* reveal rides its OWN wrapper (the session card's hard-won note, kept
       from StoreItemCard): the scroll-observer stamps `in` on the DOM
       directly, and any className React re-writes on state change wipes
       that stamp — the card vanished on every flip. */
    <div className="reveal" style={{ transitionDelay: `${delay}s` }}>
    <div className={`flip-card${flipped ? " is-flipped" : ""}`}>
      <div className="flip-inner">

        {/* ══ FRONT — the gift's picture, name, one-line sub, free · a gift ══ */}
        <div className="card flip-front" style={{ cursor: "pointer" }}
          onClick={flip} aria-hidden={flipped} inert={flipped}>
          <div role="button" tabIndex={flipped ? -1 : 0} aria-pressed={flipped}
            aria-label={`Turn the card — more about ${m.title}`}
            onClick={(e) => { e.stopPropagation(); flip(); }}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); flip(); } }}
            style={{ position: "relative", cursor: "pointer" }}>
            <img className="thumb" src={m.img}
              alt="Love's own photograph: a still lake under mountains at dusk, orange light breaking through storm cloud" />
          </div>
          <div className="body">
            <h3 style={{ fontWeight: 400, fontSize: "1.12rem", margin: 0 }}>{m.title}</h3>
            <p style={{ color: "var(--muted)", fontSize: ".88rem", margin: ".4em 0 .2em",
              display: "-webkit-box", WebkitLineClamp: 1, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
              {m.blurb}
            </p>
            <div style={{ margin: "10px 0 14px" }}>
              <span className="price" style={{ fontSize: "1.25rem" }}>{m.priceLabel}</span>
            </div>
            {/* doors: centered at the card's foot; the flip stops at them —
                the one door is the gift's own page, never a checkout */}
            <div className="push" onClick={(e) => e.stopPropagation()}
              style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center", width: "100%" }}>
              <Link className="btn btn-sm" href={m.href}>Full view →</Link>
              <button className="btn btn-ghost btn-sm" onClick={flip} aria-expanded={flipped}>more info</button>
            </div>
          </div>
        </div>

        {/* ══ BACK — the short story, free · a gift, the door to /meditation ══ */}
        <div className="card flip-back" style={{ cursor: "pointer" }}
          onClick={flip} aria-hidden={!flipped} inert={!flipped}>
          <div className="body">
            <h3 style={{ fontWeight: 400, fontSize: "1.12rem", margin: 0, textAlign: "center",
              textWrap: "balance" }}>
              {m.title}
            </h3>
            <p style={{ margin: "4px 0 0", textAlign: "center", fontSize: ".8rem", color: "var(--gold-deep)" }}>
              {m.priceLabel}
            </p>
            <div className="flip-scroll" style={{ margin: "10px 0 0", paddingRight: 4,
              borderTop: "1px solid var(--glass-edge)" }}>
              <p style={{ margin: "10px 0 0", fontSize: ".88rem", lineHeight: 1.7,
                color: "var(--ink-body)", whiteSpace: "pre-line" }}>
                {m.story}
              </p>
            </div>
            <div onClick={(e) => e.stopPropagation()}
              style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 10, flexWrap: "wrap", marginTop: 12 }}>
              <Link className="btn btn-sm" href={m.href}>Full view →</Link>
              <button className="btn-quiet" onClick={flip}>flip back</button>
            </div>
          </div>
        </div>

      </div>
    </div>
    </div>
  );
}
