"use client";

import type { ReactNode } from "react";
import { useReadingPart } from "./ReadingPartContext";
import type { ReadingPart } from "@/lib/reading-parts";

/**
 * THE AGENDA ROW'S OWN TIME BUTTON (TASK-473, block 968,624) — "the
 * agenda rows' buttons ARE the time buttons. Each row's button selects
 * that part for the top screen (#stage) on /reading, client side, no page
 * change." An `<a href="#stage">` (not a `<button>`): with JavaScript it
 * selects the part AND jumps to the stage in one click; without it, the
 * anchor alone still lands the visitor on the stage section (graceful
 * degrade, never a dead control). `children` carries whatever the caller
 * already renders inside a button (the lock icon plus words, the exact
 * shape `ReadingDayUnlockButton`/the old ended-card Link already used) —
 * never re-typed as a bare string prop.
 */
export default function ReadingPartSelectLink({
  part,
  ariaLabel,
  children,
}: {
  part: ReadingPart;
  ariaLabel?: string;
  /** optional in the TYPE only (createElement's own overload resolution
   *  needs this to accept children as trailing arguments, the
   *  `react/no-children-prop` shape every call site here uses) — every
   *  real call site always gives real content. */
  children?: ReactNode;
}) {
  const { select } = useReadingPart();
  return (
    <a className="kit-btn kit-btn-main kit-btn-sm" href="#stage" aria-label={ariaLabel} onClick={() => select(part)}>
      {children}
    </a>
  );
}
