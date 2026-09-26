import { describe, it, expect } from "vitest";
import { promises as fs } from "fs";
import path from "path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ReadingPartProvider } from "@/components/reading/ReadingPartContext";
import ReadingPartSelectLink from "@/components/reading/ReadingPartSelectLink";

/**
 * TASK-473 (block 968,624) — "the agenda rows' buttons ARE the time
 * buttons." Rendered outside any Provider (the same renderToStaticMarkup
 * law every reading component keeps), `useReadingPart()` degrades to an
 * inert default (ReadingPartContext.tsx, `selected: 1`) rather than
 * throwing — so PART 1's own anchor always reads as "selected" in these
 * bare renders; every other part reads as not-selected. The source pin
 * below proves the click actually calls `select(part)` once mounted
 * inside the real Provider.
 *
 * Fix round (same block, the Admiral's Chrome walk) — "the agenda buttons
 * are the picker, so the chosen one must shine": `kit-btn-main` +
 * `aria-current="true"` on the selected part's own anchor, `kit-btn-second`
 * on every other one. `variant="quiet"` (the notice line's own pick) drops
 * all button chrome — a bare anchor, same select+href behavior.
 */

const read = (rel: string) => fs.readFile(path.join(process.cwd(), rel), "utf8");

function renderInside(part: 1 | 2 | 3 | 4, selected: 1 | 2 | 3 | 4, children: string, extra: Record<string, unknown> = {}) {
  return renderToStaticMarkup(
    createElement(
      ReadingPartProvider,
      { defaultPart: selected },
      createElement(ReadingPartSelectLink, { part, ...extra }, children),
    ),
  );
}

describe("ReadingPartSelectLink — the shining/second class + aria-current", () => {
  it("the selected part's anchor: kit-btn-main, aria-current=\"true\"", () => {
    const html = renderInside(3, 3, "Join the book talk");
    expect(html).toBe(
      '<a class="kit-btn kit-btn-main kit-btn-sm" href="#stage" aria-current="true">Join the book talk</a>',
    );
  });

  it("every OTHER part's anchor: kit-btn-second, no aria-current", () => {
    const html = renderInside(2, 3, "Watch the Reading");
    expect(html).toBe('<a class="kit-btn kit-btn-second kit-btn-sm" href="#stage">Watch the Reading</a>');
    expect(html).not.toContain("aria-current");
  });

  it("an optional aria-label rides through untouched, alongside the shine logic", () => {
    const html = renderInside(4, 1, "Join the Q&A", { ariaLabel: "Join the Q&A" });
    expect(html).toContain('aria-label="Join the Q&amp;A"');
    expect(html).toContain("kit-btn-second"); // part 4, but selected is 1
  });

  it("degrades to an inert Part-1 default outside any Provider — no throw, Part 1 reads selected, every other part reads not-selected", () => {
    expect(() =>
      renderToStaticMarkup(createElement(ReadingPartSelectLink, { part: 1 }, "Watch the Housewarming")),
    ).not.toThrow();
    const part1 = renderToStaticMarkup(createElement(ReadingPartSelectLink, { part: 1 }, "Watch the Housewarming"));
    expect(part1).toContain("kit-btn-main");
    const part3 = renderToStaticMarkup(createElement(ReadingPartSelectLink, { part: 3 }, "Join the book talk"));
    expect(part3).toContain("kit-btn-second");
  });
});

describe("ReadingPartSelectLink — variant=\"quiet\" (the notice line's own pick)", () => {
  it("no button chrome at all — a bare anchor, same href and click behavior", () => {
    const html = renderInside(3, 1, "Pick it below", { variant: "quiet" });
    expect(html).toBe('<a href="#stage">Pick it below</a>');
  });
});

describe("ReadingPartSelectLink — source pin: the click really selects the part (no jsdom, no simulated event)", () => {
  it("onClick calls select(part) from the shared context", async () => {
    const src = await read("src/components/reading/ReadingPartSelectLink.tsx");
    expect(src).toContain("const { selected, select } = useReadingPart();");
    expect(src).toContain("onClick={() => select(part)}");
  });

  it("the class is chosen from `selected`, never a second literal for the shining state", async () => {
    const src = await read("src/components/reading/ReadingPartSelectLink.tsx");
    expect(src).toContain("const isSelected = selected === part;");
    expect(src).toContain("kit-btn-main");
    expect(src).toContain("kit-btn-second");
    expect(src).toContain('aria-current={isSelected ? "true" : undefined}');
  });
});

describe("ReadingPartContext — a component outside the Provider gets Part 1, inert, never a throw", () => {
  it("source pin: useReadingPart() falls back to a NO_PROVIDER default rather than throwing", async () => {
    const src = await read("src/components/reading/ReadingPartContext.tsx");
    expect(src).toContain("const NO_PROVIDER: ReadingPartValue = { selected: 1, select: () => {} };");
    expect(src).toContain("return useContext(ReadingPartCtx) ?? NO_PROVIDER;");
  });
});
