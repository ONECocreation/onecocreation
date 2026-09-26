import { describe, it, expect } from "vitest";
import { promises as fs } from "fs";
import path from "path";
import sharp from "sharp";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ReadingStageBody, type ReadingStageBodyProps } from "@/components/reading/ReadingStage";

/**
 * T-456 (block 968,445, the Admiral): "swap out the picture that is being
 * used as a placeholder on the /reading page … use the one called Love
 * BOOK.jpeg. this is the name of the book she is reading." The file ships
 * byte-for-byte as public/images/reading-love-cover.jpg (600×358, no EXIF).
 * Pins:
 *
 *   1. every state /reading waits in (closed, published, failed, ended)
 *      shows the cover, never the heart-book art; watching shows neither;
 *   2. the img's width/height are the file's real size (no layout shift);
 *   3. the cover fills the frame with no melt mask (the title reaches the
 *      sides the heart-book mask fades), and a phone frame takes the
 *      cover's own shape — each rule sits AFTER the rule it overrides;
 *   4. scope: the Playground's waiting frame keeps the heart-book art.
 */

const read = (rel: string) => fs.readFile(path.join(process.cwd(), rel), "utf8");

const COVER = 'src="/images/reading-love-cover.jpg"';
const ALT = 'alt="Love, by Leo Buscaglia: the word LOVE in white over a swirling violet and rose nebula"';

function body(overrides: Partial<ReadingStageBodyProps>): string {
  const props: ReadingStageBodyProps = {
    phase: "closed",
    signedIn: true,
    ended: false,
    room: null,
    playgroundOpen: false,
    /* TASK-466 (block 968,561): unlocked by default — this suite only
       checks the cover art, never the ended card's lock. */
    playgroundLock: { locked: false, floorName: "Test Tier" },
    jitsiDomain: "meet.reading-love-cover.invalid",
    nextWords: null,
    countdown: null,
    countdownWhen: null,
    left: false,
    onRoomEnded: () => {},
    onRejoin: () => {},
    ...overrides,
  };
  return renderToStaticMarkup(createElement(ReadingStageBody, props));
}

describe("/reading waits on the cover of the book Love is reading", () => {
  const waiting: [string, Partial<ReadingStageBodyProps>][] = [
    ["closed", {}],
    ["published, signed out (no room mounts)", { phase: "published", signedIn: false, room: "oc-0123456789abcdef" }],
    ["published, signed in, room not yet arrived", { phase: "published", signedIn: true, room: null }],
    ["ended", { phase: "published", ended: true, nextWords: "Wednesday, September 30" }],
  ];

  for (const [state, overrides] of waiting) {
    it(`${state}: the cover, its alt, its real size, the cover frame — never the heart book`, () => {
      const html = body(overrides);
      expect(html).toContain(COVER);
      expect(html).toContain(ALT);
      expect(html).toContain('width="600" height="358"');
      expect(html).toContain('class="kit-stage-media kit-stage-waiting kit-stage-waiting--cover"');
      expect(html).not.toContain("reading-book");
    });
  }

  it("published, signed in, room arrived: the viewer replaces it — neither picture is on the page", () => {
    const html = body({ phase: "published", signedIn: true, room: "oc-0123456789abcdef" });
    expect(html).toContain("kit-stage-viewer");
    expect(html).not.toContain("reading-love-cover");
    expect(html).not.toContain("reading-book");
  });

  it("the file on disk is the 600×358 JPEG the img declares", async () => {
    const meta = await sharp(path.join(process.cwd(), "public/images/reading-love-cover.jpg")).metadata();
    expect(meta.format).toBe("jpeg");
    expect(meta.width).toBe(600);
    expect(meta.height).toBe(358);
    expect(meta.exif).toBeUndefined();
  });
});

describe("the cover frame (kit.css)", () => {
  it("fills edge to edge with no melt mask, after the heart-book mask it overrides", async () => {
    const css = await read("src/app/kit.css");
    const mask = css.indexOf(".kit-stage-waiting>img{-webkit-mask-image:radial-gradient(");
    const cover = css.indexOf(".kit-stage-waiting--cover>img{object-fit:cover;-webkit-mask-image:none;mask-image:none}");
    expect(mask).toBeGreaterThan(-1);
    expect(cover).toBeGreaterThan(mask);
  });

  it("a phone frame takes the cover's shape, after the heart-book phone ratio it overrides", async () => {
    const css = await read("src/app/kit.css");
    const book = css.indexOf(".kit-stage-media.kit-stage-waiting{aspect-ratio:1400/1017}");
    const cover = css.indexOf("@media (max-width:640px){.kit-stage-media.kit-stage-waiting--cover{aspect-ratio:600/358}}");
    expect(book).toBeGreaterThan(-1);
    expect(cover).toBeGreaterThan(book);
  });
});

describe("scope — only /reading changes", () => {
  it("the Playground's waiting frame keeps the heart-book art", async () => {
    const src = await read("src/components/reading/playground/PlaygroundIsland.tsx");
    expect(src).toContain('<img src="/images/reading-book.webp" alt={BOOK_ALT} width="1400" height="1017" />');
    expect(src).not.toContain("reading-love-cover");
  });
});
