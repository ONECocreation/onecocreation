import { describe, it, expect } from "vitest";

/**
 * TASK-242 (0018.06.23 a₿) — the Admiral's forward ("the color on the
 * buttons here is not on onecocreation brand") traced to a Thunderbird
 * "adapt message colours" dark-mode pass that strips every DARK ink
 * declaration from the primary pill (the `<a>`'s `color`, the `<font
 * color>`, even the `bgcolor` attribute) while leaving the muted pill's
 * WHITE ink alone — evidence saved at
 * briefings/mail/incoming/welcome-home-0018.06.23.html. T-242 assumed
 * redundant DECLARATIONS of a dark ink would survive; TASK-308
 * (0018.06.25 a₿, briefings/mail/incoming/welcome-day-two-bad-button-
 * 0018.06.25.png) showed the same client stripping all four dark
 * declarations AT ONCE — the fix is the ink's LIGHTNESS, not more
 * redundancy. Pinned here, post-T-308:
 *   1. the primary pill's fill is a solid deep rose `#AD5470` (dawn rung,
 *      src/brand/tokens.ts) on both bgcolor and background-color — no
 *      gradient (the old gradient's dark stop, #C56E8B, fails contrast
 *      with white ink at 3.51:1).
 *   2. ink is WHITE `#ffffff` (4.908:1 on #AD5470), still declared four
 *      redundant ways (td, a !important, font, span !important) — the
 *      declaration redundancy stays for the client that strips only some
 *      of them; the color choice is what survives the client that strips
 *      all four by lightness.
 *   3. the muted (Unsubscribe) pill is untouched.
 *   4. both mail shells' <head> still declare color-scheme/
 *      supported-color-schemes "dark" so a well-behaved client treats our
 *      night ground as intentional.
 *   5. footer links ride the shell's own muted token #9a8fae (!important)
 *      instead of #6b6478.
 *   6. a "stripped client" simulation — remove every bare `color:#hex;`
 *      style, every `<font color="...">` wrapper, and every `bgcolor="..."`
 *      attribute the way the forward did — still leaves the span's
 *      `!important` WHITE ink standing: the last line of defence, and now
 *      the surviving ink itself is readable on the fill, not just present.
 */

const mail = () => import("@/lib/mail");

describe("pill() primary variant wears a deep-rose fill with white ink (TASK-308)", () => {
  it("carries a solid deep-rose fill on bgcolor + background-color, no gradient", async () => {
    const html = (await mail()).pill("/x", "Open");
    expect(html).toContain('bgcolor="#AD5470"');
    expect(html).toContain("background:#AD5470");
    expect(html).toContain("background-color:#AD5470");
    expect(html).not.toContain("linear-gradient");
  });

  it("declares the white ink #ffffff four independent ways: td, a (!important), font, span (!important)", async () => {
    const html = (await mail()).pill("/x", "Open");
    // td
    expect(html).toMatch(/<td[^>]*color:#ffffff;[^>]*>/);
    // a, !important
    expect(html).toMatch(/<a[^>]*color:#ffffff !important;[^>]*>/);
    // font
    expect(html).toContain('<font color="#ffffff">');
    // span, !important
    expect(html).toContain('<span style="color:#ffffff !important;">Open</span>');
  });

  it("the muted (Unsubscribe) variant is unchanged: #6b6478 fill, white ink, no gradient", async () => {
    const html = (await mail()).pill("/x", "Unsubscribe", "sm", "muted");
    expect(html).toContain('bgcolor="#6b6478"');
    expect(html).toContain("background:#6b6478");
    expect(html).not.toContain("linear-gradient");
    expect(html).toContain('<font color="#ffffff">');
    expect(html).toMatch(/<a[^>]*color:#ffffff;[^>]*>/);
  });

  it("stripped-client simulation: after removing every bare color:, <font color>, and bgcolor the way the forward did, the span's WHITE ink survives", async () => {
    const raw = (await mail()).pill("/x", "Open");
    const stripped = raw
      .replace(/\sbgcolor="[^"]*"/g, "") // the forward dropped the bgcolor attribute entirely
      .replace(/<font color="[^"]*">/g, "<font>") // the forward emptied <font color> to a bare <font>
      .replace(/;color:#[0-9a-fA-F]{6};/g, ";"); // the forward stripped bare (non-!important) color: declarations
    // the background fill style property survives (never a color: match)
    expect(stripped).toContain("background:#AD5470");
    // the bare td ink and the bare <font color> are gone, same as the evidence file
    expect(stripped).not.toMatch(/color:#ffffff;/);
    expect(stripped).not.toContain('<font color="#ffffff">');
    // the last line of defence still stands, and it's readable: white on rose
    expect(stripped).toContain('<span style="color:#ffffff !important;">Open</span>');
  });
});

describe("both mail shells declare the letter's dark ground intentional (TASK-242)", () => {
  it("richShell() head carries color-scheme + supported-color-schemes: dark", async () => {
    const html = (await mail()).richShell({ bodyHtml: "<p>body</p>" });
    expect(html).toContain('<meta name="color-scheme" content="dark">');
    expect(html).toContain('<meta name="supported-color-schemes" content="dark">');
  });

  it("brandShell() head carries color-scheme + supported-color-schemes: dark", async () => {
    const html = (await mail()).brandShell("<p>hello</p>");
    expect(html).toContain('<meta name="color-scheme" content="dark">');
    expect(html).toContain('<meta name="supported-color-schemes" content="dark">');
  });
});

describe("richShell()'s footer links ride the shell's own muted token, !important (TASK-242)", () => {
  it("the site link and the 'View on the site' link both take #9a8fae !important, not #6b6478", async () => {
    const html = (await mail()).richShell({ bodyHtml: "<p>body</p>", webUrl: "/letters/welcome" });
    expect(html).toContain('style="color:#9a8fae !important;">OneCocreation</a>');
    expect(html).toContain('style="color:#9a8fae !important;">View on the site</a>');
    expect(html).not.toContain("color:#6b6478");
  });
});
