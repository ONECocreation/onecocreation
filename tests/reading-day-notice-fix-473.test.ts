import { describe, it, expect } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ReadingPartProvider } from "@/components/reading/ReadingPartContext";
import { ReadingDayOpenNoticeBody } from "@/components/reading/ReadingDayOpenNotice";

/**
 * Fix round (block 968,624, the Admiral's Chrome walk) — "the notice sits
 * above the rows, so it must say 'below.' Better still, make 'Pick it
 * below' a direct pick." `ReadingDayOpenNoticeBody` is the pure half
 * (`ReadingDayOpenNotice.tsx`'s own Body/wrapper split) — a bare poll-
 * driven `useState` default never fires under SSR, so this is the only
 * way to see the notice's real rendered text without jsdom.
 */

function render(notice: { part: 1 | 2 | 3 | 4; title: string } | null, selected: 1 | 2 | 3 | 4 = 1): string {
  return renderToStaticMarkup(
    createElement(
      ReadingPartProvider,
      { defaultPart: selected },
      createElement(ReadingDayOpenNoticeBody, { notice }),
    ),
  );
}

describe("ReadingDayOpenNoticeBody — says 'below', never 'above' (the notice sits above the rows)", () => {
  it("null notice: renders nothing", () => {
    expect(render(null)).toBe("");
  });

  it("a real notice: 'Now open: {title}.' then a real pick link 'Pick it below', then 'to join.'", () => {
    const html = render({ part: 3, title: "The book talk" });
    expect(html).toContain("Now open: The book talk.");
    expect(html).toContain("Pick it below");
    expect(html).not.toContain("Pick it above");
    expect(html).toContain("to join.");
  });

  it("'Pick it below' is a REAL pick — a quiet anchor (no button chrome) that selects the named part", () => {
    const html = render({ part: 4, title: "The Q&A" });
    expect(html).toMatch(/<a href="#stage">Pick it below<\/a>/);
    expect(html).not.toContain("kit-btn"); // variant="quiet" — no button classes
  });

  it("no em dash anywhere in the notice's own words", () => {
    const html = render({ part: 2, title: "The Reading" });
    expect(html).not.toContain("—");
  });
});
