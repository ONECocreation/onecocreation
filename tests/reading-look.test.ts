import { describe, it, expect, afterEach, vi } from "vitest";
import { promises as fs } from "fs";
import path from "path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ReadingHeroCountdown, { type ReadingHeroCountdownProps } from "@/components/ReadingHeroCountdown";
import Stage2Details from "@/components/reading/Stage2Details";
import { TIERS, type Tier } from "@/lib/entitlement";
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
    expect(sections).toContain('"hero"');
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

  it("mounts ReadingStage with the phase only (phase-only SSR), and reads the phase from getStage1State", async () => {
    const src = await read(PAGE);
    expect(src).toContain("(await getStage1State()).phase");
    expect(src).toContain("initialPhase={");
    expect(src).toContain("<ReadingStage");
  });

  it("mounts ReadingSignUp variant=public EXACTLY ONCE as its own kitx-section-first under the sky band (M4) — still never a /news href", async () => {
    const src = await read(PAGE);
    const mounts = src.match(/<ReadingSignUp/g) ?? [];
    expect(mounts).toHaveLength(1);
    expect(src).toContain('<ReadingSignUp variant="public"');
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
    expect(src).toContain("Join the discussion after: a live group video call with Love, with any membership");
    expect(src).toContain("Weekly Chronicles pass");
    expect(src).toContain('getItem("weekly-one-week")');
    expect(src).toContain("dollars(");
  });

  it("the host section is .kitx-host with the real portrait, and the one bottom button reads 'Back to the reading ↑' to #stage (Stage 1, never Stage 2)", async () => {
    const src = await read(PAGE);
    expect(src).toContain('"kitx-host"');
    expect(src).toContain("/images/love-sidelook.webp");
    expect(src).toContain("Back to the reading ↑");
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
    expect(time).toContain("&nbsp;");
    expect(time.replace(/&nbsp;/g, "")).not.toMatch(/\s/);
  });

  it("PROVEN, not ICU-trusted: under a stubbed Intl that emits a PLAIN space, the render still carries only &nbsp;", () => {
    class FakeDTF {
      constructor(_locale?: unknown, _opts?: unknown) {}
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
    expect(time).toContain("1:11&nbsp;PM&nbsp;MDT");
  });

  it("…and under a stubbed Intl that emits U+202F (the other ICU shape), it still lands on U+00A0", () => {
    class FakeDTF {
      constructor(_locale?: unknown, _opts?: unknown) {}
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
    expect(time).toContain("1:11&nbsp;PM&nbsp;MDT");
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

  it("off: 'Stay tuned, with love.' — no cells, no when-lines, no button", () => {
    const html = renderIsland(props({ schedule: { ...BASE, on: false }, next: null }));
    expect(html).toContain("Stay tuned, with love.");
    expect(html).not.toContain("kit-count");
    expect(html).not.toContain("kit-when");
    expect(html).not.toContain("<button");
    expect(html).not.toContain("<a ");
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

  it("one row per tier — the name and monthly price from TIERS, the tagline from TIER_PAGES", () => {
    const html = renderDetails(null);
    for (const t of ["A", "B", "C"] as Tier[]) {
      expect(html).toContain(`<b>${TIERS[t].name}</b>`);
      const page = TIER_PAGES.find((p) => p.tier === t)!;
      expect(html).toContain(page.tagline);
      expect(html).toContain(`$${TIERS[t].priceUsd} / month`);
    }
    const rows = html.match(/<li>/g) ?? [];
    expect(rows).toHaveLength(3);
    expect(html).not.toContain("once");
  });

  it("the pass row rides the live store item's OWN name and price (swap the fixture price and watch it follow)", () => {
    const html = renderDetails({ name: "Weekly Chronicles — One Week Pass", price: "$12.50" });
    expect(html).toContain("<b>Weekly Chronicles — One Week Pass</b>");
    expect(html).toContain("$12.50 once");
    expect(html).not.toContain("$11 once");
    expect(html).toContain(`One week of ${TIERS.A.name}, Stage 2 included.`);
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
