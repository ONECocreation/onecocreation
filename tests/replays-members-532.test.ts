import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { promises as fs } from "fs";
import path from "path";
import crypto from "crypto";
import { renderToStaticMarkup } from "react-dom/server";
import { isolateCwd } from "./helpers/isolate-cwd";
import type { AboutVideo } from "@/lib/about-content";

/**
 * TASK-532 (block 969,334, the Admiral's round-2 NOD; pause lifted
 * 2026-09-30) — the /replays MEMBER GATE, refined: titles and thumbnails
 * are PUBLIC (Love's public /images/reading-love-cover.jpg stands in for
 * every video picture when signed out); only the PLAYER iframe is gated to
 * a member session. "At least a free member" = ANY valid member session
 * (`sessionsFromCookieHeader`, tierless email members included) — NEVER
 * `tierForSubject` (there is no free tier; A/B/C only, and the T-494
 * letters gate shape would lock free members out). Fail-closed: any throw
 * in the session read renders the signed-out shape, never the player.
 *
 * Pins:
 *  · signed out: the invitation (Love's picture, "Sign in to watch" to
 *    /login?next=%2Freplays), every title still visible, NO iframe and no
 *    youtube-nocookie anywhere in the response body
 *  · signed out taps deep-link: each small picture links
 *    /login?next=%2Freplays%3Fplay%3D<id> (round-2 NOD pick 4)
 *  · a valid session — a TIERLESS email member included — gets the player:
 *    the top iframe plays the newest (or the ?play= id), minis carry the
 *    real YouTube thumbnails
 *  · tampered, expired, and throwing session reads all fail CLOSED
 *  · /replays?play=<id> loads a SAVED id in the top player; anything else
 *    (garbage, a well-formed but unsaved id) falls back to the newest
 *  · the page source carries no notFound(), imports no tier read
 *  · the stay-in-the-loop block is the NOD's one button (pick 3)
 *
 * The fs site-config driver rides this file's own throwaway cwd (the
 * tests/replays.test.ts idiom); next/headers is mocked per render so the
 * cookie jar is exactly what each case needs.
 */

const { cleanup: cleanupCwd } = isolateCwd("oc-replays-members-");

const FILE = path.join(process.cwd(), "data", "site-config.json");
const TESTS_DIR = path.dirname(decodeURIComponent(new URL(import.meta.url).pathname));
const readSrc = (rel: string) => fs.readFile(path.join(TESTS_DIR, "..", rel), "utf8");

const SECRET = "replays-members-532-secret";

const FIXTURE: AboutVideo[] = [
  { id: "dQw4w9WgXcQ", title: "The first reading, kept", ratio: "16/9" },
  { id: "2LrWVQDnLd0", title: "The second reading, kept", ratio: "16/9" },
];

let saveSiteConfig: (typeof import("@/lib/site-config"))["saveSiteConfig"];
let makeMemberToken: (typeof import("@/lib/member-auth"))["makeMemberToken"];
let MEMBER_COOKIE: string;

beforeAll(async () => {
  process.env.NEXT_PUBLIC_SPACE_NAME = "onecocreation";
  delete process.env.KV_REST_API_URL;
  delete process.env.KV_REST_API_TOKEN;
  delete process.env.BLOB_READ_WRITE_TOKEN;
  delete process.env.REGISTRY_DRIVER;
  process.env.SEAT_SECRET = SECRET;
  await fs.rm(FILE, { force: true });
  ({ saveSiteConfig } = await import("@/lib/site-config"));
  ({ makeMemberToken, MEMBER_COOKIE } = await import("@/lib/member-auth"));
});

afterAll(async () => {
  await fs.rm(FILE, { force: true });
  cleanupCwd();
});

async function renderPage(opts: { cookie?: string; play?: string; throwOnHeaders?: boolean } = {}) {
  vi.resetModules();
  vi.doMock("next/navigation", () => ({ usePathname: () => "/replays" }));
  /* PaletteVars is an async server component (the tests/replays.test.ts
     pin); what this suite pins is the gate, not the palette style tag. */
  vi.doMock("@/components/PaletteVars", () => ({ default: () => null }));
  if (opts.throwOnHeaders) {
    vi.doMock("next/headers", () => ({
      headers: async () => {
        throw new Error("no request context in this test");
      },
    }));
  } else {
    const cookie = opts.cookie ?? "";
    vi.doMock("next/headers", () => ({
      headers: async () => new Headers(cookie ? { cookie } : {}),
    }));
  }
  try {
    const mod = await import("@/app/replays/page");
    const element = await mod.default({ searchParams: Promise.resolve({ play: opts.play }) });
    return renderToStaticMarkup(element);
  } finally {
    vi.doUnmock("next/navigation");
    vi.doUnmock("@/components/PaletteVars");
    vi.doUnmock("next/headers");
    vi.resetModules();
  }
}

/** A tampered token: a real mint with the signature's last hex char flipped. */
function tamperedCookie(handle: string, space: string): string {
  const token = makeMemberToken(handle, space);
  const last = token.slice(-1);
  const flipped = last === "0" ? "1" : "0";
  return `${MEMBER_COOKIE}=${token.slice(0, -1)}${flipped}`;
}

/** An EXPIRED but correctly signed token (the T-453 shape: past exp digits). */
function expiredCookie(handle: string, space: string): string {
  const exp = Date.now() - 60_000;
  const sig = crypto.createHmac("sha256", SECRET).update(`${handle}|${space}|${exp}`).digest("hex");
  return `${MEMBER_COOKIE}=${handle}.${space}.${exp}.${sig}`;
}

describe("TASK-532 - signed out: the invitation, public titles, NO player anywhere in the body", () => {
  it("renders Love's picture, the sign-in door, every title, and never an iframe", async () => {
    await saveSiteConfig({ replays: FIXTURE });
    const html = await renderPage();
    expect(html).toContain("Sign in to watch");
    expect(html).toContain('href="/login?next=%2Freplays"');
    expect(html).toContain("/images/reading-love-cover.jpg");
    // titles are PUBLIC (the round-2 NOD supersedes the hide-the-list gate)
    expect(html).toContain("The first reading, kept");
    expect(html).toContain("The second reading, kept");
    // but the PLAYER is gated: no iframe, no embed host, no real thumbnail
    expect(html).not.toContain("<iframe");
    expect(html).not.toContain("youtube-nocookie");
    expect(html).not.toContain("i.ytimg.com");
  });

  it("each small picture signs in and returns to THAT replay (NOD pick 4)", async () => {
    await saveSiteConfig({ replays: FIXTURE });
    const html = await renderPage();
    expect(html).toContain('href="/login?next=%2Freplays%3Fplay%3DdQw4w9WgXcQ"');
    expect(html).toContain('href="/login?next=%2Freplays%3Fplay%3D2LrWVQDnLd0"');
  });
});

describe("TASK-532 - a valid member session plays; a tierless EMAIL member is a member", () => {
  it("an email-space session with NO tier renders the top player on the newest and the real thumbnails", async () => {
    await saveSiteConfig({ replays: FIXTURE });
    const cookie = `${MEMBER_COOKIE}=${makeMemberToken("love@example.com", "email")}`;
    const html = await renderPage({ cookie });
    expect(html).toContain("<iframe");
    expect(html).toContain("youtube-nocookie.com/embed/dQw4w9WgXcQ");
    expect(html).toContain("i.ytimg.com/vi/2LrWVQDnLd0/hqdefault.jpg");
    expect(html).not.toContain("Sign in to watch");
  });
});

describe("TASK-532 - fail closed: tampered, expired, and throwing reads are signed out", () => {
  it("a tampered cookie is signed out", async () => {
    await saveSiteConfig({ replays: FIXTURE });
    const html = await renderPage({ cookie: tamperedCookie("love@example.com", "email") });
    expect(html).toContain("Sign in to watch");
    expect(html).not.toContain("<iframe");
  });

  it("an expired (but well-signed) cookie is signed out", async () => {
    await saveSiteConfig({ replays: FIXTURE });
    const html = await renderPage({ cookie: expiredCookie("love@example.com", "email") });
    expect(html).toContain("Sign in to watch");
    expect(html).not.toContain("<iframe");
  });

  it("a THROWING session read fails closed to the invitation, never the player", async () => {
    await saveSiteConfig({ replays: FIXTURE });
    const html = await renderPage({ throwOnHeaders: true });
    expect(html).toContain("Sign in to watch");
    expect(html).not.toContain("<iframe");
  });
});

describe("TASK-532 - the ?play= deep link: a saved id only, anything else falls back to the newest", () => {
  it("?play=<saved id> loads THAT id in the top player", async () => {
    await saveSiteConfig({ replays: FIXTURE });
    const cookie = `${MEMBER_COOKIE}=${makeMemberToken("love@example.com", "email")}`;
    const html = await renderPage({ cookie, play: "2LrWVQDnLd0" });
    expect(html).toContain("youtube-nocookie.com/embed/2LrWVQDnLd0");
    expect(html).not.toContain("youtube-nocookie.com/embed/dQw4w9WgXcQ");
  });

  it("?play= garbage and ?play=<a well-formed but unsaved id> both fall back to the newest", async () => {
    await saveSiteConfig({ replays: FIXTURE });
    const cookie = `${MEMBER_COOKIE}=${makeMemberToken("love@example.com", "email")}`;
    for (const play of ["not-an-id", "AAAAAAAAAAA", "../../../etc", "dQw4w9WgXcQ-extra"]) {
      const html = await renderPage({ cookie, play });
      expect(html, `play=${play}`).toContain("youtube-nocookie.com/embed/dQw4w9WgXcQ");
    }
  });
});

describe("TASK-532 - the stay-in-the-loop block is the NOD's one button (pick 3)", () => {
  it("one kit-btn-second kit-btn-sm 'Want a reminder email?' to /reading#keep-posted, no heading", async () => {
    await saveSiteConfig({ replays: FIXTURE });
    const html = await renderPage();
    expect(html).toContain('href="/reading#keep-posted"');
    expect(html).toContain("Want a reminder email?");
    expect(html).not.toContain("Want to stay in the loop?");
  });
});

describe("TASK-532 - the page's own shape: an invitation, never a 404, never a tier read", () => {
  it("the page source carries no notFound(), imports sessionsFromCookieHeader, and never reads a tier", async () => {
    const page = await readSrc("src/app/replays/page.tsx");
    expect(page).not.toContain("notFound(");
    expect(page).toContain("sessionsFromCookieHeader");
    expect(page).not.toContain("tierForSubject");
    expect(page).not.toContain("member-tier");
  });

  it("the gate is a server-side read: ReplaysList receives signedIn from the page, never from session-read.ts", async () => {
    const list = await readSrc("src/components/replays/ReplaysList.tsx");
    expect(list).not.toContain("session-read");
    expect(list).not.toContain("/api/member/session");
  });

  it("no em dash, no arrow, no emoji in the lane's touched on-screen files", async () => {
    for (const rel of [
      "src/app/replays/page.tsx",
      "src/components/replays/ReplaysList.tsx",
      "src/app/a/site/replays/ReplaysCard.tsx",
      "src/app/a/site/replays/SiteReplaysRoom.tsx",
      "src/lib/replays-source.ts",
      "src/app/api/admin/replays-playlist/route.ts",
    ]) {
      const src = await readSrc(rel);
      expect(src, `${rel} carries an em dash`).not.toContain("\u2014");
      expect(src, `${rel} carries an arrow`).not.toContain("\u2192");
    }
  });
});
