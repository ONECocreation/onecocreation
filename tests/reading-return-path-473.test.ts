import { describe, it, expect } from "vitest";
import { promises as fs } from "fs";
import path from "path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ReadingDayBody, { type ReadingDayBodyProps } from "@/components/reading/ReadingDayBody";
import { ReadingStageBody, type ReadingStageBodyProps } from "@/components/reading/ReadingStage";
import type { Tier } from "@/lib/entitlement";
import type { EncoreFloorDoor, QaDoor } from "@/lib/reading-day-doors";

/**
 * TASK-473 (block 968,624) — the remaining checklist items: no
 * "Encore"/"Playground" anywhere in /reading's VISIBLE copy, no
 * /reading/playground link anywhere on /reading, and the payment return
 * path (NARROWED per the brief's own words — see OrderStatus.tsx's own
 * docblock note — to a fixed "Back to the reading" link, never a
 * visitor-controlled redirect target, so "rejects off-site" is true by
 * construction: there is no input to reject).
 */

const read = (rel: string) => fs.readFile(path.join(process.cwd(), rel), "utf8");

const FORBIDDEN = /Encore|Playground/;

describe("no 'Encore'/'Playground' anywhere in /reading's VISIBLE copy", () => {
  const TZ = "America/Denver";
  const MS = Date.parse("2026-09-23T19:11:00.000Z");
  const ENCORE_FLOOR: EncoreFloorDoor = {
    tier: "A" as Tier,
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

  function dayProps(overrides: Partial<ReadingDayBodyProps>): ReadingDayBodyProps {
    return {
      tz: TZ,
      housewarmingStartsAtMs: MS,
      readingStartsAtMs: MS,
      encoreStartsAtMs: MS,
      qaStartsAtMs: MS,
      signedIn: false,
      encoreEntitled: false,
      encoreFloor: ENCORE_FLOOR,
      qaEntitled: false,
      qaOffer: QA_OFFER,
      ...overrides,
    };
  }

  it("ReadingDayBody: no forbidden word, signed out/in, entitled/not, in any combination", () => {
    for (const signedIn of [true, false]) {
      for (const encoreEntitled of [true, false]) {
        for (const qaEntitled of [true, false]) {
          const html = renderToStaticMarkup(
            createElement(ReadingDayBody, dayProps({ signedIn, encoreEntitled, qaEntitled })),
          );
          expect(html, `signedIn=${signedIn} encore=${encoreEntitled} qa=${qaEntitled}`).not.toMatch(FORBIDDEN);
        }
      }
    }
  });

  function stageProps(overrides: Partial<ReadingStageBodyProps>): ReadingStageBodyProps {
    return {
      phase: "closed",
      signedIn: true,
      room: null,
      playgroundLock: { locked: false, floorName: "Test Tier" },
      jitsiDomain: "meet.reading-return-path-fixture.invalid",
      nextWords: null,
      countdown: null,
      countdownWhen: null,
      left: false,
      ended: false,
      onRoomEnded: () => {},
      onRejoin: () => {},
    partLabel: null,
      ...overrides,
    };
  }

  it("ReadingStageBody: no forbidden word, in any phase (the lock words say 'Part two', never the old names)", () => {
    const PHASES: Array<Partial<ReadingStageBodyProps>> = [
      {},
      { phase: "published", room: "oc-0123456789abcdef" },
      { phase: "published", signedIn: false, room: "oc-0123456789abcdef" },
      { phase: "published", left: true },
      { phase: "published", ended: true, nextWords: "Wednesday, September 30" },
      { phase: "published", ended: true, nextWords: "Wednesday, September 30", playgroundLock: { locked: true, floorName: "Test Tier" } },
    ];
    for (const over of PHASES) {
      const html = renderToStaticMarkup(createElement(ReadingStageBody, stageProps(over)));
      expect(html).not.toMatch(FORBIDDEN);
    }
  });

  it("reading/page.tsx's own visible copy carries neither word (comments aside — the internal id/constant names are UNCHANGED per the brief, and stay out of this grep)", async () => {
    const src = await read("src/app/reading/page.tsx");
    const experienceLine = src.match(/<li>\{`Join the discussion[^`]*`\}<\/li>/)?.[0] ?? "";
    expect(experienceLine).not.toMatch(FORBIDDEN);
  });
});

describe("no /reading/playground link anywhere on /reading", () => {
  it("page.tsx, ReadingStage.tsx, ReadingDayBody.tsx: zero '/reading/playground' HREFS (prose in a docblock explaining the retirement is not a live link — checked as an actual href attribute)", async () => {
    for (const file of [
      "src/app/reading/page.tsx",
      "src/components/reading/ReadingStage.tsx",
      "src/components/reading/ReadingDayBody.tsx",
      "src/components/reading/ReadingStagePart3.tsx",
      "src/components/reading/ReadingStagePart4.tsx",
      "src/components/reading/ReadingStageDoor.tsx",
      "src/components/reading/ReadingStageDeck.tsx",
    ]) {
      const src = await read(file);
      expect(src, file).not.toMatch(/href=["'{]\/reading\/playground/);
    }
  });

  it("/reading/playground the ADDRESS still exists (never deleted) — just unreached from /reading", async () => {
    const exists = await fs
      .access(path.join(process.cwd(), "src/app/reading/playground/page.tsx"))
      .then(() => true)
      .catch(() => false);
    expect(exists).toBe(true);
  });
});

describe("the payment return path — NARROWED (block 968,624): a fixed 'Back to the reading' link, no visitor-controlled redirect target", () => {
  const FILE = "src/components/store/OrderStatus.tsx";

  it("boughtReadingPass checks the two reading-day pass item ids, imported from reading-day.ts — never a second literal", async () => {
    const src = await read(FILE);
    expect(src).toContain('import { READING_BOOK_TALK_ITEM_ID, QA_ITEM_ID } from "@/lib/reading-day"');
    expect(src).toContain("li.itemId === READING_BOOK_TALK_ITEM_ID || li.itemId === QA_ITEM_ID");
  });

  it("OrderStatus.tsx mounts the pure ReadingPassReturnLink, never a second inline copy of the link", async () => {
    const src = await read(FILE);
    expect(src).toContain('import ReadingPassReturnLink from "./ReadingPassReturnLink"');
    expect(src).toContain("<ReadingPassReturnLink settledFine={settledFine} boughtReadingPass={boughtReadingPass} />");
    expect(src).not.toContain('href="/reading#stage"'); // the literal lives in the extracted file now
  });
});

/* fix round item 5 (block 968,624) — extracted so this is tested by
   RENDERING it in every state, not by pinning OrderStatus.tsx's own
   source text. */
describe("ReadingPassReturnLink — rendered, in every state", () => {
  it("unsettled order: renders nothing, even if it contains the pass", async () => {
    const { default: ReadingPassReturnLink } = await import("@/components/store/ReadingPassReturnLink");
    const html = renderToStaticMarkup(createElement(ReadingPassReturnLink, { settledFine: false, boughtReadingPass: true }));
    expect(html).toBe("");
  });

  it("settled, but without the reading pass: renders nothing", async () => {
    const { default: ReadingPassReturnLink } = await import("@/components/store/ReadingPassReturnLink");
    const html = renderToStaticMarkup(createElement(ReadingPassReturnLink, { settledFine: true, boughtReadingPass: false }));
    expect(html).toBe("");
  });

  it("settled WITH the reading pass: the fixed same-origin link, no open-redirect surface — never built from any request/query/order field", async () => {
    const { default: ReadingPassReturnLink } = await import("@/components/store/ReadingPassReturnLink");
    const html = renderToStaticMarkup(createElement(ReadingPassReturnLink, { settledFine: true, boughtReadingPass: true }));
    expect(html).toBe('<p><a href="/reading#stage" class="kit-btn kit-btn-main kit-btn-sm">Back to the reading</a></p>');
  });
});

describe("fix round (block 968,624, the Admiral's Chrome walk): an em dash reached JitsiRoom's load-failure text — fixed, and never lets it back in", () => {
  it("both of JitsiRoom's visible strings are two sentences now, never one joined by an em dash", async () => {
    const src = await read("src/components/booking/JitsiRoom.tsx");
    expect(src).toContain("The meeting room couldn&apos;t load here.");
    expect(src).not.toContain("The meeting room couldn&apos;t load here —");
    expect(src).toContain("Thank you for meeting. You&apos;re home, right where you left off.");
    expect(src).not.toContain("Thank you for meeting —");
  });

  it("no em dash anywhere OUTSIDE a comment, in JitsiRoom.tsx or any reading component (comments explaining history are fine; live strings never are)", async () => {
    for (const file of [
      "src/components/booking/JitsiRoom.tsx",
      "src/components/reading/ReadingStage.tsx",
      "src/components/reading/ReadingStageDoor.tsx",
      "src/components/reading/ReadingStagePart3.tsx",
      "src/components/reading/ReadingStagePart4.tsx",
      "src/components/reading/ReadingDayBody.tsx",
      "src/components/reading/ReadingDayOpenNotice.tsx",
      "src/components/reading/ReadingPartSelectLink.tsx",
    ]) {
      const src = await read(file);
      // strip /* block */ and // line comments before checking — a
      // prose explanation of history is not a rendered string
      const stripped = src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
      const hit = stripped.includes("—");
      expect(hit, `${file} carries an em dash outside a comment`).toBe(false);
    }
  });
});
