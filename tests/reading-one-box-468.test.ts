import { describe, it, expect, afterEach, vi } from "vitest";
import { promises as fs } from "fs";
import path from "path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  ReadingSignInCard,
  startEmailCode,
  verifyAndSubscribe,
  WATCH_CTA,
  HEART_FIELD_HREF,
  NOSTR_KEY_POINTER,
  NOSTR_KEY_LINK_LABEL,
} from "@/components/rooms/ReadingSignInBox";

/**
 * TASK-468 (block 968,561) — THE ONE BOX on /reading: "sign me up... keep
 * me posted... it takes care of two things at one time" (the Thu
 * 2026-09-24 call with Love, briefings/walk-968482/walk.txt [00:06:27]-
 * [00:07:26]), verified by a six-digit code, "then they're logged in"
 * ([00:29:56]-[00:31:18]). Pin the MODEL (the fetch orchestration) and the
 * STRUCTURE (renderToStaticMarkup on the pure `ReadingSignInCard`) — this
 * repo's vitest.config.ts runs no jsdom (Ground, reading-sign-up.test.ts's
 * own doc comment), so no click is ever simulated here.
 */

const read = (rel: string) => fs.readFile(path.join(process.cwd(), rel), "utf8");

describe("ReadingSignInCard — signed-out box, the email step (id=sign-up)", () => {
  it("renders the email field inside a wrapper carrying id=sign-up", () => {
    const html = renderToStaticMarkup(createElement(ReadingSignInCard, { member: null }));
    expect(html).toContain('id="sign-up"');
    expect(html).toContain('id="reading-signin-email"');
    expect(html).toContain('type="email"');
  });

  it("carries the Nostr-key quiet link, pointed at /login?next=%2Freading", () => {
    const html = renderToStaticMarkup(createElement(ReadingSignInCard, { member: null }));
    expect(html).toContain(NOSTR_KEY_POINTER);
    expect(html).toContain(NOSTR_KEY_LINK_LABEL);
    expect(html).toContain('href="/login?next=%2Freading"');
  });
});

describe("ReadingSignInCard — the code step renders in the SAME box", () => {
  it("initialStep='code' still carries id=sign-up, plus the 6-digit code field", () => {
    const html = renderToStaticMarkup(createElement(ReadingSignInCard, { member: null, initialStep: "code" }));
    expect(html).toContain('id="sign-up"');
    expect(html).toContain('id="reading-signin-code"');
    expect(html).not.toContain('id="reading-signin-email"'); // one step at a time, same box
  });
});

describe("ReadingSignInCard — the code step says where the code went and never strands a mistyped email (Number One's review)", () => {
  it("names the inbox and the ten minutes, with no dash", () => {
    const html = renderToStaticMarkup(createElement(ReadingSignInCard, { member: null, initialStep: "code" }));
    expect(html).toContain("A code is on its way to your inbox. It works for ten minutes.");
    expect(html).toContain("Sent to <b>");
  });

  it("carries the quiet 'Wrong email? Use a different one' link, a link and not a second button size", () => {
    const html = renderToStaticMarkup(createElement(ReadingSignInCard, { member: null, initialStep: "code" }));
    expect(html).toContain("Wrong email? ");
    expect(html).toMatch(/<a href="#sign-up">Use a different one<\/a>/);
    expect(html).not.toContain("kit-btn-quiet");
  });

  it("the letters-list miss points at something on screen after a reload, never a button that isn't there", async () => {
    const src = await fs.readFile(path.join(process.cwd(), "src/components/rooms/ReadingSignInBox.tsx"), "utf8");
    expect(src).toContain("Reload this page to try Keep me posted again.");
  });
});

describe("startEmailCode / verifyAndSubscribe — the fetch orchestration (mocked fetch, no jsdom)", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("startEmailCode posts to /api/auth/email/start and reports the real success shape ({ok:true})", async () => {
    const calls: string[] = [];
    vi.stubGlobal("fetch", async (url: string) => {
      calls.push(String(url));
      return Response.json({ ok: true });
    });
    expect(await startEmailCode("x@example.com")).toEqual({ ok: true });
    expect(calls).toEqual(["/api/auth/email/start"]);
  });

  it("a failed verify neither subscribes nor signs in — /api/subscribe is NEVER called", async () => {
    const calls: string[] = [];
    vi.stubGlobal("fetch", async (url: string) => {
      calls.push(String(url));
      return Response.json({ ok: false, reason: "that code didn't match — try again" }, { status: 401 });
    });
    const result = await verifyAndSubscribe("x@example.com", "000000");
    expect(result.ok).toBe(false);
    expect(calls).toEqual(["/api/auth/email/verify"]); // subscribe never reached
  });

  it("subscribe is called ONLY after a verified code — the exact postReadingSignUp contract, {email, source:'reading'}", async () => {
    const calls: { url: string; body: unknown }[] = [];
    vi.stubGlobal("fetch", async (url: string, init?: { body?: string }) => {
      calls.push({ url: String(url), body: init?.body ? JSON.parse(init.body) : null });
      if (String(url) === "/api/auth/email/verify") {
        return Response.json({ ok: true, handle: "x@example.com", space: "email" });
      }
      if (String(url) === "/api/subscribe") {
        return Response.json({ ok: true, outcome: "joined" });
      }
      throw new Error(`unexpected fetch: ${url}`);
    });
    const result = await verifyAndSubscribe("x@example.com", "123456");
    expect(result).toEqual({ ok: true, handle: "x@example.com", space: "email", outcome: "joined" });
    expect(calls.map((c) => c.url)).toEqual(["/api/auth/email/verify", "/api/subscribe"]);
    expect(calls[1].body).toEqual({ email: "x@example.com", source: "reading" });
  });

  it("a subscribe failure never unwinds a good sign-in — verify still resolves ok, outcome is the honest 'subscribe-unknown'", async () => {
    vi.stubGlobal("fetch", async (url: string) => {
      if (String(url) === "/api/auth/email/verify") {
        return Response.json({ ok: true, handle: "x@example.com", space: "email" });
      }
      throw new Error("network down");
    });
    const result = await verifyAndSubscribe("x@example.com", "123456");
    expect(result).toEqual({ ok: true, handle: "x@example.com", space: "email", outcome: "subscribe-unknown" });
  });
});

describe("the error note speaks the box's own words, never a route's dashed reason (the adversarial review, block 968,561)", () => {
  const realFetch = global.fetch;
  afterEach(() => {
    global.fetch = realFetch;
  });
  function answer(status: number, reason: string) {
    global.fetch = vi.fn(async () => new Response(JSON.stringify({ ok: false, reason }), { status })) as unknown as typeof fetch;
  }

  it("a wrong code reads the box's words, not \"that code didn't match — try again\"", async () => {
    answer(401, "that code didn't match — try again");
    const r = await verifyAndSubscribe("x@example.com", "000000");
    expect(r).toEqual({ ok: false, message: "That code didn't match. Try again." });
  });

  for (const [status, reason] of [
    [400, "that email doesn't look right"],
    [429, "too many codes asked for — give it a few minutes and try again"],
    [502, "the letter didn't send — try again"],
    [503, "email sign-in isn't wired yet — please use your key, or try again soon"],
    [500, "anything — at all"],
  ] as [number, string][]) {
    it(`start ${status}: no dash, a capital, a full stop`, async () => {
      answer(status, reason);
      const r = await startEmailCode("x@example.com");
      expect(r.ok).toBe(false);
      const message = (r as { message: string }).message;
      expect(message).not.toContain("—");
      expect(message).not.toBe(reason);
      expect(message).toMatch(/^[A-Z].*\.$/);
    });
  }

  for (const status of [400, 401, 503, 500]) {
    it(`verify ${status}: no dash, never subscribes`, async () => {
      answer(status, "some route words — with a dash");
      const r = await verifyAndSubscribe("x@example.com", "123456");
      expect(r.ok).toBe(false);
      expect((r as { message: string }).message).not.toContain("—");
      const calls = (global.fetch as unknown as { mock: { calls: [string][] } }).mock.calls.map((c) => String(c[0]));
      expect(calls.some((u) => u.includes("/api/subscribe"))).toBe(false);
    });
  }
});

describe("Lumen's review (block 968,561): one door, one set of words; no doubled 'in'", () => {
  it("the box's Heart Field button reads exactly what the stage card's does", async () => {
    expect(WATCH_CTA).toBe("Go to the Heart Field");
    const stage = await fs.readFile(path.join(process.cwd(), "src/components/reading/ReadingStage.tsx"), "utf8");
    expect(stage).toContain("Go to the Heart Field");
  });

  it("'already' under the 'You're in.' heading never says 'already in'", () => {
    const html = renderToStaticMarkup(
      createElement(ReadingSignInCard, { member: { handle: "x@example.com", space: "email" }, justJoined: "already" }),
    );
    expect(html).toContain("You were already on the list for the reading.");
    expect(html).not.toContain("already in");
  });
});

describe("ReadingSignInCard — the joined state (just verified this session)", () => {
  it("shows ONE button, 'Go to the Heart Field' (the stage card's own words), to /rooms/heart-field", () => {
    const html = renderToStaticMarkup(
      createElement(ReadingSignInCard, { member: { handle: "x@example.com", space: "email" }, justJoined: "joined" }),
    );
    expect(html).toContain(WATCH_CTA);
    expect(html).toContain(`href="${HEART_FIELD_HREF}"`);
    expect((html.match(/kit-btn-main/g) ?? []).length).toBe(1); // ONE button, per the contract
  });
});

describe("ReadingSignInCard — arrived already signed in (outcome unknown): reuse ReadingSignUpCard, don't rebuild it", () => {
  it("an email member sees the reused public member card (Keep me posted), and no second Heart Field button (the stage card above carries it)", () => {
    const html = renderToStaticMarkup(
      createElement(ReadingSignInCard, { member: { handle: "reader@example.com", space: "email" } }),
    );
    expect(html).toContain("Keep me posted");
    expect(html).toContain("kit-signup"); // ReadingSignUpCard's own public-variant class, reused
    expect(html).not.toContain(WATCH_CTA);
    expect(html).not.toContain(`href="${HEART_FIELD_HREF}"`);
  });

  it("a key-signed member sees the reused member-key card (the field, never a silent skip)", () => {
    const html = renderToStaticMarkup(
      createElement(ReadingSignInCard, { member: { handle: "npub1abc", space: "onecocreation" } }),
    );
    expect(html).toContain("<input");
    expect(html).toContain("Keep me posted");
    expect(html).not.toContain(WATCH_CTA);
  });
});

describe("ReadingSignInCard — house laws: no em dash, every button kit-btn-sm", () => {
  const cases: [string, ReturnType<typeof createElement>][] = [
    ["signed-out, email step", createElement(ReadingSignInCard, { member: null })],
    ["signed-out, code step", createElement(ReadingSignInCard, { member: null, initialStep: "code" })],
    ["joined", createElement(ReadingSignInCard, { member: { handle: "x@example.com", space: "email" }, justJoined: "joined" })],
    ["already in", createElement(ReadingSignInCard, { member: { handle: "x@example.com", space: "email" }, justJoined: "already" })],
    ["returning member", createElement(ReadingSignInCard, { member: { handle: "x@example.com", space: "email" } })],
  ];

  for (const [label, el] of cases) {
    it(`${label}: no "—" anywhere`, () => {
      const html = renderToStaticMarkup(el);
      expect(html).not.toContain("—");
    });
  }

  it("every rendered <button>/<a class=kit-btn> carries kit-btn-sm", () => {
    for (const [, el] of cases) {
      const html = renderToStaticMarkup(el);
      const buttonTags = html.match(/<(?:button|a)[^>]*class="[^"]*kit-btn[^"]*"[^>]*>/g) ?? [];
      for (const tag of buttonTags) expect(tag).toContain("kit-btn-sm");
    }
  });
});

describe("ReadingSignInBox / ReadingSignInCard — source pins: no navigation away from /reading", () => {
  const SRC_PATH = "src/components/rooms/ReadingSignInBox.tsx";

  it("never window.location, never router.push — router.refresh() only", async () => {
    const src = await read(SRC_PATH);
    expect(src).not.toContain("window.location");
    expect(src).not.toContain("router.push");
    expect(src).toContain("router.refresh()");
  });

  it("subscribes through the SAME call the public 'Keep me posted' card makes (postReadingSignUp, ReadingSignUp.tsx)", async () => {
    const src = await read(SRC_PATH);
    expect(src).toContain('from "./ReadingSignUp"');
    expect(src).toContain("postReadingSignUp(");
  });

  it("no new auth route — only the two existing /api/auth/email/* endpoints", async () => {
    const src = await read(SRC_PATH);
    expect(src).toContain('"/api/auth/email/start"');
    expect(src).toContain('"/api/auth/email/verify"');
    expect(src).not.toMatch(/\/api\/auth\/(?!email\/(start|verify))/);
  });
});

describe("the page source: mounts the box, no longer mounts ReadingSignUp variant=\"public\"", () => {
  const PAGE_PATH = "src/app/reading/page.tsx";

  it("imports and mounts ReadingSignInBox exactly once", async () => {
    const src = await read(PAGE_PATH);
    expect(src).toContain('from "@/components/rooms/ReadingSignInBox"');
    expect(src.match(/<ReadingSignInBox/g)?.length).toBe(1);
  });

  it("no longer imports or mounts ReadingSignUp at all", async () => {
    const src = await read(PAGE_PATH);
    expect(src).not.toContain("ReadingSignUp");
    expect(src).not.toMatch(/href="\/news"/);
  });
});
