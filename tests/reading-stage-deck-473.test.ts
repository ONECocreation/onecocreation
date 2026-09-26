import { describe, it, expect } from "vitest";
import { promises as fs } from "fs";
import path from "path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ReadingStageDeck from "@/components/reading/ReadingStageDeck";
import { ReadingPartProvider } from "@/components/reading/ReadingPartContext";
import type { ReadingStageProps } from "@/components/reading/ReadingStage";
import type { ReadingStagePart3Props } from "@/components/reading/ReadingStagePart3";
import type { ReadingStagePart4Props } from "@/components/reading/ReadingStagePart4";
import type { EncoreFloorDoor, QaDoor } from "@/lib/reading-day-doors";

/**
 * TASK-473 (block 968,624) — "the video changes to the correct one." The
 * deck mounts EXACTLY ONE of the three stage screens, chosen by the
 * shared selection. React's own conditional-return shape (an if/return
 * chain, never a Set or multiple simultaneous mounts) is what makes
 * "exactly one conference at a time" true by construction — every switch
 * unmounts the old screen (its own JitsiRoom cleanup disposes) before the
 * next one mounts.
 */

const read = (rel: string) => fs.readFile(path.join(process.cwd(), rel), "utf8");

const DOMAIN = "meet.reading-stage-deck-fixture.invalid";

const ENCORE_FLOOR: EncoreFloorDoor = {
  tier: "A",
  name: "Weekly Intuitive",
  itemId: "weekly-intuitive",
  href: "/packages/weekly-intuitive",
  price: "$33",
  passLive: false,
};
const QA_OFFER: QaDoor = {
  itemId: "q-a-meetup-with-love",
  passLive: true,
  price: "$33.33",
  eveningStar: { name: "Evening Star", price: "$111", href: "/packages/evening-star" },
};

const STAGE1: ReadingStageProps = {
  initialPhase: "closed",
  signedIn: true,
  next: null,
  following: null,
  scheduleTz: "America/Denver",
  jitsiDomain: DOMAIN,
  countdown: null,
  countdownWhen: null,
  playgroundLock: { locked: false, floorName: "Test Tier" },
  housewarmingLabel: "12:12 PM MDT · The Housewarming",
  readingLabel: "1:11 PM MDT · The Reading",
};
const PART3: ReadingStagePart3Props = { jitsiDomain: DOMAIN, encoreFloor: ENCORE_FLOOR, whenWords: "2:22 PM MDT" };
const PART4: ReadingStagePart4Props = { jitsiDomain: DOMAIN, qaOffer: QA_OFFER, whenWords: "3:33 PM MDT" };

function renderDeck(defaultPart: 1 | 2 | 3 | 4): string {
  return renderToStaticMarkup(
    createElement(
      ReadingPartProvider,
      { defaultPart },
      createElement(ReadingStageDeck, { stage1: STAGE1, part3: PART3, part4: PART4 }),
    ),
  );
}

describe("ReadingStageDeck — exactly one screen mounts, chosen by the selection", () => {
  it("part 1 (and 2): ReadingStage's own waiting picture — never Part 3/4's own words", () => {
    for (const part of [1, 2] as const) {
      const html = renderDeck(part);
      expect(html).toContain("The reading is live to watch, free.");
      expect(html).not.toContain("The Book Talk is not live yet.");
      expect(html).not.toContain("The Q&amp;A is not live yet.");
    }
  });

  it("fix round (block 968,624): the stage chip names WHICH row is picked, 1 vs 2 — the SAME label the agenda row's own title reads", () => {
    const chip1 = renderDeck(1);
    expect(chip1).toContain('<span class="kit-stage-chip">12:12 PM MDT · The Housewarming</span>');
    const chip2 = renderDeck(2);
    expect(chip2).toContain('<span class="kit-stage-chip">1:11 PM MDT · The Reading</span>');
  });

  it("fix round: parts 3 and 4 each carry their own stage chip too, e.g. '2:22 PM MDT · The Book Talk'", () => {
    const chip3 = renderDeck(3);
    expect(chip3).toContain('<span class="kit-stage-chip">2:22 PM MDT · The Book Talk</span>');
    const chip4 = renderDeck(4);
    expect(chip4).toContain('<span class="kit-stage-chip">3:33 PM MDT · The Q&amp;A with Love</span>');
  });

  it("part 3: the Book Talk's own screen — never ReadingStage's own words, never Part 4's", () => {
    const html = renderDeck(3);
    expect(html).toContain("The Book Talk is not live yet.");
    expect(html).toContain("Opens 2:22 PM MDT.");
    expect(html).not.toContain("The reading is live to watch, free.");
    expect(html).not.toContain("The Q&amp;A is not live yet.");
  });

  it("part 4: the Q&A's own screen — never ReadingStage's own words, never Part 3's", () => {
    const html = renderDeck(4);
    expect(html).toContain("The Q&amp;A is not live yet.");
    expect(html).toContain("Opens 3:33 PM MDT.");
    expect(html).not.toContain("The reading is live to watch, free.");
    expect(html).not.toContain("The Book Talk is not live yet.");
  });

  it("every part renders exactly ONE .kit-stage root — never two screens stacked", () => {
    for (const part of [1, 2, 3, 4] as const) {
      const html = renderDeck(part);
      const count = (html.match(/class="kit-stage[" ]/g) ?? []).length;
      expect(count, `part ${part}`).toBe(1);
    }
  });
});

describe("ReadingStageDeck — source pin: an if/return chain, never a lookup table or multiple mounts", () => {
  it("selected===3 and selected===4 each return early; ReadingStage is the one fallthrough", async () => {
    const src = await read("src/components/reading/ReadingStageDeck.tsx");
    expect(src).toContain('if (selected === 3) return <ReadingStagePart3 {...part3} />;');
    expect(src).toContain('if (selected === 4) return <ReadingStagePart4 {...part4} />;');
    expect(src).toContain("return <ReadingStage {...stage1} />;");
  });
});
