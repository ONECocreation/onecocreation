"use client";

import { useEffect, useState } from "react";
import type { ReadingSchedule } from "@/lib/reading-schedule";
import { normalizeHousewarmingResponse, normalizeReadingResponse } from "./reading-marks";

/**
 * TASK-385, Named decision B — the ONE shared fetch for the weekly reading
 * schedule, written once here, called by both CircleView and MemberCalendar
 * so the fetch idiom is never copy-pasted. Reads the existing PUBLIC
 * `GET /api/admin/site` (no operator cookie needed — `NavMenu.tsx`'s own
 * docblock: "switches ride the public half of /api/admin/site... a member-
 * facing client component needing a switches field without pulling a
 * server-only import chain into the client bundle"), the same fetch idiom
 * `NavMenu.tsx` and `SiteFooter.tsx` already use.
 *
 * The hook itself carries no branching logic, only I/O and the one call —
 * `normalizeReadingResponse` (reading-marks.ts) owns every decision about
 * what the response means. `null` while unresolved, on a failed fetch, or
 * on a malformed/absent-and-invalid response — no mark is the honest
 * default; the calendar is not the place to report a network hiccup.
 */
export function useReadingSchedule(): ReadingSchedule | null {
  const [schedule, setSchedule] = useState<ReadingSchedule | null>(null);

  useEffect(() => {
    let alive = true;
    fetch("/api/admin/site", { cache: "no-store" })
      .then(async (r) => {
        const body = await r.json().catch(() => null);
        if (alive) setSchedule(normalizeReadingResponse(r.status, body));
      })
      .catch(() => {
        if (alive) setSchedule(null);
      });
    return () => {
      alive = false;
    };
  }, []);

  return schedule;
}

/**
 * TASK-499 (block 969,306+) — the sibling fetch for the Housewarming
 * switch, the same public GET /api/admin/site, so MemberCalendar drops
 * the part-1 pill in a no-Housewarming week. The default is ON in every
 * unresolved or failed state (initial, failed fetch, malformed body —
 * normalizeHousewarmingResponse's own law): the calendar failing to
 * learn the switch must never hide a part that exists.
 */
export function useHousewarmingOn(): boolean {
  const [on, setOn] = useState(true);

  useEffect(() => {
    let alive = true;
    fetch("/api/admin/site", { cache: "no-store" })
      .then(async (r) => {
        const body = await r.json().catch(() => null);
        if (alive) setOn(normalizeHousewarmingResponse(r.status, body));
      })
      .catch(() => {
        if (alive) setOn(true);
      });
    return () => {
      alive = false;
    };
  }, []);

  return on;
}
