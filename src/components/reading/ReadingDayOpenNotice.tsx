"use client";

import { useEffect, useState } from "react";
import { useReadingPart } from "./ReadingPartContext";
import { openDoorNotice, CLOSED_FLAGS, type OpenFlags } from "@/lib/reading-parts";

/**
 * "THE NEXT ROOM IS OPEN" (TASK-473, block 968,624, item 3's OR clause —
 * "a single line above the agenda naming the time"). Polls the three
 * public status routes the stage itself polls: `/api/stage1`,
 * `/api/stage2`, and `/api/qa-door` (T-475, a separate lane, mirrors
 * `/api/stage2` verbatim — see `ReadingStageDoor.tsx`'s own docblock). A
 * 404 (T-475 not landed yet) or any failed read simply keeps Part 4's own
 * flag closed, the same honest default `ReadingStageDoor` keeps. Shows
 * ONE quiet line naming whichever door just opened — but only when it
 * ISN'T the part the visitor is already looking at (`openDoorNotice`,
 * reading-parts.ts). Nothing here ever names a room; these routes already
 * answer safely to a signed-out visitor (the /api/stage2 law).
 */

const POLL_MS = 20_000;

export default function ReadingDayOpenNotice() {
  const { selected } = useReadingPart();
  const [flags, setFlags] = useState<OpenFlags>(CLOSED_FLAGS);

  useEffect(() => {
    let alive = true;
    function poll() {
      Promise.all([
        fetch("/api/stage1", { cache: "no-store" }).then((r) => (r.ok ? r.json() : null)).catch(() => null),
        fetch("/api/stage2", { cache: "no-store" }).then((r) => (r.ok ? r.json() : null)).catch(() => null),
        fetch("/api/qa-door", { cache: "no-store" }).then((r) => (r.ok ? r.json() : null)).catch(() => null),
      ]).then(([s1, s2, qa]) => {
        if (!alive) return;
        const open1 = s1?.ok ? s1.phase === "published" : false;
        const open3 = s2?.ok ? s2.open === true : false;
        const open4 = qa?.ok ? qa.open === true : false;
        setFlags({ part1: open1, part2: open1, part3: open3, part4: open4 });
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
  if (!notice) return null;
  return <p className="kit-text-quiet">{notice}</p>;
}
