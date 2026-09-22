"use client";

import { useSyncExternalStore } from "react";
import { opensOnStage } from "@/lib/reading-room";

/**
 * THE VANTAGE SWITCHER'S SHARED STATE — which of the THREE member vantages
 * (TASK-184, 0018.06.18 a₿ · the Admiral's three-rooms ruling: "we seem to
 * have too many rooms for each class") a member sees: **Stage** (the Video
 * layout wins — the live embed, the chat beside it, who's-here folded in as
 * the roster), **Lesson Path** (recordings + previous sessions + the
 * Materials merged in as the resources list), **The Circle** (the calendar:
 * the weekly ribbon first, the month under it). Per-user, persisted the
 * same way CAL's a₿|AD slider is
 * (`src/components/calendar/CalendarPrefs.tsx`): `useSyncExternalStore`
 * over `localStorage`, not `useState`+`useEffect`.
 *
 * THE RETIRED FOUR RESOLVE, NEVER 404 (the ruling: "a vantage param that no
 * longer exists lands on the Stage"): a member whose localStorage still
 * holds Sanctuary / Video / Materials / People — the vantages TASK-123/149
 * shipped — lands on the Stage (`resolveVantage` below, pinned in
 * tests/classroom-three-rooms.test.ts). The stored key itself is rewritten
 * on the member's next pick; the resolution is read-side, so no saved link
 * or stale store ever dead-ends.
 */

export type RoomVantage = "stage" | "lesson" | "circle";

/** The four retired vantages (Sanctuary, Video, Materials, People) all
 *  resolve to the Stage — the ruling's own words. */
const RETIRED_TO_STAGE = new Set(["sanctuary", "video", "materials", "people"]);

const VANTAGE_KEY = "oc-room-vantage";

/** Honest site-wide fallback — mirrors CAL's `BookingConfig.calendarDefault`
 *  seam. An admin surface may someday write `BookingConfig.
 *  classroomVantageDefault` (booking-time.ts) and this constant steps
 *  aside for it, but NOTHING reads that field yet — first-time visitors
 *  (no localStorage key set) get this constant until that wiring lands.
 *
 *  TASK-149 (0018.06.17 a₿, from Love's meeting): the classroom opens on
 *  the STAGE — the default vantage for class rooms AND the reading room.
 *  TASK-184 keeps it: the bare `/rooms/<slug>` IS the Stage's address. */
export const ROOM_VANTAGE_SITE_DEFAULT: RoomVantage = "stage";

/** The ONE vantage resolution: the three live vantages pass through, a
 *  retired vantage lands on the Stage, anything else (or nothing) falls to
 *  the site default. Pure — tests pin it. */
export function resolveVantage(v: string | null): RoomVantage {
  if (v === "stage" || v === "lesson" || v === "circle") return v;
  if (v && RETIRED_TO_STAGE.has(v)) return "stage";
  return ROOM_VANTAGE_SITE_DEFAULT;
}

const listeners = new Set<() => void>();
function notify() {
  for (const l of listeners) l();
}
function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function readVantage(): RoomVantage {
  try {
    return resolveVantage(localStorage.getItem(VANTAGE_KEY));
  } catch {
    /* private mode */
  }
  return ROOM_VANTAGE_SITE_DEFAULT;
}
function readServerVantage(): RoomVantage {
  return ROOM_VANTAGE_SITE_DEFAULT; // SSR has no localStorage
}

/** What the member explicitly picked, and where — in-memory only, never
 *  localStorage. Carries the VANTAGE itself, not just "someone clicked
 *  here" — so the pick still visibly wins for the rest of this visit
 *  even when the write below silently fails (private mode). */
export interface PinnedVisit {
  pathname: string;
  vantage: RoomVantage;
}

/** THE ARRIVAL RULE (T-384): a pin for THIS EXACT pathname always wins
 *  (the member's own recent pick, whether or not it persisted); failing
 *  that, the reading room opens on the Stage; failing that, whatever is
 *  actually stored. A pin for a DIFFERENT pathname — stale, not yet
 *  cleared, or simply another room — never applies; the equality check
 *  is the whole guard, and it is what keeps every other room untouched. */
export function vantageFor(input: { pathname: string; stored: RoomVantage; pinned: PinnedVisit | null }): RoomVantage {
  if (input.pinned && input.pinned.pathname === input.pathname) return input.pinned.vantage;
  return opensOnStage(input.pathname) ? "stage" : input.stored;
}

export interface StorageLike {
  get(): string | null;
  set(v: string): void;
}

/** Reference-counts how many mounted useRoomVantage() instances are
 *  currently standing on a given pathname (ClassroomView's own call AND
 *  VantageSwitcher's, both mounted on the SAME room) — a pin for that
 *  pathname is cleared only once the LAST of them leaves, so neither
 *  instance's own cleanup can erase it out from under the other. */
export function createVisitStore(storage: StorageLike) {
  const owners = new Map<string, number>();
  let pinned: PinnedVisit | null = null;

  // The ordering this owner count relies on: React mounts and unmounts
  // BOTH useRoomVantage() instances on a page (ClassroomView's own call
  // and VantageSwitcher's) together — a visit's two arrive() calls land
  // together, and its two depart() calls land together, before a LATER
  // visit to the same pathname ever calls arrive() again. So a stale
  // depart() echo from an already-closed visit can never be mistaken for
  // the last owner of a fresh, newly-arrived visit — no generation tag is
  // needed to tell the two apart (named residual, Number One, block
  // 968,061: this ordering is relied on, not re-proven by more machinery).

  function arrive(pathname: string): void {
    owners.set(pathname, (owners.get(pathname) ?? 0) + 1);
  }

  function depart(pathname: string): void {
    const next = (owners.get(pathname) ?? 0) - 1;
    if (next > 0) {
      owners.set(pathname, next);
      return;
    }
    owners.delete(pathname);
    // the LAST instance standing on this pathname just left — a pin for
    // it belongs to the visit that just ended and must not outlive it,
    // or a LATER, fresh arrival at the same room would wrongly find it
    // still standing guard and stay off the Stage
    if (pinned && pinned.pathname === pathname) pinned = null;
  }

  function pick(pathname: string, vantage: RoomVantage): void {
    try {
      storage.set(vantage);
    } catch {
      /* private mode — pinned below still carries the click for this
         visit, so the tab still visibly wins even though nothing persisted */
    }
    pinned = { pathname, vantage };
  }

  function resolve(pathname: string): RoomVantage {
    return vantageFor({ pathname, stored: resolveVantage(storage.get()), pinned });
  }

  function snapshot(): PinnedVisit | null {
    return pinned;
  }

  return { arrive, depart, pick, resolve, snapshot };
}

/** The one production singleton, wired to the exact same key readVantage/
 *  readServerVantage already read. */
const store = createVisitStore({
  get: () => {
    try {
      return localStorage.getItem(VANTAGE_KEY);
    } catch {
      return null; // private mode — resolveVantage(null) falls to the site default
    }
  },
  set: (v) => localStorage.setItem(VANTAGE_KEY, v), // pick() is what catches a throw
});

/** Reads the member's vantage choice + a setter. Standalone — no Provider
 *  needed, matching `useCalendarPrefs`'s own provider-less fallback shape. */
export function useRoomVantage(): [RoomVantage, (next: RoomVantage) => void] {
  const vantage = useSyncExternalStore(subscribe, readVantage, readServerVantage);
  function setVantage(next: RoomVantage) {
    try {
      localStorage.setItem(VANTAGE_KEY, next);
    } catch {
      /* private mode */
    }
    notify();
  }
  return [vantage, setVantage];
}
