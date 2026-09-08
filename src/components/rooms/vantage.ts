"use client";

import { useSyncExternalStore } from "react";

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
