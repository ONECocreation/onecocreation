"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import type { ReadingPart } from "@/lib/reading-parts";

/**
 * THE SHARED "WHICH PART IS ON THE TOP SCREEN" STATE (TASK-473, block
 * 968,624) — one client-side selection, read by the agenda rows
 * (`ReadingPartSelectLink`, `ReadingDayOpenNotice`) and by the stage
 * itself (`ReadingStageDeck`). `/reading/page.tsx` is a server component,
 * so this Provider is the ONE client boundary that wraps both the stage
 * section and the agenda section — everything inside either one can read
 * or change the selection without a page navigation ("no page change,"
 * the ruling's own words).
 *
 * `defaultPart` (the Provider's own prop) is computed server-side ONCE,
 * at first paint (`defaultReadingPart()`, reading-parts.ts) — the
 * selection never silently re-defaults itself later; a door opening after
 * load only changes the row's own notice/label (item 3), never yanks the
 * visitor's own pick out from under them.
 */

interface ReadingPartValue {
  selected: ReadingPart;
  select: (part: ReadingPart) => void;
}

const ReadingPartCtx = createContext<ReadingPartValue | null>(null);

/** A component that reads the selection outside any Provider (every
 *  existing `renderToStaticMarkup` pin across the reading surface renders
 *  `ReadingStageBody`/`ReadingDayBody` bare, no Provider, and that pattern
 *  is the house's own testability law — never broken here) gets Part 1,
 *  inert. Real pages always sit inside `ReadingPartProvider`. */
const NO_PROVIDER: ReadingPartValue = { selected: 1, select: () => {} };

export function ReadingPartProvider({
  defaultPart,
  children,
}: {
  defaultPart: ReadingPart;
  /** optional in the TYPE only (createElement's own overload resolution —
   *  see ReadingPartSelectLink's identical note); every real page always
   *  wraps real content. */
  children?: ReactNode;
}) {
  const [selected, setSelected] = useState<ReadingPart>(defaultPart);
  return <ReadingPartCtx.Provider value={{ selected, select: setSelected }}>{children}</ReadingPartCtx.Provider>;
}

export function useReadingPart(): ReadingPartValue {
  return useContext(ReadingPartCtx) ?? NO_PROVIDER;
}
