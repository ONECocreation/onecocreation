import { TIERS } from "./entitlement";

/**
 * The membership tiers as PAGES — one slug, one door, one story each
 * (the Admiral's pill-box flow: memberships → lion page → pills → details;
 * layout modeled on Love's live tier pages — two columns, stacked YES
 * pills, the affirmation add-ons strip below).
 *
 * Weekly Intuitive copy transcribed from Love's LIVE page (her words,
 * "Clair" spelling per the Admiral). Observer/Evening Star paragraphs are
 * draft shape awaiting her voice (meeting checklist). Prices/sats stay
 * single-sourced in entitlement.ts.
 */
export interface TierPage {
  slug: string;
  tier: keyof typeof TIERS;
  img: string;
  heading: string;
  tagline: string;
  /** e.g. the $11 single-week door on tier A — itemId is its store item,
   *  so the pill drops it in the basket instead of dead-ending at /support */
  oneTime?: { label: string; usd: number; itemId?: string };
  cadence: string;
  paragraphs: string[];
  /** what rides in from the lower packages — named, never lettered, with
   *  the value said out loud (the Admiral's call 0018.05.15) */
  included?: { title: string; items: string[] }[];
  caption?: string;
  feats: string[];
  /** the cross-sell pill at the bottom of the stack */
  upgradeSlug?: string;
}

export const TIER_PAGES: TierPage[] = [
  {
    slug: "weekly-intuitive",
    tier: "A",
    img: "/images/weekly-intuitive.webp",
    heading: "Weekly Live Zooms",
    tagline: "The weekly rhythm — live, held, together.",
    oneTime: { label: "one week — one-time purchase", usd: 11, itemId: "weekly-one-week" },
    cadence: "Meets 4 times a month",
    paragraphs: [
      "Live on Zoom, once-a-week sessions. We will explore our Clair Senses through Breath — explore tools you already have, to dive deeper into WHO YOU ARE.",
      "We will be tuning into recordings of material you already have access to. We will participate in videos of meditations, toning, light language, movement and quantum information.",
      "I, Love, will tune into the space, prepare, and hold the energetic field, contributing in the energetic background during these sessions. We explore questions that come up, share experiences and sometimes stories pertaining to the topic that day, supporting one another.",
      "When we come together as a group the energies are amplified. The ability to hear what calls to us is strengthened; the connection that is not always chosen is heard; the thoughts that may not be supportive are silenced. This is a place to say YES to you.",
    ],
    caption: "There are New Energies here to support us all. A New Human is coming online. It's time!",
    feats: [
      "Live weekly Zoom — 4× a month",
      "Explore your Clair Senses through breath",
      "Meditations, toning, light language",
      "A held energetic field, in community",
    ],
    upgradeSlug: "observer",
  },
  {
    slug: "observer",
    tier: "B",
    img: "/images/observer.webp",
    heading: "The Weekly Reading",
    tagline: "Everything weekly — plus the reading that finds you.",
    oneTime: { label: "one week — one-time purchase", usd: 22.22, itemId: "observer-one-week" },
    cadence: "Weekly recording + weekly live meetup",
    paragraphs: [
      "For the one who watches and wants more to work with: a recorded reading and affirmations arrive every week, and a second live meetup deepens the practice — movement, meditation, navigation.",
      "Everything in Weekly Intuitive is included; Observer adds the material that keeps working on you between sessions.",
    ],
    feats: [
      "Weekly recorded reading + affirmations",
      "Weekly live Zoom meetup group",
      "Movement, meditation & navigation",
    ],
    included: [
      {
        title: "Everything in Weekly Intuitive — included ($33/mo value)",
        items: [
          "Live weekly Zoom — 4× a month",
          "Explore your Clair Senses through breath",
          "Meditations, toning, light language",
          "A held energetic field, in community",
        ],
      },
    ],
    upgradeSlug: "evening-star",
  },
  {
    slug: "evening-star",
    tier: "C",
    img: "/images/evening-star.webp",
    heading: "Focused Time with Love",
    tagline: "The closest orbit — focused time with Love.",
    cadence: "Monthly 1–1½ hr focused meeting",
    paragraphs: [
      "The Evening Star is the closest orbit: monthly focused time with Love, quantum healing and reference tools, and every class and room the community holds.",
      "Everything in both other packages is included. All of it, held for you.",
    ],
    feats: [
      "Monthly 1–1½ hr focused meeting",
      "Quantum healing & reference tools",
      "All classes + full community",
    ],
    included: [
      {
        title: "Everything in Weekly Intuitive — included ($33/mo value)",
        items: [
          "Live weekly Zoom — 4× a month",
          "Explore your Clair Senses through breath",
          "Meditations, toning, light language",
          "A held energetic field, in community",
        ],
      },
      {
        title: "Everything in Observer — included ($55.55/mo value)",
        items: [
          "Weekly recorded reading + affirmations",
          "Weekly live Zoom meetup group",
          "Movement, meditation & navigation",
        ],
      },
    ],
  },
];

/** The add-ons strip below every tier page — Love's single offerings
 *  ("Or Purchase Single Affirmation Offerings", from her live layout). */
export const TIER_ADDONS = [
  { itemId: "thank-you-wakeup", name: "Thank You", sub: "Wake Up Affirmations · 1 hr 11 min", img: "/images/affirmation-thankyou.webp" },
  { itemId: "large-sums", name: "Large Sums of Money", sub: "Sleep Affirmation · 16 min · no music", img: "/images/affirmation-largesums.webp" },
  { itemId: "iam-worthy", name: "IAM Worthy", sub: "Sleep Affirmation · 3 hr 3 min", img: "/images/affirmation-iamenough.webp" },
];

export function tierPageBySlug(slug: string): TierPage | undefined {
  return TIER_PAGES.find((t) => t.slug === slug);
}
