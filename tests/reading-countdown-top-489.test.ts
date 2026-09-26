import { describe, it, expect } from "vitest";
import { promises as fs } from "fs";
import path from "path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ReadingStageDeck from "@/components/reading/ReadingStageDeck";
import { ReadingPartProvider } from "@/components/reading/ReadingPartContext";
import type { ReadingStageProps } from "@/components/reading/ReadingStage";
import type { EncoreFloorDoor, QaDoor } from "@/lib/reading-day-doors";

/**
 * TASK-489 (reading day): "we are missing the countdown. are we able to add
 * that back to the top of the page. it can be till the 12:12 mountain
 * time." Since TASK-481 the page opens on Part 1 before 12:12, and only
 * Part 2's screen carried the countdown. The deck now shows Stage 1's own
 * countdown node above Parts 1, 3 and 4 until the Housewarming starts.
 */

const read = (rel: string) => fs.readFile(path.join(process.cwd(), rel), "utf8");
const DOMAIN = "meet.reading-countdown-top-fixture.invalid";
const COUNT = createElement("ul", { className: "kit-count" }, "COUNTDOWN-FIXTURE");

const ENCORE_FLOOR: EncoreFloorDoor = { tier: "A", name: "Weekly Intuitive", itemId: "weekly-intuitive", href: "/packages/weekly-intuitive", price: "$33", passLive: false };
const QA_OFFER: QaDoor = { itemId: "q-a-meetup-with-love", passLive: true, price: "$33.33", eveningStar: { name: "Evening Star", price: "$111", href: "/packages/evening-star" } };
const STAGE1: ReadingStageProps = {
  initialPhase: "closed",
  signedIn: true,
  next: null,
  following: null,
  scheduleTz: "America/Denver",
  jitsiDomain: DOMAIN,
  countdown: COUNT,
  countdownWhen: null,
  playgroundLock: { locked: false, floorName: "Test Tier" },
  housewarmingLabel: "12:12 PM MDT · The Housewarming",
  readingLabel: "1:11 PM MDT · The Reading",
};

function renderDeck(part: 1 | 2 | 3 | 4, countdownUntilMs: number | null, asOfMs: number): string {
  return renderToStaticMarkup(
    createElement(
      ReadingPartProvider,
      { defaultPart: part },
      createElement(ReadingStageDeck, {
        stage1: STAGE1,
        part1: { jitsiDomain: DOMAIN, whenWords: "12:12 PM MDT" },
        part3: { jitsiDomain: DOMAIN, encoreFloor: ENCORE_FLOOR, whenWords: "2:22 PM MDT" },
        part4: { jitsiDomain: DOMAIN, qaOffer: QA_OFFER, whenWords: "3:33 PM MDT" },
        countdownUntilMs,
        asOfMs,
      }),
    ),
  );
}

const count = (html: string) => html.split("COUNTDOWN-FIXTURE").length - 1;

describe("TASK-489: the countdown sits at the top of every screen until 12:12", () => {
  it("before 12:12, Parts 1, 3 and 4 show it once, above the screen", () => {
    for (const part of [1, 3, 4] as const) {
      const html = renderDeck(part, 2_000, 1_000);
      expect(count(html)).toBe(1);
      expect(html.indexOf("COUNTDOWN-FIXTURE")).toBeLessThan(html.indexOf("kit-stage"));
    }
  });

  it("Part 2 keeps its own countdown, never twice", () => {
    expect(count(renderDeck(2, 2_000, 1_000))).toBe(1);
  });

  it("from 12:12 on, or with no target, Parts 1, 3 and 4 show none", () => {
    for (const part of [1, 3, 4] as const) {
      expect(count(renderDeck(part, 2_000, 2_000))).toBe(0);
      expect(count(renderDeck(part, null, 1_000))).toBe(0);
    }
  });

  it("the page passes the Housewarming target, held back while the day's program runs", async () => {
    const src = await read("src/app/reading/page.tsx");
    expect(src).toContain("countdownUntilMs={topCountdownUntilMs(housewarmingNext, asOfMs)}");
    expect(src).toContain('housewarmingNext.phase !== "upcoming"');
    expect(src).toContain("asOfMs < previousStartMs + DAY_PROGRAM_MS");
  });

  it("one timer flips it at the instant itself", async () => {
    const src = await read("src/components/reading/ReadingStageDeck.tsx");
    expect(src).toContain("setTimeout(() => setBefore(false), waitMs)");
    expect(src).toContain("{counting && selected !== 2 && stage1.countdown}");
  });
});
