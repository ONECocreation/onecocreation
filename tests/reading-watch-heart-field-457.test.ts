import { describe, it, expect } from "vitest";
import { promises as fs } from "fs";
import path from "path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ReadingStageBody, type ReadingStageBodyProps } from "@/components/reading/ReadingStage";
import { Stage1CardBody, type Stage1CardBodyProps } from "@/app/a/site/reading/Stage1Card";

/**
 * TASK-457 (block 968,543) — the Admiral's ruling REVERSED the earlier
 * ruling that retired the Heart Field doors from /reading: Love only ever
 * goes live in the Heart Field, and /reading's Watch controls sent the
 * visitor there instead of mounting the stream in place.
 *
 * TASK-471 (block 968,624) REVERSES TASK-457 in turn: Love's first live
 * reading is tomorrow, and the Admiral's Saturday ruling makes Stage 1
 * two-way and mounts it IN PLACE on /reading again. This file, which used
 * to pin the Heart-Field-link shape, now pins its RETIREMENT — the door
 * is gone from both the public stage and the admin card's own words.
 * `tests/reading-stage.test.ts` carries the current shape's own full
 * record; this file stays as the retirement's own proof.
 */

const read = (rel: string) => fs.readFile(path.join(process.cwd(), rel), "utf8");

const STAGE = "src/components/reading/ReadingStage.tsx";
const CARD = "src/app/a/site/reading/Stage1Card.tsx";

const ROOM = "oc-0123456789abcdef";
const DOMAIN = "meet.reading-stage-fixture.invalid";

function bodyProps(overrides: Partial<ReadingStageBodyProps>): ReadingStageBodyProps {
  return {
    phase: "closed",
    signedIn: true,
    room: null,
    playgroundLock: { locked: false, floorName: "Test Tier" },
    jitsiDomain: DOMAIN,
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

function render(p: ReadingStageBodyProps): string {
  return renderToStaticMarkup(createElement(ReadingStageBody, p));
}

describe("TASK-471 (block 968,624) — the Heart Field door is retired from the public stage", () => {
  it("published, signed in: no href to /rooms/heart-field anywhere, no 'Watch Love live' label", () => {
    const html = render(bodyProps({ phase: "published", signedIn: true, room: ROOM }));
    expect(html).not.toContain("/rooms/heart-field");
    expect(html).not.toContain("Watch Love live");
  });

  it("closed: no href to /rooms/heart-field, no 'Go to the Heart Field' label, no button at all", () => {
    const html = render(bodyProps({}));
    expect(html).not.toContain("/rooms/heart-field");
    expect(html).not.toContain("Go to the Heart Field");
    expect(html).not.toContain("<a ");
    expect(html).not.toContain("<button");
  });

  it("left-while-published: the way back in is an in-page button, never a link to /rooms/heart-field", () => {
    const html = render(bodyProps({ phase: "published", left: true }));
    expect(html).not.toMatch(/<a[^>]*href="\/rooms\/heart-field"/);
    expect(html).toMatch(/<button[^>]*>\s*Back to the reading\s*<\/button>/);
  });

  it("ended, still published: no Watch again, no Heart Field link — the ended card picks Part 3 in-page (TASK-473, block 968,624), never /reading/playground", () => {
    const html = render(bodyProps({ phase: "published", ended: true, nextWords: "Wednesday, September 30" }));
    expect(html).not.toMatch(/<button[^>]*>\s*Watch again/);
    expect(html).not.toContain("Watch again");
    expect(html).not.toContain("/rooms/heart-field");
    expect(html).toContain("Watch the Book Talk");
    expect(html).not.toContain("/reading/playground");
    expect(html).toContain('href="#stage"');
  });
});

describe("no <button> or <a> in ReadingStageBody ever calls a Heart Field navigation", () => {
  it("the source carries no /rooms/heart-field href anywhere", async () => {
    const src = await read(STAGE);
    expect(src).not.toContain('href="/rooms/heart-field"');
  });
});

describe("Stage1Card — the published words no longer point the admin at the Heart Field (TASK-471 reverses TASK-457)", () => {
  it("the source line", async () => {
    const src = await read(CARD);
    expect(src).toContain("Published. Signed-in visitors join right on /reading.");
    expect(src).not.toContain("Published — members watch in the Heart Field. /reading sends them there.");
  });

  it("the rendered lifecycle row, published phase", () => {
    const props: Stage1CardBodyProps = {
      state: { phase: "published", room: ROOM, jitsiDomain: DOMAIN },
      busy: null,
      error: null,
      onAct: () => {},
    };
    const html = renderToStaticMarkup(createElement(Stage1CardBody, props));
    expect(html).toContain("Published. Signed-in visitors join right on /reading.");
  });
});
