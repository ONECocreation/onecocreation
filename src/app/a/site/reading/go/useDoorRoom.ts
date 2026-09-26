"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { fetchDoorState, openDoor, closeDoor, runExclusive } from "../RoomsCard";
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
 */
export interface UseDoorRoomResult {
  state: DoorRowState | null;
  busy: DoorBusy;
  error: string | null;
  refresh: () => Promise<void>;
  open: () => Promise<DoorRowState | null>;
  close: () => Promise<DoorRowState | null>;
}

export function useDoorRoom(door: DoorConfig): UseDoorRoomResult {
  const [state, setState] = useState<DoorRowState | null>(null);
  const [busy, setBusy] = useState<DoorBusy>(null);
  const [error, setError] = useState<string | null>(null);
  /* the double-tap race's fix (review, T-486): one door, one lock,
     shared by open AND close so neither can run while the other is
     still in flight. */
  const lockRef = useRef(false);

  /* the ONE read — a GET, never a mutation, safe for an email scanner
     that opens the page's link without a click ever happening */
  const refresh = useCallback(async () => {
    const s = await fetchDoorState(door);
    if (s) setState(s);
  }, [door]);

  useEffect(() => {
    void (async () => {
      await refresh();
    })();
  }, [refresh]);

  const open = useCallback(async (): Promise<DoorRowState | null> => {
    return runExclusive(lockRef, async () => {
      setBusy("open");
      setError(null);
      try {
        const outcome = await openDoor(door);
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
  }, [door, refresh]);

  const close = useCallback(async (): Promise<DoorRowState | null> => {
    return runExclusive(lockRef, async () => {
      setBusy("close");
      setError(null);
      try {
        const outcome = await closeDoor(door);
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
  }, [door, refresh]);

  return { state, busy, error, refresh, open, close };
}
