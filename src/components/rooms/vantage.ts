"use client";

import { useSyncExternalStore } from "react";

/**
 * THE VANTAGE SWITCHER'S SHARED STATE (loves-desk-and-classroom-plan.md,
 * Lane ROOM, "the no-picking ruling extends to members"): which of the
 * member layouts — Sanctuary / Lesson Path / Circle, plus TASK-123's four
 * restored classroom styles (Video / Materials / People / Stage, each
 * showing the video slot, the materials list, and the people rail in a
 * different arrangement) — a member sees, per-user, persisted the same way
 * CAL's a₿|AD slider is
 * (`src/components/calendar/CalendarPrefs.tsx`): `useSyncExternalStore`
 * over `localStorage`, not `useState`+`useEffect` (the same purity-rule
 * reason CalendarPrefs.tsx and LovesDesk.tsx's own altitude store cite).
 *
 * This page hosts exactly one switcher at a time, so the DOM-attribute
 * mirror CAL's slider uses (to keep several simultaneously-mounted grids
 * in sync) is welcome but not needed here — the brief calls it optional,
 * and localStorage alone is the honest minimum for one control.
 */

export type RoomVantage = "sanctuary" | "lesson" | "circle" | "video" | "materials" | "people" | "stage";

const VANTAGE_KEY = "oc-room-vantage";

/** Honest site-wide fallback — mirrors CAL's `BookingConfig.calendarDefault`
 *  seam. An admin surface may someday write `BookingConfig.
 *  classroomVantageDefault` (booking-time.ts) and this constant steps
 *  aside for it, but NOTHING reads that field yet — first-time visitors
 *  (no localStorage key set) get this constant until that wiring lands. */
export const ROOM_VANTAGE_SITE_DEFAULT: RoomVantage = "sanctuary";

function isVantage(v: string | null): v is RoomVantage {
  return v === "sanctuary" || v === "lesson" || v === "circle"
    || v === "video" || v === "materials" || v === "people" || v === "stage";
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
    const v = localStorage.getItem(VANTAGE_KEY);
    if (isVantage(v)) return v;
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
