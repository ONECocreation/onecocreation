import { describe, it, expect } from "vitest";
import { promises as fs } from "fs";
import path from "path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { PlaygroundIslandBody, type PlaygroundIslandBodyProps } from "@/components/reading/playground/PlaygroundIsland";

/**
 * T-454 (block 968,393) — the Saturday fixes the post-merge review
 * (wf_c9948ee4-37f) confirmed on main 6f76cb3. The repo runs no jsdom, so
 * effect-level behaviour (a viewer rebuilt by an unstable callback) is
 * pinned at the source, the house's T-450 pickup idiom; the Playground's
 * pre-answer frame is rendered.
 */

const read = (rel: string) => fs.readFile(path.join(process.cwd(), rel), "utf8");

describe("/reading's viewer survives the Playground banner flipping (the rejoin on Stage 2 open)", () => {
  /* TASK-471 (block 968,624): the one-way JitsiViewer's own two callbacks
     (`viewerEnded`/`viewerFailed`) are retired with it — JitsiRoom (the
     two-way embed) exposes only `onEnded`, and owns its own script-load
     failure internally. `roomEnded` is this lane's own stable identity
     (the same T-450 pickup idiom: a re-created callback on every
     playground-banner poll would tear the room down and rejoin it). */
  it("roomEnded and rejoin are stable useCallback identities handed to JitsiRoom / the left card", async () => {
    const src = await read("src/components/reading/ReadingStage.tsx");
    expect(src).not.toContain("function roomEnded(");
    const ended = src.indexOf("const roomEnded = useCallback(");
    expect(ended).toBeGreaterThan(-1);
    const endedClose = src.indexOf("}, [", ended);
    expect(src.slice(endedClose, endedClose + 16)).toBe("}, [markEnded]);");
    const rejoin = src.indexOf("const rejoin = useCallback(");
    expect(rejoin).toBeGreaterThan(-1);
    const rejoinClose = src.indexOf("}, [", rejoin);
    expect(src.slice(rejoinClose, rejoinClose + 7)).toBe("}, []);");
    expect(src).toContain("onRoomEnded={roomEnded}");
    expect(src).toContain("onRejoin={rejoin}");
    expect(src).not.toContain("viewerFailed");
    expect(src).not.toContain("onViewerFailed");
  });

  it("a failed banner read keeps the last-known state (it used to write undefined — a re-render)", async () => {
    const src = await read("src/components/reading/ReadingStage.tsx");
    expect(src).toContain("if (alive && d?.ok) setPlaygroundOpen(d.open === true);");
    expect(src).not.toContain("setPlaygroundOpen(d?.ok && d.open === true)");
  });
});

describe("/reading/playground before its first answer", () => {
  const base: PlaygroundIslandBodyProps = {
    wire: { decision: null, reachable: null, pkg: null },
    joinedRoom: null,
    left: false,
    nameSnapshot: "Guest",
    joining: false,
    weekBusy: false,
    note: null,
    jitsiDomain: "meet.saturday-polish.invalid",
    observerHref: "/packages/fixture-tier-b",
    observerName: "Fixture Observer",
    bookTalkPass: null,
    stage2Rows: createElement("ul", null, createElement("li", null, "ROWS")),
    onJoinClick: () => {},
    onTryWeek: () => {},
    onCallEnded: () => {},
  };

  it("pending (the server read it open): the book waits — no 'closed right now', no button, no link away", () => {
    const html = renderToStaticMarkup(createElement(PlaygroundIslandBody, { ...base, pending: true }));
    expect(html).toContain("reading-book.webp");
    expect(html).not.toContain("closed right now");
    expect(html).not.toContain("<button");
    expect(html).not.toContain("<a ");
  });

  it("not pending (the server read it closed): the closed card, as before", () => {
    const html = renderToStaticMarkup(createElement(PlaygroundIslandBody, base));
    expect(html).toContain("The Playground is closed right now");
  });

  it("the island is pending exactly while the wire hasn't answered and the server didn't read it hidden", async () => {
    const src = await read("src/components/reading/playground/PlaygroundIsland.tsx");
    expect(src).toContain('pending={!answered && initialDecision !== "hidden"}');
  });
});

describe("the console names the finishing order: Close first, then End meeting for all", () => {
  it("both stage cards say it", async () => {
    expect(await read("src/app/a/site/reading/Stage1Card.tsx")).toContain(
      "When you finish: press Close first (it removes our viewers on their next poll), then End meeting for all in the call.",
    );
    expect(await read("src/app/a/site/reading/Stage2Card.tsx")).toContain(
      "When you finish: press Close first, then End meeting for all in the call.",
    );
  });
});

describe("Heart Field Story time during Stage 2", () => {
  it("joining Stage 2 clears the story's note, and a late failed click says nothing during Stage 2", async () => {
    const src = await read("src/components/rooms/StageView.tsx");
    const join = src.slice(src.indexOf("const joinStage2 = useCallback("), src.indexOf("setStage2Room(room);"));
    expect(join).toContain("setStoryNote(null);");
    expect(src).toContain('if (!stage2RoomRef.current) setStoryNote("The reading\'s picture couldn\'t load here — try again.");');
  });

  it("the stage2 grid area can shrink on a 320 px phone (the wrapper is the grid item)", async () => {
    const css = await read("src/components/rooms/classroom.css");
    expect(css).toMatch(/\.cl-area-stage2 \{ grid-area: stage2; min-width: 0; \}/);
  });
});
