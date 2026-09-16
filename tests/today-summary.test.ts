import { describe, it, expect, vi } from "vitest";
import { promises as fs } from "fs";
import path from "path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

/* TodaySummary calls useRouter for its error-state Retry (next/navigation
   throws "expected app router to be mounted" outside it) — the house's
   mock idiom (tests/door-key-handoff.test.ts) */
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: () => {}, replace: () => {}, back: () => {}, refresh: () => {} }),
}));

import TodaySummary, { formatSessionTime, type TodayNext } from "@/components/console/TodaySummary";

/**
 * TASK-326 (0018.06.26 a₿ — the Admiral accepted Astra's review-r1,
 * findings 3 + 9 + 10): Home's two static cards become a Today summary.
 * Pinned, provable without a browser (the gates run vitest, not a diff):
 *
 *  1. THE NEXT-SESSION LINE — a real booking renders its title and its
 *     complete 24-hour time in HER zone (the record's artistTz, never the
 *     browser's guess), and taps through to the calendar.
 *  2. THE THREE STATES NEVER BLUR (finding 10) — data / quiet zero
 *     ("nothing scheduled") / loud error ("couldn't load… Retry") are
 *     three distinct markups; the error never reads as a quiet day.
 *  3. THE COUNTED POINTER — T-319's AttentionStrip is mounted inside the
 *     summary unchanged (its SSR initial state is the loading line).
 *  4. THE LIVE ACTION — liveNow renders the Go-Live link.
 *  5. THE PAGE — the six reminders folded into a collapsed <details>
 *     (with the Go-Live pointer keeping its literal href="/a/live"), the
 *     p-6 wrapper and the retired card copy gone.
 */

const read = (rel: string) => fs.readFile(path.join(process.cwd(), rel), "utf8");

const next: TodayNext = {
  serviceTitle: "Heart Field reading",
  startUtc: "2026-09-20T18:00:00.000Z",
  endUtc: "2026-09-20T19:30:00.000Z",
  artistTz: "America/New_York", // UTC-4 in September — 18:00Z is her 14:00
};

const render = (props: Parameters<typeof TodaySummary>[0]) =>
  renderToStaticMarkup(createElement(TodaySummary, props));

describe("the next-session line — real time, her zone, 24 hours", () => {
  it("formats the complete 24h read in the record's artistTz", () => {
    const s = formatSessionTime(next);
    expect(s).toContain("14:00"); // 18:00Z in America/New_York, 24-hour clock
    expect(s).toContain("15:30"); // the end time rides the same read
    expect(s).not.toMatch(/PM/i); // never the 12-hour clock
    expect(s).toContain("Sunday"); // the full date leads
    expect(s).toContain("September");
  });

  it("a real booking renders its title, time, and the tap through to the calendar", () => {
    const html = render({ next, liveNow: false });
    expect(html).toContain("Heart Field reading");
    expect(html).toContain("14:00");
    expect(html).toContain('href="/a/booking"');
  });
});

describe("the three states never blur (finding 10)", () => {
  it("zero is one quiet line — and never carries the error's words", () => {
    const html = render({ next: null, liveNow: false });
    expect(html).toContain("nothing scheduled");
    expect(html).not.toContain("couldn");
    expect(html).not.toContain("Retry");
  });

  it("error is loud and offers the retry — and never reads as a quiet day", () => {
    const html = render({ next: "error", liveNow: false });
    expect(html).toContain("couldn&#x27;t load the schedule");
    expect(html).toContain("Retry");
    expect(html).not.toContain("nothing scheduled");
    expect(html).not.toContain("/a/booking");
  });

  it("data carries neither the zero line nor the error line", () => {
    const html = render({ next, liveNow: false });
    expect(html).not.toContain("nothing scheduled");
    expect(html).not.toContain("Retry");
  });
});

describe("the counted pointer and the live action", () => {
  it("T-319's AttentionStrip is mounted inside the summary (its SSR state is the loading line)", () => {
    const html = render({ next, liveNow: false });
    expect(html).toContain("checking the order book");
  });

  it("liveNow renders the room's name and the Go-Live door", () => {
    const html = render({ next: null, liveNow: true, liveTitle: "Heart Field · the studio" });
    expect(html).toContain("LIVE now");
    expect(html).toContain("Heart Field · the studio");
    expect(html).toContain('href="/a/live"');
  });

  it("not live renders no live line", () => {
    const html = render({ next: null, liveNow: false });
    expect(html).not.toContain("LIVE now");
  });
});

describe("the page — the fold and the pins that must survive", () => {
  it("the six reminders are folded into a collapsed <details>, the Go-Live pointer keeping its literal link", async () => {
    const src = await read("src/app/a/page.tsx");
    expect(src).toContain("<details");
    expect(src).toContain("Routine checks");
    expect(src).not.toContain("<details open"); // collapsed by default
    expect(src).toContain('href="/a/live"'); // tests/go-live-door.test.ts's pin survives
    // the six reminders, all still there (T-323's Sessions & hours link included)
    expect(src).toContain("tap a flagged session");
    expect(src).toContain('href="/a/letters"');
    expect(src).toContain("give-what-you-can offers waiting");
    expect(src).toContain("Sessions &amp; hours");
    expect(src).toContain("who needs a hand");
  });

  it("the retired static cards are gone; the wrapper and the summary mount stand", async () => {
    const src = await read("src/app/a/page.tsx");
    expect(src).toContain('<div className="p-6">'); // tests/a-one-dialect.test.ts's pin survives
    expect(src).toContain("<TodaySummary");
    expect(src).not.toContain('SectionHead label="Go live"');
    expect(src).not.toContain("Love's week");
    expect(src).not.toContain("LiveDoorCard");
  });

  it("the next-session read is server-side, marked honestly on failure", async () => {
    const src = await read("src/app/a/page.tsx");
    expect(src).toContain("listBookings");
    expect(src).toContain('"error"');
  });

  it("every tap target in the summary is 44px (the 390px law)", async () => {
    const src = await read("src/components/console/TodaySummary.tsx");
    expect(src).toContain("minHeight: 44");
  });
});
