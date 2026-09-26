import { describe, it, expect } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ReadingPartProvider } from "@/components/reading/ReadingPartContext";
import ReadingDayUnlockButton from "@/components/reading/ReadingDayUnlockButton";

/**
 * TASK-473 fix round, THIRD pass (block 968,624, Number One's re-walk of
 * 0a8d9b8) — "when the selected part is one the visitor does NOT own (the
 * Q&A open and chosen, visitor tier A), NO agenda button shines, because
 * that row's only button is Unlock and it's now always kit-btn-second
 * when signed in." Rule: signed in, a row's Unlock reads `kit-btn-main` +
 * `aria-current="true"` when ITS OWN part is the one selected,
 * `kit-btn-second` otherwise — read from the SAME shared
 * `useReadingPart()` context `ReadingPartSelectLink` already reads,
 * rendered under a REAL Provider (not the bare NO_PROVIDER default every
 * other reading pin renders under, which would hide this exact bug: NO_
 * PROVIDER's own `selected: 1` never matches `part={3}`/`part={4}`, so a
 * bare render always reads `kit-btn-second` regardless of whether the
 * real rule is even wired — only a real Provider proves it).
 */

function render(part: 4 | undefined, selected: 1 | 2 | 3 | 4) {
  return renderToStaticMarkup(
    createElement(
      ReadingPartProvider,
      { defaultPart: selected },
      createElement(ReadingDayUnlockButton, { itemId: "q-a-meetup-with-love", label: "Unlock the Q&A", part }),
    ),
  );
}

describe("ReadingDayUnlockButton — signed in, shines only when ITS OWN part is selected (rendered under a real Provider)", () => {
  it("selected=4 (the Q&A itself is picked, and the visitor doesn't own it): the Unlock button shines — kit-btn-main, aria-current=\"true\"", () => {
    const html = render(4, 4);
    expect(html).toContain('class="kit-btn kit-btn-main kit-btn-sm"');
    expect(html).toContain('aria-current="true"');
  });

  it("selected=1 (some other part is picked): the SAME Unlock button dims — kit-btn-second, no aria-current", () => {
    const html = render(4, 1);
    expect(html).toContain('class="kit-btn kit-btn-second kit-btn-sm"');
    expect(html).not.toContain("aria-current");
  });

  it("no part prop (signed-out behavior, or the top screen's own not-owned card): always plain kit-btn-main, never selection-aware", () => {
    const signedOut4 = render(undefined, 4);
    expect(signedOut4).toContain('class="kit-btn kit-btn-main kit-btn-sm"');
    expect(signedOut4).not.toContain("aria-current");
    const signedOut1 = render(undefined, 1);
    expect(signedOut1).toContain('class="kit-btn kit-btn-main kit-btn-sm"');
    expect(signedOut1).not.toContain("aria-current");
  });

  it("degrades to an inert Part-1 default outside any Provider — no throw", () => {
    expect(() =>
      renderToStaticMarkup(
        createElement(ReadingDayUnlockButton, { itemId: "weekly-one-week", label: "Unlock the Book Talk", part: 3 }),
      ),
    ).not.toThrow();
  });
});
