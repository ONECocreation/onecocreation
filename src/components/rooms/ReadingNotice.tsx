"use client";

import { useEffect, useState } from "react";
import Card from "@/components/kit/Card";
import Countdown from "@/components/studio-overlay/Countdown";
import { nextReading, type ReadingSchedule } from "@/lib/reading-schedule";

/**
 * THE READING NOTICE (TASK-382, block 968,061) — a slim kit-card above the
 * Stage, reading T-381's `ReadingSchedule` source. Mounted from
 * ClassroomView.tsx (Ground: an earlier draft mounted it from the SERVER
 * page; Number One's ruling threads a serialisable prop through
 * ClassroomView instead, which already knows `thisRoomLive` — no new poll,
 * no new KV read) and gated OUT the instant the room's own live poll says
 * Love is live.
 *
 * FOUR HONEST STATES, keyed off `noticeState(...).kind` — never a stored
 * `next.phase` (RULED — ROLLOVER, Astra point 2): a phase frozen at render
 * could never become "window" when an upcoming reading starts, nor advance
 * past a passed `endsAtMs`. `noticeState` calls `nextReading` fresh every
 * time it runs, never a fixed 7-day step.
 *
 * DETERMINISTIC HYDRATION (RULED, Astra point 3): the FIRST paint — server
 * and the matching first client paint alike — reads ONLY the server
 * snapshot (`schedule`/`next`/`asOfMs`), never `Date.now()` during render.
 * The visitor's own local time is simply ABSENT from that first paint and
 * added by a post-mount effect (never rendered-then-suppressed the way
 * Countdown's own one-second seam is — that precedent doesn't cover a text
 * node crossing a whole state boundary between server and client). The
 * same effect arms ROLLOVER's boundary timer and re-checks on
 * `visibilitychange` (a suspended tab resuming after its occurrence
 * already expired).
 */

export interface ReadingNoticeProps {
  schedule: ReadingSchedule;
  next: { startsAtMs: number; endsAtMs: number } | null;
  asOfMs: number;
}

/** The four honest states (Tests, RULED block 968,061) — a discriminated
 *  union rather than a flat shape with "meaningless when off" numbers: an
 *  `off` notice has nothing scheduled to carry start/end instants for. */
export type NoticeState =
  | { kind: "off" }
  | { kind: "upcoming"; startsAtMs: number; endsAtMs: number }
  | { kind: "soon"; startsAtMs: number; endsAtMs: number }
  | { kind: "window"; startsAtMs: number; endsAtMs: number };

const ONE_DAY_MS = 24 * 3600_000;

/** Buckets an already-derived occurrence (or none) against a clock reading —
 *  the one place both `noticeState` (schedule-driven, below) and the
 *  component's own first paint (prop-driven — the server already ran
 *  `nextReading` once; re-deriving it again during the initial client
 *  render would risk a hydration mismatch if the two Intl/ICU builds ever
 *  disagreed, so the first paint sticks to the numbers it was handed)
 *  agree on what "soon"/"window" means. */
function bucketOccurrence(
  occurrence: { startsAtMs: number; endsAtMs: number } | null,
  nowMs: number,
): NoticeState {
  if (!occurrence) return { kind: "off" };
  const { startsAtMs, endsAtMs } = occurrence;
  if (nowMs >= startsAtMs && nowMs < endsAtMs) return { kind: "window", startsAtMs, endsAtMs };
  return { kind: startsAtMs - nowMs <= ONE_DAY_MS ? "soon" : "upcoming", startsAtMs, endsAtMs };
}

/**
 * The one exported pure boundary function (RULED — TESTS, Astra point 4):
 * schedule + an explicit clock reading in, one of the four honest states
 * out. Internally calls `nextReading` itself every time — never trusts a
 * value computed at some earlier instant.
 */
export function noticeState(schedule: ReadingSchedule, nowMs: number): NoticeState {
  const occurrence = nextReading(schedule, nowMs);
  return bucketOccurrence(
    occurrence ? { startsAtMs: occurrence.startsAtMs, endsAtMs: occurrence.endsAtMs } : null,
    nowMs,
  );
}

const DAY_LABEL: Intl.DateTimeFormatOptions = { weekday: "long", month: "long", day: "numeric" };
const CLOCK_LABEL: Intl.DateTimeFormatOptions = { hour: "numeric", minute: "2-digit" };

function clockAt(instantMs: number, tz: string): string {
  return new Intl.DateTimeFormat("en-US", { timeZone: tz, ...CLOCK_LABEL }).format(new Date(instantMs));
}

/** The MDT/MST-style abbreviation, read AT the occurrence instant — never
 *  "today," since the schedule's own DST rule can differ between now and
 *  the occurrence (Ground, DETERMINISTIC HYDRATION). */
function zoneLabel(instantMs: number, tz: string): string {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: tz, timeZoneName: "short" }).formatToParts(
    new Date(instantMs),
  );
  return parts.find((p) => p.type === "timeZoneName")?.value ?? tz;
}

export default function ReadingNotice({ schedule, next, asOfMs }: ReadingNoticeProps) {
  const [state, setState] = useState<NoticeState>(() => bucketOccurrence(next, asOfMs));
  const [visitorTz, setVisitorTz] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    // RULED — ROLLOVER (Astra point 2): recompute from the schedule itself
    // on every check, arm ONE timer for the next boundary (the start
    // instant unless already in the window, else the end instant), and
    // re-arm by calling `noticeState`/`nextReading` again on firing —
    // never a fixed 7×24h step.
    function settle() {
      if (cancelled) return;
      const fresh = noticeState(schedule, Date.now());
      setState(fresh);
      setVisitorTz(Intl.DateTimeFormat().resolvedOptions().timeZone);
      if (fresh.kind === "off") return;
      const boundaryMs = fresh.kind === "window" ? fresh.endsAtMs : fresh.startsAtMs;
      timer = setTimeout(settle, Math.max(0, boundaryMs - Date.now()));
    }

    settle();

    // A suspended tab resuming after its occurrence already expired (Ground).
    function onVisible() {
      if (document.visibilityState !== "visible") return;
      if (timer) clearTimeout(timer);
      settle();
    }
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [schedule]);

  if (state.kind === "off") {
    return (
      <Card>
        <div className="kit-stack">
          <div>Stay tuned, with love.</div>
        </div>
      </Card>
    );
  }

  if (state.kind === "window") {
    return (
      <Card>
        <div className="kit-stack">
          <div>Starting soon.</div>
        </div>
      </Card>
    );
  }

  const day = new Intl.DateTimeFormat("en-US", { timeZone: schedule.tz, ...DAY_LABEL }).format(
    new Date(state.startsAtMs),
  );

  return (
    <Card>
      <div className="kit-stack">
        <div>Next reading.</div>
        <div>{day}</div>
        <div className="kit-text-quiet">
          {`Love: ${clockAt(state.startsAtMs, schedule.tz)} ${zoneLabel(state.startsAtMs, schedule.tz)}`}
          {visitorTz &&
            ` · Your time: ${clockAt(state.startsAtMs, visitorTz)} ${zoneLabel(state.startsAtMs, visitorTz)}`}
          {"."}
        </div>
        {state.kind === "soon" && (
          <div>
            {"Starts in "}
            <Countdown target={new Date(state.startsAtMs).toISOString()} />
            {"."}
          </div>
        )}
      </div>
    </Card>
  );
}
