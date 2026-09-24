import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import * as readingRoom from "@/lib/reading-room";
import { buildDefaultMenu } from "@/components/NavMenu";
import { MEMBER_MENU } from "@/components/door/door-machine";
import ReadWithLove from "@/components/ReadWithLove";
import { defaultSiteConfig } from "@/lib/site-config";
import { sendReadWithLoveLetter } from "@/lib/lead-magnet";

const fixture = vi.hoisted(() => ({
  rail: "jitsi" as "jitsi" | "vdo" | "static",
  signedIn: false,
  sent: [] as Array<{ html: string }>,
}));

vi.mock("@/hooks/useMemberSession", () => ({
  default: () => ({ member: fixture.signedIn ? { email: "reader@example.com" } : null }),
}));
vi.mock("@/lib/mail", async (importActual) => ({
  ...await importActual<typeof import("@/lib/mail")>(),
  sendMail: async (_persona: string, mail: { html: string }) => { fixture.sent.push(mail); },
}));
vi.mock("@/lib/subscribers", () => ({
  siteBase: () => "https://site.example.invalid",
  unsubscribeUrl: () => "https://site.example.invalid/unsubscribe",
}));
vi.mock("@/lib/site-config", async (importActual) => {
  const actual = await importActual<typeof import("@/lib/site-config")>();
  return {
    ...actual,
    getSiteConfig: async () => ({
      ...actual.defaultSiteConfig(),
      meeting: { ...actual.defaultSiteConfig().meeting, rail: fixture.rail },
    }),
  };
});

const source = (file: string) => readFileSync(resolve(process.cwd(), file), "utf8");

beforeEach(() => {
  fixture.rail = "jitsi";
  fixture.signedIn = false;
  fixture.sent.length = 0;
  vi.stubEnv("READ_WITH_LOVE_ROOM_URL", undefined);
});
afterEach(() => vi.unstubAllEnvs());

describe("TASK-444: reading doors open the public reading page", () => {
  it("exports the ruled public path separately from the room path", () => {
    expect(readingRoom).toHaveProperty("READING_PAGE_PATH", "/reading");
  });

  it("keeps the default Community reading door present before config loads and with switches off", () => {
    const config = defaultSiteConfig();
    config.features.classes = false;
    config.features.community = false;
    for (const state of [null, config]) {
      const community = buildDefaultMenu(state).find((row) => row.label === "Community");
      expect(community?.subs).toContainEqual({ label: "Read with Love", href: "/reading" });
    }
  });

  it("leaves Memberships' Heart Field door pointing to the room", () => {
    const config = defaultSiteConfig();
    config.features.memberships = true;
    const memberships = buildDefaultMenu(config).find((row) => row.label === "Memberships");
    expect(memberships?.subs).toContainEqual({ label: "Heart Field", href: readingRoom.READING_ROOM_PATH });
  });

  it("points the member menu's Read with Love door to the public page", () => {
    expect(MEMBER_MENU).toContainEqual({ label: "Read with Love", href: "/reading" });
  });

  it("uses the public path on the home card without calling readingDoorHref", () => {
    const card = source("src/components/ReadWithLove.tsx");
    expect(card).toContain("const href = READING_PAGE_PATH;");
    expect(card).not.toMatch(/readingDoorHref\s*\(/);
  });

  it.each([false, true])("renders the same public home door when signedIn=%s", (signedIn) => {
    fixture.signedIn = signedIn;
    const html = renderToStaticMarkup(createElement(ReadWithLove));
    expect(html).toContain('href="/reading"');
    expect(html).toContain("Go to the reading");
    expect(html).not.toContain("/login");
  });

  it.each(["jitsi", "vdo", "static"] as const)("links the welcome letter to the reading page on the %s rail", async (rail) => {
    fixture.rail = rail;
    await sendReadWithLoveLetter("reader@example.com");
    expect(fixture.sent[0].html).toContain('href="https://site.example.invalid/reading"');
    expect(fixture.sent[0].html).not.toContain("/rooms/heart-field");
    expect(fixture.sent[0].html).not.toContain("/read-with-love");
  });

  it.each(["jitsi", "vdo", "static"] as const)("preserves an operator override on the %s rail", async (rail) => {
    fixture.rail = rail;
    const override = "https://room.example.invalid/j/00000000000";
    vi.stubEnv("READ_WITH_LOVE_ROOM_URL", override);
    await sendReadWithLoveLetter("reader@example.com");
    expect(fixture.sent[0].html).toContain(`href="${override}"`);
    expect(fixture.sent[0].html).not.toContain('href="https://site.example.invalid/reading"');
  });

  it("passes the public path to the letters editor insert helper", () => {
    const editor = source("src/app/a/letters/page.tsx");
    expect(editor).toContain('import { READING_PAGE_PATH } from "@/lib/reading-room"');
    expect(editor).toContain("insertReadingRoomLink(currentSelection(), READING_PAGE_PATH)");
  });
});
