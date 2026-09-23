import { describe, it, expect } from "vitest";
import { promises as fs } from "fs";
import path from "path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ReadingStageBody, stage1WatchTarget, type ReadingStageBodyProps } from "@/components/reading/ReadingStage";
import Stage2Details from "@/components/reading/Stage2Details";

/**
 * TASK-438 (block 968,222; HOLD LIFTED block 968,269) — `ReadingStage.tsx`,
 * the /reading island: Watch, then room 2. The PURE `ReadingStageBody` is
 * rendered through renderToStaticMarkup across every phase (the repo runs
 * no jsdom — Stage2DoorBody's own precedent); the island's wiring (the
 * 20 s poll, the click-time fresh fetch, the single-embed conditional) is
 * pinned at the source and through the pure `stage1WatchTarget` helper.
 *
 * The phase-control law (Amendment 1's Tests): each phase has exactly ONE
 * primary control — closed has none, published has "Watch Love live",
 * watching has only the two small kit-btn-quiet tools (Full screen and
 * Leave), failed has "Try again", ended has "Watch again" only while the
 * room is still published. The book art is in closed, published and
 * ended; there is no <img> of it while watching (JitsiViewer replaces it
 * in the SAME frame).
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
    stage2Room: null,
    jitsiDomain: DOMAIN,
    nextWords: null,
    stage2Details: null,
    countdown: null,
    countdownWhen: null,
    left: false,
    onWatch: () => {},
    onTryAgain: () => {},
    onLeave: () => {},
    onFullScreen: () => {},
    onLeaveStage2: () => {},
    onJoinStage2: () => {},
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
    expect(html).toContain("/images/reading-book.webp");
    expect(html).not.toContain("kit-stage-viewer");
    expect(html).not.toContain("kit-stage-chip");
    expect(html).not.toContain("Watch Love live");
    expect(html).not.toContain(ROOM);
    expect(html).not.toContain("Join the discussion");
    expect(html).not.toContain("<button");
    expect(html).not.toContain("<iframe");
  });
});

describe("published, not yet watching — one tap starts her picture and sound", () => {
  const html = render(
    bodyProps({
      phase: "published",
      room: ROOM,
      /* the page (server) pre-renders the details — the island never imports them */
      stage2Details: createElement(Stage2Details, { weekPass: { name: "Weekly Chronicles — One Week Pass", price: "$11" } }),
    }),
  );

  it("the 'Love is live now' line, the LIVE chip on the book, exactly ONE kit-btn-main: Watch Love live", () => {
    expect(html).toContain("Love is live now");
    expect(html).toContain("kit-stage-chip");
    expect(html).toContain("/images/reading-book.webp");
    expect(count(html, "kit-btn-main")).toBe(1);
    expect(html).toContain("Watch Love live");
    expect(html).toContain("One tap starts her picture and sound.");
  });

  it("the first paint carries NO room and NO iframe — the room mounts only on the click's fresh answer", () => {
    expect(html).not.toContain(ROOM);
    expect(html).not.toContain("kit-stage-viewer");
    expect(html).not.toContain("<iframe");
  });

  it("the Stage 2 card does NOT ride the published first paint (K122 item 10 — the open sheet has none), and nothing about a camera or a microphone is said anywhere", () => {
    expect(html).not.toContain("Join the discussion");
    expect(html).not.toContain("Stage 2 · after the reading");
    expect(html).not.toMatch(/camera|microphone/i);
  });

  it("…the card appears once WATCHING (the round-3 live sheet), still below the frame", () => {
    const live = render(
      bodyProps({
        phase: "published",
        watching: true,
        room: ROOM,
        stage2Details: createElement(Stage2Details, { weekPass: { name: "Weekly Chronicles — One Week Pass", price: "$11" } }),
      }),
    );
    expect(live).toContain("Join the discussion");
    expect(live).toContain("Stage 2 · after the reading");
  });
});

describe("watching — JitsiViewer replaces the book in the same frame; two small tools, not a bar", () => {
  const html = render(bodyProps({ phase: "published", watching: true, room: ROOM }));

  it("the viewer is mounted, the book's <img> is GONE, the LIVE chip stays", () => {
    expect(html).toContain("kit-stage-viewer");
    expect(html).not.toContain("/images/reading-book.webp");
    expect(html).toContain("kit-stage-chip");
  });

  it("the controls area is slim and holds ONLY the two kit-btn-quiet tools: Full screen and Leave", () => {
    expect(html).toContain("kit-stage-controls-slim");
    expect(count(html, "kit-btn-quiet")).toBe(2);
    expect(html).toContain("Full screen");
    expect(html).toContain("Leave");
    expect(count(html, "kit-btn-main")).toBe(0);
    expect(html).not.toContain("One tap");
  });
});

describe("failed — the book returns, honest words, Try again, never a raw URL", () => {
  const html = render(bodyProps({ phase: "published", failed: true }));

  it("the book, the honest words, exactly one primary control: Try again", () => {
    expect(html).toContain("/images/reading-book.webp");
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

describe("ended — the book, the ended words, the next date; Watch again only while still published", () => {
  it("still published: Watch again is offered", () => {
    const html = render(bodyProps({ phase: "published", ended: true, nextWords: "Wednesday, September 30" }));
    expect(html).toContain("/images/reading-book.webp");
    expect(html).not.toContain("kit-stage-viewer");
    expect(html).toContain("The reading has ended — thank you for being here.");
    expect(html).toContain("Wednesday, September 30");
    expect(count(html, "kit-btn-main")).toBe(1);
    expect(html).toContain("Watch again");
  });

  it("closed underneath: the same words, no Watch again, no control", () => {
    const html = render(bodyProps({ phase: "closed", ended: true, nextWords: "Wednesday, September 30" }));
    expect(html).toContain("The reading has ended — thank you for being here.");
    expect(html).not.toContain("Watch again");
    expect(html).not.toContain("<button");
  });
});

describe("the Stage-2 branch — the single-embed conditional (StageView.tsx:150-163's pattern)", () => {
  const html = render(bodyProps({ phase: "published", stage2Room: "oc-fedcba9876543210" }));

  it("the unchanged JitsiRoom mounts in place of Stage 1 — no viewer, no book, no Watch", () => {
    expect(html).toContain("opening the room");
    expect(html).not.toContain("kit-stage-viewer");
    expect(html).not.toContain("/images/reading-book.webp");
    expect(html).not.toContain("Watch Love live");
  });

  it("Leave Stage 2 · back to the reading is ALWAYS visible (the only reset path)", () => {
    expect(html).toContain("Leave Stage 2 · back to the reading");
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

  it("Stage 2 mounts with signInHref=\"/login?next=%2Freading\" (the brief's Build 5)", async () => {
    const src = await read(STAGE);
    expect(src).toContain('signInHref="/login?next=%2Freading"');
    expect(src).toContain('from "@/components/rooms/Stage2Door"');
    /* the island NEVER imports Stage2Details — it reads the entitlement
       rail (whose dynamic `redis` import can never enter a client bundle),
       so the server page pre-renders it and hands it in as a ReactNode */
    expect(src).not.toContain('from "@/components/reading/Stage2Details"');
  });

  it("the Full screen tool calls requestFullscreen on the frame", async () => {
    const src = await read(STAGE);
    expect(src).toContain("requestFullscreen");
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
