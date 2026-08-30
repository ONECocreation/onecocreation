"use client";

import { useEffect, useRef, useState } from "react";
import { useCalendarPrefs } from "./CalendarPrefs";
import "./calendar-view.css";

/**
 * The quiet "Calendar ⌄" popover (Lane CAL, loves-desk plan): the a₿|AD
 * slider (two segments — the dates TRADE PLACES, they don't just re-weight)
 * + the counts on/off switch, with the ruled hint copy verbatim. Drives
 * `CalendarPrefsProvider`'s shared state, so every BftMonthGrid/WeekRibbon
 * under the same provider flips together.
 */
export default function CalendarOptions({ className }: { className?: string }) {
  const { primary, counts, setPrimary, setCounts } = useCalendarPrefs();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className={["cal-options", className].filter(Boolean).join(" ")} ref={rootRef}>
      <button
        type="button"
        className="cal-options__trigger"
        aria-expanded={open}
        aria-haspopup="true"
        onClick={() => setOpen((o) => !o)}
      >
        Calendar <span aria-hidden="true">⌄</span>
      </button>
      {open && (
        <div className="cal-options__panel" role="dialog" aria-label="Calendar display options">
          <div className="cal-slider" role="group" aria-label="Which date leads">
            <button
              type="button"
              className="cal-slider__seg"
              aria-pressed={primary === "bft"}
              onClick={() => setPrimary("bft")}
            >
              a₿
            </button>
            <button
              type="button"
              className="cal-slider__seg"
              aria-pressed={primary === "civil"}
              onClick={() => setPrimary("civil")}
            >
              AD
            </button>
          </div>

          <div className="cal-counts-row">
            <span className="cal-counts-label" id="cal-counts-label">week &amp; day counts</span>
            <button
              type="button"
              className="cal-counts-toggle"
              aria-pressed={counts}
              aria-labelledby="cal-counts-label"
              onClick={() => setCounts(!counts)}
            />
          </div>

          <p className="cal-options__hint">
            a₿ is the block calendar — 13 months of 28 days. AD is the civil calendar. The
            site-wide default is set in /admin; these switches are yours alone.
          </p>
        </div>
      )}
    </div>
  );
}
