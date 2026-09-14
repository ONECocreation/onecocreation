import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import StoreItemCard from "@/components/store/StoreItemCard";
import FreeMeditationCard from "@/components/store/FreeMeditationCard";
import { sanitizeDescription, fullStoryOf, validateItem, type StoreItem } from "@/lib/store";

/**
 * TASK-253 (0018.06.24 a₿ — the Admiral: "the it cards are supposed to be
 * uniform sizes. as well as the prices and buttons should line up. the IAM
 * worthy sleep meditation is not like the others"). Two structural bugs,
 * both diagnosed in the brief and pinned here:
 *
 *  1. the flip card's two faces shared one grid cell (house.css's old
 *     `.item-flip .flip-inner{display:grid}` + `grid-area:1/1;height:auto`
 *     on both faces) — the row sized to whichever face was TALLEST, and the
 *     back's blurb was unclamped. house.css now reverts .item-flip to the
 *     base contract: the FRONT alone sizes the card, the back scrolls
 *     inside it.
 *  2. the card never stretched to its row (`.flip-card` carried no height)
 *     — `.push`'s margin-top:auto pinned doors to each card's OWN bottom,
 *     never the row's. `.flip-card{height:100%}` fixes it.
 *
 * A real pixel-height assertion needs a browser (jsdom doesn't lay out
 * CSS) — that's what the shots prove. These are the SOURCE/CSS pins the
 * brief asks for: the stretch rule and the back scroller are actually in
 * house.css (not re-broken by a later edit), and the DOM a short vs. a very
 * long blurb produces is STRUCTURALLY identical (same reserved rows) so
 * nothing but content length can differ between two cards in a row.
 *
 * ADDENDUM (the Admiral, 0018.06.24 a₿) — two descriptions: `description`
 * is the long full-view story, `blurb` stays the short card line. Pinned
 * below: the sanitiser round-trip, the full view's preference, and that
 * the card back never renders `description`.
 */

const houseCss = fs.readFileSync(path.join(process.cwd(), "src", "app", "house.css"), "utf8");

function blurbOfLen(n: number): string {
  const seed = "Love wrote this story with the whole of her heart, and it runs long indeed — ";
  let s = "";
  while (s.length < n) s += seed;
  return s.slice(0, n);
}

function item(over: Partial<StoreItem>): StoreItem {
  return {
    id: "x",
    schemaVersion: 2,
    title: "X",
    blurb: "words",
    images: [],
    kind: "digital",
    price: { sats: 11111 },
    fulfillment: "digital",
    status: "live",
    ...over,
  };
}

describe("house.css — the stretch + scroll-back pins", () => {
  it(".flip-card fills its row (the stretch fix)", () => {
    expect(houseCss).toMatch(/\.flip-card\{position:relative;height:100%\}/);
  });

  it("the T-215 grid-overlap override is GONE — a face no longer forces the other's box to grow", () => {
    expect(houseCss).not.toMatch(/\.item-flip\s*\.flip-inner\{display:grid\}/);
    expect(houseCss).not.toMatch(/grid-area:1\/1;position:relative;height:auto/);
    expect(houseCss).not.toMatch(/\.item-flip\s*\.flip-scroll\{overflow:visible\}/);
  });

  it("the base flip contract (front sizes the card, back overlays + scrolls) is intact", () => {
    expect(houseCss).toMatch(/\.flip-front\{position:relative;height:100%\}/);
    expect(houseCss).toMatch(/\.flip-back\{position:absolute;inset:0\}/);
    expect(houseCss).toMatch(/\.flip-scroll\{flex:1;min-height:0;overflow-y:auto/);
  });

  it("the reserve-zone classes and .push still hold their contract", () => {
    expect(houseCss).toMatch(/\.card \.body \.card-title\{min-height:2\.5em\}/);
    expect(houseCss).toMatch(/\.card \.body \.card-sub\{min-height:2\.2em\}/);
    expect(houseCss).toMatch(/\.push\{margin-top:auto\}/);
  });
});

describe("StoreItemCard — a 40-char and a 1500-char blurb render the SAME structure", () => {
  const short = item({ id: "short", blurb: blurbOfLen(40) });
  const long = item({ id: "long", blurb: blurbOfLen(1500) });
  const htmlShort = renderToStaticMarkup(
    createElement(StoreItemCard, { item: short, icon: "🌙", href: "/store/short" }),
  );
  const htmlLong = renderToStaticMarkup(
    createElement(StoreItemCard, { item: long, icon: "🌙", href: "/store/long" }),
  );

  it("both wear the reserve-zone classes (card-title/card-sub)", () => {
    for (const html of [htmlShort, htmlLong]) {
      expect(html).toMatch(/class="card-title/);
      expect(html).toMatch(/class="card-sub/);
    }
  });

  it("both carry the fixed-height meta slot, present whether or not there's a deliverable", () => {
    for (const html of [htmlShort, htmlLong]) {
      expect(html).toMatch(/min-height:1\.2em/);
    }
  });

  it("the outer wrapper is the same flip-card/item-flip contract for both — length never changes the box the CSS sizes", () => {
    for (const html of [htmlShort, htmlLong]) {
      expect(html).toMatch(/class="flip-card item-flip/);
    }
  });

  it("the front's blurb clamps to TWO lines inside the 2.2em reserve (Number One follow-through: a one-line clamp in a two-line box showed a sliver of line two)", () => {
    for (const html of [htmlShort, htmlLong]) {
      expect(html).toMatch(/-webkit-line-clamp:2/);
    }
  });

  it("the back carries the FULL blurb (scroll, not a text clamp) — the chosen fix keeps the DOM honest, CSS does the clipping", () => {
    expect(htmlLong).toContain(blurbOfLen(1500));
  });

  it("the doors ('.push') render identically for both — same markup regardless of blurb length", () => {
    const doorsOf = (html: string) => (html.match(/class="push"/g) ?? []).length;
    expect(doorsOf(htmlShort)).toBe(doorsOf(htmlLong));
    expect(doorsOf(htmlShort)).toBeGreaterThan(0);
  });
});

describe("FreeMeditationCard — wears the same reserve slots as a paid StoreItemCard", () => {
  const html = renderToStaticMarkup(createElement(FreeMeditationCard, {}));

  it("card-title / card-sub / the fixed-height meta slot are all present", () => {
    expect(html).toMatch(/class="card-title/);
    expect(html).toMatch(/class="card-sub/);
    expect(html).toMatch(/min-height:1\.2em/);
  });

  it("still rides the flip-card item-flip contract and the push door row", () => {
    expect(html).toMatch(/class="flip-card item-flip/);
    expect(html).toMatch(/class="push"/);
  });
});

describe("ADDENDUM (0018.06.24 a₿) — two descriptions", () => {
  it("sanitizeDescription trims outer whitespace, keeps internal line breaks, empty means absent", () => {
    expect(sanitizeDescription("  hello  ")).toBe("hello");
    expect(sanitizeDescription("line one\nline two")).toBe("line one\nline two");
    expect(sanitizeDescription("")).toBeUndefined();
    expect(sanitizeDescription("   ")).toBeUndefined();
    expect(sanitizeDescription(undefined)).toBeUndefined();
    expect(sanitizeDescription(42)).toBeUndefined();
  });

  it("round-trips through sanitizeDescription + validateItem without touching blurb's own shape", () => {
    const longBlurb = blurbOfLen(2000); // production carries blurbs this long already
    const it1 = item({ blurb: longBlurb, description: sanitizeDescription("  the full story, at length  ") });
    expect(it1.description).toBe("the full story, at length");
    expect(it1.blurb).toBe(longBlurb); // never rejected, never truncated
    expect(validateItem(it1)).toEqual({ ok: true });
  });

  it("fullStoryOf() prefers description when present, else falls back to blurb — never both stacked", () => {
    const withDescription = item({ blurb: "short back line", description: "the long full-view story" });
    expect(fullStoryOf(withDescription)).toBe("the long full-view story");

    const withoutDescription = item({ blurb: "short back line" });
    expect(fullStoryOf(withoutDescription)).toBe("short back line");

    const emptyDescription = item({ blurb: "short back line", description: "" });
    expect(fullStoryOf(emptyDescription)).toBe("short back line");
  });

  it("the card BACK never renders description — it reads blurb only, by design", () => {
    const html = renderToStaticMarkup(
      createElement(StoreItemCard, {
        item: item({
          id: "two-stories",
          blurb: "THE-SHORT-CARD-BACK-LINE",
          description: "THE-LONG-FULL-VIEW-STORY-NEVER-ON-THE-CARD",
        }),
        icon: "🌙",
        href: "/store/two-stories",
      }),
    );
    expect(html).toContain("THE-SHORT-CARD-BACK-LINE");
    expect(html).not.toContain("THE-LONG-FULL-VIEW-STORY-NEVER-ON-THE-CARD");
  });
});

describe("ADDENDUM — the store desk (/a/store) carries the Full description field", () => {
  const deskSrc = fs.readFileSync(
    path.join(process.cwd(), "src", "app", "a", "store", "page.tsx"),
    "utf8",
  );

  it("a Full description textarea bound to draft.description", () => {
    expect(deskSrc).toMatch(/Full description \(the full view\)/);
    expect(deskSrc).toMatch(/value=\{draft\.description \?\? ""\}/);
  });

  it("the muted hint under the blurb field", () => {
    expect(deskSrc).toMatch(/a line or two — the back of the card; the long story goes below/);
  });

  it("the honest long-blurb-no-description hint, gated on both conditions", () => {
    expect(deskSrc).toMatch(/this blurb is long for a card back — move the story into Full description/);
    expect(deskSrc).toMatch(/!draft\.description\?\.trim\(\) && draft\.blurb\.length > 280/);
  });
});
