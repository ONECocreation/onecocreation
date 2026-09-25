import { describe, it, expect } from "vitest";
import { promises as fs } from "fs";
import path from "path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ReadingStageBody, stage1WatchTarget, type ReadingStageBodyProps } from "@/components/reading/ReadingStage";

/**
 * TASK-438 (block 968,222; HOLD LIFTED block 968,269) — `ReadingStage.tsx`,
 * the /reading island: Watch, then room 2. The PURE `ReadingStageBody` is
 * rendered through renderToStaticMarkup across every phase (the repo runs
 * no jsdom — Stage2DoorBody's own precedent); the island's wiring (the
 * 20 s polls, the click-time fresh fetch) is pinned at the source and
 * through the pure `stage1WatchTarget` helper.
 *
 * TASK-449 (block 968,364; AMENDMENT 1 block 968,366): the in-place Stage
 * 2 card and the single-embed branch are REPLACED by the Playground
 * banner — shown in every phase while Stage 2 is open (the island's own
 * 20 s `/api/stage2` poll), gone the poll after Love closes. The pins of
 * that replaced shape were rewritten in this lane's red pass; every other
 * pin below is byte-identical to base.
 *
 * The phase-control law (Amendment 1's Tests): each phase has exactly ONE
 * primary control — closed has none, published has "Watch Love live",
 * watching has no page control (Jitsi owns fullscreen and hang-up),
 * failed has "Try again", ended has "Watch again" only while the
 * room is still published. The book art is in closed, published and
 * ended; there is no <img> of it while watching (JitsiViewer replaces it
 * in the SAME frame).
 *
 * TASK-457 (block 968,543) — REVERSAL of the ruling that retired the Heart
 * Field doors from /reading: closed now also carries "Go to the Heart
 * Field", and every control that used to call `onWatch` (published,
 * ended-while-published, left-while-published) is now a `Link` to
 * `/rooms/heart-field` with its label unchanged. The one pin this changed
 * (published's "One tap starts her picture and sound." quiet line) is
 * re-trued below; every other assertion in this file is unaffected because
 * the labels and `kit-btn-main` class held. `tests/reading-watch-heart-
 * field-457.test.ts` carries this lane's own new pins.
 *
 * TASK-464 (block 968,548) — the Admiral's two answers: the published
 * "Watch Love live" link picks up `kit-btn-sm` (it bled 3 px past its card
 * on a 360 px phone, same shape as TASK-463's "Go to the Heart Field");
 * "Watch again" (ended/left) and "Try again" are untouched. The Playground
 * banner's kicker drops "Stage 2 · " and reads "The Playground" alone.
 * `tests/reading-small-watch-464.test.ts` carries this lane's own new pins.
 */

const read = (rel: string) => fs.readFile(path.join(process.cwd(), rel), "utf8");

const STAGE = "src/components/reading/ReadingStage.tsx";
const PAGE = "src/app/reading/page.tsx";

const ROOM = "oc-0123456789abcdef";
const DOMAIN = "meet.reading-stage-fixture.invalid";

function bodyProps(overrides: Partial<ReadingStageBodyProps>): ReadingStageBodyProps {
  return {
    phase: "closed",
    watching: false,
    failed: false,
    ended: false,
    room: null,
    playgroundOpen: false,
    /* TASK-466 (block 968,561): unlocked by default — this suite pins the
       pre-existing shape, not the lock itself (tests/reading-polish-
       466.test.ts owns the locked/unlocked pins). */
    playgroundLock: { locked: false, floorName: "Test Tier" },
    jitsiDomain: DOMAIN,
    nextWords: null,
    countdown: null,
    countdownWhen: null,
    left: false,
    onWatch: () => {},
    onTryAgain: () => {},
    onViewerEnded: () => {},
    ...overrides,
  };
}

function render(p: ReadingStageBodyProps): string {
  return renderToStaticMarkup(createElement(ReadingStageBody, p));
}

const count = (html: string, needle: string) => html.split(needle).length - 1;

describe("closed — the book waits, the welcome words, no control at all", () => {
  const html = render(bodyProps({}));

  it("the round-3 welcome words and the Watch-button promise, verbatim", () => {
    expect(html).toContain("The reading is live to watch, free. Want to join the discussion? Stay after for a live group video call with Love.");
    expect(html).toContain("Your Watch button appears right here when Love goes live.");
  });

  it("the book art is there; no iframe, no chip, no Watch button, no room string, no Stage 2 card", () => {
    expect(html).toContain("/images/reading-love-cover.jpg");
    expect(html).not.toContain("kit-stage-viewer");
    expect(html).not.toContain("kit-stage-chip");
    expect(html).not.toContain("Watch Love live");
    expect(html).not.toContain(ROOM);
    expect(html).not.toContain("Join the discussion");
    expect(html).not.toContain("<button");
    expect(html).not.toContain("<iframe");
  });
});

describe("published, not yet watching — Watch Love live sends the visitor to the Heart Field (TASK-457, block 968,543)", () => {
  const html = render(bodyProps({ phase: "published", room: ROOM }));

  it("the 'Love is live now' line, the LIVE chip on the book, exactly ONE kit-btn-main: Watch Love live", () => {
    expect(html).toContain("Love is live now");
    expect(html).toContain("kit-stage-chip");
    expect(html).toContain("/images/reading-love-cover.jpg");
    expect(count(html, "kit-btn-main")).toBe(1);
    expect(html).toContain("Watch Love live");
    // TASK-457 (block 968,543) re-true: "One tap starts her picture and
    // sound." (the in-place mount promise) -> the Heart Field hand-off words.
    expect(html).toContain("It plays in the Heart Field. Sign in with your email if you haven&#x27;t yet. It&#x27;s free.");
  });

  it("the first paint carries NO room and NO iframe — the room mounts only on the click's fresh answer", () => {
    expect(html).not.toContain(ROOM);
    expect(html).not.toContain("kit-stage-viewer");
    expect(html).not.toContain("<iframe");
  });

  it("no banner while the Playground is closed (playgroundOpen false), and nothing about a camera or a microphone is said anywhere", () => {
    expect(html).not.toContain("Want an encore?");
    // TASK-464 (block 968,548) re-true: the kicker is "The Playground" now
    // (was "Stage 2 · the Playground") — it renders only inside the banner,
    // so this playgroundOpen:false render must carry NEITHER string.
    expect(html).not.toContain("The Playground");
    expect(html).not.toContain("Stage 2 · the Playground");
    expect(html).not.toMatch(/camera|microphone/i);
  });
});

describe("watching — JitsiViewer replaces the book; its toolbar is the only control", () => {
  const html = render(bodyProps({ phase: "published", watching: true, room: ROOM }));

  it("the viewer is mounted, the book's <img> is GONE, the LIVE chip stays", () => {
    expect(html).toContain("kit-stage-viewer");
    expect(html).not.toContain("/images/reading-love-cover.jpg");
    expect(html).toContain("kit-stage-chip");
  });

  it("no page controls row, Full screen or Leave button under the viewer", () => {
    expect(html).not.toContain("kit-stage-controls");
    expect(count(html, "kit-btn-quiet")).toBe(0);
    expect(html).not.toContain("Full screen");
    expect(html).not.toMatch(/<button\b[^>]*>\s*Leave\s*<\/button>/);
    expect(count(html, "kit-btn-main")).toBe(0);
    expect(html).not.toContain("One tap");
  });
});

describe("failed — the book returns, honest words, Try again, never a raw URL", () => {
  const html = render(bodyProps({ phase: "published", failed: true }));

  it("the book, the honest words, exactly one primary control: Try again", () => {
    expect(html).toContain("/images/reading-love-cover.jpg");
    expect(html).not.toContain("kit-stage-viewer");
    expect(count(html, "kit-btn-main")).toBe(1);
    expect(html).toContain("Try again");
  });

  it("no raw-room link, no domain on the page, no VDO fallback", () => {
    expect(html).not.toContain("<a");
    expect(html).not.toContain(DOMAIN);
    expect(html).not.toMatch(/vdo/i);
  });
});

describe("ended — the book, the ended words, the next date; TASK-466 (block 968,561) retired Watch again for one Playground door, in BOTH variants", () => {
  it("still published: the ended words (now two sentences, no dash) and the Playground link, not Watch again", () => {
    const html = render(bodyProps({ phase: "published", ended: true, nextWords: "Wednesday, September 30" }));
    expect(html).toContain("/images/reading-love-cover.jpg");
    expect(html).not.toContain("kit-stage-viewer");
    expect(html).toContain("The reading has ended.");
    expect(html).toContain("Thank you for being here.");
    expect(html).not.toContain("The reading has ended — thank you for being here.");
    expect(html).toContain("Wednesday, September 30");
    expect(count(html, "kit-btn-main")).toBe(1);
    expect(html).not.toContain("Watch again");
    expect(html).toContain("Watch part two in the Playground");
    expect(html).toContain('href="/reading/playground"');
  });

  it("closed underneath: the SAME words and the SAME Playground door — TASK-466 dropped the old published-only gate", () => {
    const html = render(bodyProps({ phase: "closed", ended: true, nextWords: "Wednesday, September 30" }));
    expect(html).toContain("The reading has ended.");
    expect(html).toContain("Thank you for being here.");
    expect(html).not.toContain("Watch again");
    expect(html).not.toContain("<button");
    expect(html).toContain("Watch part two in the Playground");
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

describe("the Playground banner (TASK-449) — open-only, in EVERY phase, after the stage", () => {
  it("while Stage 2 is open the banner shows: watching, ended, closed and published alike (K124 §3)", () => {
    for (const over of [
      { phase: "closed" },
      { phase: "published", room: ROOM },
      { phase: "published", watching: true, room: ROOM },
      { phase: "closed", ended: true, nextWords: "Wednesday, September 30" },
    ] as const) {
      const html = render(bodyProps({ ...over, playgroundOpen: true }));
      // TASK-464 (block 968,548): the kicker dropped "Stage 2 · "
      expect(html).toContain('<p class="kicker">The Playground</p>');
      expect(html).not.toContain("Stage 2 · the Playground");
      expect(html).toContain("Want an encore?");
      expect(html).toContain("Go to the Playground");
      expect(html).toContain('href="/reading/playground"');
      expect(html).not.toContain("Go to the Playground →"); // ruling 1: no arrow
    }
  });

  it("closed Stage 2 (playgroundOpen false) renders NO banner in any phase (the ended card's OWN Playground door, TASK-466, is not the banner and is asserted separately below)", () => {
    for (const over of [
      { phase: "closed" },
      { phase: "published", room: ROOM },
      { phase: "published", watching: true, room: ROOM },
      { phase: "closed", ended: true, nextWords: "Wednesday, September 30" },
    ] as const) {
      const html = render(bodyProps({ ...over, playgroundOpen: false }));
      expect(html).not.toContain("Want an encore?");
      // TASK-466: the ended card carries its own /reading/playground link
      // when the banner isn't open — the banner-specific string above is
      // the real pin here; ended is checked on its own terms.
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

  it("published, watching and failed render NO cells and no 'Starting now.' — the when-lines ride instead (brief L3: 'until the phase says otherwise')", () => {
    for (const over of [
      { phase: "published", room: ROOM },
      { phase: "published", watching: true, room: ROOM },
      { phase: "published", failed: true },
    ] as const) {
      const html = render(bodyProps({ ...over, countdown: CELLS, countdownWhen: WHEN }));
      expect(html).not.toContain("kit-count");
      expect(html).not.toContain("Starting now.");
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

  it("the page hands the countdown INTO ReadingStage as server-composed nodes (the stage2Details idiom) — never a bare page mount that can't know the phase", async () => {
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

describe("a viewer's own hangup is NOT 'the reading has ended' (K122 item 8)", () => {
  it("left-while-published: 'You left the reading.' plus exactly ONE kit-btn-main, Watch again — never the ended words", () => {
    const html = render(bodyProps({ phase: "published", left: true }));
    expect(html).toContain("You left the reading.");
    expect(count(html, "kit-btn-main")).toBe(1);
    expect(html).toContain("Watch again");
    expect(html).not.toContain("The reading has ended");
  });

  it("the viewer-ended path re-reads /api/stage1 no-store — only a closed or expired stage shows the ended words", async () => {
    const src = await read(STAGE);
    const fetches = src.match(/fetch\("\/api\/stage1", \{ cache: "no-store" \}\)/g) ?? [];
    expect(fetches.length).toBeGreaterThanOrEqual(3); // the poll, the Watch click, AND the hangup re-check
  });
});

describe("stage1WatchTarget — the click's fresh answer is the only thing that can mount a room", () => {  it("published with a room -> the room", () => {
    expect(stage1WatchTarget({ ok: true, phase: "published", room: ROOM, jitsiDomain: DOMAIN })).toBe(ROOM);
  });

  it("prepared, closed, a failed read, or a published body WITHOUT a room -> null (a fresh-click rejection never mounts)", () => {
    expect(stage1WatchTarget({ ok: true, phase: "prepared", room: null, jitsiDomain: null })).toBeNull();
    expect(stage1WatchTarget({ ok: true, phase: "closed", room: null, jitsiDomain: null })).toBeNull();
    expect(stage1WatchTarget({ ok: false, phase: "closed", room: null, jitsiDomain: null })).toBeNull();
    expect(stage1WatchTarget(null)).toBeNull();
    expect(stage1WatchTarget({ ok: true, phase: "published", room: null, jitsiDomain: DOMAIN })).toBeNull();
  });
});

describe("the island's own wiring — source pins (the repo runs no jsdom)", () => {
  it("polls /api/stage1 every 20 seconds, no-store, and the Watch click does its OWN fresh no-store fetch", async () => {
    const src = await read(STAGE);
    expect(src).toContain("20_000");
    const fetches = src.match(/fetch\("\/api\/stage1", \{ cache: "no-store" \}\)/g) ?? [];
    expect(fetches.length).toBeGreaterThanOrEqual(2); // the poll AND the click-time re-check
  });

  it("the banner replaced the Stage 2 card + single-embed branch (TASK-449): banner words and its own /api/stage2 poll; none of the replaced shape survives", async () => {
    const src = await read(STAGE);
    // TASK-464 (block 968,548): the kicker dropped "Stage 2 · "
    expect(src).toContain('<p className="kicker">The Playground</p>');
    expect(src).not.toContain("Stage 2 · the Playground");
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
      'from "@/components/booking/JitsiRoom"',
    ]) {
      expect(src).not.toContain(gone);
    }
    /* the island NEVER imports Stage2Details — the rail's dynamic `redis`
       import can never enter a client bundle */
    expect(src).not.toContain('from "@/components/reading/Stage2Details"');
  });

  it("Jitsi owns fullscreen and hang-up; the page retains the viewer-ended path only", async () => {
    const src = await read(STAGE);
    expect(src).not.toContain("requestFullscreen");
    expect(src).not.toMatch(/\bonLeave\b|\bonFullScreen\b|function leave\(|function fullScreen\(/);
    expect(src).toContain("onEnded={onViewerEnded}");
    expect(src).toContain("onViewerEnded={viewerEnded}");
  });

  it("SSR hands the phase only — no room, no host URL, no moderator data in the props (phase-only SSR)", async () => {
    const src = await read(STAGE);
    const block = src.match(/export interface ReadingStageProps \{[\s\S]*?\n\}/);
    expect(block, "ReadingStageProps not found").not.toBeNull();
    expect(block![0]).not.toMatch(/\broom\b/i);
    expect(block![0]).not.toContain("hostUrl");
    expect(block![0]).toContain("initialPhase");
  });

  it("no Matrix or classroom import anywhere (the brief's Build 5)", async () => {
    const src = await read(STAGE);
    expect(src).not.toMatch(/import[^;]*(matrix|classroom)/i);
  });
});
