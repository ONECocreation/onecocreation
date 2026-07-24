/**
 * THE ORRERY engine — Act I of the orrery study, ported whole.
 *
 * Source of truth: studies/clock-study-orrery.html (v23, owner-approved).
 * This file is the study's own JS — the block math, the anchor table, the
 * twelve rings, the sun, the moon, the houses, the scrub/NOW/date-picker
 * wiring — adapted to the ship: the DOM skeleton is rendered by Orrery.tsx
 * (same structure, class-scoped instead of ids), and the network plumbing
 * walks THE LADDER — this ship's own same-origin seam /api/chain/tip?full=1
 * first (node-first + public fallback SERVER-side, the pluggable knob), the
 * arcade's time server second (time.pacsarcade.org, CORS open), and the
 * genesis-anchored ten-minute model last, wearing the honest ~.
 *
 * Stays in the study (owner ruling: "only ship the part 1 — the 1a, 2 and 3
 * sections are still under development"): the spirograph (Act I·B), the
 * tape (Act II), star birth facts (Act III).
 *
 * The laws ported intact (v23):
 *  - 12 orbit rings around the 624-ember sun (THE LIGHT), the Admiral's
 *    order: sun · SECOND · MINUTE · HOUR · BLOCK · DAY · DIFFICULTY ·
 *    MONTH · MOON · YEAR · HALVING · GENERATION · LAST SAT.
 *  - every dot carries its READING; laps fill at the TOP; watchmaker
 *    ticks; ALL dots rest identical in the CREAM (the MOON keeps its
 *    phase face).
 *  - the sun: "BITCOIN TIME", hh:mm:ss with the seconds living INSIDE the
 *    block (chain timestamp when the seam gives it), holds at :59 and
 *    strains past 600 s — never lies, visibly struggles; THE 624 PULSE
 *    breathes its fill from the brand coin-orange up to the true ember.
 *  - ONE selection language, every ring: the chosen ring lights an ORANGE
 *    ember arc for what's full, a BLUE arc for what remains, and its dot
 *    lights GOLD — the one selection color for every dot (owner ruling,
 *    v23: "like the halving's, fleet-wide") — all hidden at rest; the
 *    fact card names the remainder — "X% to go".
 *  - ring labels riding the orbit lines; the MOON at its true phase
 *    (northern sky); the 13 houses CAPRICORN-FIRST (the MONTH-SEAT LAW —
 *    month N of 13 sits in the Nth house; Ophiuchus keeps his true seat)
 *    behind the ✶ HOUSES toggle, every glyph naming its seat in a hover
 *    <title>, the current month's wedge softly lit in the ember; hover
 *    tooltips on every planet; the gravity-well gradient in the same
 *    ember; gold = money — the gold selection dot is the owner's ruled
 *    exception.
 *  - scrub 0→6,930,000 + NOW; SET THE CLOCK takes ANY date — pre-genesis
 *    reads negative (b₿, blocks before genesis); reduced motion = a 1 s
 *    in-place refresh, no rAF.
 */

export interface OrreryEngine {
  destroy(): void;
}

/*==MATH== — ported verbatim from the study ==*/
/* ——— the block constants: the only clock bitcoin owns ——— */
const DAY = 144, DIFF = 2016, MONTH = 4032, YEAR = 52416, HALV = 210000,
  CYCLE = 1260000, LAST = 6930000;
const GENESIS_MS = Date.UTC(2009, 0, 3, 18, 15, 5);

/* ——— gregorian ⇄ height: piecewise through real anchors, steady ~10 min elsewhere ——— */
const ANCH: Array<[number, number]> = [
  [0, GENESIS_MS],                        // genesis
  [57043, Date.UTC(2010, 4, 22)],         // pizza day
  [210000, Date.UTC(2012, 10, 28)],       // halving I
  [420000, Date.UTC(2016, 6, 9)],         // halving II
  [630000, Date.UTC(2020, 4, 11)],        // halving III
  [840000, Date.UTC(2024, 3, 20)],        // halving IV
  [957877, Date.UTC(2026, 6, 13, 16, 13, 46)], // the pupil's honest anchor — keeps the offline model within a whisker of now
];

/* ——— the BFT calendar: 13 months × 28 days, year = bitcoin's age ——— */
interface BftD { y: number; mo: number; d: number; era: string; str: string }
function bftDate(h: number): BftD {
  const H = Math.floor(h);
  const era = H >= 0 ? 'a₿' : 'b₿';
  const m = H >= 0 ? H : -H;                 // b₿ mirrors around genesis
  const y = Math.floor(m / YEAR);
  const mo = Math.floor((m % YEAR) / MONTH) + 1;
  const d = Math.floor((m % MONTH) / DAY) + 1;
  return { y, mo, d, era, str:
    String(y).padStart(4, '0') + '.' + String(mo).padStart(2, '0') + '.' + String(d).padStart(2, '0') + ' ' + era };
}

/* ——— the 13-wheel of year animals: a₿ 0 = Ox; the Cat rides thirteenth ——— */
const ANIMALS: Array<[string, string]> = [['🐀', 'Rat'], ['🐂', 'Ox'], ['🐅', 'Tiger'],
  ['🐇', 'Rabbit'], ['🐉', 'Dragon'], ['🐍', 'Snake'], ['🐎', 'Horse'], ['🐐', 'Goat'],
  ['🐒', 'Monkey'], ['🐓', 'Rooster'], ['🐕', 'Dog'], ['🐖', 'Pig'], ['🐈', 'Astronomical Cat']];
function yearAnimal(d: BftD) {
  const i = (((d.era === 'b₿' ? 1 - d.y : d.y + 1) % 13) + 13) % 13;
  return ANIMALS[i];
}

/* ——— the sky's moon: mean synodic from the 2000-01-06 18:14 UTC new moon ——— */
const SYNODIC = 29.530588853, NM_EPOCH = Date.UTC(2000, 0, 6, 18, 14);
const MOONS: Array<[string, string]> = [['🌑', 'New Moon'], ['🌒', 'Waxing Crescent'],
  ['🌓', 'First Quarter'], ['🌔', 'Waxing Gibbous'], ['🌕', 'Full Moon'],
  ['🌖', 'Waning Gibbous'], ['🌗', 'Last Quarter'], ['🌘', 'Waning Crescent']];
function moonFracAt(ms: number) {
  return ((((ms - NM_EPOCH) / 86400000) % SYNODIC + SYNODIC) % SYNODIC) / SYNODIC;
}
function moonAt(ms: number) {
  return MOONS[Math.round(moonFracAt(ms) * 8) % 8];
}

/* ——— THE 13 HOUSES (experiment): the real astronomical zodiac has
   thirteen signs — Ophiuchus ⛎ is the one astrology leaves out, the sky's
   own Astronomical Cat. One house per bitcoin month, sector 1 at the top,
   read clockwise. A planet is IN the house its dot stands in. ——— */
const ZOD13: Array<[string, string]> = [['♑', 'Capricorn'], ['♒', 'Aquarius'], ['♓', 'Pisces'],
  ['♈', 'Aries'], ['♉', 'Taurus'], ['♊', 'Gemini'], ['♋', 'Cancer'], ['♌', 'Leo'],
  ['♍', 'Virgo'], ['♎', 'Libra'], ['♏', 'Scorpio'], ['⛎', 'Ophiuchus'], ['♐', 'Sagittarius']];
/* Capricorn opens the year — genesis (3 Jan) and Day 0 (~7 Jan) both land
   in month 1. MONTH SEAT LAW: month N of 13 sits in the Nth house, same
   reading as the bitcoin-birthday page. Ophiuchus keeps his true seat. */
const houseOf = (frac: number) => ZOD13[Math.floor(((frac % 1) + 1) % 1 * 13) % 13];

/* ——— subsidy of a halving epoch: integer sats, floored, as the protocol floors ——— */
const subsidySats = (ep: number) => ep >= 33 ? 0 : Math.floor(5e9 / 2 ** ep);
function fmtSub(ep: number) {
  const s = subsidySats(ep);
  if (s === 0) return 'subsidy 0 — the last sat is struck';
  return 'subsidy ' + (s >= 1e8 ? (s / 1e8) + ' BTC'
    : s.toLocaleString('en-US') + (s === 1 ? ' sat' : ' sats'));
}
/*==/MATH==*/

const nf = (n: number) => Math.abs(n).toLocaleString('en-US');
const MON3 = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const SVGNS = 'http://www.w3.org/2000/svg';
const CREAM = '#f2ead8', GOLD = '#ffd700', CYAN = '#6fd7e0';
const BTC = '#ff6600';   /* THE 624 EMBER — vivid tangerine. the block interval
   IS the color: 1/600 Hz raised 58 octaves ≈ 432 THz ≈ 624 nm orange-red
   (#FF4500–#FF6600, the sacred band — the Hatter's discovery). NOT the
   brand coin-orange #f7931a: the sun burns at the protocol's own light. */

const bidOf = (H: number) => ((Math.floor(H) % DAY) + DAY) % DAY;
const capA = (a: number) => Math.min(Math.max(a, 0), 599.9);
const pmod = (x: number, p: number) => ((x % p) + p) % p;   // positive modulo — b₿ heights welcome
const pct = (H: number, p: number) => ((H % p) / p * 100).toFixed(1) + '%';

/* the face, all the way down: hh:mm:ss — six blocks an hour, ten minutes a
   block, and the seconds live INSIDE the block. past 600 s the face holds
   at :59 and strains — the pupil law: never lie, visibly struggle. */
function faceTime(H: number, age: number) {
  const bid = bidOf(H);
  const a = capA(age);
  return {
    hh: String(Math.floor(bid / 6)).padStart(2, '0'),
    mm: String((bid % 6) * 10 + Math.floor(a / 60)).padStart(2, '0'),
    ss: String(Math.floor(a % 60)).padStart(2, '0'),
    strain: age >= 600,
  };
}

interface RingDef {
  key: string;
  p: number;
  r: number;
  pr: number;
  c: string;
  ticks?: number;
  moon?: boolean;
  arc?: boolean;
  fr?: (H: number, a: number) => number;
  f: (H: number, a: number) => string;
  n?: (H: number, a: number) => string;
}

interface Planet {
  pl?: SVGGElement;
  lit?: SVGCircleElement | null;
  num?: SVGTextElement | null;
  hit: SVGCircleElement;
  ring?: SVGCircleElement;
  rg?: RingDef;
  fillA?: SVGCircleElement;
  remA?: SVGCircleElement;
  dot?: SVGCircleElement | null;
  tt?: SVGTitleElement;
}

let seq = 0; // unique SVG-reference ids across engine instances (strict-mode remounts)

export function createOrrery(root: HTMLElement): OrreryEngine {
  const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const uid = 'orr' + ++seq;
  const $ = <T extends Element>(sel: string) => root.querySelector<T>(sel)!;

  /* ═══ the DOM (rendered by Orrery.tsx — same shape as the study) ═══ */
  const orr = $<SVGSVGElement>('.orr');
  const chipsEl = $<HTMLDivElement>('.chips');
  const factEl = $<HTMLDivElement>('.factcard');
  const scrub = $<HTMLInputElement>('.scrub');
  const nowbtn = $<HTMLButtonElement>('.nowbtn');
  const readEl = $<HTMLDivElement>('.readout');
  const clockDate = $<HTMLInputElement>('.clock-date');
  const clockNote = $<HTMLSpanElement>('.clock-note');

  const el = (n: string, at: Record<string, string | number>) => {
    const e = document.createElementNS(SVGNS, n);
    for (const k in at) e.setAttribute(k, String(at[k]));
    return e;
  };

  /* ═══ shared state — the study's ═══ */
  let liveAnchor: [number, number] | null = null;   // [tipHeight, ms] once the tip answers
  function anchors() {
    const a = ANCH.slice();
    if (liveAnchor && liveAnchor[0] > a[a.length - 1][0]) a.push(liveAnchor);
    return a;
  }
  function h2ms(h: number) {
    const a = anchors();
    if (h <= 0) return a[0][1] + h * 600000;
    for (let i = 0; i < a.length - 1; i++)
      if (h <= a[i + 1][0])
        return a[i][1] + (h - a[i][0]) * (a[i + 1][1] - a[i][1]) / (a[i + 1][0] - a[i][0]);
    const z = a[a.length - 1];
    return z[1] + (h - z[0]) * 600000;
  }
  function ms2h(ms: number) {
    const a = anchors();
    if (ms <= a[0][1]) return (ms - a[0][1]) / 600000;
    for (let i = 0; i < a.length - 1; i++)
      if (ms <= a[i + 1][1])
        return a[i][0] + (ms - a[i][1]) * (a[i + 1][0] - a[i][0]) / (a[i + 1][1] - a[i][1]);
    const z = a[a.length - 1];
    return z[0] + (ms - z[1]) / 600000;
  }
  const exactH = (h: number) => anchors().some(x => x[0] === h);
  function oldFmt(h: number) {
    const dt = new Date(h2ms(h));
    return (exactH(h) ? '' : '~') + String(dt.getUTCDate()).padStart(2, '0') + ' ' +
      MON3[dt.getUTCMonth()] + ' ' + dt.getUTCFullYear();
  }

  let tip = Math.floor(ms2h(Date.now()));     // honest fallback until the tip answers
  let tipEstimated = true;
  let tipSeen = Date.now();
  let tipTs: number | null = null;            // the tip block's CHAIN timestamp (s)
  let tipSrc: 'ship' | 'arcade' | null = null; // 'ship' | 'arcade' | null (~model)

  let mode: 'live' | 'scrub' | 'pick' = 'live';
  let pickH = 0;
  let sel: 'sun' | number = 'sun';            // which fact card is showing

  /* THE LADDER — this ship's own door FIRST: the same-origin seam
     /api/chain/tip?full=1 (node-first + public fallback SERVER-side; the
     CHAIN knob rewires every clock with zero client code). The arcade's
     time server second — time.pacsarcade.org, the house clock's own door,
     CORS open. The genesis-anchored ten-minute model last, wearing ~. */
  const DOORS: Array<{ url: string; src: 'ship' | 'arcade' }> = [
    { url: '/api/chain/tip?full=1', src: 'ship' },
    { url: 'https://time.pacsarcade.org/api/chain/tip?full=1', src: 'arcade' },
  ];
  async function fetchTip() {
    let got: { h: number; ts: number | null; src: 'ship' | 'arcade' } | null = null;
    for (const door of DOORS) {
      if (got) break;
      try {
        const r = await fetch(door.url, { cache: 'no-store' });
        const j = r.ok ? await r.json() : null;
        if (j && j.ok && Number.isFinite(j.height))
          got = {
            h: j.height,
            ts: Number.isFinite(j.tipTimestamp) ? j.tipTimestamp : null,
            src: door.src,
          };
      } catch { /* this rung is dark — the next one carries */ }
    }
    if (destroyed) return;
    if (got) {
      if (got.h !== tip) tipSeen = Date.now();
      tip = got.h; tipTs = got.ts; tipEstimated = false; tipSrc = got.src;
      liveAnchor = [tip, tipTs ? tipTs * 1000 : tipSeen];
    } else {
      tip = Math.floor(ms2h(Date.now())); tipEstimated = true; tipTs = null; tipSrc = null;
    }
    if (mode === 'live') scrub.value = String(tip);
    renderOrrery(); renderRead();
  }

  /* seconds into the current block — the CHAIN's own timestamp when the
     seam gives it (the honest age), first-seen wall clock otherwise */
  function blockAge() {
    if (tipEstimated) return (((ms2h(Date.now()) % 1) + 1) % 1) * 600;
    if (tipTs != null) return Math.max(Date.now() / 1000 - tipTs, 0);
    return (Date.now() - tipSeen) / 1000;
  }
  /* live fractional height: the tick fills in tenths, wearing the ~ */
  function liveH() {
    if (tipEstimated) return Math.max(ms2h(Date.now()), tip);
    return tip + Math.min(blockAge() / 600, 0.999);
  }

  /* ═══ THE RINGS — the hands ride the inner orbits and truly move; the
     chain's periods orbit beyond them. The order is the Admiral's ruling.
     ALL dots rest identical in the CREAM (the MOON keeps its phase face).
     ONE selection language, every ring: choose a ring and the ORANGE arc
     shows what's full, the BLUE arc what remains, and the dot lights
     GOLD — hidden at rest. The MOON
     rides its
     own orbit just outside the calendar's MONTH (synodic ≈ 4,252 blocks vs
     4,032 — the two-moons drift made visible; they kiss every ~19.3 bitcoin
     months, the house Metonic). Rings wear watchmaker tick marks — the
     Breguet/Patek graduation law. The moon is drawn as the NORTHERN sky
     sees it, and says so. ═══ */
  const RINGS: RingDef[] = [
    { key: 'SECOND', p: 60, r: 62, pr: 4.5, c: CREAM,
      fr: (H, a) => (capA(a) % 60) / 60,
      f: (H, a) => `<b>60 seconds</b> · one lap a minute · :${faceTime(H, a).ss}` },
    { key: 'MINUTE', p: 6, r: 80, pr: 4.5, c: CREAM,
      fr: (H, a) => (((bidOf(H) % 6) * 600 + capA(a)) % 3600) / 3600,
      f: (H, a) => { const t = faceTime(H, a); return `<b>60 minutes</b> · one lap an hour · ${t.hh}:${t.mm}`; } },
    { key: 'HOUR', p: DAY, r: 98, pr: 5, c: CREAM, ticks: 24,
      fr: (H, a) => ((bidOf(H) * 600 + capA(a)) % 86400) / 86400,
      f: (H, a) => { const t = faceTime(H, a); return `<b>24 hours</b> · one lap fills the day · ${t.hh}:${t.mm}:${t.ss}`; } },
    /* BLOCK counts the way the Admiral reads it: block x of 144, one lap
       fills the day, full at the top — the day's 24 hour-marks on the rim */
    { key: 'BLOCK', p: DAY, r: 115, pr: 5.5, c: CREAM, ticks: 24,
      fr: (H, a) => (bidOf(H) + capA(a) / 600) / DAY,
      f: H => `<b>144 blocks a day</b> · one lap fills the day · block ${bidOf(H) + 1} of 144 · ~10 min each` },
    /* the calendar rings count the way the Admiral reads a clock: the DAY
       dot climbs 1→28 and its lap FILLS the month — full lands at the top,
       and the new month begins there. MONTH climbs 1→13 filling the year;
       YEAR wears bitcoin's age and laps the 13-year animal wheel. */
    { key: 'DAY', p: MONTH, r: 132, pr: 5, c: CREAM, ticks: 28,
      fr: H => pmod(H, MONTH) / MONTH,
      f: H => `<b>28 days</b> · one lap fills the month · day ${Math.floor(pmod(H, MONTH) / DAY) + 1} of 28 · full at the top` },
    { key: 'DIFFICULTY', p: DIFF, r: 149, pr: 5, c: CREAM,
      f: H => `<b>2,016 blocks</b> · the network re-tunes · ${pct(H, DIFF)} through` },
    { key: 'MONTH', p: YEAR, r: 166, pr: 5, c: CREAM, ticks: 13,
      fr: H => pmod(H, YEAR) / YEAR,
      f: H => { const h = houseOf(pmod(H, YEAR) / YEAR);
        return `<b>13 months</b> · one lap fills the year · month ${Math.floor(pmod(H, YEAR) / MONTH) + 1} of 13 · in the house of ${h[0]} ${h[1]}`; } },
    { key: 'MOON', p: 4252, r: 183, pr: 6, c: CREAM, moon: true,
      fr: H => moonFracAt(mode === 'live' ? Date.now() : h2ms(H)),
      f: H => { const t = mode === 'live' ? Date.now() : h2ms(H); const m = moonAt(t); const h = houseOf(moonFracAt(t));
        return `<b>≈4,252 blocks</b> · the sky's own month · ${m[0]} ${m[1]} · in the house of ${h[0]} ${h[1]} · drawn for the northern sky`; } },
    { key: 'YEAR', p: YEAR * 13, r: 200, pr: 5.5, c: CREAM, ticks: 13,
      fr: H => (pmod(Math.floor(H / YEAR), 13) + pmod(H, YEAR) / YEAR) / 13,
      f: H => { const bd = bftDate(H), an = yearAnimal(bd);
        return `<b>year ${bd.y} — bitcoin's age</b> · one lap = the 13-year animal wheel · ${an[0]} ${an[1]}`; } },
    /* the gold planet counts halvings-so-far; its lap is the ~4-year epoch,
       and the NEXT halving lands at the top — the counting law, in gold */
    { key: 'HALVING', p: HALV, r: 217, pr: 6, c: CREAM, ticks: 4,
      f: H => `<b>every 210,000 blocks ≈ 4 years</b> · ${Math.floor(H / HALV)} halvings so far · the next lands at the top · <span class="g">${fmtSub(Math.floor(H / HALV))}</span>` },
    { key: 'GENERATION', p: CYCLE, r: 234, pr: 5.5, c: CREAM, ticks: 6,
      f: H => `<b>1,260,000 blocks</b> · 6 halvings · ~24 years — a human generation · ${pct(H, CYCLE)} through` },
    { key: 'LAST SAT', p: LAST, r: 258, pr: 5, c: CREAM, arc: true,
      f: H => `<b>6,930,000 blocks</b> · genesis → the last sat struck · ~2140 · ${(H / LAST * 100).toFixed(2)}% along` },
  ];

  /* every dot carries its READING — glance at the planet, know the value,
     the way a clock hand points at its number */
  const NUMS: Record<string, (H: number, a: number) => string> = {
    SECOND: (H, a) => faceTime(H, a).ss,
    MINUTE: (H, a) => faceTime(H, a).mm,
    BLOCK: H => String(bidOf(H) + 1),                           // block 1-144, fills the day
    HOUR: (H, a) => faceTime(H, a).hh,
    DAY: H => String(Math.floor(pmod(H, MONTH) / DAY) + 1),     // day 1-28, fills the month
    DIFFICULTY: H => String(Math.floor(pmod(H, DIFF) / DIFF * 100)), // % to the re-tune
    MONTH: H => String(Math.floor(pmod(H, YEAR) / MONTH) + 1),  // month 1-13, fills the year
    YEAR: H => String(bftDate(H).y),                            // bitcoin's age (mirrored b₿)
    HALVING: H => String(Math.max(0, Math.floor(H / HALV))),    // halvings so far
    GENERATION: H => String(Math.floor(pmod(H, CYCLE) / HALV) + 1), // halving 1-6 of the generation
    'LAST SAT': H => Math.max(0, Math.round(H / LAST * 100)) + '%',
  };
  RINGS.forEach(r => { r.n = NUMS[r.key]; });

  /* ═══ build — the study's buildOrrery, ids made instance-unique ═══ */
  const planets: Planet[] = [];
  let wedgeIdx = -1;
  let sunLbl: SVGTextElement, sunTime: SVGTextElement, sunDate: SVGTextElement,
    sunVel: SVGTextElement, zodiacG: SVGGElement, sunTT: SVGTitleElement,
    houseWedge: SVGPathElement;
  while (orr.firstChild) orr.removeChild(orr.firstChild); // idempotent (strict-mode remount)
  {
    /* the gravity well — the sun's pull, fading out through the rings,
       wearing the same 624 ember as the sun itself */
    const defs = el('defs', {});
    defs.innerHTML = '<radialGradient id="' + uid + '-gw">' +
      '<stop offset="0%" stop-color="#ff6600" stop-opacity=".17"/>' +
      '<stop offset="35%" stop-color="#ff6600" stop-opacity=".05"/>' +
      '<stop offset="100%" stop-color="#ff6600" stop-opacity="0"/></radialGradient>' +
      '<clipPath id="' + uid + '-mcl"><circle r="6"/></clipPath>';
    orr.appendChild(defs);
    orr.appendChild(el('circle', { r: 285, fill: 'url(#' + uid + '-gw)' }));
    /* THE 13 HOUSES — faint spokes from the sun's edge to beyond the last
       orbit, one per bitcoin month, sign glyphs on the outer rim. An
       experiment layer: the ✶ HOUSES chip lights and douses it. */
    zodiacG = el('g', {}) as SVGGElement;
    /* the house shade — the current month's wedge, softly lit so the whole
       pie slice (and its boundaries) reads at a glance */
    houseWedge = el('path', { fill: 'rgba(255,102,0,.055)', stroke: 'rgba(242,234,216,.10)', 'stroke-width': 1 }) as SVGPathElement;
    zodiacG.appendChild(houseWedge);
    for (let k = 0; k < 13; k++) {
      const ba = k / 13 * 2 * Math.PI - Math.PI / 2;              // sector boundary
      zodiacG.appendChild(el('line', {
        x1: (58 * Math.cos(ba)).toFixed(1), y1: (58 * Math.sin(ba)).toFixed(1),
        x2: (272 * Math.cos(ba)).toFixed(1), y2: (272 * Math.sin(ba)).toFixed(1),
        stroke: 'rgba(242,234,216,.08)', 'stroke-width': 1, 'stroke-dasharray': '3 5' }));
      const ca = (k + .5) / 13 * 2 * Math.PI - Math.PI / 2;       // sector center
      const gl = el('text', { x: (281 * Math.cos(ca)).toFixed(1), y: (281 * Math.sin(ca)).toFixed(1),
        'text-anchor': 'middle', 'dominant-baseline': 'central', 'font-size': 12,
        fill: 'rgba(242,234,216,.6)', cursor: 'default' });
      gl.textContent = ZOD13[k][0] + '︎';   // text presentation — ⛎ renders as emoji otherwise and ignores the paint
      const gt = el('title', {});
      gt.textContent = ZOD13[k][1] + ' — house ' + (k + 1) + ' of 13 · month ' + String(k + 1).padStart(2, '0') + '’s seat';
      gl.appendChild(gt);
      zodiacG.appendChild(gl);
    }
    orr.appendChild(zodiacG);
    RINGS.forEach((rg, i) => {
      const ring = el('circle', { class: 'ring', r: rg.r, 'data-i': i }) as SVGCircleElement;
      orr.appendChild(ring);
      /* watchmaker graduations — the Breguet/Patek tick-mark law */
      if (rg.ticks) {
        for (let k = 0; k < rg.ticks; k++) {
          const ta = k / rg.ticks * 2 * Math.PI - Math.PI / 2;
          orr.appendChild(el('line', {
            x1: ((rg.r - 2.5) * Math.cos(ta)).toFixed(2), y1: ((rg.r - 2.5) * Math.sin(ta)).toFixed(2),
            x2: ((rg.r + 2.5) * Math.cos(ta)).toFixed(2), y2: ((rg.r + 2.5) * Math.sin(ta)).toFixed(2),
            stroke: 'rgba(242,234,216,.22)', 'stroke-width': 1 }));
        }
      }
      /* the orbit line carries its own name — read the ring like a dial */
      const pid = uid + '-rp' + i;
      orr.appendChild(el('path', { id: pid, fill: 'none',
        d: 'M ' + rg.r + ' 0 A ' + rg.r + ' ' + rg.r + ' 0 1 1 -' + rg.r + ' 0 A ' + rg.r + ' ' + rg.r + ' 0 1 1 ' + rg.r + ' 0' }));
      const lb = el('text', { class: 'ringlbl' });
      const tp = el('textPath', { startOffset: '61%' });
      tp.setAttribute('href', '#' + pid);
      tp.setAttributeNS('http://www.w3.org/1999/xlink', 'xlink:href', '#' + pid);
      tp.textContent = rg.key;
      lb.appendChild(tp); orr.appendChild(lb);

      /* ONE selection language, every ring: choose a ring and the ORANGE arc
         shows what's full, the BLUE arc shows what remains — hidden at rest */
      const fillA = el('circle', { r: rg.r, fill: 'none', stroke: '#ff6600', 'stroke-width': 2.2,
        pathLength: 100, 'stroke-dasharray': '0 100', transform: 'rotate(-90)',
        'stroke-linecap': 'round', opacity: 0 }) as SVGCircleElement;
      const remA = el('circle', { r: rg.r, fill: 'none', stroke: CYAN, 'stroke-width': 1.5,
        pathLength: 100, 'stroke-dasharray': '0 100', transform: 'rotate(-90)',
        'stroke-linecap': 'round', opacity: 0 }) as SVGCircleElement;
      orr.appendChild(fillA); orr.appendChild(remA);
      /* the MOON is drawn at its true phase — dark disc, lit overlay sliding
         with the synodic age (as the NORTHERN sky sees it: waxing lights the
         right limb) */
      let pl: SVGGElement, lit: SVGCircleElement | null = null, num: SVGTextElement | null = null,
        dot: SVGCircleElement | null = null;
      if (rg.moon) {
        pl = el('g', {}) as SVGGElement;
        pl.appendChild(el('circle', { r: 6, fill: '#23232a', stroke: 'rgba(242,234,216,.4)', 'stroke-width': '.7' }));
        lit = el('circle', { r: 6, fill: '#d9d3c6', 'clip-path': 'url(#' + uid + '-mcl)' }) as SVGCircleElement;
        pl.appendChild(lit);
      } else {
        /* the dot is a tiny dial: the planet circle with its reading inside.
           ALL dots rest identical (cream); the chosen ring's dot lights
           GOLD (owner ruling: like the halving's, fleet-wide) */
        pl = el('g', {}) as SVGGElement;
        dot = el('circle', { r: 8, fill: rg.c }) as SVGCircleElement;
        pl.appendChild(dot);
        num = el('text', { y: 2.4, 'text-anchor': 'middle', 'font-size': 6.5, 'font-weight': '700', fill: '#121215' }) as SVGTextElement;
        pl.appendChild(num);
      }
      const hit = el('circle', { class: 'hit', r: 17, 'data-i': i }) as SVGCircleElement;
      const tt = el('title', {}) as SVGTitleElement; hit.appendChild(tt);   // native hover tooltip
      orr.appendChild(pl); orr.appendChild(hit);
      planets.push({ pl, lit, num, hit, ring, rg, fillA, remA, dot, tt });
    });
    /* the sun: TIME CLOSEST TO THE HEART — hh:mm:ss beating at the center,
       the height beneath it as the sun's velocity (one block of speed every
       ~10 min), the planets held in the well of its pull. The sun wears the
       624 EMBER — vivid tangerine, the protocol's own 624 nm light — and
       THE 624 PULSE breathes it from the brand coin-orange to the ember. */
    orr.appendChild(el('circle', { r: 58, fill: BTC, opacity: .4, class: 'sunpulse sun624' }));
    orr.appendChild(el('circle', { r: 50, fill: BTC, class: 'sun624' }));
    sunLbl = el('text', { y: -27, 'text-anchor': 'middle', 'font-size': 6.2, 'letter-spacing': '.22em', fill: '#121215', opacity: .72 }) as SVGTextElement;
    sunLbl.textContent = 'BITCOIN TIME';
    sunTime = el('text', { y: -5, 'text-anchor': 'middle', 'font-size': 14.5, 'font-weight': '700', fill: '#121215' }) as SVGTextElement;
    sunDate = el('text', { y: 11, 'text-anchor': 'middle', 'font-size': 7.5, fill: '#121215', opacity: .85 }) as SVGTextElement;
    sunVel = el('text', { y: 27, 'text-anchor': 'middle', 'font-size': 7, 'font-weight': '700', 'letter-spacing': '.06em', fill: '#121215', opacity: .72 }) as SVGTextElement;
    const sunHit = el('circle', { class: 'hit', r: 58, 'data-i': 'sun' }) as SVGCircleElement;
    sunTT = el('title', {}) as SVGTitleElement; sunHit.appendChild(sunTT);
    [sunLbl, sunTime, sunDate, sunVel, sunHit].forEach(n => orr.appendChild(n));
    planets.push({ hit: sunHit });
  }

  function curH() { return mode === 'live' ? liveH() : mode === 'pick' ? pickH : +scrub.value; }

  function renderOrrery(withText?: boolean) {
    const H = curH();
    const age = mode === 'live' ? blockAge() : 0;
    planets.forEach(o => {
      if (!o.rg) return;
      const frac = o.rg.arc ? Math.min(Math.max(H, 0) / LAST, 1)
        : o.rg.fr ? pmod(o.rg.fr(H, age), 1)
        : pmod(H, o.rg.p) / o.rg.p;
      const a = frac * 2 * Math.PI - Math.PI / 2;
      const x = (o.rg.r * Math.cos(a)).toFixed(2), y = (o.rg.r * Math.sin(a)).toFixed(2);
      o.pl!.setAttribute('transform', 'translate(' + x + ' ' + y + ')');
      if (o.rg.moon) {
        /* phase = position on this orbit: the lit disc slides across the dark
           one — off-right at new, centered at full, off-left back to new */
        const off = frac <= .5 ? 12 * (1 - 2 * frac) : -12 * (2 * frac - 1);
        o.lit!.setAttribute('cx', off.toFixed(2));
      }
      if (o.num && o.rg.n) o.num.textContent = o.rg.n(H, age);
      o.hit.setAttribute('cx', x); o.hit.setAttribute('cy', y);
      if (o.fillA) {
        const chosen = sel === planets.indexOf(o);
        /* the chosen ring's dot lights GOLD — the one selection color for
           every dot (owner ruling: like the halving's, fleet-wide) */
        if (o.dot) o.dot.setAttribute('fill', chosen ? GOLD : o.rg.c);
        if (chosen) {
          o.fillA.setAttribute('stroke-dasharray', (frac * 100).toFixed(2) + ' 100');
          o.fillA.setAttribute('opacity', '.8');
          o.remA!.setAttribute('stroke-dasharray', ((1 - frac) * 100).toFixed(2) + ' 100');
          o.remA!.setAttribute('stroke-dashoffset', (-frac * 100).toFixed(2));
          o.remA!.setAttribute('opacity', '.4');
        } else {
          o.fillA.setAttribute('opacity', '0');
          o.remA!.setAttribute('opacity', '0');
        }
      }
    });
    renderSun(H);
    /* shade the month's current house wedge (recut only when it moves) */
    const wk = Math.floor(pmod(H, YEAR) / MONTH) % 13;
    if (wk !== wedgeIdx) { wedgeIdx = wk; houseWedge.setAttribute('d', wedgePath(wk)); }
    if (withText !== false) renderFact(H);
  }
  function wedgePath(k: number) {
    const a0 = k / 13 * 2 * Math.PI - Math.PI / 2, a1 = (k + 1) / 13 * 2 * Math.PI - Math.PI / 2;
    const r1 = 58, r2 = 272;
    const P = (r: number, a: number) => (r * Math.cos(a)).toFixed(1) + ' ' + (r * Math.sin(a)).toFixed(1);
    return 'M ' + P(r1, a0) + ' L ' + P(r2, a0) + ' A ' + r2 + ' ' + r2 + ' 0 0 1 ' + P(r2, a1) +
      ' L ' + P(r1, a1) + ' A ' + r1 + ' ' + r1 + ' 0 0 0 ' + P(r1, a0) + ' Z';
  }
  function renderSun(H?: number) {
    H = H === undefined ? Math.max(curH(), 0) : H;
    const live = mode === 'live';
    const t = faceTime(H, live ? blockAge() : 0);
    const est = live && tipEstimated;
    sunTime.textContent = t.hh + ':' + t.mm + ':' + t.ss + (est ? '~' : '');
    sunTime.classList.toggle('strain', live && t.strain);
    sunDate.textContent = bftDate(H).str;
    sunVel.textContent = '★ ' + (est ? '~' : '') + (H < 0 ? '−' : '') + nf(Math.floor(H));
  }
  function renderFact(H?: number) {
    H = H === undefined ? curH() : H;
    /* hover text everywhere — every hit target carries its fact as a native
       tooltip, same words as the card at the bottom */
    const age = mode === 'live' ? blockAge() : 0;
    planets.forEach(o => {
      if (o.tt && o.rg) o.tt.textContent = String(o.rg.f(H!, age)).replace(/<[^>]*>/g, '');
    });
    if (sunTT) sunTT.textContent = 'THE LIGHT · block ' + (H < 0 ? '−' : '') + nf(Math.floor(H)) + ' · ' + bftDate(H).str + ' · one block of velocity every ~10 min';
    factEl.innerHTML = sel === 'sun'
      ? `<span><b>THE LIGHT · block ${H < 0 ? '−' : ''}${nf(Math.floor(H))}</b> · the sun of this system — b₿ and a₿ are before and after it · one block of velocity every ~10 min${mode === 'live' && tipEstimated ? ' · <span class="tilde">~estimated</span>' : ''}</span>`
      : (() => { const o = planets[sel as number], age2 = mode === 'live' ? blockAge() : 0;
          const frac = o.rg!.arc ? Math.min(Math.max(H!, 0) / LAST, 1) : o.rg!.fr ? pmod(o.rg!.fr(H!, age2), 1) : pmod(H!, o.rg!.p) / o.rg!.p;
          return `<span>${RINGS[sel as number].f(H!, age2)} · <span class="tilde">${(100 - frac * 100).toFixed(frac > .99 ? 1 : 0)}% to go</span></span>`; })();
    root.querySelectorAll('.chips button').forEach((b, i) =>
      b.classList.toggle('on', sel === 'sun' ? i === 0 : i === (sel as number) + 1));
  }
  function renderRead() {
    const H = Math.floor(curH());
    const live = mode === 'live';
    readEl.innerHTML =
      `${H < 0 ? nf(H) + ' blocks before genesis' : 'block ' + nf(H)} · ${oldFmt(H)} · ${bftDate(H).str}` +
      (live ? (tipEstimated ? ' · <span class="tilde">~no rail, ten-minute model</span>'
          : tipSrc === 'ship' ? ' · live · this ship’s door'
          : ' · live · the arcade’s time server')
        : mode === 'pick' ? ' · set by the date picker — NOW returns'
        : ' · scrubbing — NOW returns');
  }

  /* every listener rides one leash — destroy() aborts them all */
  const ac = new AbortController();
  const sig = { signal: ac.signal };

  /* chips: THE LIGHT + the twelve rings — easy tap targets for small screens */
  while (chipsEl.firstChild) chipsEl.removeChild(chipsEl.firstChild); // idempotent (strict-mode remount)
  ['THE LIGHT', ...RINGS.map(r => r.key)].forEach((name, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = name;
    b.addEventListener('click', () => { sel = i === 0 ? 'sun' : i - 1; hotRing(); renderFact(); }, sig);
    chipsEl.appendChild(b);
  });
  /* the experiment switch — the 13 houses, lit by default, doused on tap */
  const zbtn = document.createElement('button');
  zbtn.type = 'button';
  zbtn.textContent = '✶ HOUSES';
  zbtn.classList.add('on');
  zbtn.addEventListener('click', () => {
    const off = zodiacG.style.display === 'none';
    zodiacG.style.display = off ? '' : 'none';
    zbtn.classList.toggle('on', off);
  }, sig);
  chipsEl.appendChild(zbtn);
  function hotRing() {
    planets.forEach((o, i) => { if (o.ring) o.ring.classList.toggle('hot', sel === i); });
  }
  const pick = (e: Event) => {
    const t = e.target as Element | null;
    const i = t && t.getAttribute ? t.getAttribute('data-i') : null;
    if (i !== null && i !== undefined) { sel = i === 'sun' ? 'sun' : +i; hotRing(); renderFact(); }
  };
  orr.addEventListener('pointerover', pick, sig);
  orr.addEventListener('click', pick, sig);

  scrub.addEventListener('input', () => { mode = 'scrub'; renderOrrery(); renderRead(); }, sig);
  nowbtn.addEventListener('click', () => {
    mode = 'live'; scrub.value = String(tip); renderOrrery(); renderRead();
  }, sig);

  /* the date picker — point the whole orrery at any date; pre-genesis dates
     are welcome and read honestly in b₿, blocks-before-genesis */
  clockDate.addEventListener('change', () => {
    if (!clockDate.value) return;
    const [y, m, d] = clockDate.value.split('-').map(Number);
    pickH = Math.round(ms2h(Date.UTC(y, m - 1, d, 12)));
    mode = 'pick';
    if (pickH >= 0 && pickH <= LAST) scrub.value = String(pickH);
    renderOrrery(); renderRead();
    clockNote.textContent = '= ' + (pickH < 0 ? nf(pickH) + ' blocks before genesis (b₿)' : '~block ' + nf(pickH));
  }, sig);

  /* the slow dance: rAF while live; reduced motion holds true positions instead */
  let destroyed = false;
  let rafId = 0;
  let reducedInterval: ReturnType<typeof setInterval> | undefined;
  let lastText = 0;
  if (!RM) {
    const tick = () => {
      if (destroyed) return;
      if (mode === 'live') {
        renderOrrery(false);
        if (Date.now() - lastText > 1000) { lastText = Date.now(); renderFact(); renderRead(); }
      }
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
  } else {
    /* reduced motion: no animation frames — but a clock still tells time.
       once a second the face, velocity and true positions refresh in place. */
    reducedInterval = setInterval(() => { if (mode === 'live') { renderOrrery(); renderRead(); } }, 1000);
  }

  /* ═══ ignition — the study's, on the ladder ═══ */
  scrub.value = String(tip);
  renderOrrery(); renderRead();
  fetchTip();                                     // the one network request, polled every 60s
  const pollId = setInterval(fetchTip, 60000);

  function destroy() {
    destroyed = true;
    ac.abort();
    cancelAnimationFrame(rafId);
    if (reducedInterval) clearInterval(reducedInterval);
    clearInterval(pollId);
  }

  return { destroy };
}
