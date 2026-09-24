import { describe, it, expect } from "vitest";
import { promises as fs } from "fs";
import path from "path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

/**
 * TASK-450 (block 968,370; K124 §T-450 + the Admiral's ruling 2,
 * block 968,357) — the Heart Field room's "● Story time": while Stage 1
 * is published the free reading room (READING_ROOM_SLUG) offers the
 * reading on its OWN stage — the same one-way JitsiViewer /reading uses
 * (Guest, the T-448 keys, untouched) — with the room's chat stepped
 * aside in THAT stage state only, and the Stage 2 door never moving.
 *
 * The repo runs no jsdom and effects never run under renderToStaticMarkup
 * (tests/studio-chat-switch.test.ts's own idiom), so the poll/click law
 * is pinned at SOURCE level and the chat-off law at source level AND on
 * the static render's default state (storyRoom starts null — both
 * chatHidden shapes re-asserted here so the pin travels with the lane).
 */

const STAGE_VIEW = "src/components/rooms/StageView.tsx";
const STORY_PILL = "src/components/rooms/StoryTimePill.tsx";
const READING_STAGE = "src/components/reading/ReadingStage.tsx";
const read = (rel: string) => fs.readFile(path.join(process.cwd(), rel), "utf8");

/* the same minimal props tests/studio-chat-switch.test.ts renders
   StageView with — heart-field IS the derived READING_ROOM_SLUG */
const PROPS = {
  slug: "heart-field",
  alias: "#heart-field:onecocreation.com",
  title: "Heart Field",
  kind: "community" as const,
  live: false,
  roster: null,
};

/** the poll effect's own source block, delimited by its docblock marker */
function pollBlock(src: string): string {
  const start = src.indexOf("TASK-450: ONE new poll");
  expect(start, "the Story time poll effect is missing").toBeGreaterThan(-1);
  const end = src.indexOf("}, [slug]);", start);
  expect(end, "the poll effect's end is missing").toBeGreaterThan(-1);
  return src.slice(start, end);
}

/** the click handler's own source block */
function clickBlock(src: string): string {
  const start = src.indexOf("async function storyTime()");
  expect(start, "the storyTime click handler is missing").toBeGreaterThan(-1);
  const end = src.indexOf("function storyEnded(", start);
  expect(end, "the click handler's end is missing").toBeGreaterThan(-1);
  return src.slice(start, end);
}

/** the story-stage swap branch inside the video region */
function storyBranch(src: string): string {
  const start = src.indexOf(") : storyRoom ? (");
  expect(start, "the storyRoom swap branch is missing").toBeGreaterThan(-1);
  const end = src.indexOf(") : (", start);
  expect(end, "the storyRoom branch's end is missing").toBeGreaterThan(-1);
  return src.slice(start, end);
}

describe("the poll — one new 20 s display-only read, gated to the Heart Field room", () => {
  it("rides ClassroomView's /api/live idiom: no-store, alive flag, a missed poll keeps the last-known state", async () => {
    const poll = pollBlock(await read(STAGE_VIEW));
    expect(poll).toContain('fetch("/api/stage1", { cache: "no-store" })');
    expect(poll).toContain("let alive = true;");
    expect(poll).toContain("setInterval(poll, 20_000)");
    expect(poll).toContain(".catch(() => {})");
  });

  it("wears the SAME slug guard the Stage2Door mount wears — no other room ever polls", async () => {
    const poll = pollBlock(await read(STAGE_VIEW));
    expect(poll).toContain("if (slug !== READING_ROOM_SLUG) return;");
  });

  it("is DISPLAY-ONLY: it sets storyOpen, never a room — the click alone mounts", async () => {
    const poll = pollBlock(await read(STAGE_VIEW));
    expect(poll).toContain('setStoryOpen(d.phase === "published")');
    expect(poll).not.toContain("setStoryRoom");
    expect(poll).not.toContain("JitsiViewer");
  });

  it("starts closed — no pill until a published answer arrives (fail-closed by construction)", async () => {
    const src = await read(STAGE_VIEW);
    expect(src).toContain("useState(false)");
    const StageView = (await import("@/components/rooms/StageView")).default;
    const html = renderToStaticMarkup(createElement(StageView, PROPS));
    expect(html).not.toContain("Story time");
  });

  it("exactly two /api/stage1 fetches exist in the file — the poll's and the click's, never a third", async () => {
    const src = await read(STAGE_VIEW);
    expect(src.match(/fetch\("\/api\/stage1"/g)?.length).toBe(2);
  });
});

describe("the click authorizes — a fresh re-check through the imported stage1WatchTarget", () => {
  it("IMPORTS the house's one decision from ReadingStage — never re-implements it", async () => {
    const src = await read(STAGE_VIEW);
    expect(src).toContain('import { stage1WatchTarget } from "../reading/ReadingStage";');
    const reading = await read(READING_STAGE);
    expect(reading).toContain("export function stage1WatchTarget(");
    /* the room string never travels through StageView's own hands */
    expect(src).not.toContain("body.room");
    expect(src).not.toContain("d.room");
  });

  it("fetches /api/stage1 FRESH at the instant of the click and mounts only the fresh answer's room", async () => {
    const click = clickBlock(await read(STAGE_VIEW));
    expect(click).toContain('fetch("/api/stage1", { cache: "no-store" })');
    expect(click).toContain("const target = stage1WatchTarget(body);");
    expect(click).toContain("setStoryRoom(target);");
  });

  it("a null target mounts NOTHING — a stale poll's pill can never open a closed stage", async () => {
    const click = clickBlock(await read(STAGE_VIEW));
    /* the ONLY non-null setStoryRoom in the whole file rides the target guard */
    const src = await read(STAGE_VIEW);
    const mounts = [...src.matchAll(/setStoryRoom\(([^)]*)\)/g)].map((m) => m[1]).filter((a) => a !== "null");
    expect(mounts).toEqual(["target"]);
    expect(click).toMatch(/if \(target &&/);
  });

  it("the wire's jitsiDomain rides WITH the room name — the pair never splits", async () => {
    const click = clickBlock(await read(STAGE_VIEW));
    expect(click).toContain("setStoryDomain(body.jitsiDomain);");
  });
});

describe("the pill — the room's own btn btn-gold idiom, honest precedence", () => {
  it("renders only under the slug guard + a published poll answer + a free stage", async () => {
    const src = await read(STAGE_VIEW);
    expect(src).toContain("slug === READING_ROOM_SLUG && storyOpen && !live && !stage2Room && !storyRoom");
  });

  it("is a plain btn btn-gold button — the ● Story time copy, NO inline style, in its OWN leaf (the census law)", async () => {
    /* the operator census ratchets StageView's buttonFamilies at 1 and the
       write mode never raises — the button element lives in
       StoryTimePill.tsx, which enters at the new-file allowance */
    const pill = await read(STORY_PILL);
    expect(pill).toContain('<button type="button" className="btn btn-gold" onClick={onWatch}>');
    expect(pill).toContain("● Story time");
    expect(pill).not.toContain("style=");
    /* StageView itself gains NO button element and NO style block this lane */
    const src = await read(STAGE_VIEW);
    expect(src.match(/<button/g)?.length ?? 0).toBe(1); // the TASK-392 Leave Stage 2 reset only
    expect(src.match(/style=\{\{/g)?.length ?? 0).toBe(3);
    expect(src).toContain("<StoryTimePill onWatch={() => void storyTime()} />");
  });

  it("the room's own live show and a joined Stage 2 outrank the pill (ruling E)", async () => {
    const src = await read(STAGE_VIEW);
    const pillLine = src.slice(src.indexOf("slug === READING_ROOM_SLUG && storyOpen"));
    expect(pillLine).toContain("!live");
    expect(pillLine).toContain("!stage2Room");
  });
});

describe("chat off in the story-time stage state ONLY (ruling 2's 'for now')", () => {
  it("a LOCAL chatOff = chatHidden || storyRoom !== null — the operator's switch and ClassroomView untouched", async () => {
    const src = await read(STAGE_VIEW);
    expect(src).toContain("const chatOff = chatHidden || storyRoom !== null;");
    expect(src).toContain('`cl-grid-stage${chatOff ? " cl-grid-stage--no-chat" : ""}`');
    expect(src).toContain("{!chatOff && (");
    const classroom = await read("src/components/rooms/ClassroomView.tsx");
    expect(classroom).not.toContain("storyRoom");
    expect(classroom).not.toContain("stage1");
  });

  it("no story playing (the static render's default): chatHidden=false mounts the chat region, no modifier", async () => {
    const StageView = (await import("@/components/rooms/StageView")).default;
    const html = renderToStaticMarkup(createElement(StageView, PROPS));
    expect(html).toContain('data-region="chat"');
    expect(html).not.toContain("cl-grid-stage--no-chat");
  });

  it("no story playing: chatHidden=true hides the chat region, the modifier rides — today's shapes hold", async () => {
    const StageView = (await import("@/components/rooms/StageView")).default;
    const html = renderToStaticMarkup(createElement(StageView, { ...PROPS, chatHidden: true }));
    expect(html).not.toContain('data-region="chat"');
    expect(html).toContain("cl-grid-stage--no-chat");
  });

  it("the chat gate and the grid modifier consume chatOff, not the bare prop — storyRoom set steps chat aside", async () => {
    const src = await read(STAGE_VIEW);
    const chatGate = src.indexOf("{!chatOff && (");
    expect(src.slice(chatGate, chatGate + 200)).toContain('data-region="chat"');
    /* and the bare prop is never consumed at either spot any more */
    expect(src).not.toContain('`cl-grid-stage${chatHidden ?');
    expect(src).not.toContain("{!chatHidden && (");
  });
});

describe("the swap and the way back — the reading on the room's own stage", () => {
  it("the storyRoom branch mounts the one-way JitsiViewer with the wire's domain + room", async () => {
    const branch = storyBranch(await read(STAGE_VIEW));
    expect(branch).toContain("<JitsiViewer");
    expect(branch).toContain("domain={storyDomain ??");
    expect(branch).toContain("room={storyRoom}");
    expect(branch).toContain("onEnded={storyEnded}");
    expect(branch).toContain("onFailed={storyFailed}");
  });

  it("carries NO page button — Jitsi's own toolbar (fullscreen + hangup) is the whole control surface", async () => {
    const branch = storyBranch(await read(STAGE_VIEW));
    expect(branch).not.toContain("<button");
    expect(branch).not.toContain("<Link");
  });

  it("onEnded is the way back and onFailed clears the stage with the honest one-line note", async () => {
    const src = await read(STAGE_VIEW);
    const ended = src.indexOf("function storyEnded(");
    expect(src.slice(ended, ended + 200)).toContain("setStoryRoom(null);");
    const failed = src.indexOf("function storyFailed(");
    expect(src.slice(failed, failed + 300)).toContain("setStoryRoom(null);");
    expect(src.slice(failed, failed + 300)).toContain("The reading's picture couldn't load here — try again.");
  });

  it("the stage2Room branch stays byte-identical (ruling 2 — the Stage 2 door never moves)", async () => {
    const src = await read(STAGE_VIEW);
    expect(src).toContain("Leave Stage 2 · back to the reading");
    expect(src).toContain('<JitsiRoom domain={jitsiDomain ?? ""} room={stage2Room} displayName={undefined} />');
    expect(src).toContain(
      '<Stage2Door jitsiDomain={jitsiDomain ?? ""} joined={!!stage2Room} onJoin={setStage2Room} signedIn={signedIn} />',
    );
  });

  it("the viewer joins as Guest — no name prop is ever handed to JitsiViewer (the one-way design)", async () => {
    const src = await read(STAGE_VIEW);
    expect(src).not.toContain("readingViewerName");
    const branch = storyBranch(src);
    expect(branch).not.toContain("displayName");
  });
});
