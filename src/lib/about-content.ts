/**
 * TASK-154 (0018.06.17 a₿ · block 966,019) — Love's About pass: the copy
 * contract, single-sourced so the hand-built page (src/app/about/page.tsx),
 * the Puck about seed (src/lib/puck-seeds.ts), and the pins
 * (tests/about-copy.test.ts) can never drift apart.
 *
 * item 6 — the Bridge line wears the pull-quote's face (var(--serif), the
 *   same Barlow "Home IS where the Heart IS." speaks) and drops the period.
 * item 7 — the join-us heading reads "Breathe with us"; both doors pour the
 *   house pink (.btn-rose — the pair T-121 proved ≥4.5:1 in both themes).
 * item 8 — the single video becomes a PLAYLIST: several of Love's own
 *   videos, real ids from her channel @Onecocreation (titles confirmed over
 *   YouTube oEmbed, 0018.06.17). An empty list renders the honest note
 *   below instead of a broken frame (derive-or-dash).
 */

export const ABOUT_JOIN_LINES = { ink: "BREATHE", teal: "WITH US" };
export const ABOUT_PINK_DOOR = "btn btn-rose";

export const ABOUT_BRIDGE_LINE =
  "“To those drawn by the energy of the soul — Welcome Home to you. You Are the Bridge, Where Heaven and Earth Meet”";

export const ABOUT_VIDEOS: { id: string; title: string; ratio: string }[] = [
  // her most-loved short (top of the channel by views, 0018.05.15) — breath, exactly the work
  { id: "2LrWVQDnLd0", title: "What Breath in discomfort?", ratio: "9/16" },
  { id: "Gt24u_BAybA", title: "CANNABIS | A Message from The Lemurians", ratio: "16/9" },
  { id: "OwUPYSwh0Wo", title: "#1 Sekmet, Balance, Putting Off, Lyrans, Dragons..OH MY!", ratio: "16/9" },
  { id: "vwB3B0VGXoU", title: "The Rockys 🏔️ | No Judgement", ratio: "16/9" },
];
export const ABOUT_VIDEOS_EMPTY =
  "No videos here yet — the newest land on Love's channel first.";
