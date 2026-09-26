"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { fetchDoorState, openDoor, closeDoor, showCameraDoor, hideCameraDoor, runExclusive, type DoorActionOutcome } from "../RoomsCard";
import type { DoorBusy, DoorConfig, DoorRowState } from "../rooms-config";

/**
 * TASK-486 (block 968,624+) — the SHARED HELPER `/a/site/reading/go/
 * [door]` reuses instead of copying `RoomsCard.tsx`'s own open/close
 * logic. `RoomsCard`'s default export keeps a `Record<string, ...>`
 * across ALL doors (one card, many rows); this page only ever needs ONE
 * door, so the state here is scalar — but every fetch/PUT call rides
 * `RoomsCard.tsx`'s own exported `fetchDoorState`/`openDoor`/`closeDoor`,
 * the exact same publish-then-prepare-fallback chain, never a second
 * copy of it.
 *
 * `open`/`close` RETURN the resulting state (or null on failure) so the
 * page's own "Open and join" button can navigate off the value the PUT
 * just answered with, in the same click, without waiting on a re-render.
 *
 * REVIEW FIX (block 968,624+, T-486): the double-tap race. `busy` state
 * alone doesn't guard a second tap before the next render — both wrap
 * through `RoomsCard.tsx`'s own `runExclusive` and a single
 * `useRef(false)` shared by open+close (one door here, so one lock): a
 * second call while the first is still running returns `null`
 * immediately, never runs `openDoor`/`closeDoor` again.
 *
 * `DoorBusy`/`DoorConfig`/`DoorRowState` come from `../rooms-config.ts`
 * (block 968,624+ blocker fix — the plain module `go/[door]/page.tsx`,
 * a SERVER component, also needs); `fetchDoorState`/`openDoor`/
 * `closeDoor`/`runExclusive` stay on `RoomsCard.tsx` since they are only
 * ever called client-side, here and in `RoomsCard`'s own default
 * export.
 *
 * TASK-487 (block 968,624+, the Admiral's ruling, option C) — TWO
 * additions:
 *   1. `showCamera`/`hideCamera`, the SAME shape as `open`/`close` — they
 *      wrap through the SAME `lockRef` (one door, one lock, shared by
 *      all four actions now — a camera tap can never race an open/close
 *      tap, or another camera tap, on this door), calling
 *      `RoomsCard.tsx`'s own new `showCameraDoor`/`hideCameraDoor`
 *      exports, never a second copy of that PUT chain.
 *   2. Love keeps THIS page open on her phone through the whole reading
 *      day — a one-time mount fetch would show stale buttons the moment
 *      the state changes underneath her (she pressed Open on the desktop
 *      card, or the room self-closed at Denver midnight). `refresh()` now
 *      re-runs on a plain 10-second interval AND on the window's `focus`
 *      event (she switches back to this tab/app after being elsewhere) —
 *      ONE polling mechanism, not two: the interval and the focus
 *      listener both just call the same `refresh()`, never a second
 *      fetch path.
 */
export interface UseDoorRoomResult {
  state: DoorRowState | null;
  busy: DoorBusy;
  error: string | null;
  refresh: () => Promise<void>;
  open: () => Promise<DoorRowState | null>;
  close: () => Promise<DoorRowState | null>;
  showCamera: () => Promise<DoorRowState | null>;
  hideCamera: () => Promise<DoorRowState | null>;
}

const REFRESH_MS = 10_000;

export function useDoorRoom(door: DoorConfig): UseDoorRoomResult {
  const [state, setState] = useState<DoorRowState | null>(null);
  const [busy, setBusy] = useState<DoorBusy>(null);
  const [error, setError] = useState<string | null>(null);
  /* the double-tap race's fix (review, T-486), widened (TASK-487): one
     door, one lock, shared by open/close/showCamera/hideCamera so no two
     of these four can ever run at once for this door. */
  const lockRef = useRef(false);

  /* the ONE read — a GET, never a mutation, safe for an email scanner
     that opens the page's link without a click ever happening */
  const refresh = useCallback(async () => {
    const s = await fetchDoorState(door);
    if (s) setState(s);
  }, [door]);

  /* TASK-487: mount fetch, a 10s interval, AND a window-focus listener —
     all three call the same refresh(), so the phone page never shows
     stale buttons whether Love just opened it, left it running, or came
     back to it. */
  useEffect(() => {
    let alive = true;
    void (async () => {
      await refresh();
    })();
    const id = setInterval(() => {
      if (alive) void refresh();
    }, REFRESH_MS);
    const onFocus = () => {
      if (alive) void refresh();
    };
    window.addEventListener("focus", onFocus);
    return () => {
      alive = false;
      clearInterval(id);
      window.removeEventListener("focus", onFocus);
    };
  }, [refresh]);

  /* TASK-487: open/close/showCamera/hideCamera share this one run-and-
     report shape — the SAME lock, the SAME error/refresh fallback. */
  const runAction = useCallback(
    (label: Exclude<DoorBusy, null>, action: (door: DoorConfig) => Promise<DoorActionOutcome>): Promise<DoorRowState | null> => {
      return runExclusive(lockRef, async () => {
        setBusy(label);
        setError(null);
        try {
          const outcome = await action(door);
          if (outcome.ok) {
            setState(outcome.state);
            return outcome.state;
          }
          setError(outcome.reason);
          await refresh();
          return null;
        } catch {
          setError("the room didn't answer, try again");
          await refresh();
          return null;
        } finally {
          setBusy(null);
        }
      });
    },
    [door, refresh],
  );

  const open = useCallback(() => runAction("open", openDoor), [runAction]);
  const close = useCallback(() => runAction("close", closeDoor), [runAction]);
  const showCamera = useCallback(() => runAction("show-camera", showCameraDoor), [runAction]);
  const hideCamera = useCallback(() => runAction("hide-camera", hideCameraDoor), [runAction]);

  return { state, busy, error, refresh, open, close, showCamera, hideCamera };
}
