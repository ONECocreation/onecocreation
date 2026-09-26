import { describe, it, expect, afterEach, vi } from "vitest";
import { promises as fs } from "fs";
import path from "path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ReadingHeroCountdown, { type ReadingHeroCountdownProps } from "@/components/ReadingHeroCountdown";
import Stage2Details from "@/components/reading/Stage2Details";
import { TIERS, tierSatisfies, type Tier } from "@/lib/entitlement";
import { STAGE2_MIN_TIER } from "@/lib/stage2-access";
import { TIER_PAGES } from "@/lib/tiers-content";
import type { ReadingSchedule } from "@/lib/reading-schedule";

/**
 * TASK-438 Amendment 1 (block 968,230) + Amendment 2 (block 968,232) —
 * THE APPROVED READING LOOK, pinned. Covers: the sky band and the nebula
 * MOVE (home renders identically — the rule body is byte-identical, only
 * the selector gained `.sky-nebula::before`); the `blocks` countdown
 * variant (four cells, tabular numerals, the day on one line and the time
 * on the next, every gap inside the clock-plus-zone a U+00A0 — proven
 * under a STUBBED Intl so the test measures OUR normalizing, never the
 * machine's ICU); the hero/card variants' byte-identity (fixtures
 * captured from the pre-lane build on this machine); Stage2Details'
 * derive-every-word law; and the look laws (no colour literal, no serif,
 * reduced-motion, the .kit-list marker within 32 px of its text, one
 * right edge in .kit-rows).
 */

const read = (rel: string) => fs.readFile(path.join(process.cwd(), rel), "utf8");

const KIT = "src/app/kit.css";
const CART = "src/app/cartridge.css";
const PAGE = "src/app/reading/page.tsx";
const STAGE = "src/components/reading/ReadingStage.tsx";
const VIEWER = "src/components/reading/JitsiViewer.tsx";
const DETAILS = "src/components/reading/Stage2Details.tsx";
const SIGNUP = "src/components/rooms/ReadingSignUp.tsx";

/** The kit.css region this lane added — everything from its own banner
 *  comment down, so the look laws are measured on the ADDITIONS. */
async function additions(): Promise<string> {
  const css = await read(KIT);
  const at = css.indexOf("READING LOOK");
  expect(at, "kit.css is missing the READING LOOK banner").toBeGreaterThan(-1);
  return css.slice(at);
}

const norm = (s: string) => s.replace(/\s+/g, " ");

/* ═══════════════ the nebula MOVE (L1: move, don't copy; home renders identically) ═══════════════ */

describe("the nebula rule moved, byte-identical, into one shared selector (L1)", () => {
  const OLD_BODY = `content:"";position:absolute;inset:-12%;z-index:0;
  background:url("/images/consciouscuts/nebula.webp") center / cover no-repeat;
  opacity:.16;animation:nebula-drift 70s ease-in-out infinite alternate`;

  it("kit.css carries `.sky-nebula::before,.hero::before` with the old cartridge rule's body verbatim", async () => {
    const css = await read(KIT);
    expect(css).toContain(`.sky-nebula::before,.hero::before{${OLD_BODY}}`);
  });

  it("cartridge.css no longer carries its own .hero::before rule — but KEEPS the nebula-drift keyframes", async () => {
    const css = await read(CART);
    expect(css).not.toMatch(/\.hero::before\{/);
    expect(css).toContain("@keyframes nebula-drift");
  });

  it("the declaration body in kit.css is byte-identical to what cartridge.css:287-289 held (whitespace-normalized)", async () => {
    const css = await read(KIT);
    const m = css.match(/\.sky-nebula::before,\s*\.hero::before\{([\s\S]*?)\}/);
    expect(m, "the shared nebula rule is missing").not.toBeNull();
    expect(norm(m![1])).toBe(norm(OLD_BODY));
  });

  it("reduced motion stops the drift and leaves a still frame — for BOTH selectors (Amendment 1's motion law)", async () => {
    const css = await read(KIT);
    expect(css).toContain("@media (prefers-reduced-motion:reduce){.sky-nebula::before,.hero::before{animation:none}}");
  });

  it("home's hero still wears the class the shared rule dresses (sections.tsx is read-only — the selector group is what keeps home dressed)", async () => {
    const sections = await read("src/components/sections.tsx");
    expect(sections).toContain('className="hero keep-dark"');
  });
});

/* ═══════════════ the page structure (L1/L5, M3, M4) ═══════════════ */

describe("the /reading page — the sky band and the approved structure", () => {
  it("opens with ONE keep-dark sky-veil section carrying the shared sky-stage + sky-nebula classes, id=stage, mounting CosmicSky", async () => {
    const src = await read(PAGE);
    expect(src).toContain('className="keep-dark sky-veil sky-stage sky-nebula"');
    expect(src).toContain('id="stage"');
    expect(src).toContain("<CosmicSky />");
  });

  it("the kicker derives its weekday (never a literal), the h1 is kit-h1, and the countdown mounts as variant=blocks — the hero/card mounts are RETIRED", async () => {
    const src = await read(PAGE);
    expect(src).toContain("Live every ");
    expect(src).toContain("recurrenceLabel");
    expect(src).toContain('className="kit-h1"');
    expect(src).toContain('variant="blocks"');
    expect(src).not.toContain('variant="hero"');
    expect(src).not.toContain('variant="card"');
  });

  it("mounts ReadingStage (via ReadingStageDeck, TASK-473) with the phase only (phase-only SSR), and reads the phase from getStage1State", async () => {
    const src = await read(PAGE);
    expect(src).toContain("const stage1State = await getStage1State();");
    expect(src).toContain("const stage1Phase = stage1State.phase;");
    expect(src).toContain("initialPhase: stage1Phase,");
    expect(src).toContain("<ReadingStageDeck");
    /* TASK-449: the stage2Details prop is RETIRED (the Playground page is
       Stage2Details' only consumer now). TASK-471/472 (block 968,624): the
       week-pass import is ALSO retired from this page — that was
       stage2-access.ts's shared membership taster, never offered on
       /reading any more (reading-day-doors.ts's own docblock). */
    expect(src).not.toContain('from "@/lib/week-pass"');
    expect(src).not.toContain("deriveWeekPass()");
    expect(src).not.toContain("stage2Details");
    expect(src).not.toContain('from "@/components/reading/Stage2Details"');
  });

  it("TASK-468 (block 968,561): mounts ReadingSignInBox EXACTLY ONCE as its own kitx-section-first under the sky band (M4, ReadingSignUp retired from this page) — still never a /news href", async () => {
    const src = await read(PAGE);
    const mounts = src.match(/<ReadingSignInBox/g) ?? [];
    expect(mounts).toHaveLength(1);
    expect(src).not.toContain("ReadingSignUp");
    expect(src).toContain("kitx-section-first");
    expect(src).not.toMatch(/href="\/news"/);
  });

  it("the three Heart Field CTAs are retired — no readingDoorHref, no /rooms/ href, neither old label, no .feat list", async () => {
    const src = await read(PAGE);
    expect(src).not.toContain("readingDoorHref");
    expect(src).not.toContain("/rooms/heart-field");
    expect(src).not.toMatch(/href="\/rooms\//);
    expect(src).not.toContain("Enter the reading room");
    expect(src).not.toContain("Sign in to join");
    expect(src).not.toContain('"feat"');
  });

  it("'What you will experience' is a .kit-list with M3's three lines — the weekday DERIVED, the clock living once at the top, the pass price from the live store item", async () => {
    const src = await read(PAGE);
    expect(src).toContain('"kit-list"');
    expect(src).toContain("a live reading from Love's book");
    expect(src).toContain("Free to watch from anywhere. Nothing to install");
    /* T-454: the real floor, the Playground page's own words (was "with any
       membership" + a literal pass name). TASK-465 (block 968,561): the
       floor name is DERIVED (stage2-access.ts's STAGE2_FLOOR_NAME) — the
       Admiral raised it to Observer, so the literal "Weekly Intuitive"
       would now be wrong. */
    expect(src).toContain("Join the discussion after: a live group video call with Love, with every membership from ${STAGE2_FLOOR_NAME} up");
    expect(src).not.toContain("from Weekly Intuitive up");
    expect(src).not.toContain("with any membership");
    /* TASK-471/472 (block 968,624): the "one-week pass" clause is retired
       from this line — that was stage2-access.ts's shared membership
       taster (deriveWeekPass/week-pass.ts), never mentioned on /reading
       any more; the Encore row (ReadingDayBody) names the book talk's OWN
       pass instead. */
    expect(src).not.toContain("one-week pass");
    expect(src).not.toContain('from "@/lib/week-pass"');
    expect(src).not.toContain("deriveWeekPass");
  });

  it("the host section is .kitx-host with the real portrait, and the one bottom button reads 'Back to the reading' to #stage (no arrow since TASK-463) (Stage 1, never Stage 2)", async () => {
    const src = await read(PAGE);
    expect(src).toContain('"kitx-host"');
    expect(src).toContain("/images/love-sidelook.webp");
    expect(src).toContain("Back to the reading");
    expect(src).toContain('href="#stage"');
  });
});

describe("no camera or microphone words anywhere /reading renders from (M2)", () => {
  for (const file of [PAGE, STAGE, VIEWER, DETAILS, SIGNUP]) {
    it(`${file} is clean`, async () => {
      const src = await read(file);
      expect(src).not.toMatch(/camera|microphone/i);
    });
  }
});

/* ═══════════════ the new kit rules obey the look laws ═══════════════ */

describe("the kit.css additions — the Amendment-1 laws", () => {
  it("no colour literal anywhere in the additions — tokens and color-mix() only", async () => {
    const slice = await additions();
    expect(slice).not.toMatch(/#[0-9A-Fa-f]{3,8}\b/);
    expect(slice).not.toMatch(/\brgba?\(/);
    expect(slice).not.toMatch(/\bhsla?\(/);
  });

  it("no serif (sans-serif only), and every animation stops under prefers-reduced-motion", async () => {
    const slice = await additions();
    const serifs = slice.match(/serif/g) ?? [];
    const sans = slice.match(/sans-serif/g) ?? [];
    expect(serifs.length).toBe(sans.length);
    expect(slice).toContain("@media (prefers-reduced-motion:reduce)");
  });

  it("the .kit-list marker sits within 32 px of its text (18 px column + 12 px gap = 30)", async () => {
    const slice = await additions();
    expect(slice).toMatch(/\.kit-list>li\{display:grid;grid-template-columns:18px 1fr;gap:12px/);
  });

  it(".kit-count-num carries tabular numerals (nothing shifts as it ticks)", async () => {
    const slice = await additions();
    const block = slice.match(/\.kit-count-num\{[^}]*\}/);
    expect(block, ".kit-count-num is missing").not.toBeNull();
    expect(block![0]).toContain("tabular-nums");
  });

  it(".kit-when-time never lets a clock split (white-space:nowrap), and the fade at the band's foot is one var(--ground) rule — no theme-specific override", async () => {
    const slice = await additions();
    const when = slice.match(/\.kit-when-time\{[^}]*\}/);
    expect(when, ".kit-when-time is missing").not.toBeNull();
    expect(when![0]).toContain("white-space:nowrap");
    expect(slice).toContain("linear-gradient(180deg,transparent,var(--ground))");
    expect(slice).not.toContain("data-oc-theme");
  });

  it("every class the lane named actually landed (the OWNS roll-call)", async () => {
    const slice = await additions();
    for (const cls of [
      ".sky-stage",
      ".sky-nebula",
      ".kit-stage{",
      ".kit-stage-media",
      ".kit-stage-waiting",
      ".kit-stage-chip",
      ".kit-stage-controls",
      ".kit-stage-controls-slim",
      ".kit-stage-tools",
      ".kit-stage-live-line",
      ".kit-stage-viewer",
      ".kit-stage2-card",
      ".kit-count{",
      ".kit-count-num",
      ".kit-count-unit",
      ".kit-when{",
      ".kit-when-day",
      ".kit-when-time",
      ".kit-list",
      ".kit-rows{",
      ".kit-rows-end",
      ".kitx-host",
      ".kitx-section",
      ".kitx-section-first",
      ".kit-signup",
      ".kit-inline-form",
    ]) {
      expect(slice).toContain(cls);
    }
  });
});

/* ═══════════════ the blocks variant (L3 + M1) ═══════════════ */

const BASE: ReadingSchedule = { on: true, weekday: 3, time: "13:11", tz: "America/Denver", durationMin: 60 };
const STARTS = Date.parse("2026-09-23T19:11:00.000Z"); // Wednesday 1:11 PM MDT — tests/reading-schedule.test.ts
const ENDS = Date.parse("2026-09-23T20:11:00.000Z");
const ONE_DAY_MS = 24 * 3600_000;

function props(overrides: Partial<ReadingHeroCountdownProps>): ReadingHeroCountdownProps {
  return { schedule: BASE, next: { startsAtMs: STARTS, endsAtMs: ENDS }, asOfMs: STARTS, variant: "blocks", ...overrides };
}

function renderIsland(p: ReadingHeroCountdownProps): string {
  return renderToStaticMarkup(createElement(ReadingHeroCountdown, p));
}

function timeLineText(html: string): string {
  const m = html.match(/<p class="kit-when-time">([\s\S]*?)<\/p>/);
  expect(m, "the .kit-when-time line is missing").not.toBeNull();
  return m![1];
}

describe("blocks — the when group (M1): the day on one line, the time on the next, a clock that never splits", () => {
  it("upcoming: day line, time line, no 'Your time' on the first paint (it waits for the visitor's zone)", () => {
    const html = renderIsland(props({ asOfMs: STARTS - 3 * ONE_DAY_MS }));
    expect(html).toContain('<p class="kit-when-day">Wednesday, September 23</p>');
    const time = timeLineText(html);
    expect(time).toContain("1:11");
    expect(time).toContain("MDT"); // 2026-09-26 is daylight time — computed, never hard-coded
    expect(html).not.toContain("Your time");
  });

  it("every gap inside the clock-plus-zone line is U+00A0 — no U+0020, no U+202F", () => {
    const html = renderIsland(props({ asOfMs: STARTS - 3 * ONE_DAY_MS }));
    const time = timeLineText(html);
    expect(time).toContain("\u00A0");
    expect(time.replace(/\u00A0/g, "")).not.toMatch(/\s/);
  });

  it("PROVEN, not ICU-trusted: under a stubbed Intl that emits a PLAIN space, the render still carries only &nbsp;", () => {
    class FakeDTF {
      constructor() {}
      format() {
        return "1:11 PM"; // the ICU-78.3 shape checker C11 measured — a plain U+0020
      }
      formatToParts() {
        return [{ type: "timeZoneName", value: "MDT" }];
      }
      resolvedOptions() {
        return { timeZone: "America/Denver" };
      }
    }
    vi.stubGlobal("Intl", { DateTimeFormat: FakeDTF });
    const html = renderIsland(props({ asOfMs: STARTS - 3 * ONE_DAY_MS }));
    const time = timeLineText(html);
    expect(time).not.toMatch(/ /);
    expect(time).toContain("1:11\u00A0PM\u00A0MDT");
  });

  it("…and under a stubbed Intl that emits U+202F (the other ICU shape), it still lands on U+00A0", () => {
    class FakeDTF {
      constructor() {}
      format() {
        return "1:11 PM";
      }
      formatToParts() {
        return [{ type: "timeZoneName", value: "MDT" }];
      }
      resolvedOptions() {
        return { timeZone: "America/Denver" };
      }
    }
    vi.stubGlobal("Intl", { DateTimeFormat: FakeDTF });
    const html = renderIsland(props({ asOfMs: STARTS - 3 * ONE_DAY_MS }));
    const time = timeLineText(html);
    expect(time).not.toMatch(/ /);
    expect(time).toContain("1:11\u00A0PM\u00A0MDT");
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });
});

describe("blocks — the four cells, tabular numerals, and the honest edges", () => {
  it("upcoming: days/hours/mins/secs cells, two digits each, from the SAME schedule/next/asOfMs", () => {
    const html = renderIsland(props({ asOfMs: STARTS - 3 * ONE_DAY_MS }));
    for (const u of ["d", "h", "m", "s"]) {
      const cell = html.match(new RegExp(`<span class="kit-count-num" data-u="${u}">(\\d{2})</span>`));
      expect(cell, `the ${u} cell is missing`).not.toBeNull();
    }
    expect(html).toContain('<span class="kit-count-num" data-u="d">03</span>');
    expect(html).toContain("kit-count-unit");
  });

  it("soon (inside 24 h) keeps the same four cells — 01 hour 3 days out is 00/01/00/00", () => {
    const html = renderIsland(props({ asOfMs: STARTS - 3600_000 }));
    expect(html).toContain('<span class="kit-count-num" data-u="d">00</span>');
    expect(html).toContain('<span class="kit-count-num" data-u="h">01</span>');
  });

  it("window: the when-lines stay and it says 'Starting now.' — it NEVER infers the room is open from the clock alone", () => {
    const html = renderIsland(props({ asOfMs: STARTS + 30 * 60_000 }));
    expect(html).toContain("Starting now.");
    expect(html).toContain("kit-when-day");
    expect(html).not.toContain("kit-count-num");
    expect(html).not.toMatch(/live|open|watch/i);
  });

  it("off: the countdown shows NOTHING (K122 item 13 — a clean 'date to come' page) — no cells, no when-lines, no words, no button", () => {
    const html = renderIsland(props({ schedule: { ...BASE, on: false }, next: null }));
    expect(html).toBe("");
  });
});

/* ═══════════════ hero/card stay byte-identical (L3's law, fixtures captured pre-lane) ═══════════════ */

describe("the hero and card variants are byte-identical to the pre-lane build", () => {
  const FIXTURES: Array<[string, ReadingHeroCountdownProps, string]> = [
    ["hero off", props({ schedule: { ...BASE, on: false }, next: null, variant: "hero" }), '<p class="kit-body">Stay tuned, with love.</p>'],
    ["hero window", props({ asOfMs: STARTS + 30 * 60_000, variant: "hero" }), '<p class="kit-body">Starting soon.</p>'],
    [
      "hero upcoming",
      props({ asOfMs: STARTS - 3 * ONE_DAY_MS, variant: "hero" }),
      '<p class="kit-body">Wednesday · 1:11 PM MDT · live online</p>',
    ],
    [
      "hero soon",
      props({ asOfMs: STARTS - 3600_000, variant: "hero" }),
      '<p class="kit-body">Wednesday · 1:11 PM MDT · live online</p>',
    ],
    ["card off", props({ schedule: { ...BASE, on: false }, next: null, variant: "card" }), '<div class="kit-stack"><div>Stay tuned, with love.</div></div>'],
    ["card window", props({ asOfMs: STARTS + 30 * 60_000, variant: "card" }), '<div class="kit-stack"><div>Starting soon.</div></div>'],
    [
      "card upcoming",
      props({ asOfMs: STARTS - 3 * ONE_DAY_MS, variant: "card" }),
      '<div class="kit-stack"><div>Next reading.</div><div>Wednesday, September 23</div><div class="kit-text-quiet">Love: 1:11 PM MDT.</div></div>',
    ],
  ];

  for (const [name, p, expected] of FIXTURES) {
    it(`${name}`, () => {
      expect(renderIsland(p)).toBe(expected);
    });
  }

  it("card soon — the countdown's own value is clock-dependent, so the SHAPE around it is pinned byte-exactly", () => {
    const html = renderIsland(props({ asOfMs: STARTS - 3600_000, variant: "card" }));
    expect(html).toMatch(
      /^<div class="kit-stack"><div>Next reading\.<\/div><div>Wednesday, September 23<\/div><div class="kit-text-quiet">Love: 1:11 PM MDT\.<\/div><div>Starts in <span>\d{1,4}:\d{2}(:\d{2})?<\/span>\.<\/div><\/div>$/,
    );
  });
});

/* ═══════════════ Stage2Details — every word derived (L4 + M3) ═══════════════ */

function renderDetails(weekPass: { name: string; price: string } | null): string {
  return renderToStaticMarkup(createElement(Stage2Details, { weekPass }));
}

describe("Stage2Details — the round-3 heading and the derive-every-word law", () => {
  it("the kicker, the heading and the one line, verbatim (M3)", () => {
    const html = renderDetails(null);
    expect(html).toContain("Stage 2 · after the reading");
    expect(html).toContain("Join the discussion");
    expect(html).toContain("Right after the reading, Love opens a live group video call. Come talk with her.");
  });

  /* TASK-465 (block 968,561) raised the floor to Observer, dropping
     Weekly Intuitive from this list. TASK-471 (block 968,624) — the
     Admiral's Saturday-night minimal fix — moved the floor back to A for
     this room; re-trued from ["B","C"] / 2 rows back to ["A","B","C"] /
     3 rows, tier-A's own week page. */
  it("one row per tier AT OR ABOVE the floor — the name LINKED to its TIER_PAGES page (TASK-449), the monthly price from TIERS, the tagline from TIER_PAGES", () => {
    const html = renderDetails(null);
    const floorUp = (["A", "B", "C"] as Tier[]).filter((t) => tierSatisfies(t, STAGE2_MIN_TIER));
    expect(floorUp).toEqual(["A", "B", "C"]);
    for (const t of floorUp) {
      const page = TIER_PAGES.find((p) => p.tier === t)!;
      expect(html).toContain(`<b><a href="/packages/${page.slug}">${TIERS[t].name}</a></b>`);
      expect(html).toContain(page.tagline);
      expect(html).toContain(`$${TIERS[t].priceUsd} / month`);
    }
    const rows = html.match(/<li>/g) ?? [];
    expect(rows).toHaveLength(3);
    expect(html).not.toContain("once");
  });

  it("the pass row rides the live store item's OWN name and price, linked to the FLOOR tier's page (swap the fixture price and watch it follow)", () => {
    const html = renderDetails({ name: "Weekly Chronicles — One Week Pass", price: "$12.50" });
    const floorPage = TIER_PAGES.find((p) => p.tier === STAGE2_MIN_TIER)!;
    expect(html).toContain(`<b><a href="/packages/${floorPage.slug}">Weekly Chronicles — One Week Pass</a></b>`);
    expect(html).toContain("$12.50 once");
    expect(html).not.toContain("$11 once");
    /* AMENDMENT 1 (block 968,366): the encore's visible name is the
       Playground */
    expect(html).toContain(`One week of ${TIERS[STAGE2_MIN_TIER].name}, the Playground included.`);
    const rows = html.match(/<li>/g) ?? [];
    expect(rows).toHaveLength(4);
  });

  it("every row's price rides .kit-rows-end — the one right edge (the /a uniformity law's grid)", () => {
    const html = renderDetails({ name: "Weekly Chronicles — One Week Pass", price: "$11" });
    const rows = html.match(/<li>[\s\S]*?<\/li>/g) ?? [];
    expect(rows.length).toBe(4);
    for (const r of rows) expect(r).toContain("kit-rows-end");
  });

  it("the source derives, never literals: TIERS and TIER_PAGES imported, no $-amount and no weekday written out", async () => {
    const src = await read(DETAILS);
    expect(src).toContain('from "@/lib/entitlement"');
    expect(src).toContain('from "@/lib/tiers-content"');
    expect(src).not.toMatch(/\$\d/);
    expect(src).not.toMatch(/\b(Sunday|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday)\b/);
  });
});

/* ═══════════════ the K122 fix round (block 968,284) — the look-side pins ═══════════════ */

describe("K122 item 6a — whenOnly: the island's non-closed companion node renders the when-lines with NO cells and NO 'Starting now.'", () => {
  it("upcoming: the when-lines, no cells", () => {
    const html = renderIsland(props({ asOfMs: STARTS - 3 * ONE_DAY_MS, whenOnly: true }));
    expect(html).toContain("kit-when-day");
    expect(html).not.toContain("kit-count");
  });

  it("window: the when-lines, never 'Starting now.' (the island's live-line carries that truth now)", () => {
    const html = renderIsland(props({ asOfMs: STARTS + 30 * 60_000, whenOnly: true }));
    expect(html).toContain("kit-when-day");
    expect(html).not.toContain("Starting now.");
  });
});

describe("K122 items 1, 3, 6b, 9 — the kit.css additions carry the fix round's rules", () => {
  it("item 1: the Stage 1 card's rows stack under 769 px (words, the state line, then the control on the row's right edge) — SCOPED to the card; the shared .kit-rows grid stays two-column for Stage2Details (SHEET-live-390)", async () => {
    const css = await additions();
    expect(css).toContain(".kit-rows>li{display:grid;grid-template-columns:1fr auto;gap:16px;align-items:center");
    expect(css).toContain(".kit-stage1-card .kit-rows>li{grid-template-columns:1fr");
    expect(css).toContain(".kit-stage1-card .kit-rows-end{justify-self:end}");
  });

  it("item 3: disabled controls LOOK disabled — scoped to .kit-rows-end (:disabled and [aria-disabled=\"true\"]), never a site-wide kit change", async () => {
    const css = await additions();
    expect(css).toContain('.kit-rows-end :disabled,.kit-rows-end [aria-disabled="true"]{opacity:.55;cursor:not-allowed}');
  });

  it("item 6b: the band rhythm is the mock's own (frag-common-top:3-5) — a 12 px flow, the kicker and h1 carrying no margin, a shared rule under .sky-stage", async () => {
    const css = await additions();
    expect(css).toContain(".sky-stage .kitx-flow{gap:12px}");
    expect(css).toContain(".sky-stage .kitx-flow>.kicker,.sky-stage .kitx-flow>.kit-h1{margin:0}");
  });

  it("item 9: Stay in the know's 16 px lands on the card BODY (kit/Card wraps children in .kit-card-body — the outer rule's gap never reached the field)", async () => {
    const css = await additions();
    expect(css).toContain(".kit-signup .kit-card-body{display:flex;flex-direction:column;gap:16px;align-items:center;text-align:center}");
  });
});
