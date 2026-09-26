import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

/**
 * TASK-246 — the Stage's video frame stands full height and wears our mark.
 * The Admiral's picture (troubleshooting/onecocreation/9.16/heartfield
 * open1.png): the prejoin card's name field was cut at the fold because
 * JitsiRoom's holder resolved `height: 100%` against an auto-height
 * parent, collapsing to Jitsi's own ~240px minimum. This pins the fix:
 *  · JitsiRoom's wrapper/holder carry the flex chain that lets the holder
 *    actually claim the height its parent hands it.
 *  · the "ended" card speaks the house sans, not the serif (no-serif law).
 *  · the client-side branding override carries no Jitsi watermark and our
 *    own mark instead — belt and braces to the server kit
 *    (briefings/vps-scripts/jitsi/deploy/branding/custom-interface_config.js).
 *  · RoomVideoSlot's aspect box carries a min-height floor so the card
 *    never falls below the fold again, even when JitsiRoom's own fix is
 *    somehow bypassed.
 */

const JITSI_SRC = readFileSync("src/components/booking/JitsiRoom.tsx", "utf8");
const SLOT_SRC = readFileSync("src/components/rooms/RoomVideoSlot.tsx", "utf8");
const CSS_SRC = readFileSync("src/components/rooms/classroom.css", "utf8");

describe("JitsiRoom — the wrapper/holder flex chain", () => {
  it("the wrapper takes the parent's full height as a column, the holder fills what's left", async () => {
    const JitsiRoom = (await import("@/components/booking/JitsiRoom")).default;
    const html = renderToStaticMarkup(
      createElement(JitsiRoom, { domain: "meet.fixture.invalid", room: "fixture-room", height: "100%" }),
    );
    expect(html).toContain('style="height:100%;display:flex;flex-direction:column;min-height:0"');
    expect(html).toContain(
      'style="flex:1;min-height:0;border-radius:18px;overflow:hidden;border:1.5px solid rgba(139,118,196,.35)"',
    );
  });

  it("a custom height (the /meet default) still rides the same flex chain", async () => {
    const JitsiRoom = (await import("@/components/booking/JitsiRoom")).default;
    const html = renderToStaticMarkup(
      createElement(JitsiRoom, { domain: "meet.fixture.invalid", room: "fixture-room", height: "72vh" }),
    );
    expect(html).toContain('style="height:72vh;display:flex;flex-direction:column;min-height:0"');
  });
});

describe("JitsiRoom — no-serif law", () => {
  it("the ended card speaks the house sans, weight 600, never the serif", () => {
    expect(JITSI_SRC).not.toContain("var(--serif)");
    expect(JITSI_SRC).toContain('fontFamily: "var(--sans)"');
    expect(JITSI_SRC).toContain("fontWeight: 600");
  });
});

describe("JitsiRoom — client-side branding override", () => {
  it("kills every Jitsi watermark and speaks One Cocreation's name", () => {
    expect(JITSI_SRC).toContain("SHOW_JITSI_WATERMARK: false");
    expect(JITSI_SRC).toContain("SHOW_WATERMARK_FOR_GUESTS: false");
    expect(JITSI_SRC).toContain('APP_NAME: "One Cocreation"');
    expect(JITSI_SRC).toContain('JITSI_WATERMARK_LINK: ""');
  });

  it("raises our own mark instead, absolute through the site's own origin", () => {
    expect(JITSI_SRC).toContain("cartridge.logo.mark");
    expect(JITSI_SRC).toContain("SHOW_BRAND_WATERMARK: true");
    expect(JITSI_SRC).toContain("DEFAULT_LOGO_URL: markUrl");
    expect(JITSI_SRC).toContain("DEFAULT_WELCOME_PAGE_LOGO_URL: markUrl");
    expect(JITSI_SRC).toContain("defaultLogoUrl: markUrl");
    /* TASK-477: the options object moved into a pure `jitsiEmbedOptions()`
       (so it can be pinned directly — see jitsi-embed-options-477.test.ts)
       and takes `origin` as a param rather than calling `siteOrigin()`
       inline; the call site still feeds it the live origin, verbatim. */
    expect(JITSI_SRC).toContain("origin: siteOrigin()");
    expect(JITSI_SRC).toContain("BRAND_WATERMARK_LINK: origin");
  });
});

describe("RoomVideoSlot — the Stage's aspect box carries a min-height floor", () => {
  it("the slot's embed block wears the floored class, not a bare inline aspect box", () => {
    expect(SLOT_SRC).toContain('className="cl-stage-embed"');
    expect(SLOT_SRC).not.toContain('aspectRatio: "16 / 9"');
  });

  it("classroom.css floors the box at 300px, 420px from 900px up", () => {
    const rule = CSS_SRC.match(/\.cl-stage-embed\s*\{[\s\S]*?\}/);
    expect(rule, "the .cl-stage-embed rule is missing").not.toBeNull();
    expect(rule![0]).toContain("aspect-ratio: 16 / 9");
    expect(rule![0]).toContain("min-height: 300px");

    const desktop = CSS_SRC.match(/@media \(min-width: 900px\)\s*\{\s*\.cl-stage-embed\s*\{[\s\S]*?\}/);
    expect(desktop, "the desktop (>=900px) min-height rule is missing").not.toBeNull();
    expect(desktop![0]).toContain("min-height: 420px");
  });
});
