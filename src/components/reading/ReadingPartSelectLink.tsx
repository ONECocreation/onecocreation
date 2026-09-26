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
 *
 * Fix round (same block, the Admiral's Chrome walk) — "the agenda buttons
 * are the picker, so the chosen one must shine": `variant="button"` (the
 * default, every agenda row and the ended card's own pick) reads
 * `selected` off the shared context and wears `kit-btn-main` (shining)
 * when it names the CURRENTLY selected part, `kit-btn-second` otherwise —
 * plus `aria-current="true"` on the shining one, an honest a11y signal a
 * screen reader can act on. `.kit-day .kit-rows-end>.kit-btn` (kit.css)
 * already caps every `.kit-btn` at one width regardless of which variant
 * class rides alongside it — no new CSS. `variant="quiet"` (the notice
 * line's own "Pick it below") is the SAME select+anchor behavior with NO
 * button chrome at all — a bare inline link, since a courtesy line is not
 * a second control competing with the rows themselves.
 */
export default function ReadingPartSelectLink({
  part,
  ariaLabel,
  variant = "button",
  children,
}: {
  part: ReadingPart;
  ariaLabel?: string;
  variant?: "button" | "quiet";
  /** optional in the TYPE only (createElement's own overload resolution
   *  needs this to accept children as trailing arguments, the
   *  `react/no-children-prop` shape every call site here uses) — every
   *  real call site always gives real content. */
  children?: ReactNode;
}) {
  const { selected, select } = useReadingPart();
  const isSelected = selected === part;
  const className =
    variant === "quiet" ? undefined : `kit-btn ${isSelected ? "kit-btn-main" : "kit-btn-second"} kit-btn-sm`;
  return (
    <a
      className={className}
      href="#stage"
      aria-label={ariaLabel}
      aria-current={isSelected ? "true" : undefined}
      onClick={() => select(part)}
    >
      {children}
    </a>
  );
}
