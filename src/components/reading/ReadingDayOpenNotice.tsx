"use client";

import { useEffect, useState } from "react";
import { useReadingPart } from "./ReadingPartContext";
import ReadingPartSelectLink from "./ReadingPartSelectLink";
import { openDoorNotice, CLOSED_FLAGS, type OpenFlags, type OpenDoorNotice } from "@/lib/reading-parts";

/**
 * "THE NEXT ROOM IS OPEN" (TASK-473, block 968,624, item 3's OR clause —
 * "a single line above the agenda naming the time"). Polls the four
 * public status routes the stage itself polls: `/api/housewarming-door`
 * (TASK-481, block 968,624+ — Part 1's own door now, never Stage 1's),
 * `/api/stage1` (Part 2 alone), `/api/stage2`, and `/api/qa-door` (T-475,
 * mirrors `/api/stage2` verbatim — see `ReadingStageDoor.tsx`'s own
 * docblock). A 404 or any failed read simply keeps that part's own flag
 * closed, the same honest default `ReadingStageDoor` keeps. Shows ONE
 * quiet line naming whichever door just opened — but only when it ISN'T
 * the part the visitor is already looking at (`openDoorNotice`,
 * reading-parts.ts). Nothing here ever names a room; these routes already
 * answer safely to a signed-out visitor (the /api/stage2 law).
 *
 * Fix round (same block) — this line sits ABOVE the rows, so its own
 * words say "below" now (they used to say "above," backwards); "Pick it
 * below" is a real in-page pick (`ReadingPartSelectLink`, `variant="quiet"`
 * — a bare inline anchor, not a full button, so it reads as a courtesy
 * line, not a second control competing with the rows themselves).
 *
 * `ReadingDayOpenNoticeBody` is the pure presentation (renderToStaticMarkup
 * tests, since a bare poll-driven state never fires under SSR); the
 * default export owns the polling — the same split every other reading
 * component keeps.
 */

export function ReadingDayOpenNoticeBody({ notice }: { notice: OpenDoorNotice | null }) {
  if (!notice) return null;
  return (
    <p className="kit-text-quiet">
      {`Now open: ${notice.title}. `}
      <ReadingPartSelectLink part={notice.part} variant="quiet">
        Pick it below
      </ReadingPartSelectLink>
      {" to join."}
    </p>
  );
}

const POLL_MS = 20_000;

export default function ReadingDayOpenNotice() {
  const { selected } = useReadingPart();
  const [flags, setFlags] = useState<OpenFlags>(CLOSED_FLAGS);

  useEffect(() => {
    let alive = true;
    function poll() {
      Promise.all([
        fetch("/api/housewarming-door", { cache: "no-store" }).then((r) => (r.ok ? r.json() : null)).catch(() => null),
        fetch("/api/stage1", { cache: "no-store" }).then((r) => (r.ok ? r.json() : null)).catch(() => null),
        fetch("/api/stage2", { cache: "no-store" }).then((r) => (r.ok ? r.json() : null)).catch(() => null),
        fetch("/api/qa-door", { cache: "no-store" }).then((r) => (r.ok ? r.json() : null)).catch(() => null),
      ]).then(([hw, s1, s2, qa]) => {
        if (!alive) return;
        /* TASK-481: Part 1's own flag reads the Housewarming door now —
           never Stage 1's `phase`, which is Part 2's own truth alone. */
        const open1 = hw?.ok ? hw.open === true : false;
        const open2 = s1?.ok ? s1.phase === "published" : false;
        const open3 = s2?.ok ? s2.open === true : false;
        const open4 = qa?.ok ? qa.open === true : false;
        setFlags({ part1: open1, part2: open2, part3: open3, part4: open4 });
      });
    }
    poll();
    const id = setInterval(poll, POLL_MS);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);

  const notice = openDoorNotice(flags, selected);
  return <ReadingDayOpenNoticeBody notice={notice} />;
}
