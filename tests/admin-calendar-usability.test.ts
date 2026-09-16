import { describe, it, expect } from "vitest";
import { promises as fs } from "fs";
import path from "path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { bftMonthGrid } from "@/lib/calendar-view";
import DayCell, { type CalendarEventPill } from "@/components/calendar/DayCell";
import { attentionCounts } from "@/components/console/AttentionStrip";
import { buildDeskMarks } from "@/components/console/desk/marks";
import type { OrderRecord } from "@/lib/store";

/**
 * TASK-319 (0018.06.26 a₿ — the Admiral: the admin Home calendar has
 * "bad overlapping", the pills unreadable, and "the mark fullfilled area
 * is kind of a nunsance… section can be minimized"). Two halves, pinned:
 *
 *  1. THE DAY CELL — three root causes, three pins: the pill's
 *     white-space:nowrap+ellipsis truncated every label to "~1…"/"12:…"
 *     inside the 84px column; the day-of-year numeral was
 *     position:absolute over the pill row (the AUG 17 overlap in the
 *     Admiral's shot); the civil-month-boundary head crowded both named
 *     dates onto one line. The fix lets a pill take two full-width lines
 *     (labels lead with the time, so the time never ellipsizes), caps
 *     the glance at 2 pills + an honest "+N more", and moves the numeral
 *     into the normal flow. CSS pins + real renders, the house idiom
 *     (tests/calendar-cell-radius.test.ts, tests/calendar-clicks-through.test.ts).
 *
 *  2. WHERE "MARK FULFILLED" LIVES — the brief's named decision, option
 *     (b) per Astra's K48 read: fulfilment lives ONLY in the Money
 *     room's order popup (it already carried an identical button); Home
 *     keeps one compact counted pointer. Pinned: the pointer counts the
 *     same things the old strip listed (goods to ship, offers waiting —
 *     sessions stay on the calendar), the strip no longer carries the
 *     action, Money still does (the action is moved, never deleted),
 *     and loading/quiet/failed never blur (a failed load is loud with a
 *     retry — it must never read as "nothing waiting").
 */

const read = (rel: string) => fs.readFile(path.join(process.cwd(), rel), "utf8");

function makeCell() {
  return bftMonthGrid(18, 6).cells[3];
}

function pill(id: string, label: string): CalendarEventPill {
  return { id, label, variant: "plain" };
}

function order(id: string, over: Partial<OrderRecord> = {}): OrderRecord {
  return {
    id,
    lineItems: [{ itemId: "it_1", title: "Postcard", qty: 1 }],
    ...over,
  } as OrderRecord;
}

describe("the day cell — the overlap's three root causes stay fixed", () => {
  it("the day-of-year numeral is no longer absolutely positioned over the pills", async () => {
    const css = await read("src/components/calendar/calendar-view.css");
    const doyRule = css.match(/\.cal-cell__doy\{[^}]*\}/)?.[0] ?? "";
    expect(doyRule).not.toBe("");
    expect(doyRule).not.toMatch(/position\s*:\s*absolute/);
  });

  it("a pill may take two lines — no nowrap truncation; the honest clamp rides line-clamp", async () => {
    const css = await read("src/components/calendar/calendar-view.css");
    const pillRule = css.match(/\.cal-pill\{[^}]*\}/)?.[0] ?? "";
    expect(pillRule).not.toBe("");
    expect(pillRule).not.toMatch(/white-space\s*:\s*nowrap/);
    expect(pillRule).toMatch(/line-clamp\s*:\s*2/);
    // the radius pin's rule block must still be the same one (calendar-cell-radius.test.ts)
    expect(pillRule).toMatch(/border-radius:999px/);
  });

  it("one pill per row, full cell width — the pills column, not a wrap row", async () => {
    const css = await read("src/components/calendar/calendar-view.css");
    const pillsRule = css.match(/\.cal-cell__pills\{[^}]*\}/)?.[0] ?? "";
    expect(pillsRule).toMatch(/flex-direction\s*:\s*column/);
  });

  it("a civil-month-boundary cell's head may wrap — the scoped breathing room", async () => {
    const css = await read("src/components/calendar/calendar-view.css");
    expect(css).toMatch(/\.cal-cell--boundary \.cal-cell__head\{[^}]*flex-wrap\s*:\s*wrap/);
  });

  it("the week ribbon rides the SAME 84px cell floor as the month grid — a ~45px cell splits the time mid-token", async () => {
    const css = await read("src/components/calendar/calendar-view.css");
    const ribbonRule = css.match(/\.cal-week-ribbon\{[^}]*\}/)?.[0] ?? "";
    expect(ribbonRule).toMatch(/minmax\(84px,1fr\)/);
    expect(ribbonRule).toMatch(/min-width:588px/);
  });

  it("pill labels lead with the time, so the time never ellipsizes (marks.ts's contract)", () => {
    const cell = makeCell();
    const marks = buildDeskMarks(
      {
        rules: [],
        overrides: [],
        bookings: [{
          bookingId: "bk_1",
          title: "Soul Reading",
          customer: "Riley",
          startUtc: cell.civilDate.toISOString(),
          state: "booked",
          needsFulfil: false,
        }],
      },
      { todayCivilKey: "1999-01-01" },
    );
    const label = marks(cell)?.pills?.find((p) => p.id === "bk_1")?.label ?? "";
    expect(label).toMatch(/^\d{1,2}:\d{2} /);
  });
});

describe("the day cell — the glance caps at 2 pills + an honest \"+N more\"", () => {
  it("four pills render as two pills + \"+2 more\"", () => {
    const html = renderToStaticMarkup(
      createElement(DayCell, {
        cell: makeCell(),
        primary: "bft",
        counts: false,
        marks: { pills: [pill("a", "9:00 One"), pill("b", "10:00 Two"), pill("c", "11:00 Three"), pill("d", "12:00 Four")] },
        onSelectPill: () => {},
      }),
    );
    expect(html.match(/cal-pill cal-pill--plain/g)).toHaveLength(2);
    expect(html).toContain("+2 more");
    expect(html).not.toContain("11:00 Three");
  });

  it("the \"+N more\" is an inert span, never a pill and never a door", () => {
    const html = renderToStaticMarkup(
      createElement(DayCell, {
        cell: makeCell(),
        primary: "bft",
        counts: false,
        marks: { pills: [pill("a", "9:00 One"), pill("b", "10:00 Two"), pill("c", "11:00 Three")] },
        onSelectPill: () => {},
      }),
    );
    expect(html).toMatch(/<span[^>]*class="cal-cell__more"[^>]*>\+1 more<\/span>/);
    // two pill buttons only — the overflow line is not a third door
    expect(html.match(/<button[^>]*class="cal-pill/g)).toHaveLength(2);
  });

  it("two pills or fewer render whole — no overflow line", () => {
    const html = renderToStaticMarkup(
      createElement(DayCell, {
        cell: makeCell(),
        primary: "bft",
        counts: false,
        marks: { pills: [pill("a", "9:00 One"), pill("b", "10:00 Two")] },
      }),
    );
    expect(html).toContain("9:00 One");
    expect(html).toContain("10:00 Two");
    expect(html).not.toContain("more");
  });

  it("the day-of-year numeral still renders (moved to the flow, not dropped)", () => {
    const cell = makeCell();
    const html = renderToStaticMarkup(
      createElement(DayCell, { cell, primary: "bft", counts: true }),
    );
    expect(html).toMatch(/<span class="cal-cell__doy">/);
    expect(html).toContain(String(cell.dayOfYear));
  });
});

describe("the named decision (b) — fulfilment lives in Money; Home keeps a counted pointer", () => {
  it("attentionCounts carries goods to ship + offers waiting — sessions stay on the calendar", () => {
    const orders = [
      order("o_goods", { state: "settled" }),
      order("o_session", { state: "settled", bookingId: "bk_1" }),
      order("o_offer", { pwycPending: true }),
      order("o_done", { state: "fulfilled" }),
    ];
    const { goods, offers } = attentionCounts(orders, ["o_goods", "o_session"]);
    expect(goods).toBe(1); // o_session is flagged too, but it lives on the calendar
    expect(offers).toBe(1);
  });

  it("Home's strip no longer carries the fulfil action — it points at the order book", async () => {
    const src = await read("src/components/console/AttentionStrip.tsx");
    expect(src).not.toContain("Mark fulfilled");
    expect(src).not.toContain('action: "fulfill"');
    expect(src).toContain('href="/a/money"');
  });

  it("the action is MOVED, never deleted — Money's order popup still marks fulfilled", async () => {
    const src = await read("src/app/a/money/page.tsx");
    expect(src).toContain("Mark fulfilled ✓");
    expect(src).toContain('action: "fulfill"');
    // and the rows waiting on Love's hand wear the flag the pointer counts
    expect(src).toContain("needsAttention");
    expect(src).toContain("⚑");
  });

  it("loading / quiet / failed never blur — a failed load is loud and offers a retry", async () => {
    const src = await read("src/components/console/AttentionStrip.tsx");
    // a distinct loud failure state (never the null of an honestly-empty book)
    expect(src).toContain('"failed"');
    expect(src).toContain("didn&apos;t answer");
    expect(src).toContain("Retry");
    // the quiet line for loading, distinct again
    expect(src).toContain("checking the order book…");
    // and the honestly-empty book still renders nothing at all
    expect(src).toMatch(/if \(goods === 0 && offers === 0\) return null/);
  });
});
