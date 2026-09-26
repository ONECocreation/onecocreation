import { describe, it, expect } from "vitest";
import { promises as fs } from "fs";
import path from "path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ReadingStageBody, stage1WatchTarget, type ReadingStageBodyProps } from "@/components/reading/ReadingStage";

/**
 * TASK-438 (block 968,222; HOLD LIFTED block 968,269) — `ReadingStage.tsx`,
 * the /reading island.
 *
 * TASK-471 (block 968,624) — Love's first live reading is tomorrow. The
 * Admiral's ruling reverses TASK-457 (block 968,543, "Love only ever goes
 * live in the Heart Field"): Stage 1 is TWO-WAY now and mounts IN PLACE on
 * /reading, using `JitsiRoom` (never `JitsiViewer`, which stays retired
 * from this page). There is no more click-based "Watch" flow, no
 * separate "failed"/"Try again" card (JitsiRoom owns its own script-load
 * failure), and no `/rooms/heart-field` door anywhere in this file. This
 * suite REPLACES `tests/reading-watch-heart-field-457.test.ts`,
 * `reading-small-watch-464.test.ts` and `reading-polish-466.test.ts`'s own
 * Heart-Field-specific pins (those files carry only the parts of their old
 * pins that are still true, re-trued); this file is the current shape's
 * own record.
 */

const read = (rel: string) => fs.readFile(path.join(process.cwd(), rel), "utf8");

const STAGE = "src/components/reading/ReadingStage.tsx";
const PAGE = "src/app/reading/page.tsx";

const ROOM = "oc-0123456789abcdef";
const DOMAIN = "meet.reading-stage-fixture.invalid";

function bodyProps(overrides: Partial<ReadingStageBodyProps>): ReadingStageBodyProps {
  return {
    phase: "closed",
    signedIn: true,
    room: null,
    playgroundOpen: false,
    playgroundLock: { locked: false, floorName: "Test Tier" },
    jitsiDomain: DOMAIN,
    nextWords: null,
    countdown: null,
    countdownWhen: null,
    left: false,
    ended: false,
    onRoomEnded: () => {},
    onRejoin: () => {},
    ...overrides,
  };
}

function render(p: ReadingStageBodyProps): string {
  return renderToStaticMarkup(createElement(ReadingStageBody, p));
}

const count = (html: string, needle: string) => html.split(needle).length - 1;

describe("closed — the book waits, no room, no control at all", () => {
  const html = render(bodyProps({}));

  it("the round-3 welcome words, and the honest quiet line (no button promised)", () => {
    expect(html).toContain(
      "The reading is live to watch, free. Want to join the discussion? Stay after for a live group video call with Love.",
    );
    expect(html).toContain("It plays right here, everyone in view. Your seat opens the moment Love goes live.");
  });

  it("the book art is there; no viewer, no chip, no button, no room string, no Heart Field", () => {
    expect(html).toContain("/images/reading-love-cover.jpg");
    expect(html).not.toContain("kit-stage-viewer");
    expect(html).not.toContain("kit-stage-chip");
    expect(html).not.toContain(ROOM);
    expect(html).not.toContain("<button");
    expect(html).not.toContain("<a ");
    expect(html).not.toContain("/rooms/heart-field");
  });
});

describe("published, signed in, room arrived — JitsiRoom mounts IN PLACE, never JitsiViewer", () => {
  const html = render(bodyProps({ phase: "published", signedIn: true, room: ROOM }));

  it("the 'Love is live now' line, the LIVE chip, the two-way viewer wrapper — no book art, no button", () => {
    expect(html).toContain("Love is live now");
    expect(html).toContain("kit-stage-chip");
    expect(html).toContain("kit-stage-viewer");
    expect(html).not.toContain("/images/reading-love-cover.jpg");
    expect(html).not.toContain("<button");
    expect(html).not.toContain("kit-btn-main");
  });

  it("never links to the Heart Field, and never mounts the room string as a bare visible link", () => {
    expect(html).not.toContain("/rooms/heart-field");
    expect(html).not.toContain("Watch Love live");
    expect(html).not.toContain("Go to the Heart Field");
  });

  it("no banner while the Playground is closed, and nothing about a camera or a microphone is said in the page's own words", () => {
    expect(html).not.toContain("Want an encore?");
    expect(html).not.toMatch(/camera|microphone/i);
  });
});

describe("published, signed in, room not yet arrived — the honest transient state, never a guessed room", () => {
  it("'Opening the room…', no viewer, no book-image chip claim of a live join", () => {
    const html = render(bodyProps({ phase: "published", signedIn: true, room: null }));
    expect(html).toContain("Opening the room");
    expect(html).not.toContain("kit-stage-viewer");
    expect(html).not.toContain(ROOM);
  });
});

describe("published, signed OUT — the page's own sign-in path, never a link elsewhere", () => {
  const html = render(bodyProps({ phase: "published", signedIn: false, room: ROOM }));

  it("no room mounts for a signed-out visitor, even with a room string in hand", () => {
    expect(html).not.toContain("kit-stage-viewer");
    expect(html).not.toContain(ROOM);
  });

  it("the one control is Sign me up, to #sign-up — never /rooms/heart-field, never a raw login link", () => {
    expect(count(html, "kit-btn-main")).toBe(1);
    expect(html).toMatch(/<a class="kit-btn kit-btn-main kit-btn-sm" href="#sign-up">\s*Sign me up\s*<\/a>/);
    expect(html).not.toContain("/rooms/heart-field");
    expect(html).not.toContain("/login");
  });
});

describe("ended — the book, the ended words, the next date; the Playground door, in BOTH variants", () => {
  it("still published: the ended words (two sentences, no dash) and the Playground link, no Heart Field anywhere", () => {
    const html = render(bodyProps({ phase: "published", ended: true, nextWords: "Wednesday, September 30" }));
    expect(html).toContain("/images/reading-love-cover.jpg");
    expect(html).not.toContain("kit-stage-viewer");
    expect(html).toContain("The reading has ended.");
    expect(html).toContain("Thank you for being here.");
    expect(html).not.toContain("The reading has ended — thank you for being here.");
    expect(html).toContain("Wednesday, September 30");
    expect(count(html, "kit-btn-main")).toBe(1);
    expect(html).toContain("Watch part two");
    expect(html).toContain('href="/reading/playground"');
    expect(html).not.toContain("/rooms/heart-field");
  });

  it("closed underneath: the SAME words and the SAME Playground door", () => {
    const html = render(bodyProps({ phase: "closed", ended: true, nextWords: "Wednesday, September 30" }));
    expect(html).toContain("The reading has ended.");
    expect(html).toContain("Thank you for being here.");
    expect(html).not.toContain("<button");
    expect(html).toContain("Watch part two");
    expect(html).toContain('href="/reading/playground"');
  });

  it("K122 item 13 — ended with NO date (nextWords null, the schedule off): 'Love will share the next reading date soon.', never 'The next reading is …'", () => {
    const html = render(bodyProps({ phase: "closed", ended: true }));
    expect(html).toContain("The reading has ended.");
    expect(html).toContain("Thank you for being here.");
    expect(html).toContain("Love will share the next reading date soon.");
    expect(html).not.toContain("The next reading is");
  });
});

describe("left — the viewer's own hangup on a STILL-PUBLISHED stage (K122 item 8), rejoined in place", () => {
  it("'You left the reading.' plus exactly ONE in-page button, 'Back to the reading' — never a link, never the ended words", () => {
    const html = render(bodyProps({ phase: "published", left: true }));
    expect(html).toContain("You left the reading.");
    expect(count(html, "kit-btn-main")).toBe(1);
    expect(html).toMatch(/<button[^>]*class="kit-btn kit-btn-main kit-btn-sm"[^>]*>\s*Back to the reading\s*<\/button>/);
    expect(html).not.toContain("The reading has ended");
    expect(html).not.toContain("/rooms/heart-field");
    expect(html).not.toContain("<a ");
  });

  it("left takes priority over showing the room, even with a room string in hand", () => {
    const html = render(bodyProps({ phase: "published", left: true, room: ROOM }));
    expect(html).not.toContain("kit-stage-viewer");
  });
});

describe("the Playground banner (TASK-449) — open-only, in EVERY phase, after the stage", () => {
  it("while Stage 2 is open the banner shows: waiting, live, ended and closed alike", () => {
    for (const over of [
      { phase: "closed" },
      { phase: "published", room: ROOM },
      { phase: "closed", ended: true, nextWords: "Wednesday, September 30" },
    ] as const) {
      const html = render(bodyProps({ ...over, playgroundOpen: true }));
      expect(html).toContain('<p class="kicker">The Playground</p>');
      expect(html).toContain("Want an encore?");
      expect(html).toContain("Go to the Playground");
      expect(html).toContain('href="/reading/playground"');
      expect(html).not.toContain("Go to the Playground →"); // ruling 1: no arrow
    }
  });

  it("closed Stage 2 (playgroundOpen false) renders NO banner in any phase", () => {
    for (const over of [
      { phase: "closed" },
      { phase: "published", room: ROOM },
      { phase: "closed", ended: true, nextWords: "Wednesday, September 30" },
    ] as const) {
      const html = render(bodyProps({ ...over, playgroundOpen: false }));
      expect(html).not.toContain("Want an encore?");
      if (!over.ended) expect(html).not.toContain("/reading/playground");
    }
  });
});

describe("the countdown rides the island now (K122 item 6a) — cells only while closed, the when-lines until ended, never in ended", () => {
  const CELLS = createElement("ul", { className: "kit-count" });
  const WHEN = createElement("div", { className: "kit-when" });

  it("closed renders the full countdown node (the cells)", () => {
    const html = render(bodyProps({ countdown: CELLS, countdownWhen: WHEN }));
    expect(html).toContain("kit-count");
  });

  it("published (with or without a room) renders NO cells — the when-lines ride instead", () => {
    for (const over of [
      { phase: "published", room: ROOM },
      { phase: "published", room: null },
    ] as const) {
      const html = render(bodyProps({ ...over, countdown: CELLS, countdownWhen: WHEN }));
      expect(html).not.toContain("kit-count");
      expect(html).toContain("kit-when");
    }
  });

  it("ended renders NEITHER node — the ended words name the date themselves (item 7)", () => {
    const html = render(
      bodyProps({ phase: "closed", ended: true, nextWords: "Wednesday, September 30", countdown: CELLS, countdownWhen: WHEN }),
    );
    expect(html).not.toContain("kit-count");
    expect(html).not.toContain("kit-when");
  });

  it("the page hands the countdown INTO ReadingStage as server-composed nodes — never a bare page mount that can't know the phase", async () => {
    const page = await read(PAGE);
    expect(page).toContain("countdown={");
    expect(page).toContain("countdownWhen={");
    const src = await read(STAGE);
    expect(src).toContain("countdownWhen");
  });
});

describe("the ended words name the NEXT reading, never the one that just ended (K122 item 7)", () => {
  const NEXT = { startsAtMs: 1_000, endsAtMs: 2_000 };
  const FOLLOWING = { startsAtMs: 8_000, endsAtMs: 9_000 };

  it("three clocks: before the start -> next; in the window -> following; after the window -> following", async () => {
    const { readingShownNext } = await import("@/components/reading/ReadingStage");
    expect(readingShownNext(NEXT, FOLLOWING, 500)).toBe(NEXT);
    expect(readingShownNext(NEXT, FOLLOWING, 1_500)).toBe(FOLLOWING);
    expect(readingShownNext(NEXT, FOLLOWING, 2_500)).toBe(FOLLOWING);
  });

  it("the page derives following = nextReading(schedule, next.endsAtMs) and hands it into the island", async () => {
    const page = await read(PAGE);
    expect(page).toContain("nextReading(schedule, next.endsAtMs)");
    expect(page).toContain("following={");
  });
});

describe("stage1WatchTarget — the poll's fresh answer is the only thing that can name a room", () => {
  it("published with a room -> the room", () => {
    expect(stage1WatchTarget({ ok: true, phase: "published", room: ROOM, jitsiDomain: DOMAIN })).toBe(ROOM);
  });

  it("prepared, closed, a failed read, or a published body WITHOUT a room -> null (a stale read never mounts)", () => {
    expect(stage1WatchTarget({ ok: true, phase: "prepared", room: null, jitsiDomain: null })).toBeNull();
    expect(stage1WatchTarget({ ok: true, phase: "closed", room: null, jitsiDomain: null })).toBeNull();
    expect(stage1WatchTarget({ ok: false, phase: "closed", room: null, jitsiDomain: null })).toBeNull();
    expect(stage1WatchTarget(null)).toBeNull();
    expect(stage1WatchTarget({ ok: true, phase: "published", room: null, jitsiDomain: DOMAIN })).toBeNull();
  });
});

describe("the island's own wiring — source pins (the repo runs no jsdom)", () => {
  it("polls /api/stage1 every 20 seconds, no-store, and mounts the room from the poll itself — no separate click-time fetch", async () => {
    const src = await read(STAGE);
    expect(src).toContain("20_000");
    const fetches = src.match(/fetch\("\/api\/stage1", \{ cache: "no-store" \}\)/g) ?? [];
    expect(fetches.length).toBeGreaterThanOrEqual(2); // the poll AND the hangup re-check
  });

  it("never mounts JitsiViewer — JitsiRoom is the one embed on this page (the docblock's own history mentions the retired component by name; the CODE never imports or renders it)", async () => {
    const src = await read(STAGE);
    expect(src).not.toContain('from "@/components/reading/JitsiViewer"');
    expect(src).not.toContain("<JitsiViewer");
    expect(src).toContain('from "@/components/booking/JitsiRoom"');
    expect(src).toContain("<JitsiRoom");
  });

  it("no live /rooms/heart-field href anywhere in the source (the docblock's own history names the retired door in prose; no JSX carries it)", async () => {
    const src = await read(STAGE);
    expect(src).not.toContain('href="/rooms/heart-field"');
    expect(src).not.toContain(">Go to the Heart Field<");
    expect(src).not.toContain(">Watch Love live<");
  });

  it("the banner replaced the Stage 2 card + single-embed branch (TASK-449): banner words and its own /api/stage2 poll; none of the retired shape survives", async () => {
    const src = await read(STAGE);
    expect(src).toContain('<p className="kicker">The Playground</p>');
    expect(src).toContain("Want an encore?");
    expect(src).toContain("Go to the Playground");
    expect(src).toContain('href="/reading/playground"');
    expect(src).not.toContain("Go to the Playground →");
    expect(src).toContain('fetch("/api/stage2", { cache: "no-store" })');
    for (const gone of [
      "showStage2Card",
      "stage2Room",
      "stage2Details",
      "Leave Stage 2",
      "Stage2Door",
      "onJoinStage2",
      "onLeaveStage2",
      'from "@/components/rooms/Stage2Door"',
    ]) {
      expect(src).not.toContain(gone);
    }
    expect(src).not.toContain('from "@/components/reading/Stage2Details"');
  });

  it("Jitsi owns fullscreen, hang-up and chat; the page retains only the room-ended path", async () => {
    const src = await read(STAGE);
    expect(src).not.toContain("requestFullscreen");
    expect(src).not.toMatch(/\bonLeave\b|\bonFullScreen\b|function leave\(|function fullScreen\(/);
    expect(src).toContain("onEnded={onRoomEnded}");
    expect(src).toContain("onRoomEnded={roomEnded}");
  });

  it("no Matrix or classroom import anywhere (the brief's Build 5)", async () => {
    const src = await read(STAGE);
    expect(src).not.toMatch(/import[^;]*(matrix|classroom)/i);
  });
});
