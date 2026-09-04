import { describe, it, expect, beforeAll } from "vitest";

/**
 * G4 (TASK-105): every mail link resolves to NEXT_PUBLIC_SITE_URL, never to
 * the old ShinePages host. onecocreation.com DNS still points at the old
 * site until Love's cutover, so the mail shells (brandShell, pill,
 * richShell) must build their hrefs/srcs through siteBase(). The footer's
 * display TEXT "onecocreation.com" is not a URL and lawfully stays — the
 * assertions target href=/src= attributes only.
 */

const NEW_SITE = "https://new-site.example";

beforeAll(() => {
  process.env.NEXT_PUBLIC_SITE_URL = NEW_SITE;
});

const mail = () => import("@/lib/mail");

describe("mail links point at the new site", () => {
  it("pill() absolutizes relative hrefs against NEXT_PUBLIC_SITE_URL", async () => {
    const html = (await mail()).pill("/memberships", "Join");
    expect(html).toContain(`href="${NEW_SITE}/memberships"`);
    expect(html).not.toContain("onecocreation.com");
  });

  it("brandShell() routes the brand mark img src through the new site", async () => {
    const html = (await mail()).brandShell("<p>hello</p>");
    expect(html).toContain(`src="${NEW_SITE}/brand/onecocreation-mark.svg"`);
    expect(html).not.toMatch(/(?:href|src)="https:\/\/onecocreation\.com/);
    // the footer display text is not a URL — it stays (spec)
    expect(html).toContain("One Cocreation · onecocreation.com");
  });

  it("richShell() contains no old-host link at all", async () => {
    const html = (await mail()).richShell({
      bodyHtml: "<p>body</p>",
      heroUrl: "/brand/hero.png",
      sections: [{ title: "A", href: "/about", blurb: "b" }],
      cta: { label: "Read", href: "/memberships" },
      webUrl: "/news/letter-1",
    });
    expect(html).toContain(`href="${NEW_SITE}/memberships"`);
    expect(html).toContain(`src="${NEW_SITE}/brand/onecocreation-lockup-email.png"`);
    expect(html).toContain(`href="${NEW_SITE}/news/letter-1"`);
    expect(html).not.toContain("https://onecocreation.com");
  });
});
