import { describe, it, expect, beforeAll } from "vitest";
import { insertHeroLine, insertReadingRoomLink } from "@/lib/letter-marks";
import { READING_ROOM_PATH } from "@/lib/reading-room";

/**
 * TASK-227 — a letter can point at the reading room: Love left a spot for
 * the weekly-reading link in "Story time welcome" and had no way to make
 * `[text](/rooms/heart-field)` land as a real link (bodyToHtml's inline
 * link regex only ever accepted `https?:` URLs) or to reach for the room's
 * path / the hero art without typing them by hand.
 *
 * Pinned here:
 *   1. bodyToHtml/letterHtml: a site-path link `[text](/path)` renders
 *      through siteBase(); https:// stays untouched; javascript:/mailto:/
 *      a bare word/`//host` (scheme-relative) all stay literal text.
 *   2. letter-marks.ts: the two new toolbar quick-insert helpers, pure.
 */

describe("bodyToHtml/letterHtml — a site-path link rides through siteBase()", () => {
  beforeAll(() => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://fixture.example";
  });

  it("[text](/path) renders <a href=\"{siteBase()}/path\">", async () => {
    const { bodyToHtml } = await import("@/lib/letters");
    const html = bodyToHtml("[Join the weekly reading](/rooms/heart-field)");
    expect(html).toContain('<a href="https://fixture.example/rooms/heart-field" style="color:#E7B2C3">Join the weekly reading</a>');
  });

  it("an https:// link is untouched — no siteBase() prefix added", async () => {
    const { bodyToHtml } = await import("@/lib/letters");
    const html = bodyToHtml("[elsewhere](https://example.com/x)");
    expect(html).toContain('<a href="https://example.com/x" style="color:#E7B2C3">elsewhere</a>');
  });

  it("javascript: stays literal text, never a link", async () => {
    const { bodyToHtml } = await import("@/lib/letters");
    const html = bodyToHtml("[click](javascript:alert(1))");
    expect(html).not.toContain("<a href");
    expect(html).toContain("[click](javascript:alert(1))");
  });

  it("mailto: stays literal text, never a link", async () => {
    const { bodyToHtml } = await import("@/lib/letters");
    const html = bodyToHtml("[email me](mailto:love@example.com)");
    expect(html).not.toContain("<a href");
    expect(html).toContain("[email me](mailto:love@example.com)");
  });

  it("a scheme-relative //host link (an off-site jump in disguise) stays literal text", async () => {
    const { bodyToHtml } = await import("@/lib/letters");
    const html = bodyToHtml("[door](//evil.example/x)");
    expect(html).not.toContain("<a href");
    expect(html).toContain("[door](//evil.example/x)");
  });

  it("a bare word with no scheme at all stays literal text", async () => {
    const { bodyToHtml } = await import("@/lib/letters");
    const html = bodyToHtml("[nope](rooms/heart-field)");
    expect(html).not.toContain("<a href");
  });

  it("letterHtml() (the full assembly) carries the site-path link through the same way", async () => {
    const { letterHtml } = await import("@/lib/letters");
    const html = letterHtml("Beautiful soul,\n\n[Join the weekly reading](/rooms/heart-field)\n\nWith love.");
    expect(html).toContain('<a href="https://fixture.example/rooms/heart-field" style="color:#E7B2C3">Join the weekly reading</a>');
  });

  it("the rendered anchor for READING_ROOM_PATH itself (the Commons Stage door)", async () => {
    const { bodyToHtml } = await import("@/lib/letters");
    expect(READING_ROOM_PATH).toBe("/rooms/heart-field");
    const html = bodyToHtml(`[Join the weekly reading](${READING_ROOM_PATH})`);
    expect(html).toContain('<a href="https://fixture.example/rooms/heart-field" style="color:#E7B2C3">Join the weekly reading</a>');
  });
});

describe("letter-marks — the two new toolbar quick-inserts, pure", () => {
  it("insertReadingRoomLink() drops the exact markdown link at the caret, path never typed by the helper", () => {
    const r = insertReadingRoomLink({ text: "Beautiful soul, ", start: 16, end: 16 }, "/rooms/heart-field");
    expect(r.text).toBe("Beautiful soul, [Join the weekly reading](/rooms/heart-field)");
  });

  it("insertReadingRoomLink() with a null path (no free room in the registry) inserts nothing", () => {
    const sel = { text: "Beautiful soul, ", start: 16, end: 16 };
    const r = insertReadingRoomLink(sel, null);
    expect(r).toEqual({ text: sel.text, start: sel.start, end: sel.end });
  });

  it("insertReadingRoomLink() rides READING_ROOM_PATH end to end (the derived constant, not a typed literal)", () => {
    const r = insertReadingRoomLink({ text: "", start: 0, end: 0 }, READING_ROOM_PATH);
    expect(r.text).toBe(`[Join the weekly reading](${READING_ROOM_PATH})`);
  });

  it("insertHeroLine() at an empty caret inserts the bare !hero: line, no stray newlines", () => {
    const r = insertHeroLine({ text: "", start: 0, end: 0 }, "/images/heaven-earth.webp");
    expect(r.text).toBe("!hero: /images/heaven-earth.webp");
  });

  it("insertHeroLine() mid-paragraph wraps the directive in its own newlines so it never fuses onto prose", () => {
    const text = "Beautiful soul, welcome home.";
    const caret = "Beautiful soul, ".length;
    const r = insertHeroLine({ text, start: caret, end: caret }, "/images/heaven-earth.webp");
    expect(r.text).toBe("Beautiful soul, \n!hero: /images/heaven-earth.webp\nwelcome home.");
  });

  it("insertHeroLine() on an already-empty line (Love's placeholder) adds no extra blank lines", () => {
    const text = "Beautiful soul,\n\n\nwelcome home.";
    const caret = "Beautiful soul,\n\n".length; // the empty placeholder line
    const r = insertHeroLine({ text, start: caret, end: caret }, "/images/heaven-earth.webp");
    expect(r.text).toBe("Beautiful soul,\n\n!hero: /images/heaven-earth.webp\nwelcome home.");
  });
});
