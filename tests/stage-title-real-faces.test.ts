import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from "vitest";
import { promises as fs } from "fs";
import path from "path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { isolateCwd } from "./helpers/isolate-cwd";

/**
 * TASK-260 (0018.06.24 a₿, block 967,043) — THE STAGE SAYS THE SHOW'S
 * NAME, THE AUDIENCE WEARS ITS REAL FACES, AND THE JOIN PILL STOPS LYING.
 * Cut from the Admiral's walk of the Heart Field stage on the studio rail.
 * See `src/components/rooms/RoomVideoSlot.tsx`'s own TASK-260 docblock
 * paragraph and `src/lib/registry.ts`'s `reservedSeat()` for the full
 * reasoning; this file pins the observable behavior.
 *
 * Pins:
 *  1. TITLE — the slot's `<h3>` reads `fullSceneShowTitle || roomTitle`
 *     (the exact derive-or-dash `SceneFrame.tsx:94` already performs);
 *     the literal placeholder "Video" never renders again.
 *  2. THE PILL STOPS LYING — RoomVideoSlot mounts ONLY on a room's own
 *     Stage, so whenever its `roomTitle` resolves against the ROOMS
 *     registry, `joinHref` is provably the page already open and the
 *     "● Join Live Session" pill does not render. A title that doesn't
 *     match any registered room (the honest fallback, `/live`) still
 *     draws the pill — that door leads somewhere real.
 *  3. REAL FACES — `/api/member/availability` (TASK-280 moved this from
 *     `/api/frens/availability`; the old URL still answers, dual-read,
 *     via a re-export shim — see the sibling describe below) validates
 *     SHAPE first, then
 *     asks the registry; a RESERVED name that is genuinely SEATED
 *     (`registry.ts`'s new `reservedSeat()`, additive/read-only) answers
 *     `available:false, reason:"reserved", npub:<real npub>` so the Stage
 *     gallery can draw a real nostr face instead of a guessed one. An
 *     unseated reserved name falls through to the original answer,
 *     unchanged. Claim validation (`validateHandle`, the public queue)
 *     is untouched either way — a reserved name still cannot be CLAIMED.
 *
 * This repo ships NO seeded registry fixture (data/*-registry.json is
 * untracked, and scripts/reset-registry.mjs empties it on every `npm run
 * dev`) — adminpacman's real seat lives in production Vercel Blob storage,
 * written outside the public queue. The registry describe below builds its
 * OWN isolated fixture (isolateCwd + a hand-written entries array) to
 * prove the mechanism; it does not and cannot assert anything about the
 * production seat itself.
 */

/* captured BEFORE the registry describe below ever calls isolateCwd
   (which process.chdir()s the test process) — every relative-path fs read
   in this file goes through this constant so ordering can never matter. */
const PROJECT_ROOT = process.cwd();
const readSrc = (rel: string) => fs.readFile(path.join(PROJECT_ROOT, rel), "utf8");

describe("RoomVideoSlot — the title says the show's name, never the literal 'Video' (TASK-260)", () => {
  it("reads the studio doc's own show title when one is threaded", async () => {
    const RoomVideoSlot = (await import("@/components/rooms/RoomVideoSlot")).default;
    const html = renderToStaticMarkup(
      createElement(RoomVideoSlot, {
        live: true,
        roomTitle: "The Heart Field",
        rail: "vdo",
        vdoHost: "vdo.onecocreation.com",
        studioRoom: "onecocreation-studio",
        fullScene: "starting",
        fullSceneShowTitle: "Chronicles: The Evening Reading",
      }),
    );
    expect(html).toContain('<h3 class="cl-video-title">Chronicles: The Evening Reading</h3>');
    expect(html).not.toContain(">Video<");
  });

  it("derives to the room's own title when no show title rides down (derive-or-dash, never blank)", async () => {
    const RoomVideoSlot = (await import("@/components/rooms/RoomVideoSlot")).default;
    const html = renderToStaticMarkup(
      createElement(RoomVideoSlot, { live: false, roomTitle: "The Heart Field" }),
    );
    expect(html).toContain('<h3 class="cl-video-title">The Heart Field</h3>');
    expect(html).not.toContain(">Video<");
  });

  it("source pin: the placeholder literal is gone", async () => {
    const src = await readSrc("src/components/rooms/RoomVideoSlot.tsx");
    expect(src).not.toMatch(/<h3 className="cl-video-title">Video<\/h3>/);
    expect(src).toContain("{fullSceneShowTitle || roomTitle}");
  });
});

describe("RoomVideoSlot — the join pill stops lying (TASK-260)", () => {
  it("a registered room's own Stage never draws a pill back to itself — jitsi rail", async () => {
    const RoomVideoSlot = (await import("@/components/rooms/RoomVideoSlot")).default;
    const html = renderToStaticMarkup(
      createElement(RoomVideoSlot, {
        live: true,
        roomTitle: "The Heart Field",
        jitsiDomain: "meet.onecocreation.com",
        liveRoom: "onecocreation-heart-field",
      }),
    );
    expect(html).toContain("opening the room"); // the embed still mounts
    expect(html).not.toContain("Join Live Session");
  });

  it("a registered room's own Stage never draws a pill back to itself — live, no embed configured", async () => {
    const RoomVideoSlot = (await import("@/components/rooms/RoomVideoSlot")).default;
    const html = renderToStaticMarkup(
      createElement(RoomVideoSlot, { live: true, roomTitle: "The Heart Field" }),
    );
    expect(html).toContain("Love is live in The Heart Field now");
    expect(html).not.toContain("Join Live Session");
  });

  it("a title that matches no registered room still draws the pill — /live is a REAL door, not itself", async () => {
    const RoomVideoSlot = (await import("@/components/rooms/RoomVideoSlot")).default;
    const html = renderToStaticMarkup(
      createElement(RoomVideoSlot, { live: true, roomTitle: "Not A Registered Room" }),
    );
    expect(html).toContain("Join Live Session");
    expect(html).toContain('href="/live"');
  });
});

describe("member/availability — real faces: a seated reserved name reads its real npub (TASK-260, TASK-280 moved path)", () => {
  /* own isolated cwd — never touches the shared data/ dir, never races
     any other suite's registry file (worktrees share one .git but each
     vitest file already owns its own OS process under the `forks` pool) */
  const { cleanup: cleanupCwd } = isolateCwd("oc-task260-registry-");
  const SEATED_NPUB = `npub1${"q".repeat(58)}`;
  /* NEXT_PUBLIC_SPACE_NAME is a module-top-level constant in
     identity-config.ts — earlier describes in this same file already
     imported RoomVideoSlot (which imports it), so it's already resolved
     by the time this beforeAll runs. Reading it back (rather than trying
     to set the env var late) keeps the fixture honest under whatever
     space actually resolved. */
  let space = "frens";

  const registryFile = () => path.join(process.cwd(), "data", `${space}-registry.json`);

  async function seedRegistry(entries: Array<Record<string, unknown>>) {
    await fs.mkdir(path.dirname(registryFile()), { recursive: true });
    await fs.writeFile(registryFile(), JSON.stringify({ space, entries }, null, 2));
  }

  beforeAll(async () => {
    delete process.env.BLOB_READ_WRITE_TOKEN;
    delete process.env.VERCEL;
    delete process.env.REGISTRY_DRIVER;
    const { SPACE_NAME } = await import("@/lib/identity-config");
    space = SPACE_NAME;
  });

  afterEach(async () => {
    await fs.rm(registryFile(), { force: true });
    vi.resetModules();
  });

  afterAll(() => {
    cleanupCwd();
  });

  it("adminpacman, seated: available:false, reason:'reserved', the real npub", async () => {
    await seedRegistry([
      {
        handle: "adminpacman",
        npub: SEATED_NPUB,
        status: "committed",
        batchId: "fixture-batch",
        requestedAt: new Date().toISOString(),
      },
    ]);
    const { GET } = await import("@/app/api/member/availability/route");
    const res = await GET(new Request("http://localhost/api/member/availability?handle=adminpacman"));
    const json = await res.json();
    expect(json).toEqual({
      handle: "adminpacman",
      space,
      available: false,
      reason: "reserved",
      npub: SEATED_NPUB,
    });
  });

  it("a reserved name with NO seat in the fixture falls through to the original answer, unchanged", async () => {
    await seedRegistry([]); // no row for any reserved name — the honest state this repo ships
    const { GET } = await import("@/app/api/member/availability/route");
    const res = await GET(new Request("http://localhost/api/member/availability?handle=adminpacman"));
    const json = await res.json();
    expect(json).toEqual({ handle: "adminpacman", available: false, reason: "reserved name" });
    expect(json.npub).toBeUndefined();
  });

  it("claim validation is untouched: a reserved name still cannot be CLAIMED, seated or not", async () => {
    await seedRegistry([
      { handle: "adminpacman", npub: SEATED_NPUB, status: "committed", batchId: "x", requestedAt: new Date().toISOString() },
    ]);
    const { validateHandle } = await import("@/lib/registry");
    const result = validateHandle("adminpacman");
    expect(result).toEqual({ ok: false, reason: "reserved name" });
  });

  it("an ordinary unclaimed handle is unaffected by the reserved-seat path", async () => {
    await seedRegistry([]);
    const { GET } = await import("@/app/api/member/availability/route");
    const res = await GET(new Request("http://localhost/api/member/availability?handle=someone-new"));
    const json = await res.json();
    expect(json).toEqual({ handle: "someone-new", space, available: true, reason: null });
  });

  /* TASK-280 dual-read: the OLD /api/frens/availability URL still answers
     via a re-export shim — same behavior, same implementation, no drift. */
  it("dual-read: the old /api/frens/availability URL answers identically via the re-export shim", async () => {
    await seedRegistry([
      {
        handle: "adminpacman",
        npub: SEATED_NPUB,
        status: "committed",
        batchId: "fixture-batch",
        requestedAt: new Date().toISOString(),
      },
    ]);
    const { GET } = await import("@/app/api/frens/availability/route");
    const res = await GET(new Request("http://localhost/api/frens/availability?handle=adminpacman"));
    const json = await res.json();
    expect(json).toEqual({
      handle: "adminpacman",
      space,
      available: false,
      reason: "reserved",
      npub: SEATED_NPUB,
    });
  });
});
