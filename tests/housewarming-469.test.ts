import { describe, it, expect } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { clockWords, HOUSEWARMING_TIME } from "@/lib/reading-day";
import ReadingDayBody, { type ReadingDayBodyProps } from "@/components/reading/ReadingDayBody";
import type { Tier } from "@/lib/entitlement";

/**
 * TASK-469 (block 968,567) — THE 12:12 HOUSEWARMING ROW.
 *
 * Love, passed on by the Admiral: "will you make a 12:12 button that is
 * linked straight to the stage where everyone gets to see everyone? I
 * wanna have housewarming with introductions and movement before the
 * reading." The Admiral: "yes lets cut the 12:12 room."
 *
 * The two-way call itself needs no code — this pins only the NEW first
 * row on `/reading`'s "The day's agenda" card (TASK-467): free, no
 * lock, the same two buttons (signed in / signed out) as the existing
 * Reading row, pointed at the same `/rooms/heart-field` door.
 *
 * Same fixture pattern `tests/reading-day-467.test.ts` already uses:
 * `America/Denver`, the reading's own civil day (2026-09-23), the
 * Wednesday instant every other reading-day suite measures against.
 */

const TZ = "America/Denver";
// Wednesday 1:11 PM MDT — the same measured instant reading-day-467.test.ts uses.
const READING_MS = Date.parse("2026-09-23T19:11:00.000Z");
const ENCORE_MS = Date.parse("2026-09-23T20:22:00.000Z"); // 2:22 PM MDT, same day
const QA_MS = Date.parse("2026-09-23T21:33:00.000Z"); // 3:33 PM MDT, same day
const HOUSEWARMING_MS = Date.parse("2026-09-23T18:12:00.000Z"); // 12:12 PM MDT, same day, before the reading

const ENCORE_FLOOR = { tier: "A" as Tier, name: "Weekly Intuitive", itemId: "weekly-intuitive", href: "/packages/weekly-intuitive", price: "$33" };
const QA_OFFER_LIVE = {
  itemId: "q-a-meetup-with-love",
  passLive: true,
  price: "$33.33",
  eveningStar: { name: "Evening Star", price: "$111", href: "/packages/evening-star" },
};

function bodyProps(overrides: Partial<ReadingDayBodyProps>): ReadingDayBodyProps {
  return {
    tz: TZ,
    housewarmingStartsAtMs: HOUSEWARMING_MS,
    readingStartsAtMs: READING_MS,
    encoreStartsAtMs: ENCORE_MS,
    qaStartsAtMs: QA_MS,
    signedIn: false,
    encoreEntitled: false,
    encoreFloor: ENCORE_FLOOR,
    qaEntitled: false,
    qaRoomHref: "/rooms/inner-sanctum",
    qaOffer: QA_OFFER_LIVE,
    ...overrides,
  };
}

function render(p: ReadingDayBodyProps): string {
  return renderToStaticMarkup(createElement(ReadingDayBody, p));
}

/** the first `<li>...</li>` in the rendered card — the Housewarming row, if it's really first. */
function firstRow(html: string): string {
  const start = html.indexOf("<li");
  const end = html.indexOf("</li>", start) + "</li>".length;
  return html.slice(start, end);
}

describe("reading-day.ts — HOUSEWARMING_TIME, the one place 12:12 is written", () => {
  it("is the wall-clock string '12:12', and clockWords reads it as '12:12 PM MDT'", () => {
    expect(HOUSEWARMING_TIME).toBe("12:12");
    expect(clockWords(HOUSEWARMING_MS, TZ)).toBe("12:12 PM MDT");
  });
});

describe("ReadingDayBody — the Housewarming is the FIRST row, before The Reading", () => {
  it("the card's own first <li> is the Housewarming row, not the Reading row", () => {
    const html = render(bodyProps({}));
    const row = firstRow(html);
    expect(row).toContain("The Housewarming");
    expect(row).not.toContain("The Reading");
  });

  it("The Housewarming's own index in the markup comes before The Reading's", () => {
    const html = render(bodyProps({}));
    const housewarmingAt = html.indexOf("The Housewarming");
    const readingAt = html.indexOf("The Reading");
    expect(housewarmingAt).toBeGreaterThan(-1);
    expect(readingAt).toBeGreaterThan(-1);
    expect(housewarmingAt).toBeLessThan(readingAt);
  });

  it("carries its own clock words and the quiet line naming what it is", () => {
    const html = render(bodyProps({}));
    const row = firstRow(html);
    expect(row).toContain(clockWords(HOUSEWARMING_MS, TZ));
    expect(row).toContain("12:12 PM MDT");
    // Lumen's word check (block 968,571): "Free." like the Reading row; a description, not a command
    expect(row).toContain("Free. Introductions and movement with Love. Everyone&#x27;s on camera.");
    expect(row).not.toContain("Cameras on.");
  });
});

describe("ReadingDayBody — the Housewarming row's buttons: the Reading row's own two states", () => {
  it("signed in: 'Go to the Heart Field', linked to /rooms/heart-field", () => {
    const html = render(bodyProps({ signedIn: true }));
    const row = firstRow(html);
    expect(row).toContain('href="/rooms/heart-field"');
    expect(row).toContain("Go to the Heart Field");
    expect(row).not.toContain("Sign me up");
  });

  it("signed out: 'Sign me up', linked to #sign-up", () => {
    const html = render(bodyProps({ signedIn: false }));
    const row = firstRow(html);
    expect(row).toContain('href="#sign-up"');
    expect(row).toContain("Sign me up");
    expect(row).not.toContain("Go to the Heart Field");
  });

  it("both button states carry kit-btn kit-btn-main kit-btn-sm, the one button size on the card", () => {
    for (const signedIn of [true, false]) {
      const row = firstRow(render(bodyProps({ signedIn })));
      expect(row).toMatch(/class="kit-btn kit-btn-main kit-btn-sm"/);
    }
  });
});

describe("ReadingDayBody — the Housewarming row is free: no lock, no price", () => {
  it("carries no lock icon, in any state (the row never gates on entitlement)", () => {
    const html = render(bodyProps({ encoreEntitled: false, qaEntitled: false, signedIn: false }));
    const row = firstRow(html);
    expect(row).not.toContain("kit-lock-icon");
  });

  it("names no price anywhere in its own row", () => {
    const html = render(bodyProps({}));
    const row = firstRow(html);
    expect(row).not.toMatch(/\$\d/);
  });
});

describe("ReadingDayBody — no em dash anywhere in the rendered card", () => {
  it("signed out, nothing entitled", () => {
    const html = render(bodyProps({ signedIn: false, encoreEntitled: false, qaEntitled: false }));
    expect(html).not.toContain("—");
  });

  it("signed in, everything entitled", () => {
    const html = render(bodyProps({ signedIn: true, encoreEntitled: true, qaEntitled: true }));
    expect(html).not.toContain("—");
  });
});
