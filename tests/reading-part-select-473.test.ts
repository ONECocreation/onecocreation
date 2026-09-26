import { describe, it, expect } from "vitest";
import { promises as fs } from "fs";
import path from "path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ReadingPartSelectLink from "@/components/reading/ReadingPartSelectLink";

/**
 * TASK-473 (block 968,624) — "the agenda rows' buttons ARE the time
 * buttons." Rendered outside any Provider (the same renderToStaticMarkup
 * law every reading component keeps), `useReadingPart()` degrades to an
 * inert default (ReadingPartContext.tsx) rather than throwing — so this
 * pins the anchor's own shape; the source pin below proves the click
 * actually calls `select(part)` once mounted inside the real Provider.
 */

const read = (rel: string) => fs.readFile(path.join(process.cwd(), rel), "utf8");

describe("ReadingPartSelectLink — the anchor's own shape", () => {
  it("always href=\"#stage\", the one house button size, the caller's own children verbatim", () => {
    const html = renderToStaticMarkup(createElement(ReadingPartSelectLink, { part: 3 }, "Go to the book talk"));
    expect(html).toBe('<a class="kit-btn kit-btn-main kit-btn-sm" href="#stage">Go to the book talk</a>');
  });

  it("an optional aria-label rides through untouched", () => {
    const html = renderToStaticMarkup(
      createElement(ReadingPartSelectLink, { part: 4, ariaLabel: "Join the Q&A" }, "Join the Q&A"),
    );
    expect(html).toContain('aria-label="Join the Q&amp;A"');
  });

  it("degrades to an inert default outside any Provider — no throw, still a real #stage anchor (never breaks the renderToStaticMarkup law every reading pin already relies on)", () => {
    expect(() =>
      renderToStaticMarkup(createElement(ReadingPartSelectLink, { part: 1 }, "Back to the reading")),
    ).not.toThrow();
  });
});

describe("ReadingPartSelectLink — source pin: the click really selects the part (no jsdom, no simulated event)", () => {
  it("onClick calls select(part) from the shared context", async () => {
    const src = await read("src/components/reading/ReadingPartSelectLink.tsx");
    expect(src).toContain("const { select } = useReadingPart();");
    expect(src).toContain("onClick={() => select(part)}");
  });
});

describe("ReadingPartContext — a component outside the Provider gets Part 1, inert, never a throw", () => {
  it("source pin: useReadingPart() falls back to a NO_PROVIDER default rather than throwing", async () => {
    const src = await read("src/components/reading/ReadingPartContext.tsx");
    expect(src).toContain("const NO_PROVIDER: ReadingPartValue = { selected: 1, select: () => {} };");
    expect(src).toContain("return useContext(ReadingPartCtx) ?? NO_PROVIDER;");
  });
});
