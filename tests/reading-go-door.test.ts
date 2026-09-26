import { describe, it, expect, vi, beforeAll, afterEach } from "vitest";
import { promises as fs } from "fs";
import path from "path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { generateSecretKey, getPublicKey, nip19 } from "nostr-tools";
import type { DoorConfig, DoorRowState } from "@/app/a/site/reading/rooms-config";

/**
 * TASK-486 (block 968,624+) — Love's one-tap email links: `/a/site/
 * reading/go/[door]`. One page per door (housewarming/stage1/stage2/qa),
 * operator-gated exactly like every other `/a` room, GET-safe for an
 * email scanner, ONE button that opens (or re-fetches) the room and
 * sends the SAME TAB straight to it.
 *
 * Pins:
 *  · `GoRoomBody` (the pure presentation, `RoomsCardBody`'s own split) —
 *    every phase, direct render, no jsdom (this repo runs none);
 *  · the shared open logic — `RoomsCard.tsx`'s own exported `openDoor`/
 *    `closeDoor`/`fetchDoorState`, called directly here with a mocked
 *    `fetch`, proving the publish-then-prepare fallback rides unmoved,
 *    and that `useDoorRoom.ts` calls these SAME functions rather than a
 *    second copy;
 *  · the route: an unknown door 404s, the operator gate (signed out sees
 *    OperatorGate with a `next` back to this exact address; signed in
 *    sees the room), and that rendering it — GET, no click — never
 *    fetches at all (SSR makes no request of its own; the child's own
 *    hook only fetches after mount, which `renderToStaticMarkup` never
 *    runs).
 */

const ROOT = process.cwd();
const read = (rel: string) => fs.readFile(path.join(ROOT, rel), "utf8");

const DOMAIN = "meet.reading-go-door-fixture.invalid";
const ROOM = "oc-fedcba9876543210";
const DOOR: DoorConfig = { id: "stage1", label: "Reading · 1:11", adminPath: "/api/admin/stage1" };

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status });
}

const realFetch = global.fetch;
afterEach(() => {
  global.fetch = realFetch;
  vi.unstubAllGlobals();
});

/* the route's own next/headers mock — top-level (never nested inside a
   describe callback), same idiom studio-director-desk.test.ts uses:
   vi.mock calls are hoisted above imports by the static transform, so a
   nested one would run before the closure it references exists. */
let testCookie: string | null = null;
vi.mock("next/headers", () => ({
  headers: async () => ({ get: (name: string) => (name === "cookie" ? testCookie : null) }),
}));

describe("RoomsCard's own shared functions — the ONE open/close logic, called directly", () => {
  it("openDoor: publish succeeds first try (Stage 2/Q&A's own convenience path) — one PUT", async () => {
    const calls: Array<{ action: string }> = [];
    global.fetch = (async (_url: string | URL, init?: RequestInit) => {
      const body = JSON.parse(String((init as RequestInit).body)) as { action: string };
      calls.push({ action: body.action });
      return jsonResponse({ ok: true, phase: "published", room: ROOM, jitsiDomain: DOMAIN });
    }) as unknown as typeof fetch;

    const { openDoor } = await import("@/app/a/site/reading/RoomsCard");
    const outcome = await openDoor(DOOR);
    expect(outcome).toEqual({ ok: true, state: { phase: "published", room: ROOM, jitsiDomain: DOMAIN } });
    expect(calls.map((c) => c.action)).toEqual(["publish"]);
  });

  it("openDoor: publish refused (Stage 1's own 409 law) falls back to prepare, then publish — in the SAME call", async () => {
    const calls: Array<{ action: string }> = [];
    global.fetch = (async (_url: string | URL, init?: RequestInit) => {
      const body = JSON.parse(String((init as RequestInit).body)) as { action: string };
      calls.push({ action: body.action });
      if (body.action === "publish" && calls.filter((c) => c.action === "publish").length === 1) {
        return jsonResponse({ ok: false, reason: "prepare first — the room refused" }, 409);
      }
      if (body.action === "prepare") return jsonResponse({ ok: true, phase: "prepared", room: ROOM, jitsiDomain: DOMAIN });
      return jsonResponse({ ok: true, phase: "published", room: ROOM, jitsiDomain: DOMAIN });
    }) as unknown as typeof fetch;

    const { openDoor } = await import("@/app/a/site/reading/RoomsCard");
    const outcome = await openDoor(DOOR);
    expect(outcome).toEqual({ ok: true, state: { phase: "published", room: ROOM, jitsiDomain: DOMAIN } });
    expect(calls.map((c) => c.action)).toEqual(["publish", "prepare", "publish"]);
  });

  it("openDoor: a refused prepare answers honestly, never a fabricated room", async () => {
    global.fetch = (async (_url: string | URL, init?: RequestInit) => {
      const body = JSON.parse(String((init as RequestInit).body)) as { action: string };
      if (body.action === "prepare") return jsonResponse({ ok: false, reason: "the room refused (500)" }, 500);
      return jsonResponse({ ok: false, reason: "prepare first" }, 409);
    }) as unknown as typeof fetch;

    const { openDoor } = await import("@/app/a/site/reading/RoomsCard");
    const outcome = await openDoor(DOOR);
    expect(outcome.ok).toBe(false);
    if (!outcome.ok) expect(outcome.reason).toBe("the room refused (500)");
  });

  it("closeDoor: one PUT close, the closed state comes back", async () => {
    const calls: Array<{ action: string }> = [];
    global.fetch = (async (_url: string | URL, init?: RequestInit) => {
      const body = JSON.parse(String((init as RequestInit).body)) as { action: string };
      calls.push({ action: body.action });
      return jsonResponse({ ok: true, phase: "closed", room: null, jitsiDomain: DOMAIN });
    }) as unknown as typeof fetch;

    const { closeDoor } = await import("@/app/a/site/reading/RoomsCard");
    const outcome = await closeDoor(DOOR);
    expect(outcome).toEqual({ ok: true, state: { phase: "closed", room: null, jitsiDomain: DOMAIN } });
    expect(calls).toEqual([{ action: "close" }]);
  });

  it("fetchDoorState: a plain GET — no method, no body, never a PUT (safe for an email scanner)", async () => {
    let capturedInit: RequestInit | undefined;
    let capturedUrl: string | URL | undefined;
    global.fetch = (async (url: string | URL, init?: RequestInit) => {
      capturedUrl = url;
      capturedInit = init;
      return jsonResponse({ ok: true, phase: "closed", room: null, jitsiDomain: DOMAIN });
    }) as unknown as typeof fetch;

    const { fetchDoorState } = await import("@/app/a/site/reading/RoomsCard");
    const state = await fetchDoorState(DOOR);
    expect(state).toEqual({ phase: "closed", room: null, jitsiDomain: DOMAIN });
    expect(capturedUrl).toBe(DOOR.adminPath);
    expect(capturedInit?.method).toBeUndefined();
    expect(capturedInit?.body).toBeUndefined();
    expect(capturedInit?.cache).toBe("no-store");
  });

  it("fetchDoorState: a network failure answers null, never throws", async () => {
    global.fetch = (async () => {
      throw new Error("offline");
    }) as unknown as typeof fetch;
    const { fetchDoorState } = await import("@/app/a/site/reading/RoomsCard");
    await expect(fetchDoorState(DOOR)).resolves.toBeNull();
  });
});

describe("runExclusive — the double-tap race's fix (review, block 968,624+)", () => {
  it("a plain lock: two concurrent runs invoke fn only ONCE — the second gets null immediately, without waiting", async () => {
    const { runExclusive } = await import("@/app/a/site/reading/RoomsCard");
    const lock = { current: false };
    let calls = 0;
    let release!: (v: string) => void;
    const fn = () =>
      new Promise<string>((resolve) => {
        calls++;
        release = resolve;
      });

    const p1 = runExclusive(lock, fn);
    const p2 = runExclusive(lock, fn);
    // BEFORE either promise settles: fn ran exactly once, synchronously
    // proven — the second call's lock check already saw `current: true`.
    expect(calls).toBe(1);
    expect(lock.current).toBe(true);

    release("done");
    const [r1, r2] = await Promise.all([p1, p2]);
    const results = [r1, r2];
    expect(results.filter((r) => r === null)).toHaveLength(1);
    expect(results).toContain("done");
    expect(lock.current).toBe(false);
  });

  it("after the lock releases, a later call runs fn again", async () => {
    const { runExclusive } = await import("@/app/a/site/reading/RoomsCard");
    const lock = { current: false };
    let calls = 0;
    await runExclusive(lock, async () => {
      calls++;
      return "a";
    });
    await runExclusive(lock, async () => {
      calls++;
      return "b";
    });
    expect(calls).toBe(2);
  });

  it("a thrown fn still releases the lock (finally, never a stuck room)", async () => {
    const { runExclusive } = await import("@/app/a/site/reading/RoomsCard");
    const lock = { current: false };
    await expect(
      runExclusive(lock, async () => {
        throw new Error("boom");
      }),
    ).rejects.toThrow("boom");
    expect(lock.current).toBe(false);
  });

  it("TWO CONCURRENT open() CALLS PRODUCE A SINGLE openDoor CALL — the real production path, real openDoor, mocked fetch", async () => {
    const lock = { current: false };
    let fetchCalls = 0;
    let releaseFetch!: (v: Response) => void;
    global.fetch = (() =>
      new Promise<Response>((resolve) => {
        fetchCalls++;
        releaseFetch = resolve;
      })) as unknown as typeof fetch;

    const { runExclusive, openDoor } = await import("@/app/a/site/reading/RoomsCard");
    const p1 = runExclusive(lock, () => openDoor(DOOR));
    const p2 = runExclusive(lock, () => openDoor(DOOR));

    // the SECOND concurrent open() never reaches openDoor's own fetch —
    // exactly one PUT in flight, never two rooms prepared
    expect(fetchCalls).toBe(1);

    releaseFetch(jsonResponse({ ok: true, phase: "published", room: ROOM, jitsiDomain: DOMAIN }));
    const [r1, r2] = await Promise.all([p1, p2]);
    const results = [r1, r2];
    expect(results.filter((r) => r === null)).toHaveLength(1);
    expect(results.find((r) => r !== null)).toEqual({
      ok: true,
      state: { phase: "published", room: ROOM, jitsiDomain: DOMAIN },
    });
  });
});

describe("useDoorRoom.ts — reuses RoomsCard's own functions, never a second copy of the fallback chain", () => {
  it("imports openDoor/closeDoor/fetchDoorState from ../RoomsCard, never reimplements putAction", async () => {
    const src = await read("src/app/a/site/reading/go/useDoorRoom.ts");
    expect(src).toMatch(/from ["']\.\.\/RoomsCard["']/);
    expect(src).toContain("openDoor");
    expect(src).toContain("closeDoor");
    expect(src).toContain("fetchDoorState");
    expect(src).not.toMatch(/putAction/);
  });

  it("wraps open()/close() in the shared runExclusive lock, backed by its own useRef (double-tap race fix)", async () => {
    const src = await read("src/app/a/site/reading/go/useDoorRoom.ts");
    expect(src).toContain("runExclusive");
    expect(src).toContain("useRef(false)");
    expect(src.match(/runExclusive\(lockRef,/g)?.length).toBe(2);
  });

  it("open()/close() return the resulting state so the page can navigate off the answer directly", async () => {
    const src = await read("src/app/a/site/reading/go/useDoorRoom.ts");
    expect(src).toMatch(/Promise<DoorRowState \| null>/);
  });
});

describe("GoRoom.tsx — the same-tab navigation law", () => {
  it("sends the SAME TAB with window.location.assign, never window.open (iOS Safari blocks a post-await popup)", async () => {
    const src = await read("src/app/a/site/reading/go/[door]/GoRoom.tsx");
    expect(src).toContain("window.location.assign(");
    expect(src).not.toContain("window.open(");
  });

  it("reuses rooms-config.ts's own jitsiRoomUrl — never a second copy of the Jitsi hash, never read from RoomsCard.tsx's client boundary", async () => {
    const src = await read("src/app/a/site/reading/go/[door]/GoRoom.tsx");
    expect(src).toContain("jitsiRoomUrl(");
    expect(src).toMatch(/from ["']\.\.\/\.\.\/rooms-config["']/);
    expect(src).not.toMatch(/from ["'].*RoomsCard["']/);
    expect(src).not.toContain("config.p2p.enabled");
  });
});

describe("GoRoomBody — every phase, direct render (no jsdom)", () => {
  async function render(overrides: Record<string, unknown> = {}) {
    const { GoRoomBody } = await import("@/app/a/site/reading/go/[door]/GoRoom");
    const props = {
      door: DOOR,
      state: null,
      busy: null,
      error: null,
      onOpenAndJoin: () => {},
      onClose: () => {},
      ...overrides,
    };
    return renderToStaticMarkup(createElement(GoRoomBody, props));
  }

  it("before the first read resolves: 'Reading…', the one button disabled, no crash", async () => {
    const html = await render();
    expect(html).toContain("Reading…");
    expect(html).toContain(">Open and join<");
    expect(html).toMatch(/<button[^>]*disabled[^>]*>Open and join/);
  });

  it("closed: the title, 'Closed.', ONE big button, no Join/Close pair", async () => {
    const state: DoorRowState = { phase: "closed", room: null, jitsiDomain: DOMAIN };
    const html = await render({ state });
    expect(html).toContain("Reading · 1:11");
    expect(html).toContain("Closed.");
    expect(html).toContain(">Open and join<");
    expect(html).not.toContain("Join on camera");
    expect(html).not.toContain("Close this room");
    expect((html.match(/<button|<a /g) ?? []).length).toBe(1);
  });

  it("already open (prepared or published): the one line, Join on camera + Close this room", async () => {
    for (const phase of ["prepared", "published"] as const) {
      const state: DoorRowState = { phase, room: ROOM, jitsiDomain: DOMAIN };
      const html = await render({ state });
      expect(html).toContain("Open. Viewers can come in.");
      expect(html).toContain(`href="https://${DOMAIN}/${ROOM}#config.p2p.enabled=false&amp;config.showChatPermissionsModeratorSetting=true"`);
      expect(html).toContain(">Join on camera<");
      expect(html).toContain(">Close this room<");
      expect(html).not.toContain(">Open and join<");
    }
  });

  it("busy 'open' replaces the status line: 'Opening…'", async () => {
    const html = await render({ busy: "open" });
    expect(html).toContain("Opening…");
    expect(html).not.toContain("Closed.");
  });

  it("busy 'close' replaces the status line: 'Closing…'", async () => {
    const state: DoorRowState = { phase: "published", room: ROOM, jitsiDomain: DOMAIN };
    const html = await render({ state, busy: "close" });
    expect(html).toContain("Closing…");
  });

  it("an error replaces the status line, in plain words, announced (role=alert)", async () => {
    const html = await render({ error: "the room refused, try again" });
    expect(html).toContain("the room refused, try again");
    expect(html).toMatch(/role="alert"[^>]*>the room refused, try again/);
  });

  it("kit classes only — full-width kit-btn-main, no legacy .btn, no em dash, no arrow", async () => {
    const html = await render();
    expect(html).toContain("kit-btn");
    expect(html).toContain("kit-go-room-actions");
    expect(html).not.toMatch(/class="btn/);
    expect(html).not.toContain("→");
    const src = await read("src/app/a/site/reading/go/[door]/GoRoom.tsx");
    const wordsOnly = src.match(/"[^"]*"/g)?.join(" ") ?? "";
    expect(wordsOnly).not.toContain("—");
    expect(src).not.toContain("style={{");
  });
});

describe("the route — /a/site/reading/go/[door]", () => {
  let operatorCookie: string;

  beforeAll(async () => {
    process.env.NEXT_PUBLIC_SPACE_NAME = "onecocreation";
    delete process.env.KV_REST_API_URL;
    delete process.env.KV_REST_API_TOKEN;
    process.env.SEAT_SECRET = "task-486-reading-go-door-secret";
    const pk = getPublicKey(generateSecretKey());
    process.env.OPERATOR_NPUBS = nip19.npubEncode(pk);
    const { makeOperatorToken } = await import("@/lib/operator-auth");
    operatorCookie = `fe-operator=${makeOperatorToken(pk)}`;
  });

  const renderPage = async (door: string) => {
    const { default: GoDoorPage } = await import("@/app/a/site/reading/go/[door]/page");
    return GoDoorPage({ params: Promise.resolve({ door }) });
  };

  it("an unknown door 404s", async () => {
    testCookie = operatorCookie;
    await expect(renderPage("bogus-door")).rejects.toThrow();
  });

  it("an unknown door 404s even signed out — the door param is checked first", async () => {
    testCookie = null;
    await expect(renderPage("bogus-door")).rejects.toThrow();
  });

  it("signed out: OperatorGate renders, never the room, and its email link carries next back to THIS address", async () => {
    testCookie = null;
    const html = renderToStaticMarkup(await renderPage("qa"));
    expect(html).toContain("Operator sign-in");
    expect(html).not.toContain("Open and join");
    expect(html).toContain(`href="/login?next=${encodeURIComponent("/a/site/reading/go/qa")}"`);
  });

  it("signed in: renders the room (GoRoom), never the gate", async () => {
    testCookie = operatorCookie;
    vi.stubGlobal(
      "fetch",
      vi.fn(() => {
        throw new Error("render must not fetch — GET-only render changes nothing");
      }),
    );
    const html = renderToStaticMarkup(await renderPage("stage1"));
    expect(html).not.toContain("Operator sign-in");
    expect(html).toContain("Reading · 1:11");
    vi.unstubAllGlobals();
  });

  it("GET-only render (SSR) fetches nothing at all — safe for an email scanner opening the link with no click", async () => {
    testCookie = operatorCookie;
    const fetchSpy = vi.fn(() => {
      throw new Error("render must not fetch");
    });
    vi.stubGlobal("fetch", fetchSpy);
    await renderPage("housewarming");
    expect(fetchSpy).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });

  it("page.tsx makes no fetch of its own — reads a cookie, checks the door, renders a child", async () => {
    const src = await read("src/app/a/site/reading/go/[door]/page.tsx");
    expect(src).not.toMatch(/fetch\(/);
  });

  it("the door param is checked against DOORS (rooms-config.ts's own config, a plain module — never RoomsCard.tsx's client boundary), never a second copy", async () => {
    const src = await read("src/app/a/site/reading/go/[door]/page.tsx");
    expect(src).toMatch(/from ["']\.\.\/\.\.\/rooms-config["']/);
    expect(src).not.toMatch(/from ["'].*RoomsCard["']/);
    expect(src).toContain("DOORS.find(");
  });

  it("same server gate shape as every other /a room: no \"use client\", OperatorGate + operatorFromCookieHeader + operatorsConfigured + force-dynamic", async () => {
    const src = await read("src/app/a/site/reading/go/[door]/page.tsx");
    expect(src).not.toContain('"use client"');
    expect(src).toContain('import OperatorGate from "@/components/OperatorGate"');
    expect(src).toContain("operatorFromCookieHeader");
    expect(src).toContain("operatorsConfigured");
    expect(src).toContain('export const dynamic = "force-dynamic"');
    expect(src).toContain('from "next/headers"');
    expect(src).toContain("await headers()");
  });

  it("the next path is hardened through safeNextPath (T-442), never a raw template string", async () => {
    const src = await read("src/app/a/site/reading/go/[door]/page.tsx");
    expect(src).toContain('from "@/lib/next-path"');
    expect(src).toContain("safeNextPath(");
  });
});
