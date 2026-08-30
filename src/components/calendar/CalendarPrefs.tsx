"use client";

import { createContext, useContext, useSyncExternalStore, type ReactNode } from "react";

/**
 * The a₿|AD slider's shared state (Lane CAL, loves-desk plan): "the two
 * dates TRADE PLACES, not just weight" — one switch drives every calendar
 * on the page at once, per-user, persisted the same way `oc-theme` is
 * (src/components/ThemeLantern.tsx + the boot script in src/app/layout.tsx):
 * dark/bft is the unmarked default (absence of the attribute), the other
 * state is the one explicit `data-oc-cal-*` attribute — write-through to
 * localStorage, read back from the DOM on mount so SSR and the client
 * never disagree.
 *
 * SITE-WIDE DEFAULT SEAM (honest scope note): `/admin` setting a site-wide
 * default is ruled but not built here — `BookingConfig.calendarDefault`
 * (src/lib/booking-time.ts) is the seam an admin surface will eventually
 * write; nothing reads it into this provider yet, so first-time visitors
 * (no localStorage key set) get the constant `SITE_DEFAULT_*` below until
 * that wiring lands.
 */

export type CalendarPrimary = "bft" | "civil";

export interface CalendarPrefs {
  /** which date leads: "bft" (a₿ primary-left, the default) or "civil" (AD primary-left) */
  primary: CalendarPrimary;
  /** week-of-year + day-of-year counts, default off */
  counts: boolean;
  setPrimary: (next: CalendarPrimary) => void;
  setCounts: (next: boolean) => void;
}

const PRIMARY_KEY = "oc-cal-primary";
const COUNTS_KEY = "oc-cal-counts";

/** honest constant fallback — see the seam note above */
const SITE_DEFAULT_PRIMARY: CalendarPrimary = "bft";
const SITE_DEFAULT_COUNTS = false;

/** Flash-free pre-paint boot script, same shape as oc-theme's own (layout.tsx)
 *  — drop verbatim into a `<script dangerouslySetInnerHTML>` in the root
 *  layout, after the oc-theme script. "bft"/counts-off stay the unmarked
 *  default (no attribute written) so a first-time visitor's SSR HTML
 *  already matches what CalendarPrefsProvider settles on after mount. */
export const CALENDAR_PREFS_BOOT_SCRIPT =
  "try{" +
  "var p=localStorage.getItem('oc-cal-primary');" +
  "if(p==='civil')document.documentElement.setAttribute('data-oc-cal-primary','civil');" +
  "var c=localStorage.getItem('oc-cal-counts');" +
  "if(c==='on')document.documentElement.setAttribute('data-oc-cal-counts','on');" +
  "}catch(e){}";

/* The DOM attributes ARE the store — `document.documentElement`'s
   `data-oc-cal-*` pair, the same source the boot script writes pre-paint
   and `setPrimary`/`setCounts` write on every change. `useSyncExternalStore`
   (not useState+useEffect) reads it: this is the officially-blessed shape
   for "a value that lives outside React and can change from more than one
   place" — a plain useEffect-synced useState trips the
   react-hooks/set-state-in-effect purity rule (as ThemeLantern.tsx's own
   identical-shaped effect already does, uncorrected) and, worse, doesn't
   naturally keep two OTHER mounted calendar surfaces in sync with a click
   in a third when there's no shared Provider between them — the store
   subscription does both for free. */
type Listener = () => void;
const listeners = new Set<Listener>();
function notify() {
  for (const l of listeners) l();
}
function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getPrimarySnapshot(): CalendarPrimary {
  return document.documentElement.getAttribute("data-oc-cal-primary") === "civil" ? "civil" : SITE_DEFAULT_PRIMARY;
}
function getCountsSnapshot(): boolean {
  return document.documentElement.getAttribute("data-oc-cal-counts") === "on";
}
function getServerPrimarySnapshot(): CalendarPrimary {
  return SITE_DEFAULT_PRIMARY; // SSR has no DOM; matches the boot script's unmarked default
}
function getServerCountsSnapshot(): boolean {
  return SITE_DEFAULT_COUNTS;
}

/** The read/write core, shared by the provider and the provider-less
 *  fallback below — one implementation, two doors in. */
function useCalendarPrefsState(): CalendarPrefs {
  const primary = useSyncExternalStore(subscribe, getPrimarySnapshot, getServerPrimarySnapshot);
  const counts = useSyncExternalStore(subscribe, getCountsSnapshot, getServerCountsSnapshot);

  function setPrimary(next: CalendarPrimary) {
    if (next === "civil") document.documentElement.setAttribute("data-oc-cal-primary", "civil");
    else document.documentElement.removeAttribute("data-oc-cal-primary");
    try { localStorage.setItem(PRIMARY_KEY, next); } catch { /* private mode */ }
    notify();
  }

  function setCounts(next: boolean) {
    if (next) document.documentElement.setAttribute("data-oc-cal-counts", "on");
    else document.documentElement.removeAttribute("data-oc-cal-counts");
    try { localStorage.setItem(COUNTS_KEY, next ? "on" : "off"); } catch { /* private mode */ }
    notify();
  }

  return { primary, counts, setPrimary, setCounts };
}

const CalendarPrefsContext = createContext<CalendarPrefs | null>(null);

/** Wrap any subtree that hosts more than one calendar surface so the
 *  slider drives them all at once (the Month/Week/Day altitudes of Love's
 *  Desk, a member layout's calendar + a room's mini-calendar, ...). */
export function CalendarPrefsProvider({ children }: { children: ReactNode }) {
  const prefs = useCalendarPrefsState();
  return <CalendarPrefsContext.Provider value={prefs}>{children}</CalendarPrefsContext.Provider>;
}

/** Reads the shared a₿|AD + counts preference. Works even without a
 *  `CalendarPrefsProvider` above it (falls back to its own local
 *  instance) so a single BftMonthGrid/WeekRibbon can be dropped in
 *  standalone — but a page with more than one calendar surface should
 *  wrap them in one Provider or their sliders won't stay in sync. */
export function useCalendarPrefs(): CalendarPrefs {
  const ctx = useContext(CalendarPrefsContext);
  // always called (never behind a branch) so this stays rules-of-hooks
  // clean even though its result is only used when ctx is absent
  const fallback = useCalendarPrefsState();
  return ctx ?? fallback;
}
