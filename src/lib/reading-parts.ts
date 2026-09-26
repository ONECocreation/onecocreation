/**
 * THE FOUR PARTS OF THE READING DAY, AS ONE SELECTABLE SCREEN (TASK-473,
 * block 968,624, the Admiral's flow ruling) — "there will be an agenda
 * item that shows what time each class is. for the end user they will
 * stay on /reading ... users can have a button that shows the next room
 * is open" / "just have the users pick the button for the time and the
 * video changes to the correct one."
 *
 * Parts 1 and 2 (12:12, 1:11) share ONE door — Stage 1 — so they are
 * separate PARTS (separate agenda rows, separate clock words) but never a
 * separate OPEN/CLOSED truth: both read Stage 1's own phase. Part 3
 * (2:22) is Stage 2's door; Part 4 (3:33) is the Q&A's own door (the
 * site-wide live flag, `src/lib/live.ts`, targeting the Q&A's room).
 *
 * Pure, isomorphic (server default-selection math AND the client's
 * courtesy notice both import this file) — no fetch, no Date.now() inside
 * either function; every clock read is the caller's own.
 */

export type ReadingPart = 1 | 2 | 3 | 4;

export interface PartDoorInfo {
  part: ReadingPart;
  /** the visible title used only by the notice line below — never the
   *  row's own bold text (ReadingDayBody owns that separately) */
  title: string;
  startsAtMs: number;
  open: boolean;
  /** unix MILLISECONDS this door was last published; null while closed,
   *  or when the source has no timestamp of its own */
  openedAtMs: number | null;
}

/**
 * Default selection (the Admiral's ruling, restated in ACTIONS.md item
 * 2): "the part whose door is open (the latest opened), else the next
 * part by time." Ties among open doors break on `openedAtMs` (later
 * wins); with nothing open, the soonest upcoming `startsAtMs` wins, and
 * once every part's time has already passed today this falls back to the
 * day's own first part — next week's occurrence starts the cycle over.
 */
export function defaultReadingPart(doors: PartDoorInfo[], nowMs: number): ReadingPart {
  const open = doors.filter((d) => d.open);
  if (open.length > 0) {
    return open.reduce((latest, d) => ((d.openedAtMs ?? 0) > (latest.openedAtMs ?? 0) ? d : latest)).part;
  }
  const upcoming = doors.filter((d) => d.startsAtMs >= nowMs).sort((a, b) => a.startsAtMs - b.startsAtMs);
  return (upcoming[0] ?? doors[0])?.part ?? 1;
}

/** The client poll's own lightweight door flags — no timestamps (the
 *  public status routes don't carry one for every source), just "is this
 *  part's door open right now." Parts 1 and 2 always carry the SAME value
 *  (Stage 1's one door). */
export interface OpenFlags {
  part1: boolean;
  part2: boolean;
  part3: boolean;
  part4: boolean;
}

export const CLOSED_FLAGS: OpenFlags = { part1: false, part2: false, part3: false, part4: false };

/** Exported (fix round, block 968,624): `ReadingDayOpenNotice` builds the
 *  notice's own words directly from this — never a second literal. */
export const PART_TITLES: Record<ReadingPart, string> = {
  1: "The Housewarming",
  2: "The Reading",
  3: "The Book Talk",
  4: "The Q&A",
};

/** Which open door to name in the notice — the highest-numbered open part
 *  (Love opens parts in order through the day, so "highest open" reads as
 *  "most recently opened" without needing a live timestamp). */
export function latestOpenPart(flags: OpenFlags): ReadingPart | null {
  if (flags.part4) return 4;
  if (flags.part3) return 3;
  if (flags.part2) return 2;
  if (flags.part1) return 1;
  return null;
}

/** "The next room is open" (block 968,624, item 3's own OR clause: "a
 *  single line above the agenda naming the time") — the part named plus
 *  its title, so the CALLER (a client component, `ReadingDayOpenNotice`)
 *  can render a real in-page pick alongside the words (fix round, same
 *  block: the notice sits ABOVE the rows, so its own words must say
 *  "below," and "Pick it below" is now a direct `ReadingPartSelectLink`,
 *  never bare prose — this function hands back the part to pick, not a
 *  finished string). Null when nothing is open, or when the only open
 *  door is the one already selected — the visitor is already looking at
 *  it, no notice needed. */
export interface OpenDoorNotice {
  part: ReadingPart;
  title: string;
}

export function openDoorNotice(flags: OpenFlags, selected: ReadingPart): OpenDoorNotice | null {
  const latest = latestOpenPart(flags);
  if (latest === null || latest === selected) return null;
  return { part: latest, title: PART_TITLES[latest] };
}
