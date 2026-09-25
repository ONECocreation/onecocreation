import { describe, it, expect } from "vitest";
import { promises as fs } from "fs";
import path from "path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ReadingHeroCountdown, {
  type ReadingHeroCountdownProps,
} from "@/components/ReadingHeroCountdown";
import type { ReadingSchedule } from "@/lib/reading-schedule";

/**
 * TASK-391 (block 968,088) — the Saturday reading page. `/reading` itself
 * is an async server component reading `headers()` (the same "pins, model
 * not render" house idiom `tests/site-knows-who-is-signed-in.test.ts`
 * names explicitly: "an async server component never renders in the node
 * env") — the FOUR honest states this brief's Tests section asks for live
 * in `ReadingHeroCountdown`, a plain client component with no `headers()`
 * dependency, so THAT is what's actually rendered here, across every
 * state; the page's own wiring (session read, door derivation, CTA label,
 * the no-literal law) is pinned at the source.
 *
 * Fixtures reuse tests/reading-schedule.test.ts's own measured instants
 * (BASE/STARTS/ENDS, and the two DST fixtures) rather than re-deriving new
 * UTC numbers by hand.
 */

const read = (rel: string) => fs.readFile(path.join(process.cwd(), rel), "utf8");

const PAGE_PATH = "src/app/reading/page.tsx";
const ISLAND_PATH = "src/components/ReadingHeroCountdown.tsx";

const BASE: ReadingSchedule = { on: true, weekday: 3, time: "13:11", tz: "America/Denver", durationMin: 60 };
const STARTS = Date.parse("2026-09-23T19:11:00.000Z"); // Wednesday 1:11 PM MDT — tests/reading-schedule.test.ts
const ENDS = Date.parse("2026-09-23T20:11:00.000Z");
const ONE_DAY_MS = 24 * 3600_000;

function props(overrides: Partial<ReadingHeroCountdownProps>): ReadingHeroCountdownProps {
  return { schedule: BASE, next: { startsAtMs: STARTS, endsAtMs: ENDS }, asOfMs: STARTS, variant: "hero", ...overrides };
}

function render(p: ReadingHeroCountdownProps): string {
  return renderToStaticMarkup(createElement(ReadingHeroCountdown, p));
}

describe("ReadingHeroCountdown — hero variant, one fixture per honest state", () => {
  it("off: 'Stay tuned, with love.' and nothing else — no button, no link, no stale date", () => {
    const html = render(props({ schedule: { ...BASE, on: false }, next: null, variant: "hero" }));
    expect(html).toContain("Stay tuned, with love.");
    expect(html).not.toContain("live online");
    expect(html).not.toContain("Starting soon.");
    expect(html).not.toContain("<a ");
    expect(html).not.toContain("<button");
  });

  it("window: 'Starting soon.' alone (decision B) — no date line, no countdown", () => {
    const html = render(props({ asOfMs: STARTS + 30 * 60_000, variant: "hero" }));
    expect(html).toContain("Starting soon.");
    expect(html).not.toContain("live online");
    expect(html).not.toContain("Stay tuned");
    expect(html).not.toContain("Starts in");
  });

  it("upcoming: the computed date line — weekday, clock, the REAL zone abbreviation, 'live online'", () => {
    const html = render(props({ asOfMs: STARTS - 3 * ONE_DAY_MS, variant: "hero" }));
    expect(html).toContain("Wednesday");
    expect(html).toContain("1:11");
    expect(html).toContain("MDT"); // computed, not the mock's illustrative generic "MT"
    expect(html).toContain("live online");
    expect(html).not.toContain("Starting soon.");
  });

  it("soon: the SAME date line as upcoming — decision B ties 'Starting soon' to window alone, never soon", () => {
    const html = render(props({ asOfMs: STARTS - 3600_000, variant: "hero" }));
    expect(html).toContain("Wednesday");
    expect(html).toContain("MDT");
    expect(html).toContain("live online");
    expect(html).not.toContain("Starting soon.");
  });

  it("a Sunday schedule prints Sunday, never Wednesday — the weekday is derived, not hardcoded either way", () => {
    const schedule: ReadingSchedule = { ...BASE, weekday: 0 };
    const starts = Date.parse("2026-09-27T19:11:00.000Z"); // the following Sunday, same wall time/zone
    const html = render(props({ schedule, next: { startsAtMs: starts, endsAtMs: starts + 3600_000 }, asOfMs: starts - 3 * ONE_DAY_MS, variant: "hero" }));
    expect(html).toContain("Sunday");
    expect(html).not.toContain("Wednesday");
  });
});

describe("ReadingHeroCountdown — card variant, the 'Next reading.' body", () => {
  it("off: 'Stay tuned, with love.' alone — no 'Next reading.', no countdown", () => {
    const html = render(props({ schedule: { ...BASE, on: false }, next: null, variant: "card" }));
    expect(html).toContain("Stay tuned, with love.");
    expect(html).not.toContain("Next reading.");
    expect(html).not.toContain("Love:");
  });

  it("window: 'Starting soon.' alone", () => {
    const html = render(props({ asOfMs: STARTS + 30 * 60_000, variant: "card" }));
    expect(html).toContain("Starting soon.");
    expect(html).not.toContain("Next reading.");
  });

  it("upcoming: 'Next reading.' + the day + Love's time — the visitor's own time is ABSENT from the first paint (DETERMINISTIC HYDRATION), no countdown", () => {
    const html = render(props({ asOfMs: STARTS - 3 * ONE_DAY_MS, variant: "card" }));
    expect(html).toContain("Next reading.");
    expect(html).toContain("Wednesday, September 23");
    expect(html).toContain("Love: 1:11");
    expect(html).toContain("MDT");
    expect(html).not.toContain("Your time");
    expect(html).not.toContain("Starts in");
  });

  it("soon: the same lines, PLUS the countdown's own initial rendered value — the target is present", () => {
    const html = render(props({ asOfMs: STARTS - 3600_000, variant: "card" }));
    expect(html).toContain("Next reading.");
    expect(html).toContain("Starts in");
    expect(html).toMatch(/Starts in[\s\S]{0,80}\d{1,4}:\d{2}(:\d{2})?/);
  });

  it("never a door or link of its own — the card's body is words and the countdown only, the page owns every CTA", () => {
    for (const p of [
      props({ schedule: { ...BASE, on: false }, next: null, variant: "card" }),
      props({ asOfMs: STARTS + 30 * 60_000, variant: "card" }),
      props({ asOfMs: STARTS - 3 * ONE_DAY_MS, variant: "card" }),
      props({ asOfMs: STARTS - 3600_000, variant: "card" }),
    ]) {
      const html = render(p);
      expect(html).not.toContain("<a ");
      expect(html).not.toContain("<button");
    }
  });
});

describe("ReadingHeroCountdown — the exact state boundaries (mirrors reading-notice.test.ts's own pins)", () => {
  it("24h before start (inclusive): soon — the card's countdown is present", () => {
    const html = render(props({ asOfMs: STARTS - ONE_DAY_MS, variant: "card" }));
    expect(html).toContain("Starts in");
  });

  it("one beat past 24h before start: upcoming — no countdown yet", () => {
    const html = render(props({ asOfMs: STARTS - ONE_DAY_MS - 1, variant: "card" }));
    expect(html).toContain("Next reading.");
    expect(html).not.toContain("Starts in");
  });

  it("the exact start instant: window, never soon — 'Starting soon.'", () => {
    const html = render(props({ asOfMs: STARTS, variant: "hero" }));
    expect(html).toContain("Starting soon.");
  });
});

describe("ReadingHeroCountdown — DST, the zone abbreviation is computed, never a fixed offset", () => {
  it("the spring gap (2026-03-08, Denver springs forward at 2am): the resolved instant reads MST, still pre-transition (measured in tests/reading-schedule.test.ts)", () => {
    const schedule: ReadingSchedule = { on: true, weekday: 0, time: "02:30", tz: "America/Denver", durationMin: 60 };
    const starts = Date.parse("2026-03-08T08:30:00.000Z");
    const html = render({ schedule, next: { startsAtMs: starts, endsAtMs: starts + 3600_000 }, asOfMs: starts - 3 * ONE_DAY_MS, variant: "hero" });
    expect(html).toContain("Sunday");
    expect(html).toContain("MST");
    expect(html).not.toContain("MDT");
  });

  it("the autumn fold (2026-11-01, Denver falls back at 2am): the resolved (first) occurrence reads MDT, the still-daylight instant (measured in tests/reading-schedule.test.ts)", () => {
    const schedule: ReadingSchedule = { on: true, weekday: 0, time: "01:30", tz: "America/Denver", durationMin: 60 };
    const starts = Date.parse("2026-11-01T07:30:00.000Z");
    const html = render({ schedule, next: { startsAtMs: starts, endsAtMs: starts + 3600_000 }, asOfMs: starts - 3 * ONE_DAY_MS, variant: "hero" });
    expect(html).toContain("Sunday");
    expect(html).toContain("MDT");
    expect(html).not.toContain("MST");
  });
});

describe("the page itself — source pins (async server component, headers()-dependent; the house's own 'pins, model not render' idiom)", () => {
  it("reads the session the same way every public page with a signed-in variant does (member-auth over the raw cookie header, never cookies())", async () => {
    const src = await read(PAGE_PATH);
    expect(src).toContain('from "@/lib/member-auth"');
    expect(src).toContain("sessionsFromCookieHeader(");
    expect(src).toContain('(await headers()).get("cookie")');
    expect(src).not.toContain("import { cookies }");
  });

  it("is dynamic, not cached — force-dynamic, the rooms/[slug]/page.tsx precedent", async () => {
    const src = await read(PAGE_PATH);
    expect(src).toContain('export const dynamic = "force-dynamic"');
  });

  it("the schedule comes from getSiteConfig()'s own reading field, falling back to DEFAULT_READING_SCHEDULE — never a page-local default", async () => {
    const src = await read(PAGE_PATH);
    expect(src).toContain("await getSiteConfig()");
    expect(src).toContain("config.reading ?? DEFAULT_READING_SCHEDULE");
  });

  it("Stage 1 is phase-only SSR: the page mounts ReadingStage with the phase from getStage1State() — never a room path, never a client-only door", async () => {
    const src = await read(PAGE_PATH);
    expect(src).toContain('from "@/components/reading/ReadingStage"');
    expect(src).toContain("(await getStage1State()).phase");
    expect(src).not.toContain("readingDoorHref");
    expect(src).not.toMatch(/href="\/rooms\//);
    expect(src).not.toContain("Enter the reading room");
    expect(src).not.toContain("Sign in to join");
  });

  it("the countdown rides INSIDE ReadingStage as server-composed nodes (K122 item 6a — the stage2Details idiom, the island owns the phase), and the page derives the FOLLOWING reading for the ended words (K122 item 7)", async () => {
    const src = await read(PAGE_PATH);
    expect(src).toContain("countdown={");
    expect(src).toContain("countdownWhen={");
    expect(src).toContain("nextReading(schedule, next.endsAtMs)");
    expect(src).toContain("following={");
  });

  it("the public sign-up card: ReadingSignUp variant=\"public\" exactly once — the letters, never a second door", async () => {
    const src = await read(PAGE_PATH);
    expect(src.match(/<ReadingSignUp /g)?.length).toBe(1);
    expect(src).toContain('variant="public"');
    expect(src).not.toMatch(/href="\/news"/);
  });

  it("K122 item 13 — Stay in the know mounts in EVERY schedule state: never gated on schedule.on && next, the date-less state is { kind: \"off\" }, and the kicker falls back to 'Readings with Love · free'", async () => {
    const src = await read(PAGE_PATH);
    expect(src).not.toContain("schedule.on && next");
    expect(src).toContain('{ kind: "off" }');
    expect(src).toContain("Readings with Love · free");
  });

  it("no payment logic on this page; the ONE tier read (TASK-466, block 968,561) reuses stage2-access's own composition for the Playground lock, never a re-implementation or a literal tier", async () => {
    const src = await read(PAGE_PATH);
    expect(src).not.toMatch(/\bpayment\b/i);
    // the sanctioned derivation only — the exact functions
    // /api/stage2/route.ts's GET calls, and the one place the floor is
    // written (STAGE2_MIN_TIER) — never a page-local gate
    expect(src).toContain("tierForSubject(");
    expect(src).toContain("tierSatisfies(");
    expect(src).toContain("STAGE2_MIN_TIER");
    expect(src).toContain("TIERS[STAGE2_MIN_TIER]");
    // never a literal tier letter as a comparison target or a hand-typed gate
    expect(src).not.toMatch(/tierSatisfies\([^)]*["'][ABC]["']/);
    expect(src).not.toMatch(/tier\s*===?\s*["'][ABC]["']/);
  });

  it("Love's video/graphic slots are honest absences — no <video>, no invented asset path, no placeholder box", async () => {
    const src = await read(PAGE_PATH);
    expect(src).not.toContain("<video");
    expect(src).not.toMatch(/public\/reading|\/reading\/(video|photo|graphic)/);
  });

  it("mounts the real SiteFooter, once — never a page-local footer", async () => {
    const src = await read(PAGE_PATH);
    expect(src).toContain('from "@/components/SiteFooter"');
    expect(src).toContain("<SiteFooter />");
    expect(src.match(/<SiteFooter/g)?.length).toBe(1);
  });

  it("the theme contract: house/kit classes and the seven RULED kitx- classes only, no inline style anywhere", async () => {
    const src = await read(PAGE_PATH);
    expect(src).not.toMatch(/style=\{\{/);
    for (const cls of ["kitx-balanced", "kitx-flow", "kitx-host", "kitx-section"]) {
      expect(src).toContain(cls);
    }
  });
});

describe("no literal weekday name and no \"1:11\" — the page AND its one helper island (the schedule computes it, never the source)", () => {
  const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

  for (const file of [PAGE_PATH, ISLAND_PATH]) {
    it(`${file} carries no hard-coded weekday name, no "1:11", and never the mock's literal "Every week"`, async () => {
      const src = await read(file);
      for (const day of WEEKDAYS) {
        expect(src).not.toMatch(new RegExp(`["'\`]${day}\\b`));
      }
      expect(src).not.toContain("1:11");
      expect(src).not.toContain("Every week");
    });
  }
});

describe("the design-drift theme contract — kit.css carries exactly the seven RULED kitx- rules", () => {
  it("every kitx- class the page/island use is defined in kit.css, and no eighth kitx- class exists", async () => {
    const css = await read("src/app/kit.css");
    const defined = [...css.matchAll(/\.kitx-([a-z]+)/g)].map((m) => m[0]);
    const unique = [...new Set(defined)].sort();
    expect(unique).toEqual([".kitx-actions", ".kitx-balanced", ".kitx-flow", ".kitx-host", ".kitx-mark", ".kitx-photo", ".kitx-section"].sort());
  });
});

describe("the nav catalog — /reading is catalogued and known, ungated (decision D)", () => {
  it("PAGE_CATALOG carries /reading with no feature gate", async () => {
    const { PAGE_CATALOG } = await import("@/components/NavMenu");
    const entry = PAGE_CATALOG.find((p) => p.href === "/reading");
    expect(entry).toBeTruthy();
    expect(entry?.feature).toBeUndefined();
  });

  it("KNOWN_NAV_HREFS carries /reading — a saved nav row pointing at it survives sanitize", async () => {
    const { KNOWN_NAV_HREFS } = await import("@/lib/site-config");
    expect(KNOWN_NAV_HREFS).toContain("/reading");
  });

  it("catalog/allow-list consistency (replaces the dropped same-commit pin): every PAGE_CATALOG href is a member of KNOWN_NAV_HREFS — the two lists never drift apart", async () => {
    const { PAGE_CATALOG } = await import("@/components/NavMenu");
    const { KNOWN_NAV_HREFS } = await import("@/lib/site-config");
    for (const p of PAGE_CATALOG) {
      expect(KNOWN_NAV_HREFS).toContain(p.href);
    }
  });
});
