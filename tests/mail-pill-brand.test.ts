import { describe, it, expect } from "vitest";

/**
 * TASK-242 (0018.06.23 a₿) — the Admiral's forward ("the color on the
 * buttons here is not on onecocreation brand") traced to a Thunderbird
 * "adapt message colours" dark-mode pass that strips every DARK ink
 * declaration from the primary pill (the `<a>`'s `color`, the `<font
 * color>`, even the `bgcolor` attribute) while leaving the muted pill's
 * WHITE ink alone — evidence saved at
 * briefings/mail/incoming/welcome-home-0018.06.23.html. Pinned here:
 *   1. the primary pill IS the site's own rose door (.btn-rose,
 *      house.css:90): the gradient + a solid midpoint fallback on both
 *      bgcolor and background-color, plum ink (--rose-btn-ink #2E0E1D)
 *      declared four redundant ways (td, a !important, font, span
 *      !important).
 *   2. the muted (Unsubscribe) pill is untouched.
 *   3. both mail shells' <head> now declare color-scheme/
 *      supported-color-schemes "dark" so a well-behaved client treats our
 *      night ground as intentional.
 *   4. footer links ride the shell's own muted token #9a8fae (!important)
 *      instead of #6b6478.
 *   5. a "stripped client" simulation — remove every bare `color:#hex;`
 *      style, every `<font color="...">` wrapper, and every `bgcolor="..."`
 *      attribute the way the forward did — still leaves the span's
 *      `!important` ink standing: the last line of defence.
 */

const mail = () => import("@/lib/mail");

describe("pill() primary variant wears the site's rose door (TASK-242)", () => {
  it("carries the gradient AND a solid fallback on bgcolor + background-color", async () => {
    const html = (await mail()).pill("/x", "Open");
    expect(html).toContain('bgcolor="#D890A7"');
    expect(html).toContain("background:linear-gradient(135deg,#E7B2C3,#C56E8B)");
    expect(html).toContain("background-color:#D890A7");
  });

  it("declares the plum ink #2E0E1D four independent ways: td, a (!important), font, span (!important)", async () => {
    const html = (await mail()).pill("/x", "Open");
    // td
    expect(html).toMatch(/<td[^>]*color:#2E0E1D;[^>]*>/);
    // a, !important
    expect(html).toMatch(/<a[^>]*color:#2E0E1D !important;[^>]*>/);
    // font
    expect(html).toContain('<font color="#2E0E1D">');
    // span, !important
    expect(html).toContain('<span style="color:#2E0E1D !important;">Open</span>');
  });

  it("the muted (Unsubscribe) variant is unchanged: #6b6478 fill, white ink, no gradient", async () => {
    const html = (await mail()).pill("/x", "Unsubscribe", "sm", "muted");
    expect(html).toContain('bgcolor="#6b6478"');
    expect(html).toContain("background:#6b6478");
    expect(html).not.toContain("linear-gradient");
    expect(html).toContain('<font color="#ffffff">');
    expect(html).toMatch(/<a[^>]*color:#ffffff;[^>]*>/);
  });

  it("stripped-client simulation: after removing every bare color:, <font color>, and bgcolor the way the forward did, the span's ink survives", async () => {
    const raw = (await mail()).pill("/x", "Open");
    const stripped = raw
      .replace(/\sbgcolor="[^"]*"/g, "") // the forward dropped the bgcolor attribute entirely
      .replace(/<font color="[^"]*">/g, "<font>") // the forward emptied <font color> to a bare <font>
      .replace(/;color:#[0-9a-fA-F]{6};/g, ";"); // the forward stripped bare (non-!important) color: declarations
    // the background gradient/fallback style property survives (never a color: match)
    expect(stripped).toContain("background:linear-gradient(135deg,#E7B2C3,#C56E8B)");
    // the bare td ink and the bare <font color> are gone, same as the evidence file
    expect(stripped).not.toMatch(/color:#2E0E1D;/);
    expect(stripped).not.toContain('<font color="#2E0E1D">');
    // the last line of defence still stands
    expect(stripped).toContain('<span style="color:#2E0E1D !important;">Open</span>');
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
