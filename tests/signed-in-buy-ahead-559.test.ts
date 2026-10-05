import { describe, it, expect } from "vitest";
import { promises as fs } from "fs";
import path from "path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { buyAheadShows } from "@/lib/reading-schedule";
import { dayWords, opensWords } from "@/lib/reading-day";
import ReadingDayBody, { type ReadingDayBodyProps } from "@/components/reading/ReadingDayBody";
import { ReadingSignInCard } from "@/components/rooms/ReadingSignInBox";
import { wallClockToUtc } from "@/lib/booking-time";
import type { ReadingSchedule } from "@/lib/reading-schedule";

/**
 * TASK-559 (block 970,084) - the owner's two review marks:
 * "when a user is already signed in, can we remove the keep me posted
 * letters. they are already signed up for the mailing list." and "if user
 * is signed in. it is probably a good idea to show them the opportunity to
 * purchase a head of time."
 */

const read = (rel: string) => fs.readFile(path.join(process.cwd(), rel), "utf8");
const TZ = "America/Denver";
const at = (y: number, m: number, d: number, hh: number, mm: number) => wallClockToUtc(y, m, d, hh, mm, TZ).getTime();
const SAT_READING = at(2026, 10, 10, 13, 11);
const SAT_ENCORE = at(2026, 10, 10, 14, 22);
const SAT_QA = at(2026, 10, 10, 15, 33);
const SAT_HW = at(2026, 10, 10, 12, 12);

function props(over: Partial<ReadingDayBodyProps> = {}): ReadingDayBodyProps {
  return {
    tz: TZ,
    housewarmingStartsAtMs: SAT_HW,
    readingStartsAtMs: SAT_READING,
    encoreStartsAtMs: SAT_ENCORE,
    qaStartsAtMs: SAT_QA,
    signedIn: true,
    encoreEntitled: false,
    encoreFloor: { tier: "B", name: "Moonlight", itemId: "weekly-one-week", href: "/packages/moonlight", price: "$11", passLive: true },
    qaEntitled: false,
    qaOffer: { itemId: "q-a-meetup-with-love", passLive: true, price: "$33.33", eveningStar: { name: "Evening Star", price: "$111", href: "/packages/evening-star" } },
    ...over,
  } as ReadingDayBodyProps;
}
const render = (p: ReadingDayBodyProps) => renderToStaticMarkup(createElement(ReadingDayBody, p));

describe("TASK-559 buyAheadShows truth table", () => {
  for (const agenda of [false, true]) {
    for (const signedIn of [false, true]) {
      for (const hasNext of [false, true]) {
        const want = !agenda && signedIn && hasNext;
        it(`agenda ${agenda}, signed in ${signedIn}, next ${hasNext} -> ${want}`, () => {
          expect(buyAheadShows(agenda, signedIn, hasNext)).toBe(want);
        });
      }
    }
  }
});

describe("TASK-559 dayWords", () => {
  it("words the day the way opensWords does", () => {
    expect(dayWords(SAT_READING, TZ)).toBe("Saturday, October 10");
  });
  it("reads the day in the given zone, not the machine's", () => {
    const lateDenver = at(2026, 10, 10, 22, 0); // already Sunday in UTC
    expect(dayWords(lateDenver, TZ)).toBe("Saturday, October 10");
    expect(dayWords(lateDenver, "UTC")).toBe("Sunday, October 11");
  });
  it("opensWords still carries the same day", () => {
    const sched: ReadingSchedule = { on: true, weekday: 6, time: "13:11", tz: TZ, durationMin: 60 };
    expect(opensWords(sched, at(2026, 10, 5, 11, 6), SAT_READING)).toContain(dayWords(SAT_READING, TZ));
  });
});

describe("TASK-559 ReadingDayBody, ahead mode", () => {
  const html = render(props({ ahead: true }));
  it("heading names the day, the quiet line sits under it", () => {
    expect(html).toContain("Coming up Saturday, October 10");
    expect(html).toContain('<p class="kit-text-quiet">These follow the reading. You can unlock them ahead of time.</p>');
    expect(html.indexOf("Coming up Saturday")).toBeLessThan(html.indexOf("These follow the reading"));
    expect(html).toContain('aria-label="Coming up"');
  });
  it("rows 3 and 4 are there with their words, prices and buttons", () => {
    expect(html).toContain("The Book Talk");
    expect(html).toContain("The Q&amp;A with Love");
    expect(html).toContain("$11 once.");
    expect(html).toContain("$33.33 once.");
    expect(html).toContain("Unlock the Book Talk");
    expect(html).toContain("Unlock the Q&amp;A");
  });
  it("rows 1 and 2, the old heading and the open notice are absent", () => {
    expect(html).not.toContain("The Housewarming");
    expect(html).not.toContain("The Reading");
    expect(html).not.toContain("The day&#x27;s agenda");
    expect(html).not.toContain("Join the Housewarming");
    expect(html).not.toContain("Watch the Reading");
    expect((html.match(/<li>/g) ?? []).length).toBe(2);
  });
  it("an entitled visitor still gets the join buttons on rows 3 and 4", () => {
    const h = render(props({ ahead: true, encoreEntitled: true, qaEntitled: true }));
    expect(h).toContain("Join the Book Talk");
    expect(h).toContain("Join the Q&amp;A");
  });
  it("no em dash", () => {
    expect(html).not.toContain("—");
  });
});

describe("TASK-559 ReadingDayBody, default mode is as it was", () => {
  const html = render(props());
  it("old heading, all four rows, no ahead words", () => {
    expect(html).toContain("The day&#x27;s agenda");
    expect(html).toContain('aria-label="The day&#x27;s agenda"');
    expect((html.match(/<li>/g) ?? []).length).toBe(4);
    expect(html).toContain("The Housewarming");
    expect(html).toContain("The Reading");
    expect(html).not.toContain("Coming up");
    expect(html).not.toContain("ahead of time");
  });
  it("ahead false is byte-identical to ahead absent", () => {
    expect(render(props({ ahead: false }))).toBe(html);
  });
  it("the rows 3 and 4 markup is the same fragment in both modes", () => {
    const rows = (h: string) => h.slice(h.indexOf("<li>", h.indexOf("The Reading</b>")) , h.lastIndexOf("</li>") + 5);
    const ahead = render(props({ ahead: true }));
    const aheadRows = ahead.slice(ahead.indexOf("<li>"), ahead.lastIndexOf("</li>") + 5);
    expect(rows(html)).toBe(aheadRows);
  });
  it("no em dash", () => {
    expect(html).not.toContain("—");
  });
});

describe("TASK-559 ReadingSignInCard, the letters card", () => {
  const render2 = (p: Parameters<typeof ReadingSignInCard>[0]) => renderToStaticMarkup(createElement(ReadingSignInCard, p));
  it("an email member who arrived signed in gets nothing", () => {
    expect(render2({ member: { handle: "walker@example.test", space: "email" } })).toBe("");
  });
  it("a key member keeps the card", () => {
    const h = render2({ member: { handle: "npub1abc", space: "onecocreation" } });
    expect(h).toContain("Keep me posted");
    expect(h).toContain("<input");
    expect(h).not.toContain("—");
  });
  it("You're in still wins for an email member who just joined", () => {
    for (const outcome of ["joined", "already"] as const) {
      const h = render2({ member: { handle: "walker@example.test", space: "email" }, justJoined: outcome });
      expect(h).toContain("You&#x27;re in.");
      expect(h).not.toContain("—");
    }
  });
  it("a guest still gets the email form", () => {
    const h = render2({ member: null });
    expect(h).toContain('id="reading-signin-email"');
    expect(h).not.toContain("—");
  });
});

describe("TASK-559 source pins", () => {
  it("kit.css closes an empty section and its dashed line", async () => {
    const css = await read("src/app/kit.css");
    expect(css).toContain(".kitx-section:has(> .wrap:empty){display:none}");
    expect(css).toContain(".kitx-section:has(> .wrap:empty)+.kitx-section{border-top:0;padding-top:40px}");
  });
  it("the page keeps its bare mount and adds the ahead mount in its own section", async () => {
    const src = await read("src/app/reading/page.tsx");
    expect(src).toContain("const aheadOn = buyAheadShows(agendaOn, !!session, next !== null);");
    expect(src).toMatch(/\{agendaOn && \(\s*<section className="kitx-section">\s*<div className="wrap">\s*<ReadingDay \/>\s*<\/div>\s*<\/section>\s*\)\}/);
    expect(src).toMatch(/\{aheadOn && \(\s*<section className="kitx-section">\s*<div className="wrap">\s*<ReadingDay ahead \/>\s*<\/div>\s*<\/section>\s*\)\}/);
    expect(src).toContain('import { HOUSEWARMING_TIME, ENCORE_TIME, QA_TIME, sameDayAt, clockWords } from "@/lib/reading-day";');
  });
  it("ReadingDay hands the flag to the body", async () => {
    expect(await read("src/components/reading/ReadingDay.tsx")).toContain("ahead={ahead}");
  });
});
