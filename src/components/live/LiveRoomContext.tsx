"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

/**
 * THE LIVE-ROOM STORE (T-639 BUILD, K184 block 972,965 — the Admiral's
 * ruling A: build the mini player the T-639 mockup drew, with Number One's
 * fixes). ONE layout-owned session: while a guest is inside a live Jitsi
 * room, the room's owner page (ReadingStage, ReadingStageDoor, StageView's
 * story time) renders a `LiveRoomBridge` instead of the embed; the bridge
 * `join()`s here, and `LiveRoomDock` — mounted once in app/layout.tsx —
 * holds the ACTUAL embed. Client navigation unmounts the page but never
 * the layout, so the iframe inside the dock never reloads: that
 * persistence is the whole answer to R-093 ("keep the video live while
 * browsing"). Full reloads (absolute https links, leaving the site) still
 * end the room — accepted by the ruling.
 *
 * The session is keyed by IDENTITY (`kind` + `domain` + `room`):
 *   - join with the identity already live = the owner updating its fields
 *     (the chip text, the camera cover) — NEVER a remount;
 *   - join with the same identity after a leave = a rejoin — a FRESH mount
 *     (mountKey bumps, the embed boots again);
 *   - join with a different identity = the guest walked into another room —
 *     the old embed unmounts (Jitsi's own dispose leaves that room), the
 *     new one mounts. Only one bridge is mounted at a time in practice
 *     (ReadingStageDeck mounts one screen; the rooms page is a different
 *     route), so this replace path is the deck's part-switch, the same
 *     "disposed on switch" law the old in-place mounts kept.
 *
 * `phase` is "live" while the room plays and "left" after any end — the
 * embed's own farewell (Jitsi's hangup / Love ending the call), the dock's
 * confirmed Leave, or the watch embed's load failure. "left" unmounts the
 * embed (api.dispose fires) and shows the rejoin card for ALL guests
 * (ruling A + E, block 972,844: camera or watch-only, 11 seconds, keeps
 * its close control). A SERVER-SIDE end (the stage's own poll finding the
 * door closed) is not a leave — there is nothing to rejoin — so the owners
 * call `dismissIf(identity)` there and the session is forgotten outright.
 *
 * The pure transitions below are exported so the repo's no-jsdom test idiom
 * can pin the state machine directly (tests/live-room-dock.test.ts).
 */

export interface LiveRoomIdentity {
  /** "twoway" = JitsiRoom (the guest's own camera/mic, guestView keys);
   *  "watch" = JitsiViewer (one-way, Guest, the T-448 keys). */
  kind: "twoway" | "watch";
  domain: string;
  room: string;
}

/** viewport-relative box the dock's stage mode sits on (the bridge's own
 *  placeholder — the exact seat the embed used to occupy). */
export interface LiveRoomRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

/** display fields the owning page keeps current — a change here must NEVER
 *  remount the embed. */
export interface LiveRoomFields {
  /** the bar's (and the phone strip's) title, e.g. "the reading" */
  title: string;
  /** where the room's own stage lives — the rejoin card's door */
  homePath: string;
  /** the door's words, e.g. "Back to the reading" */
  homeLabel: string;
  /** the stage chip's words ("Live · 1:11 PM MDT · The Reading"), if any */
  chip?: string | null;
  /** the book cover rides over the embed (Love's camera not shown yet) */
  coverUp?: boolean;
}

/** the owner's own callbacks — the dock calls these when the embed (or the
 *  guest, through the dock) ends the room, so the page's left/ended flows
 *  run exactly as they did when the embed sat in the page. */
export interface LiveRoomHandlers {
  onEnded?: () => void;
  onFailed?: () => void;
  onJoined?: (joined: boolean) => void;
  onRejoin?: () => void;
}

export interface LiveRoomSession extends LiveRoomIdentity, LiveRoomFields {
  /** non-null while the owning bridge is mounted — the stage mode's seat.
   *  Null = no owner on screen (navigated away) = the docked modes. */
  rect: LiveRoomRect | null;
  /** bumped on every rejoin — the embed's remount key. */
  mountKey: number;
}

export type LiveRoomPhase = "live" | "left";

export interface LiveRoomStoreState {
  session: LiveRoomSession | null;
  phase: LiveRoomPhase;
}

export const LIVE_ROOM_IDLE: LiveRoomStoreState = { session: null, phase: "live" };

export function sameLiveRoom(a: LiveRoomIdentity | null | undefined, b: LiveRoomIdentity | null | undefined): boolean {
  return !!a && !!b && a.kind === b.kind && a.domain === b.domain && a.room === b.room;
}

function sameFields(a: LiveRoomFields, b: LiveRoomFields): boolean {
  return (
    a.title === b.title &&
    a.homePath === b.homePath &&
    a.homeLabel === b.homeLabel &&
    (a.chip ?? null) === (b.chip ?? null) &&
    !!a.coverUp === !!b.coverUp
  );
}

/** join(): idempotent by identity. The SAME live identity with unchanged
 *  fields returns the SAME state object (no render, no remount); changed
 *  fields patch the session in place (the embed keeps playing); the same
 *  identity in "left" is a rejoin (a fresh mount); a different identity
 *  replaces the session outright. */
export function liveRoomJoin(state: LiveRoomStoreState, identity: LiveRoomIdentity, fields: LiveRoomFields): LiveRoomStoreState {
  const prev = state.session;
  if (prev && sameLiveRoom(prev, identity) && state.phase === "live") {
    if (sameFields(prev, fields)) return state;
    return { ...state, session: { ...prev, ...fields } };
  }
  const mountKey = (prev?.mountKey ?? -1) + 1;
  return { session: { ...identity, ...fields, rect: null, mountKey }, phase: "live" };
}

/** reportRect(): the bridge's own box, re-measured on scroll/resize. Only
 *  ever patches the matching live session; an unchanged box returns the
 *  SAME state object (scroll never re-renders when nothing moved). */
export function liveRoomRect(state: LiveRoomStoreState, identity: LiveRoomIdentity, rect: LiveRoomRect): LiveRoomStoreState {
  const prev = state.session;
  if (!prev || !sameLiveRoom(prev, identity)) return state;
  const r = prev.rect;
  if (r && r.top === rect.top && r.left === rect.left && r.width === rect.width && r.height === rect.height) return state;
  return { ...state, session: { ...prev, rect } };
}

/** detach(): the owner unmounted — client navigation, NEVER a leave. The
 *  session keeps playing; only the stage-mode seat is forgotten, so the
 *  dock falls back to the docked modes. */
export function liveRoomDetach(state: LiveRoomStoreState, identity: LiveRoomIdentity): LiveRoomStoreState {
  const prev = state.session;
  if (!prev || !sameLiveRoom(prev, identity) || prev.rect === null) return state;
  return { ...state, session: { ...prev, rect: null } };
}

export interface LiveRoomsValue {
  session: LiveRoomSession | null;
  phase: LiveRoomPhase;
  join: (identity: LiveRoomIdentity, fields: LiveRoomFields, handlers: LiveRoomHandlers) => void;
  reportRect: (identity: LiveRoomIdentity, rect: LiveRoomRect) => void;
  detach: (identity: LiveRoomIdentity) => void;
  /** any end of the room from the guest's side or the embed's own farewell —
   *  phase "left", the rejoin card shows, the owner's onEnded runs. */
  endSession: () => void;
  /** the watch embed's script-load failure — same "left" shape, the owner's
   *  onFailed runs (its honest one-line note). */
  failSession: () => void;
  /** the embed's own join signal, passed through to the owner (TASK-488's
   *  prejoin law — the cover never hides Jitsi's Join button). */
  joinedFromEmbed: (joined: boolean) => void;
  /** the rejoin card's door — a fresh mount of the same room, and the
   *  owner's onRejoin so its left card clears with it. */
  rejoin: () => void;
  /** forget the session entirely (the rejoin card's own close/timeout). */
  dismiss: () => void;
  /** a SERVER-SIDE end (the owner's poll found the door closed) — forget
   *  the session, but only if it still IS that identity: one island's poll
   *  must never kill another room's session. */
  dismissIf: (identity: LiveRoomIdentity | null) => void;
}

const LiveRoomsContext = createContext<LiveRoomsValue | null>(null);

/** null outside the provider — the bridge renders its placeholder alone
 *  under renderToStaticMarkup (the repo's no-jsdom test idiom), so every
 *  existing room-owner render pin keeps working unchanged. */
export function useLiveRooms(): LiveRoomsValue | null {
  return useContext(LiveRoomsContext);
}

export function LiveRoomsProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<LiveRoomStoreState>(LIVE_ROOM_IDLE);
  /* the dock's embed callbacks must be STABLE (both embeds' boot effects
     depend on them — an unstable onEnded re-boots the room, the T-454
     lesson), so event-time reads of the current state go through this
     mirror rather than a closure over state. */
  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);
  /* the owning bridge's handlers, keyed to the current session by join()'s
     own identity law. Deliberately NOT cleared on bridge unmount: the
     dock's rejoin card must still reach the owner's onRejoin after the
     page's left card unmounted the bridge (a stale call into an unmounted
     island is a setState no-op — safe). */
  const handlersRef = useRef<LiveRoomHandlers>({});

  const join = useCallback((identity: LiveRoomIdentity, fields: LiveRoomFields, handlers: LiveRoomHandlers) => {
    handlersRef.current = handlers;
    setState((prev) => liveRoomJoin(prev, identity, fields));
  }, []);

  const reportRect = useCallback((identity: LiveRoomIdentity, rect: LiveRoomRect) => {
    setState((prev) => liveRoomRect(prev, identity, rect));
  }, []);

  const detach = useCallback((identity: LiveRoomIdentity) => {
    setState((prev) => liveRoomDetach(prev, identity));
  }, []);

  const endSession = useCallback(() => {
    const cur = stateRef.current;
    if (!cur.session || cur.phase !== "live") return;
    setState({ session: cur.session, phase: "left" });
    handlersRef.current.onEnded?.();
  }, []);

  const failSession = useCallback(() => {
    const cur = stateRef.current;
    if (!cur.session || cur.phase !== "live") return;
    setState({ session: cur.session, phase: "left" });
    handlersRef.current.onFailed?.();
  }, []);

  const joinedFromEmbed = useCallback((joined: boolean) => {
    handlersRef.current.onJoined?.(joined);
  }, []);

  const rejoin = useCallback(() => {
    const cur = stateRef.current;
    if (!cur.session || cur.phase !== "left") return;
    setState({ session: { ...cur.session, mountKey: cur.session.mountKey + 1 }, phase: "live" });
    handlersRef.current.onRejoin?.();
  }, []);

  const dismiss = useCallback(() => {
    handlersRef.current = {};
    setState(LIVE_ROOM_IDLE);
  }, []);

  const dismissIf = useCallback((identity: LiveRoomIdentity | null) => {
    if (!identity || !sameLiveRoom(stateRef.current.session, identity)) return;
    handlersRef.current = {};
    setState(LIVE_ROOM_IDLE);
  }, []);

  const value = useMemo<LiveRoomsValue>(
    () => ({
      session: state.session,
      phase: state.phase,
      join,
      reportRect,
      detach,
      endSession,
      failSession,
      joinedFromEmbed,
      rejoin,
      dismiss,
      dismissIf,
    }),
    [state, join, reportRect, detach, endSession, failSession, joinedFromEmbed, rejoin, dismiss, dismissIf],
  );

  return <LiveRoomsContext.Provider value={value}>{children}</LiveRoomsContext.Provider>;
}
