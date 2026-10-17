import { describe, it, expect } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { readFile } from "node:fs/promises";
import ReadingNotice from "@/components/rooms/ReadingNotice";
import { ReadingSignInCard } from "@/components/rooms/ReadingSignInBox";

/* T-618: the Admiral's ruling on the Heart Field and /reading sign-up cards.
   Signed in (email or key) = no "Stay in the know" card on /reading and no
   "Hold your seat" card in the room; signed out = the card, at the BOTTOM of
   /reading, after the day's agenda and everything else. */
const read = (p: string) => readFile(p, "utf8");

describe("T-618: signed in = no sign-up card", () => {
  it("/reading box: an email member and a key member both render nothing", () => {
    for (const member of [
      { handle: "reader@example.com", space: "email" },
      { handle: "npub1abc", space: "onecocreation" },
    ]) {
      expect(renderToStaticMarkup(createElement(ReadingSignInCard, { member }))).toBe("");
    }
  });

  it("/reading box: signed out still renders the card", () => {
    const html = renderToStaticMarkup(createElement(ReadingSignInCard, { member: null }));
    expect(html).toContain("Sign me up. Keep me posted.");
    expect(html).toContain("<input");
  });

  it("the room notice never mounts the Hold your seat card", async () => {
    const src = await read("src/components/rooms/ReadingNotice.tsx");
    expect(src).not.toContain("ReadingSignUp");
    const STARTS = Date.UTC(2026, 8, 23, 19, 11);
    const html = renderToStaticMarkup(
      createElement(ReadingNotice, {
        schedule: { on: true, weekday: 3, time: "13:11", tz: "America/Denver", durationMin: 60 },
        next: { startsAtMs: STARTS, endsAtMs: STARTS + 3600_000 },
        asOfMs: STARTS - 3 * 86400_000,
      }),
    );
    expect(html).toContain("Next reading.");
    expect(html).not.toContain("Hold your seat");
    expect(html).not.toContain("<input");
  });
});

describe("T-618: signed-out card sits at the bottom of /reading", () => {
  it("the keep-posted section comes after the agenda, the experience list and the host, just before </main>", async () => {
    const src = await read("src/app/reading/page.tsx");
    const box = src.indexOf("<ReadingSignInBox />");
    expect(src.match(/<ReadingSignInBox/g)).toHaveLength(1);
    expect(box).toBeGreaterThan(src.indexOf("<ReadingDay />"));
    expect(box).toBeGreaterThan(src.indexOf("<ReadingDay ahead />"));
    expect(box).toBeGreaterThan(src.indexOf("What you will experience"));
    expect(box).toBeGreaterThan(src.indexOf("Back to the reading"));
    expect(box).toBeLessThan(src.indexOf("</main>"));
    expect(src).toContain('id="keep-posted"');
  });
});
