import { describe, it, expect, vi } from "vitest";
import { promises as fs } from "fs";
import path from "path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { bftMonthGrid } from "@/lib/calendar-view";
import DayCell, { type CalendarEventPill } from "@/components/calendar/DayCell";
import BftMonthGrid from "@/components/calendar/BftMonthGrid";
import WeekRibbon from "@/components/calendar/WeekRibbon";
import WeekAltitude from "@/components/console/desk/WeekAltitude";
import DayAltitude from "@/components/console/desk/DayAltitude";
import { resolvePillAction } from "@/components/console/LovesDesk";
import type { DeskFeed } from "@/components/console/desk/types";

/**
 * TASK-248 (0018.06.23 a₿ — the Admiral: "make the weekly buttons also
 * clickable — when the day block is selected it would go to that day
 * view; if they select an item on the calendar it should go to that
 * item's details, for all the calendar views"). Ground (verified in the
 * cut brief): WeekRibbon already accepted `onSelectDay` — WeekAltitude
 * just never passed it on; DayCell's pills were always inert `<span>`s.
 *
 * DayCell has no hooks — calling it directly as a plain function (not
 * through React's renderer) returns the same element tree JSX would, and
 * lets these specs invoke the real onClick handlers with a fake event and
 * assert on `stopPropagation`/the exact callback args, with no jsdom in
 * this house (vitest.config.ts's `environment: "node"`). WeekRibbon/
 * BftMonthGrid/WeekAltitude do carry hooks (useCalendarPrefs), so their
 * own wiring is proven two ways: a real `renderToStaticMarkup` pass (the
 * SAME idiom tests/member-calendar.test.ts already uses for this shared
 * grid) showing the button/pill markup actually reaches the page, plus a
 * source-text pin (the idiom tests/calendar-cell-radius.test.ts already
 * uses) showing the exact reference is threaded straight through —
 * `onSelect={onSelectDay}` — which combined with DayCell's own proven
 * onClick behaviour is the whole chain, with no gap.
 */

const read = (rel: string) => fs.readFile(path.join(process.cwd(), rel), "utf8");

function makeCell() {
  return bftMonthGrid(18, 6).cells[3];
}

function makePill(id: string, label = "11:00 Reading with Ada"): CalendarEventPill {
  return { id, label, variant: "plain" };
}

/** Walk the plain React-element object graph DayCell(...) returns (no
 *  DOM, no renderer) and collect every node whose className contains
 *  `cls`. */
function findByClass(node: unknown, cls: string, out: Array<{ props: Record<string, unknown> }> = []) {
  if (node == null || typeof node !== "object") return out;
  if (Array.isArray(node)) {
    for (const n of node) findByClass(n, cls, out);
    return out;
  }
  const el = node as { props?: Record<string, unknown> };
  const className = el.props?.className;
  if (typeof className === "string" && className.split(" ").includes(cls)) {
    out.push(el as { props: Record<string, unknown> });
  }
  if (el.props?.children !== undefined) findByClass(el.props.children, cls, out);
  return out;
}

describe("DayCell — pills stay inert spans without onSelectPill (MemberCalendar's shape, untouched)", () => {
  it("renders a plain <span>, no <button>, when onSelectPill is not passed", () => {
    const cell = makeCell();
    const html = renderToStaticMarkup(
      createElement(DayCell, { cell, primary: "bft", counts: false, marks: { pills: [makePill("bk_1")] } }),
    );
    expect(html).toMatch(/<span[^>]*class="cal-pill cal-pill--plain"/);
    expect(html).not.toContain("<button");
  });
});

describe("DayCell — a pill becomes its own door when onSelectPill is given", () => {
  it("renders the pill as a <button> carrying an \"open <label>\" aria-label", () => {
    const cell = makeCell();
    const html = renderToStaticMarkup(
      createElement(DayCell, {
        cell,
        primary: "bft",
        counts: false,
        marks: { pills: [makePill("bk_1", "11:00 Reading with Ada")] },
        onSelectPill: () => {},
      }),
    );
    expect(html).toMatch(/<button[^>]*class="cal-pill cal-pill--plain"/);
    expect(html).toContain('aria-label="open 11:00 Reading with Ada"');
  });

  it("calls onSelectPill with the exact pill and cell, and stops the click from propagating to the day", () => {
    const cell = makeCell();
    const onSelect = vi.fn();
    const onSelectPill = vi.fn();
    const pill = makePill("bk_42", "14:00 Circle");
    const tree = DayCell({
      cell, primary: "bft", counts: false, marks: { pills: [pill] }, onSelect, onSelectPill,
    });
    const pillButtons = findByClass(tree, "cal-pill");
    expect(pillButtons).toHaveLength(1);
    const stopPropagation = vi.fn();
    (pillButtons[0].props.onClick as (e: { stopPropagation: () => void }) => void)({ stopPropagation });

    expect(stopPropagation).toHaveBeenCalledTimes(1);
    expect(onSelectPill).toHaveBeenCalledExactlyOnceWith(pill, cell);
    expect(onSelect).not.toHaveBeenCalled();
  });

  it("the day block itself still opens on its own click — the pattern this task copies (onSelect(cell))", () => {
    const cell = makeCell();
    const onSelect = vi.fn();
    const tree = DayCell({ cell, primary: "bft", counts: false, onSelect });
    // onSelect given, no pills → DayCell's own return is the <button class="cal-cell"> itself
    expect((tree as { type: string }).type).toBe("button");
    (tree as { props: { onClick: () => void } }).props.onClick();
    expect(onSelect).toHaveBeenCalledExactlyOnceWith(cell);
  });
});

describe("WeekRibbon / BftMonthGrid — onSelectDay and onSelectPill reach every DayCell, unwrapped", () => {
  it("BftMonthGrid renders a clickable pill button when marks + onSelectPill are supplied", () => {
    const html = renderToStaticMarkup(
      createElement(BftMonthGrid, {
        bftYear: 18,
        bftMonth: 6,
        marks: (cell) => (cell.bftDay === 4 ? { pills: [makePill("bk_1", "9am")] } : undefined),
        onSelectDay: () => {},
        onSelectPill: () => {},
      }),
    );
    expect(html).toMatch(/<button[^>]*class="cal-cell/); // the day block's own click target
    expect(html).toMatch(/<button[^>]*class="cal-pill cal-pill--plain"/); // the pill's own click target
    expect(html).toContain('aria-label="open 9am"');
  });

  it("WeekRibbon renders the same clickable pill button when marks + onSelectPill are supplied", () => {
    const html = renderToStaticMarkup(
      createElement(WeekRibbon, {
        bftYear: 18,
        bftMonth: 6,
        weekOfMonth: 1,
        marks: (cell) => (cell.bftDay === 1 ? { pills: [makePill("live-now", "● LIVE now")] } : undefined),
        onSelectDay: () => {},
        onSelectPill: () => {},
      }),
    );
    expect(html).toMatch(/<button[^>]*class="cal-cell/);
    expect(html).toMatch(/<button[^>]*class="cal-pill cal-pill--plain"/);
  });

  it("BftMonthGrid threads onSelect/onSelectPill straight through to DayCell — the exact reference, unwrapped", async () => {
    const src = await read("src/components/calendar/BftMonthGrid.tsx");
    expect(src).toMatch(/onSelect=\{onSelectDay\}/);
    expect(src).toMatch(/onSelectPill=\{onSelectPill\}/);
  });

  it("WeekRibbon threads onSelect/onSelectPill straight through to DayCell — the exact reference, unwrapped", async () => {
    const src = await read("src/components/calendar/WeekRibbon.tsx");
    expect(src).toMatch(/onSelect=\{onSelectDay\}/);
    expect(src).toMatch(/onSelectPill=\{onSelectPill\}/);
  });
});

describe("WeekAltitude — the week's day blocks stop being inert (the Admiral's \"weekly buttons\")", () => {
  it("accepts onSelectDay/onSelectPill and passes them straight to WeekRibbon", async () => {
    const src = await read("src/components/console/desk/WeekAltitude.tsx");
    // the ribbon mount itself must carry both props now, not the bare
    // `<WeekRibbon .../>` this bug shipped with
    const mount = src.match(/<WeekRibbon\b[\s\S]*?\/>/)?.[0] ?? "";
    expect(mount).toMatch(/onSelectDay=\{onSelectDay\}/);
    expect(mount).toMatch(/onSelectPill=\{onSelectPill\}/);
  });

  it("renders WeekRibbon's day blocks as real buttons once onSelectDay is wired (was <div>, inert)", () => {
    const feed: DeskFeed = { rules: [], overrides: [], bookings: [] };
    const html = renderToStaticMarkup(
      createElement(WeekAltitude, {
        bftYear: 18,
        bftMonth: 6,
        weekOfMonth: 1,
        feed,
        rooms: [],
        liveNowRoomSlug: null,
        todayCivilKey: "1970-01-01",
        selectedBookingId: null,
        onSelectBooking: () => {},
        selectedRoomSlug: null,
        onSelectRoom: () => {},
        onSelectDay: () => {},
      }),
    );
    expect(html).toMatch(/<button[^>]*class="cal-cell/);
  });
});

describe("DayAltitude — a selected booking's details render through the SAME breadcrumb Week uses (derived, never a second card)", () => {
  it("imports BookingBreadcrumb from WeekAltitude rather than re-declaring its own", async () => {
    const src = await read("src/components/console/desk/DayAltitude.tsx");
    expect(src).toMatch(/import\s*\{\s*BookingBreadcrumb\s*\}\s*from\s*"\.\/WeekAltitude"/);
  });

  it("renders nothing extra when no booking is selected (today's rendering, untouched)", () => {
    const cell = makeCell();
    const feed: DeskFeed = { rules: [], overrides: [], bookings: [] };
    const html = renderToStaticMarkup(
      createElement(DayAltitude, {
        cell, feed, rooms: [], liveNowRoomSlug: null, selectedRoomSlug: null, onSelectRoom: () => {},
      }),
    );
    expect(html).not.toContain("desk-breadcrumb");
  });

  it("names the selected booking once a booking pill has set selectedBookingId", () => {
    const cell = makeCell();
    const feed: DeskFeed = {
      rules: [],
      overrides: [],
      bookings: [{
        bookingId: "bk_7",
        title: "Soul Reading",
        customer: "Riley",
        startUtc: cell.civilDate.toISOString(),
        state: "booked",
        needsFulfil: false,
      }],
    };
    const html = renderToStaticMarkup(
      createElement(DayAltitude, {
        cell, feed, rooms: [], liveNowRoomSlug: null, selectedRoomSlug: null, onSelectRoom: () => {},
        selectedBookingId: "bk_7",
      }),
    );
    expect(html).toContain("desk-breadcrumb");
    expect(html).toContain("Soul Reading");
    expect(html).toContain("working this meeting");
  });
});

describe("LovesDesk — every altitude wires the same jumpToDay + the pill handler", () => {
  it("passes (cell) => jumpToDay(cell.bftDay) to both BftMonthGrid and WeekAltitude's onSelectDay", async () => {
    const src = await read("src/components/console/LovesDesk.tsx");
    const monthMount = src.match(/<BftMonthGrid\b[\s\S]*?\/>/)?.[0] ?? "";
    const weekMount = src.match(/<WeekAltitude\b[\s\S]*?\/>/)?.[0] ?? "";
    expect(monthMount).toMatch(/onSelectDay=\{\(cell\) => jumpToDay\(cell\.bftDay\)\}/);
    expect(weekMount).toMatch(/onSelectDay=\{\(cell\) => jumpToDay\(cell\.bftDay\)\}/);
    expect(monthMount).toMatch(/onSelectPill=\{handleSelectPill\}/);
    expect(weekMount).toMatch(/onSelectPill=\{handleSelectPill\}/);
  });

  it("passes selectedBookingId to DayAltitude so a booking pill's jump actually shows there", async () => {
    const src = await read("src/components/console/LovesDesk.tsx");
    const dayMount = src.match(/<DayAltitude\b[\s\S]*?\/>/)?.[0] ?? "";
    expect(dayMount).toMatch(/selectedBookingId=\{selectedBookingId\}/);
  });
});

describe("resolvePillAction — pure, tested: what a pill click MEANS (LovesDesk's real handler just branches on this)", () => {
  it("the always-live pill (\"live-now\") maps to the live room", () => {
    expect(resolvePillAction({ id: "live-now", label: "● LIVE now" })).toEqual({ kind: "live" });
  });

  it("a projected Mon/Wed/Fri live pill (\"live-<civilKey>\") also maps to the live room", () => {
    expect(resolvePillAction({ id: "live-2026-09-14", label: "~11:11 live" })).toEqual({ kind: "live" });
  });

  it("any other pill id is a booking pill, carrying its own bookingId through unchanged", () => {
    expect(resolvePillAction({ id: "bk_abc123", label: "11:00 Reading" }))
      .toEqual({ kind: "booking", bookingId: "bk_abc123" });
  });
});
