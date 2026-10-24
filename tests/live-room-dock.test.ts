import { describe, it, expect } from "vitest";
import { promises as fs } from "fs";
import path from "path";
import {
  LIVE_ROOM_IDLE,
  liveRoomDetach,
  liveRoomJoin,
  liveRoomRect,
  sameLiveRoom,
  type LiveRoomIdentity,
} from "@/components/live/LiveRoomContext";

/**
 * T-639 (K184, block 972,965 — the Admiral's ruling A on desk card
 * 972844-oc-mockup-t-639: build the live-room mini player the mockup drew,
 * with Number One's fixes). The repo runs no jsdom, so this suite drives
 * the pure exported state machine (LiveRoomContext.tsx's transitions)
 * directly, and pins the dock's rulings at SOURCE level:
 *
 *   - the state machine's idempotence law (a fields-only update NEVER
 *     remounts the embed; a left→join rejoin bumps mountKey exactly once;
 *     a different identity replaces);
 *   - item 1 (word buttons, never glyphs), item 3 (the leave Sheet at
 *     maxWidth 520), rulings A+E (the rejoin card for all guests, 11 s),
 *     ruling C (never under /a), ruling B (the strip's page padding),
 *     item 8 (the ?livedock=test switch, non-production only);
 *   - the bridge's cleanup law: detach ONLY, never a leave.
 */

const read = (rel: string) => fs.readFile(path.join(process.cwd(), rel), "utf8");

const DOCK = "src/components/live/LiveRoomDock.tsx";
const BRIDGE = "src/components/live/LiveRoomBridge.tsx";
const CONTEXT = "src/components/live/LiveRoomContext.tsx";
const LAYOUT = "src/app/layout.tsx";
const KIT = "src/app/kit.css";

const ID: LiveRoomIdentity = { kind: "twoway", domain: "meet.example", room: "oc-0123456789abcdef" };
const FIELDS = { title: "the reading", homePath: "/reading", homeLabel: "Back to the reading" };

describe("the live-room state machine (pure transitions)", () => {
  it("join from idle mounts a live session with mountKey 0 and no rect", () => {
    const next = liveRoomJoin(LIVE_ROOM_IDLE, ID, FIELDS);
    expect(next.phase).toBe("live");
    expect(next.session).toMatchObject({ ...ID, ...FIELDS, rect: null, mountKey: 0 });
  });

  it("the SAME live identity with unchanged fields returns the SAME state object (no render, no remount)", () => {
    const joined = liveRoomJoin(LIVE_ROOM_IDLE, ID, FIELDS);
    expect(liveRoomJoin(joined, ID, FIELDS)).toBe(joined);
  });

  it("a fields-only change (the chip, the camera cover) patches in place — mountKey and rect survive", () => {
    const joined = liveRoomJoin(LIVE_ROOM_IDLE, ID, FIELDS);
    const seated = liveRoomRect(joined, ID, { top: 10, left: 20, width: 300, height: 169 });
    const flipped = liveRoomJoin(seated, ID, { ...FIELDS, chip: "Live · 1:11 PM MDT · The Reading", coverUp: true });
    expect(flipped).not.toBe(seated);
    expect(flipped.session?.chip).toContain("Live ·");
    expect(flipped.session?.coverUp).toBe(true);
    expect(flipped.session?.mountKey).toBe(0);
    expect(flipped.session?.rect).toEqual({ top: 10, left: 20, width: 300, height: 169 });
  });

  it("the same identity in phase 'left' is a REJOIN — mountKey bumps (a fresh embed boot), phase live again", () => {
    const joined = liveRoomJoin(LIVE_ROOM_IDLE, ID, FIELDS);
    const left = { ...joined, phase: "left" as const };
    const rejoined = liveRoomJoin(left, ID, FIELDS);
    expect(rejoined.phase).toBe("live");
    expect(rejoined.session?.mountKey).toBe(1);
  });

  it("a different identity replaces the session outright (the deck's part-switch)", () => {
    const joined = liveRoomJoin(LIVE_ROOM_IDLE, ID, FIELDS);
    const other: LiveRoomIdentity = { kind: "watch", domain: "meet.example", room: "oc-fedcba9876543210" };
    const replaced = liveRoomJoin(joined, other, FIELDS);
    expect(replaced.session).toMatchObject({ ...other, mountKey: 1 });
    expect(sameLiveRoom(replaced.session, ID)).toBe(false);
  });

  it("reportRect patches only the matching session; an unchanged box returns the SAME state object", () => {
    const joined = liveRoomJoin(LIVE_ROOM_IDLE, ID, FIELDS);
    const box = { top: 10, left: 20, width: 300, height: 169 };
    const seated = liveRoomRect(joined, ID, box);
    expect(seated.session?.rect).toEqual(box);
    expect(liveRoomRect(seated, ID, box)).toBe(seated);
    /* another room's rect report never touches this session */
    expect(liveRoomRect(seated, { ...ID, room: "elsewhere" }, { top: 0, left: 0, width: 1, height: 1 })).toBe(seated);
  });

  it("detach forgets ONLY the seat (navigation, never a leave) — the session keeps playing", () => {
    const seated = liveRoomRect(liveRoomJoin(LIVE_ROOM_IDLE, ID, FIELDS), ID, { top: 10, left: 20, width: 300, height: 169 });
    const detached = liveRoomDetach(seated, ID);
    expect(detached.session?.rect).toBeNull();
    expect(detached.phase).toBe("live");
    /* detaching an already-detached or foreign session changes nothing */
    expect(liveRoomDetach(detached, ID)).toBe(detached);
    expect(liveRoomDetach(seated, { ...ID, room: "elsewhere" })).toBe(seated);
  });
});

describe("the dock's rulings — source pins (no jsdom in this repo)", () => {
  it("the layout owns the store and the dock (the room survives client navigation)", async () => {
    const src = await read(LAYOUT);
    expect(src).toContain('from "@/components/live/LiveRoomContext"');
    expect(src).toContain('from "@/components/live/LiveRoomDock"');
    expect(src).toContain("<LiveRoomsProvider>");
    expect(src).toContain("<LiveRoomDock />");
  });

  it("item 1 — every bar control is a WORD with an aria-label; no bare glyphs anywhere in the dock", async () => {
    const src = await read(DOCK);
    /* the toggle pair rides an expression, the rest are standalone lines */
    expect(src).toContain('"Grow"');
    expect(src).toContain('"Shrink"');
    const wordButtons = src.match(/>\s*(Dock|Undock|Close|Stay)\s*</g) ?? [];
    /* Dock, Undock, Close (the bar), Close (the strip), Close (the rejoin
       card), Stay (the leave Sheet) */
    expect(wordButtons.length).toBeGreaterThanOrEqual(6);
    for (const glyph of [">X<", ">-<", ">U<", ">D<", ">+<", ">_<", ">×<"]) {
      expect(src).not.toContain(glyph);
    }
    expect(src).toContain('aria-label="close the player"');
    expect(src).toContain('"grow the player"');
    expect(src).toContain('"shrink the player"');
    expect(src).toContain('aria-label="undock the player"');
  });

  it("item 3 — the leave Sheet is maxWidth 520 with the pair on flex + nowrap (one line at 1440 AND 390)", async () => {
    const src = await read(DOCK);
    expect(src).toContain("maxWidth={520}");
    expect(src).toContain("lrd-ask-buttons");
    const kit = await read(KIT);
    const ask = kit.slice(kit.indexOf(".lrd-ask-buttons"), kit.indexOf(".lrd-ask-buttons") + 300);
    expect(ask).toContain("flex");
    expect(ask).toContain("nowrap");
  });

  it("rulings A + E — the rejoin card serves ALL guests, self-dismisses at 11 s, keeps its close control", async () => {
    const src = await read(DOCK);
    expect(src).toContain("11_000");
    expect(src).toContain("REJOIN_DISMISS_MS");
    /* no camera/kind gate on the card itself — the kind check lives on the
       LEAVE question (camera-on asks first), never on the rejoin offer */
    const card = src.slice(src.indexOf("lrd-rejoin"), src.indexOf("lrd-rejoin") + 1400);
    expect(card).toContain('role="status"');
    expect(card).toContain("welcome to rejoin later");
    expect(card).toContain("session.homeLabel");
  });

  it("ruling C — the dock never paints under /a (display, never an unmount, so the room survives)", async () => {
    const src = await read(DOCK);
    expect(src).toContain('pathname === "/a" || pathname.startsWith("/a/")');
    expect(src).toContain("lrd-hidden");
  });

  it("ruling B / item 6 — while the phone strip shows, the page grows bottom padding (64px + the safe-area inset)", async () => {
    const src = await read(DOCK);
    expect(src).toContain("lrd-strip-on");
    expect(src).toContain("(max-width: 640px)");
    const kit = await read(KIT);
    expect(kit).toContain("html.lrd-strip-on body{padding-bottom:calc(64px + env(safe-area-inset-bottom))}");
  });

  it("item 2 — the phone strip is a real button with the full title and 'Tap to grow' on one line", async () => {
    const src = await read(DOCK);
    expect(src).toContain("lrd-strip-grow");
    expect(src).toContain("{session.title}, live");
    expect(src).toContain("Tap to grow");
  });

  it("item 7 — the dock holds the REAL embeds: JitsiRoom guestView for twoway, JitsiViewer for watch, keyed by identity + mountKey", async () => {
    const src = await read(DOCK);
    const twoWay = src.split("\n").find((l) => l.includes("<JitsiRoom"));
    expect(twoWay).toBeDefined();
    expect(twoWay).toMatch(/guestView/);
    expect(src).toContain("<JitsiViewer");
    expect(src).toContain("session.mountKey");
    /* TASK-519's prejoin hint rides the dock's JitsiRoom now (reading-stage.test.ts's re-trued pin points here) */
    const jitsi = await read("src/components/booking/JitsiRoom.tsx");
    expect(jitsi).toContain("Allow camera and microphone");
  });

  it("item 1's Close — camera-on asks first (the Sheet); watch-only closes straight to the rejoin card", async () => {
    const src = await read(DOCK);
    expect(src).toContain('session?.kind === "twoway"');
    expect(src).toContain("setAsking(true)");
    expect(src).toContain("endSession()");
    expect(src).toContain("Do you want to leave");
  });

  it("item 8 — ?livedock=test joins the real meet.jit.si test room, non-production hostnames only", async () => {
    const src = await read(DOCK);
    expect(src).toContain('"onecocreation.com"');
    expect(src).toContain('"meet.jit.si"');
    expect(src).toContain("OneCocreationDockTest");
    expect(src).toContain('"livedock"');
    expect(src).toContain('"test"');
  });

  it("the bridge's cleanup DETACHES ONLY — never a leave, never a dismiss (navigation survival)", async () => {
    const src = await read(BRIDGE);
    expect(src).toContain("live.detach(identity)");
    expect(src).not.toContain(".endSession(");
    expect(src).not.toContain(".dismiss(");
    /* and it renders no controls — the owners' render pins (cover-479's
       no-buttons law) hold in the room's old seat */
    expect(src).not.toContain("<button");
    expect(src).not.toContain("<Link");
  });

  it("the context exposes the pure transitions + the idle state (this suite's own import surface)", async () => {
    const src = await read(CONTEXT);
    for (const name of ["sameLiveRoom", "liveRoomJoin", "liveRoomRect", "liveRoomDetach", "LIVE_ROOM_IDLE"]) {
      expect(src).toContain(`export ${name === "LIVE_ROOM_IDLE" ? "const" : "function"} ${name}`);
    }
  });
});
