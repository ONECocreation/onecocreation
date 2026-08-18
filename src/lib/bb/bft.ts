/**
 * Bitcoin Federated Time for /bb — a TypeScript port of the canonical clock
 * (`knowledge-engine/services/common/bft.py` + `docs/BFT.md`).
 *
 * 13 months × 28 days × 144 blocks/day; genesis = a₿ 0. Dates render ₿-marked
 * with the marker AFTER the date ("0016.05.23 a₿") so they read as bitcoin
 * dates — ONE order for both epochs (the day-first b₿ inversion is dead,
 * Pac's ruling). The moon is block-timed — one lunation per 28-day month —
 * and each year carries a 12-animal sign (AB 0 / 2009 = Ox; new year M01·D01
 * is a new moon). Signs are lore, not finance (same house rule as the
 * Observatory's zodiac).
 */

export const BLOCKS_PER_DAY = 144;
export const BLOCKS_PER_MONTH = 4032; // 28 days · 2 difficulty epochs
export const BLOCKS_PER_YEAR = 52416; // 13 months · 26 difficulty epochs
export const GENESIS_MS = Date.UTC(2009, 0, 3); // 2009-01-03, block 0

export interface BftDate {
  year: number;
  month: number; // 1..13
  day: number; // 1..28
  height: number;
}

export function bft(height: number): BftDate {
  const rem = ((height % BLOCKS_PER_YEAR) + BLOCKS_PER_YEAR) % BLOCKS_PER_YEAR;
  return {
    year: Math.floor(height / BLOCKS_PER_YEAR),
    month: Math.floor(rem / BLOCKS_PER_MONTH) + 1,
    day: Math.floor((rem % BLOCKS_PER_MONTH) / BLOCKS_PER_DAY) + 1,
    height,
  };
}

const pad = (n: number, w: number) => String(n).padStart(w, "0");

/** ₿-marked After-Bitcoin date, marker AFTER the date (Pac, ~0018.04.14 a₿):
    "0016.05.23 a₿". */
export function bftDate(height: number): string {
  const b = bft(height);
  return `${pad(b.year, 4)}.${pad(b.month, 2)}.${pad(b.day, 2)} a₿`;
}

/* The display standard (Pac, ~0018.04.14 a₿; marker law reaffirmed
   ~0018.05.24 a₿ — the in-repo "marker is assumed" relaxation is
   SUPERSEDED): date = yyyy.mm.dd · time = hh:mm (the 144-block day mapped
   onto a 24h clock — 6 blocks an hour, ten "minutes" a block) · date+time =
   "yyyy.mm.dd hh:mm a₿" — the a₿ marker ALWAYS rides the stamp, after the
   date, one order for both epochs. */

/** Plain BFT date, no marker (compose your own — the marker law wants
    `bftDate` wherever the stamp stands alone): "0018.04.15". */
export function bftDatePlain(height: number): string {
  const b = bft(height);
  return `${pad(b.year, 4)}.${pad(b.month, 2)}.${pad(b.day, 2)}`;
}

/** BFT time of day, 24h: block-in-day → "hh:mm" (steps of 10). */
export function bftTime(height: number): string {
  const bid = ((height % BLOCKS_PER_DAY) + BLOCKS_PER_DAY) % BLOCKS_PER_DAY;
  return `${pad(Math.floor(bid / 6), 2)}:${pad((bid % 6) * 10, 2)}`;
}

/** Full stamp, marker after: "yyyy.mm.dd hh:mm a₿" — the standard. */
export function bftDateTime(height: number): string {
  return `${bftDatePlain(height)} ${bftTime(height)} a₿`;
}

/** Pre-genesis wall-clock (negative-time / ghost side), marker after, the
    SAME big-to-small order as a₿ (the day-first b₿ inversion is dead,
    Pac's ruling): "yyyy.mm.dd[.ss] b₿". */
export function beforeBitcoin(year: number, month: number, day: number, second?: number): string {
  const base = `${pad(year, 4)}.${pad(month, 2)}.${pad(day, 2)}`;
  return `${second == null ? base : `${base}.${pad(second, 2)}`} b₿`;
}

/* ── THE CANONICAL BRIDGE (ported 0018.05.24 a₿, coordinator ruling) ──
   Verbatim-faithful ports from the canonical public package —
   github.com/PacsArcade/bitcoin-federated-time v0.3.0 (MIT), `bft/__init__.py`.
   The math is integer-identical; only the dress is TypeScript. Two genesis
   instants live in this file ON PURPOSE: GENESIS_MS (midnight, above) is the
   house calendar's own boundary — Converters/HalfWheel/BdayChecker already
   ride it; GENESIS_UNIX_S (below) is the chain's real birth certificate,
   the canonical bridge's anchor. They differ by ~110 blocks and both are
   honest about which they are. */

/** Canonical GENESIS_UNIX (`__init__.py:42`): block 0's own timestamp,
    2009-01-03 18:15:05 UTC. The bridge anchors HERE. */
export const GENESIS_UNIX_S = 1_231_006_505;

const DAYS_PER_MONTH = 28;   // canonical (`__init__.py:49`)
const DAYS_PER_YEAR = 364;   // 13 × 28 — drifts from the sun on purpose
const MONTHS_PER_YEAR = 13;  // canonical (`__init__.py:50`)
const DIFFICULTY_EPOCH_BLOCKS = 2016; // canonical (`__init__.py:35`)
const SECONDS_PER_BLOCK = 600;        // the 10-minute target (`__init__.py:43`)

export interface BftKnown {
  known: true;
  height: number;
  epoch: "AB" | "BB";
  year: number;
  month: number;        // 1..13
  day: number;          // 1..28
  monthIndex: number;   // 0..12
  label: string;
  dayOfYear?: number;          // AB only (1..364)
  weekOfMonth?: number;        // AB only
  beat?: number;               // AB only — block within the day
  dayProgress?: number;        // AB only, %
  diffEpoch?: number;          // AB only
  blocksBeforeGenesis?: number; // BB only
  note?: string;               // BB only
}
export type BftReading = BftKnown | { known: false; height: null };

/** Canonical `from_height` (`__init__.py:86`) — decompose a block height
    into a BFT date, BOTH epochs: heights ≥ 0 are After Bitcoin; a negative
    height's MAGNITUDE decomposes the same way, counting back from genesis
    (Before Bitcoin). All integer block math — two nodes at the same height
    agree on the date. */
export function fromHeight(height: number): BftKnown;
export function fromHeight(height: number | null): BftReading;
export function fromHeight(height: number | null): BftReading {
  if (height == null) return { known: false, height: null };
  const h = Math.trunc(height);
  if (h < 0) {                             // inverse: before the genesis block
    const before = -h;                     // magnitude, decomposed counting back
    const doe = Math.floor(before / BLOCKS_PER_DAY);
    const by = Math.floor(doe / DAYS_PER_YEAR);
    const doy = doe % DAYS_PER_YEAR;
    const mi = Math.floor(doy / DAYS_PER_MONTH);
    const dom = doy % DAYS_PER_MONTH;
    return { known: true, height: h, epoch: "BB",
      blocksBeforeGenesis: before,
      year: by, month: mi + 1, day: dom + 1, monthIndex: mi,
      label: `BB ${by} · M${pad(mi + 1, 2)} · D${pad(dom + 1, 2)}`,
      note: "Before Bitcoin: the clock runs in reverse here — time the chain cannot vouch for" };
  }
  const dayOfEpoch = Math.floor(h / BLOCKS_PER_DAY);
  const blockOfDay = h % BLOCKS_PER_DAY;
  const yearIndex = Math.floor(dayOfEpoch / DAYS_PER_YEAR);
  const dayOfYear = dayOfEpoch % DAYS_PER_YEAR;
  const monthIndex = Math.floor(dayOfYear / DAYS_PER_MONTH);
  const dayOfMonth = dayOfYear % DAYS_PER_MONTH;
  return { known: true, height: h, epoch: "AB",
    year: yearIndex, month: monthIndex + 1, day: dayOfMonth + 1,
    monthIndex, dayOfYear: dayOfYear + 1,
    weekOfMonth: Math.floor(dayOfMonth / 7) + 1,
    beat: blockOfDay,
    dayProgress: Math.round((1000 * blockOfDay) / BLOCKS_PER_DAY) / 10,
    diffEpoch: Math.floor(h / DIFFICULTY_EPOCH_BLOCKS),
    label: `AB ${yearIndex} · M${pad(monthIndex + 1, 2)} · D${pad(dayOfMonth + 1, 2)}` };
}

/** Canonical `format_date` (`__init__.py:126`) — the calendar date rendered.
    Default style "date" is the house standard: ₿-marked, marker AFTER, ONE
    order for both epochs — "0018.04.20 a₿" / "0003.06.09 b₿" (the day-first
    b₿ inversion is dead, Pac's ruling). "short" → "AB 18 · M04 · D20";
    "long" adds the block + difficulty epoch. `monthNames` (13) supplies
    blessed month lore in short/long when set, else M01..M13. */
export function formatDate(
  height: number | null,
  monthNames?: readonly string[],
  style: "date" | "short" | "long" = "date",
): string {
  const d = fromHeight(height);
  if (!d.known) return "BFT —";
  if (style === "date") {
    // year zero-padded to 4; the display year IS bitcoin's age — genesis
    // opens 0000. ONE order for both epochs (Pac's law, no inversion).
    return `${pad(d.year, 4)}.${pad(d.month, 2)}.${pad(d.day, 2)} ${d.epoch === "BB" ? "b₿" : "a₿"}`;
  }
  const mi = d.monthIndex;
  const month = monthNames && monthNames.length >= MONTHS_PER_YEAR && monthNames[mi]
    ? String(monthNames[mi])
    : `M${pad(d.month, 2)}`;
  if (d.epoch === "BB") return `BB ${d.year} · ${month} · D${pad(d.day, 2)}`;
  const short = `${d.epoch} ${d.year} · ${month} · D${pad(d.day, 2)}`;
  return style === "long"
    ? `${short}  (block ${d.height.toLocaleString("en-US")} · diff-epoch ${d.diffEpoch})`
    : short;
}

/** Canonical `height_at` (`__init__.py:169`) — estimate the block height
    for a Gregorian UTC date/time: (seconds since genesis) ÷ 600. Dates
    before the genesis block return a NEGATIVE height — the BB inverse.
    ESTIMATE, deliberately: real blocks don't arrive exactly every 10
    minutes, so the arithmetic is exact and the wall-clock mapping is
    modeled — a real tip height is the truth when you have it. (Python's
    calendar.timegm takes any year; Date.UTC misreads 0–99 as 19xx, so the
    year is pinned with setUTCFullYear. Python's round() is half-to-even,
    JS's half-up — a 1-block edge at exact :05 marks, immaterial here.) */
export function heightAt(
  year: number, month: number, day: number,
  hour = 0, minute = 0, second = 0,
): number {
  const dt = new Date(Date.UTC(year, month - 1, day, hour, minute, second));
  dt.setUTCFullYear(year);
  return Math.round((dt.getTime() / 1000 - GENESIS_UNIX_S) / SECONDS_PER_BLOCK);
}

/** Canonical `from_gregorian` (`__init__.py:186`) — a Gregorian UTC moment
    rendered in BFT: the estimated height plus the readings of it. The
    canonical package returns its full clock(); this port carries the
    readings this house owns (the calendar + the hh:mm beat — no clock
    before genesis). `estimate` is a standing reminder the height is
    modeled, never looked up. */
export function fromGregorian(
  year: number, month: number, day: number,
  hour = 0, minute = 0, second = 0,
): { height: number; calendar: BftReading; hhmm: string | null; estimate: true; beforeBitcoin: boolean } {
  const h = heightAt(year, month, day, hour, minute, second);
  return {
    height: h,
    calendar: fromHeight(h),
    hhmm: h >= 0 ? bftTime(h) : null,
    estimate: true,
    beforeBitcoin: h < 0,
  };
}

export const MOON_PHASES: ReadonlyArray<readonly [string, string]> = [
  ["🌑", "New"], ["🌒", "Waxing Crescent"], ["🌓", "First Quarter"], ["🌔", "Waxing Gibbous"],
  ["🌕", "Full"], ["🌖", "Waning Gibbous"], ["🌗", "Last Quarter"], ["🌘", "Waning Crescent"],
];

/** One lunation per BFT month → phase is a pure function of the day-of-month. */
/** THE SKY'S OWN MOON (universal-calendar review, 0018.05.18): phase from
 *  the real synodic month (29.530589 days) anchored to a known new moon —
 *  not the calendar day. The 28-day month is our RHYTHM; the moon keeps her
 *  own, and the clock honors the sky. Accurate within hours for decades. */
const SYNODIC_DAYS = 29.530588853;
/** A well-known new moon: 2000-01-06 18:14 UTC. */
const NEW_MOON_EPOCH_MS = Date.UTC(2000, 0, 6, 18, 14);

/** `atMs` — the wall instant this height belongs to. Callers who KNOW it
 *  (a live tip = Date.now()) must pass it: the flat 10-min genesis average
 *  runs months ahead of reality after 17 years of fast blocks. Without it,
 *  the estimate wears that honest skew. */
export function moonPhase(
  height: number,
  atMs: number = GENESIS_MS + height * 600_000,
): { emoji: string; name: string; index: number } {
  const days = (atMs - NEW_MOON_EPOCH_MS) / 86_400_000;
  const age = ((days % SYNODIC_DAYS) + SYNODIC_DAYS) % SYNODIC_DAYS;
  const index = Math.round((age / SYNODIC_DAYS) * 8) % 8;
  const [emoji, name] = MOON_PHASES[index];
  return { emoji, name, index };
}

// 13 animals — the traditional 12 plus the CAT as the 13th (Pac, 2026-07-10). The cat is the
// famous "left-out" sign of the Great Race (the Rat tricked it) and a real sign in the Vietnamese
// zodiac; BB seats it as the 13th to match the 13-month year (and Ophiuchus, the 13th sign). Here
// it's the "Astronomical Cat" — the flying cat of Adult Swim's Perfect Hair Forever.
const YEAR_ANIMALS: ReadonlyArray<readonly [string, string]> = [
  ["🐀", "Rat"], ["🐂", "Ox"], ["🐅", "Tiger"], ["🐇", "Rabbit"], ["🐉", "Dragon"], ["🐍", "Snake"],
  ["🐎", "Horse"], ["🐐", "Goat"], ["🐒", "Monkey"], ["🐓", "Rooster"], ["🐕", "Dog"], ["🐖", "Pig"],
  ["🐈", "Astronomical Cat"],
];

/** 13-animal year sign. AB 0 (2009) = Ox; the new year falls on a new moon (M01·D01). */
export function yearAnimal(height: number): { emoji: string; name: string } {
  const [emoji, name] = YEAR_ANIMALS[(bft(height).year + 1) % 13];
  return { emoji, name };
}

/** 13 astronomical signs incl. Ophiuchus (order per calendar_lore.py). */
const SIGNS: ReadonlyArray<readonly [string, string]> = [
  ["Capricorn", "♑"], ["Aquarius", "♒"], ["Pisces", "♓"], ["Aries", "♈"], ["Taurus", "♉"], ["Gemini", "♊"],
  ["Cancer", "♋"], ["Leo", "♌"], ["Virgo", "♍"], ["Libra", "♎"], ["Scorpio", "♏"], ["Ophiuchus", "⛎"], ["Sagittarius", "♐"],
];

const ELEMENTS = ["Ember", "Sprout", "Tidal", "Stone", "Static", "Gale"];
const TEMPERS = ["Cheery", "Grumpy", "Curious", "Sleepy", "Feral", "Zen"];
const RARITIES = ["Common", "Uncommon", "Rare", "Epic", "Legendary"];

export interface BuddyTraits {
  element: string;
  temper: string;
  rarity: string;
  zodiac: string;
  zodiacGlyph: string;
}

/** Deterministic on-chain-style biology from the birth block + name (design notes Part 3). */
export function deriveTraits(bornBlock: number, name: string): BuddyTraits {
  let h = 2166136261 >>> 0;
  for (const c of String(bornBlock) + name) h = Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0;
  const [zodiac, zodiacGlyph] = SIGNS[(bft(bornBlock).month - 1) % 13];
  return {
    element: ELEMENTS[h % ELEMENTS.length],
    temper: TEMPERS[(h >>> 3) % TEMPERS.length],
    rarity: RARITIES[(h >>> 6) % RARITIES.length],
    zodiac,
    zodiacGlyph,
  };
}

/**
 * Best-effort current block height, "tied to bitcoin". Sovereignty fix (the
 * admiral, 2026-07-11): read the tip from the fleet's OWN door — the same-origin
 * /api/chain/tip proxy, which reads the admiral's configured mempool node (its
 * own instance when pointed, the public mempool.space only as a fallback). If
 * the proxy is unreachable (e.g. server-side render, offline), fall back to a
 * direct mempool.space read, then to a genesis-anchored estimate (~10 min/block).
 * Cached briefly so a page doesn't hammer anything.
 */
let _tipCache: { height: number; at: number; tipTimestamp: number | null } | null = null;

/** Heights the chain passed on well-recorded days. The network has averaged
 * FASTER than 600s/block for most of its life, so a pure genesis ÷ 10min
 * guess drifts ~250 days behind by 0018 — these anchors keep a date→height
 * estimate honest in every era. The table rides the canonical package's
 * (github.com/PacsArcade/bitcoin-federated-time): genesis at the REAL birth
 * instant (GENESIS_UNIX, not the calendar's midnight), pizza day exact
 * (`bft/holidays.py` — chain-verified, 0018.04.15 a₿), the four halvings,
 * and the pupil's verified recent anchor (studies/clock-study-pupil.html —
 * RECENT_ANCHOR: block 957,877 at unix 1783959226) so the offline model
 * lands within a whisker of now instead of a year low.
 * Exported for the orrery's dial walk — ONE table, every clock. */
export const CHAIN_ANCHORS: ReadonlyArray<readonly [number, number]> = [
  [GENESIS_UNIX_S * 1000, 0],
  [Date.UTC(2010, 4, 22), 57_043],        // pizza day
  [Date.UTC(2012, 10, 28), 210_000],      // halving I
  [Date.UTC(2016, 6, 9), 420_000],        // halving II
  [Date.UTC(2020, 4, 11), 630_000],       // halving III
  [Date.UTC(2024, 3, 20), 840_000],       // halving IV
  [Date.UTC(2026, 6, 13, 16, 13, 46), 957_877], // the pupil's RECENT_ANCHOR
];

/**
 * Date → ~height, anchored. Interpolates between chain anchors for historical
 * dates; when the live tip is known it becomes the final anchor, so "today"
 * lands on today's height and futures extend from the real tip at 600s/block.
 */
export function estimateHeightAt(
  utcMs: number,
  tip?: number | null,
  tipAtMs = Date.now(),
): number {
  const anchors: Array<readonly [number, number]> = [...CHAIN_ANCHORS];
  const lastFixed = anchors[anchors.length - 1];
  if (tip != null && tip > lastFixed[1] && tipAtMs > lastFixed[0]) {
    anchors.push([tipAtMs, tip]);
  }
  if (utcMs <= GENESIS_MS) {
    return Math.floor((utcMs - GENESIS_MS) / 600_000);
  }
  const last = anchors[anchors.length - 1];
  if (utcMs >= last[0]) {
    return Math.max(0, Math.round(last[1] + (utcMs - last[0]) / 600_000));
  }
  for (let i = 1; i < anchors.length; i++) {
    if (utcMs <= anchors[i][0]) {
      const [t0, h0] = anchors[i - 1];
      const [t1, h1] = anchors[i];
      return Math.max(0, Math.round(h0 + ((utcMs - t0) / (t1 - t0)) * (h1 - h0)));
    }
  }
  return Math.max(0, Math.floor((utcMs - GENESIS_MS) / 600_000));
}

export function estimateHeight(nowMs = Date.now()): number {
  return estimateHeightAt(nowMs);
}

/** The anchored model's own mine-instant (ms) for an ESTIMATED "now" height —
 *  the moment `estimateHeight` first answers `height`. Offline clock faces
 *  seed their block age here so the ~ seconds tick continuously with the
 *  model instead of restarting at page load (the honest-clock law: an age
 *  must never restart at :00 on reload). Estimate only — wear the `~`. */
export function estimatedBlockAtMs(height: number): number {
  const [t0, h0] = CHAIN_ANCHORS[CHAIN_ANCHORS.length - 1];
  return t0 + (height - 0.5 - h0) * 600_000;
}

/** `estimated: true` = the network was unreachable and the height is a
    genesis-anchored ~10-min/block guess — display it with the honest `~`. */
export interface BlockInfo {
  height: number;
  estimated: boolean;
  /** unix seconds the tip block was mined — the CHAIN's own anchor for the
      block age, so every clock agrees on Pac's lap and the seconds no
      matter when the page loaded (`?full=1` reading). Null when only a
      bare height was known. */
  tipTimestamp: number | null;
}

export async function currentBlockInfo(opts?: { fresh?: boolean }): Promise<BlockInfo> {
  const now = Date.now();
  if (!opts?.fresh && _tipCache && now - _tipCache.at < 60_000)
    return { height: _tipCache.height, estimated: false, tipTimestamp: _tipCache.tipTimestamp };

  // the fleet's own door first — /api/chain/tip reads the configured node
  // (?full=1 adds the tip's own timestamp: the strip clock's seconds anchor)
  // The 10 s deadline on every knock: a request left hanging across a laptop
  // sleep or a network change must never out-live the reading that asked.
  try {
    const res = await fetch("/api/chain/tip?full=1", {
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
    if (res.ok) {
      const d = await res.json();
      if (d?.ok && Number.isFinite(d.height) && d.height > 0) {
        const ts =
          typeof d.tipTimestamp === "number" && Number.isFinite(d.tipTimestamp) ? d.tipTimestamp : null;
        _tipCache = { height: d.height, at: now, tipTimestamp: ts };
        return { height: d.height, estimated: false, tipTimestamp: ts };
      }
    }
  } catch {
    /* proxy unreachable (SSR / offline) → try the direct read below */
  }

  // fallback: direct mempool.space read (relative fetch can't resolve
  // server-side, and the proxy may be down) — keeps the clock ticking
  try {
    const res = await fetch("https://mempool.space/api/blocks/tip/height", {
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
    if (res.ok) {
      const h = parseInt((await res.text()).trim(), 10);
      if (Number.isFinite(h) && h > 0) {
        _tipCache = { height: h, at: now, tipTimestamp: null };
        return { height: h, estimated: false, tipTimestamp: null };
      }
    }
  } catch {
    /* offline / blocked → fall through to the estimate */
  }
  return { height: estimateHeight(now), estimated: true, tipTimestamp: null };
}

export async function currentBlock(): Promise<number> {
  return (await currentBlockInfo()).height;
}
