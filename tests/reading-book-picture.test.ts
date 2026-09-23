import { describe, it, expect } from "vitest";
import { promises as fs } from "fs";
import path from "path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

/**
 * TASK-228 (0018.06.23 a₿, Number One from the 01:05 call): the magical
 * book beneath "Join the Weekly Reading" — Love's own Weekly Reading art
 * (docs/shinepages-recon/assets/02d57174-IMG_0295-7431271.jpeg, an open
 * book whose pages curl into a heart), converted to public/images/
 * reading-book*.webp. Pins:
 *
 *   1. THE HERO DOOR — the picture sits under the "Join the Weekly
 *      Reading" button, both a guest's and a member's render (Hero's
 *      readingDoor is never null while the standing default schedule is
 *      on — weeklyReadingDoor(), re-pointed to `/reading` by TASK-437
 *      (block 968,221 a₿), is pinned by tests/join-the-reading.test.ts,
 *      tests/site-knows-who-is-signed-in.test.ts and
 *      tests/hero-door-to-reading.test.ts).
 *   2. GATED BEHIND THE DOOR (source pin, the house idiom) — the picture
 *      markup lives inside the SAME `{readingDoor && (…)}` block as the
 *      button, so derive-or-dash still governs it: no room, no door, no
 *      picture.
 *   3. THE READ-WITH-LOVE CARD — the habitat's 📖 emoji is retired; its
 *      art is the thumb, carrying the same alt text.
 */

const read = (rel: string) => fs.readFile(path.join(process.cwd(), rel), "utf8");

describe("the reading-book picture under the hero door (TASK-228)", () => {
  it("renders under the button for a guest AND a member — same alt, same file", async () => {
    const { Hero } = await import("@/components/sections");
    const guest = renderToStaticMarkup(createElement(Hero, { session: null }));
    const member = renderToStaticMarkup(
      createElement(Hero, { session: { handle: "firefly@example.com", space: "email", tier: "B" } }),
    );
    for (const html of [guest, member]) {
      const button = html.indexOf("Join the Weekly Reading");
      const picture = html.indexOf('src="/images/reading-book.webp"');
      expect(button).toBeGreaterThan(-1);
      expect(picture).toBeGreaterThan(button); // beneath the door, not above it
      expect(html).toContain('alt="An open book whose pages curl into a heart"');
    }
  });

  it("the T-178 bare render (no visitor said) still carries the picture", async () => {
    const { Hero } = await import("@/components/sections");
    const html = renderToStaticMarkup(createElement(Hero));
    expect(html.indexOf('src="/images/reading-book.webp"')).toBeGreaterThan(html.indexOf("Join the Weekly Reading"));
  });

  it("the picture is gated behind the door — inside the same {readingDoor && (…)} block as the button (source pin)", async () => {
    const src = await read("src/components/sections.tsx");
    const gate = src.indexOf("{readingDoor && (");
    const button = src.indexOf("Join the Weekly Reading", gate);
    const picture = src.indexOf("reading-book.webp", button);
    const close = src.indexOf(")}", picture);
    expect(gate).toBeGreaterThan(-1);
    expect(button).toBeGreaterThan(gate);
    expect(picture).toBeGreaterThan(button); // the picture comes after the door, inside the same gate
    expect(close).toBeGreaterThan(picture);
    // TASK-437 re-trued the derivation the gate reads: the door is the
    // /reading door, derived from the schedule prop — never the paid room
    expect(src).toContain("weeklyReadingDoor(reading)");
    expect(src).toContain('href: "/reading"');
    expect(src).not.toContain("/rooms/weekly-reading");
  });
});

describe("the Read-with-Love card's habitat picture (TASK-228)", () => {
  it("the emoji beast is retired — the habitat's art is the thumb, alt text carried (source pin, client component)", async () => {
    const src = await read("src/components/ReadWithLove.tsx");
    expect(src).toContain('src="/images/reading-book-thumb.webp"');
    expect(src).toContain('alt="An open book whose pages curl into a heart"');
    expect(src).not.toContain("📖");
    expect(src).not.toContain('<span className="beast">');
  });
});
