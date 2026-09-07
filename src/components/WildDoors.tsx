import type { ReactNode } from "react";
import ReadWithLove from "./ReadWithLove";

/**
 * THE SQUARES (TASK-120, 0018.06.16 a₿) — the grid keeps Love's first door
 * (the White Lions, her word 0018.05.15: "The White Lions are the heart of
 * the earth") and the two long-standing placeholder doors finally open:
 * Instagram (the fleet's @onecocreation, a real link out) and Read with
 * Love (the weekly live book reading — its own component, an email door,
 * the Zoom link riding the welcome letter server-side, never this markup).
 * Each card is still a habitat; hover and the being grows out of its cell.
 */

/** the Instagram glyph — inline SVG, no icon dep (the house has no emoji
 *  for this door); inherits the beast's ink, decorative only */
const INSTAGRAM_GLYPH = (
  <svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor"
    strokeWidth="1.7" strokeLinecap="round" aria-hidden="true" focusable="false">
    <rect x="2.6" y="2.6" width="18.8" height="18.8" rx="5.4" />
    <circle cx="12" cy="12" r="4.4" />
    <circle cx="17.35" cy="6.65" r="1.15" fill="currentColor" stroke="none" />
  </svg>
);

interface Door {
  key: string;
  beast: ReactNode;
  /** ink for a drawn glyph (the emoji beasts carry their own color) */
  beastInk?: string;
  sprouts: [string, string];
  ground: string;
  title: string;
  words: string;
  href: string;
  cta: string;
}

const DOORS: Door[] = [
  {
    key: "lions",
    beast: "🦁",
    sprouts: ["🌾", "🌾"],
    ground: "linear-gradient(180deg,#f9ecca 0%,#eccf8f 55%,#d9a95c 100%)",
    title: "The White Lions",
    words: "the heart of the Earth — the Global White Lion Protection Trust",
    // Love's word, 0018.05.15: the Capstone Community door supports the
    // lions directly
    href: "https://whitelions.org/capstone-community-2026/",
    cta: "Give to the lions ↗",
  },
  {
    key: "instagram",
    beast: INSTAGRAM_GLYPH,
    /* the card-body literal #3f3a4e (the S21 ruling, 4.60:1 on this card's
       ground in BOTH themes) — a drawn glyph obeys the same contrast law */
    beastInk: "#3f3a4e",
    sprouts: ["🌿", "🦜"],
    ground: "linear-gradient(180deg,#e2f0da 0%,#a8cd9c 55%,#6f9e6e 100%)",
    title: "Love on Instagram",
    words: "@onecocreation — stills and notes from the studio, most days",
    href: "https://instagram.com/onecocreation",
    cta: "Follow along ↗",
  },
];

export default function WildDoors() {
  return (
    <div className="wild-grid">
      {DOORS.map((d) => (
        <a key={d.key} className="wild-card" href={d.href} target="_blank" rel="noreferrer">
          <div className="habitat">
            <span className="ground"><i style={{ background: d.ground }} /></span>
            <span className="sprout sprout--l">{d.sprouts[0]}</span>
            <span className="beast" style={d.beastInk ? { color: d.beastInk } : undefined}>{d.beast}</span>
            <span className="sprout sprout--r">{d.sprouts[1]}</span>
          </div>
          <div className="wild-body">
            <h3>{d.title}</h3>
            <p>{d.words}</p>
            <span className="wild-cta">{d.cta}</span>
          </div>
        </a>
      ))}
      {/* the third square is an email door, not a link out — its own
          component carries the form (a card with a form is no anchor) */}
      <ReadWithLove />
    </div>
  );
}
