import { describe, it, expect } from "vitest";
import { promises as fs } from "fs";
import path from "path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ReadingStageBody, type ReadingStageBodyProps } from "@/components/reading/ReadingStage";
import { Stage1CardBody, type Stage1CardBodyProps } from "@/app/a/site/reading/Stage1Card";

/**
 * TASK-457 (block 968,543) — the Admiral's ruling (his tracker notes,
 * block 968,516: w482-where-reading + w482-email-to-watch) REVERSES the
 * earlier ruling that retired the Heart Field doors from /reading: Love
 * only ever goes live in the Heart Field now, and /reading's Watch
 * controls send the visitor there instead of mounting the stream in
 * place. This suite pins the new shape; `tests/reading-stage.test.ts`
 * carries the one re-trued pin from the old shape (the published quiet
 * line) — every other assertion in that file held unmodified because the
 * labels and `kit-btn-main` class are unchanged.
 */

const read = (rel: string) => fs.readFile(path.join(process.cwd(), rel), "utf8");

const STAGE = "src/components/reading/ReadingStage.tsx";
const CARD = "src/app/a/site/reading/Stage1Card.tsx";

const ROOM = "oc-0123456789abcdef";
const DOMAIN = "meet.reading-stage-fixture.invalid";
const HEART_FIELD_HREF = "/rooms/heart-field";

function bodyProps(overrides: Partial<ReadingStageBodyProps>): ReadingStageBodyProps {
  return {
    phase: "closed",
    watching: false,
    failed: false,
    ended: false,
    room: null,
    playgroundOpen: false,
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

describe("published — Watch Love live is a link to the Heart Field, never an in-place mount", () => {
  const html = render(bodyProps({ phase: "published", room: ROOM }));

  it('renders exactly one kit-btn-main link (the small size since TASK-464), href="/rooms/heart-field", labelled "Watch Love live"', () => {
    expect(html).toMatch(
      new RegExp(
        `<a class="kit-btn kit-btn-main kit-btn-sm" href="${HEART_FIELD_HREF.replace("/", "\\/")}">\\s*Watch Love live\\s*<\\/a>`,
      ),
    );
  });

  it("the quiet line sends the visitor to the Heart Field, names sign-in, and says it's free", () => {
    expect(html).toContain("It plays in the Heart Field. Sign in with your email if you haven&#x27;t yet. It&#x27;s free.");
  });

  it("no JitsiViewer mount path from this control — no room string, no viewer class, no iframe", () => {
    expect(html).not.toContain(ROOM);
    expect(html).not.toContain("kit-stage-viewer");
    expect(html).not.toContain("<iframe");
  });
});

describe("closed — Go to the Heart Field", () => {
  const html = render(bodyProps({}));

  it('renders exactly one kit-btn-main link (the small size since TASK-463), href="/rooms/heart-field", labelled "Go to the Heart Field"', () => {
    expect(html).toMatch(
      new RegExp(`<a class="kit-btn kit-btn-main kit-btn-sm" href="${HEART_FIELD_HREF.replace("/", "\\/")}">\\s*Go to the Heart Field\\s*<\\/a>`),
    );
  });

  it("keeps the round-3 welcome body paragraph untouched, and the quiet line now names the Heart Field", () => {
    expect(html).toContain(
      "The reading is live to watch, free. Want to join the discussion? Stay after for a live group video call with Love.",
    );
    expect(html).toContain(
      "The reading plays in the Heart Field. Your Watch button appears right here when Love goes live.",
    );
  });

  it("no button anywhere in the closed body — the new control is a link, not a mount", () => {
    expect(html).not.toContain("<button");
  });
});

describe("ended-while-published and left-while-published: Watch again is the same Heart Field link, label unchanged", () => {
  it("ended, still published: Watch again links to /rooms/heart-field", () => {
    const html = render(bodyProps({ phase: "published", ended: true, nextWords: "Wednesday, September 30" }));
    expect(html).not.toMatch(/<button[^>]*>\s*Watch again/);
    expect(html).toMatch(new RegExp(`<a[^>]*href="${HEART_FIELD_HREF.replace("/", "\\/")}"[^>]*>\\s*Watch again\\s*<\\/a>`));
  });

  it("left-while-published: Watch again links to /rooms/heart-field", () => {
    const html = render(bodyProps({ phase: "published", left: true }));
    expect(html).not.toMatch(/<button[^>]*>\s*Watch again/);
    expect(html).toMatch(new RegExp(`<a[^>]*href="${HEART_FIELD_HREF.replace("/", "\\/")}"[^>]*>\\s*Watch again\\s*<\\/a>`));
  });
});

describe("no <button> in ReadingStageBody calls onWatch — nothing on /reading mounts the stream any more", () => {
  it("the source carries no onClick={onWatch} anywhere (every former Watch control is now a Link)", async () => {
    const src = await read(STAGE);
    expect(src).not.toContain("onClick={onWatch}");
  });

  it("ReadingStageBody's own JSX never destructures onWatch (it stays only in the type, for the wired watch() click-time fetch)", async () => {
    const src = await read(STAGE);
    const fnStart = src.indexOf("export function ReadingStageBody({");
    expect(fnStart).toBeGreaterThan(-1);
    const fnHeader = src.slice(fnStart, src.indexOf("ReadingStageBodyProps) {", fnStart));
    expect(fnHeader).not.toMatch(/\bonWatch\b/);
  });

  it("every rendered phase across the pure body is free of <button>-calls-onWatch (belt and suspenders on the real markup)", () => {
    const cases: Array<Partial<ReadingStageBodyProps>> = [
      { phase: "closed" },
      { phase: "published", room: ROOM },
      { phase: "published", ended: true, nextWords: "Wednesday, September 30" },
      { phase: "closed", ended: true, nextWords: "Wednesday, September 30" },
      { phase: "published", left: true },
      { phase: "published", failed: true },
      { phase: "published", watching: true, room: ROOM },
    ];
    for (const over of cases) {
      const html = render(bodyProps(over));
      // Try again (failed) is the one legitimate remaining <button>; it never
      // names "Watch" and never calls onWatch.
      expect(html).not.toMatch(/<button[^>]*>\s*Watch/);
    }
  });
});

describe("Stage1Card — the published words point the admin at the Heart Field (TASK-457)", () => {
  it("the source line", async () => {
    const src = await read(CARD);
    expect(src).toContain("Published — members watch in the Heart Field. /reading sends them there.");
    expect(src).not.toContain("Published — viewers can watch on /reading.");
  });

  it("the rendered lifecycle row, published phase", () => {
    const props: Stage1CardBodyProps = {
      state: { phase: "published", room: ROOM, jitsiDomain: DOMAIN },
      busy: null,
      error: null,
      onAct: () => {},
    };
    const html = renderToStaticMarkup(createElement(Stage1CardBody, props));
    expect(html).toContain("Published — members watch in the Heart Field. /reading sends them there.");
  });
});
