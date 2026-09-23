"use client";

import { useEffect, useState } from "react";
import Countdown from "@/components/studio-overlay/Countdown";
import { noticeState, nextBoundaryMs, type NoticeState } from "@/components/rooms/ReadingNotice";
import type { ReadingSchedule } from "@/lib/reading-schedule";

/**
 * READING HERO COUNTDOWN (TASK-391, block 968,088) — the one client island
 * `/reading` needs: binding T-382's own `Countdown` plus the optional
 * "Starting soon"/"Stay tuned" words to the page's hero date line AND its
 * "Next reading." card, so both flip at the exact instant the room's own
 * `ReadingNotice` does (Freshness, RULED). `noticeState`/`nextBoundaryMs`
 * are `ReadingNotice.tsx`'s own exported pure functions — imported, never
 * re-derived; `ReadingNotice.tsx` itself stays read-only, mounted, never
 * edited.
 *
 * DETERMINISTIC HYDRATION (the same law `ReadingNotice.tsx`'s own docblock
 * names): the first paint — server and the matching first client paint
 * alike — buckets the ALREADY-DERIVED `next` occurrence against `asOfMs`
 * with plain arithmetic (`firstPaintState`, below) rather than calling
 * `nextReading`/`noticeState` again during hydration — re-deriving via
 * Intl's civil-date walk on the client could in principle disagree with
 * the server's own ICU build. Only the POST-MOUNT effect (`settle`, below)
 * calls `noticeState` again, mirroring `ReadingNotice.tsx`'s own ROLLOVER
 * effect exactly: recompute on a fresh clock read, re-arm at
 * `nextBoundaryMs`, re-check on `visibilitychange`.
 *
 * Two variants render from the SAME state, never a page-local
 * reimplementation of what a state means: `hero` is the page's one-line
 * date line (weekday · clock time · zone abbreviation · "live online"; off
 * → "Stay tuned, with love."; window → "Starting soon." — decision B); `card` is the
 * "Next reading." card's own body (kit-stack, the same off/window/
 * upcoming/soon words `ReadingNotice.tsx` renders) — a second mount of the
 * same schedule and the same four states, elsewhere on the page.
 */

export interface ReadingHeroCountdownProps {
  schedule: ReadingSchedule;
  next: { startsAtMs: number; endsAtMs: number } | null;
  asOfMs: number;
  variant: "hero" | "card" | "blocks";
}

const ONE_DAY_MS = 24 * 3600_000;

/** Mirrors `ReadingNotice.tsx`'s own (unexported) `bucketOccurrence` — plain
 *  arithmetic against an already-derived occurrence, no `Intl` involved
 *  (see DETERMINISTIC HYDRATION above). */
function firstPaintState(
  occurrence: { startsAtMs: number; endsAtMs: number } | null,
  nowMs: number,
): NoticeState {
  if (!occurrence) return { kind: "off" };
  const { startsAtMs, endsAtMs } = occurrence;
  if (nowMs >= startsAtMs && nowMs < endsAtMs) return { kind: "window", startsAtMs, endsAtMs };
  return { kind: startsAtMs - nowMs <= ONE_DAY_MS ? "soon" : "upcoming", startsAtMs, endsAtMs };
}

const WEEKDAY_LABEL: Intl.DateTimeFormatOptions = { weekday: "long" };
const DAY_LABEL: Intl.DateTimeFormatOptions = { weekday: "long", month: "long", day: "numeric" };
const CLOCK_LABEL: Intl.DateTimeFormatOptions = { hour: "numeric", minute: "2-digit" };

function weekdayName(ms: number, tz: string): string {
  return new Intl.DateTimeFormat("en-US", { timeZone: tz, ...WEEKDAY_LABEL }).format(new Date(ms));
}
function dayLabel(ms: number, tz: string): string {
  return new Intl.DateTimeFormat("en-US", { timeZone: tz, ...DAY_LABEL }).format(new Date(ms));
}
function clockAt(ms: number, tz: string): string {
  return new Intl.DateTimeFormat("en-US", { timeZone: tz, ...CLOCK_LABEL }).format(new Date(ms));
}
function zoneLabel(ms: number, tz: string): string {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: tz, timeZoneName: "short" }).formatToParts(new Date(ms));
  return parts.find((p) => p.type === "timeZoneName")?.value ?? tz;
}

export default function ReadingHeroCountdown({ schedule, next, asOfMs, variant }: ReadingHeroCountdownProps) {
  const [state, setState] = useState<NoticeState>(() => firstPaintState(next, asOfMs));
  const [visitorTz, setVisitorTz] = useState<string | null>(null);
  /* blocks only: the per-second tick that walks the four cells down — the
     hero/card variants keep their own boundary-settled clock (below) and
     never pay for a one-second interval (TASK-438, Amendment 1 L3). */
  const [tickMs, setTickMs] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    function settle() {
      if (cancelled) return;
      const fresh = noticeState(schedule, Date.now());
      setState(fresh);
      setVisitorTz(Intl.DateTimeFormat().resolvedOptions().timeZone);
      const boundaryMs = nextBoundaryMs(fresh);
      if (boundaryMs === null) return;
      timer = setTimeout(settle, Math.max(0, boundaryMs - Date.now()));
    }

    settle();

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

  useEffect(() => {
    if (variant !== "blocks") return;
    if (state.kind !== "upcoming" && state.kind !== "soon") return;
    const id = setInterval(() => setTickMs(Date.now()), 1000);
    return () => clearInterval(id);
  }, [variant, state.kind]);

  /* ── TASK-438 (Amendment 1 L3 + Amendment 2 M1): the BLOCKS variant —
     the approved round-3 look's when-group (the day on one line, the time
     on the next, every gap inside clock-plus-zone a U+00A0 so the clock
     never splits — OUR normalizing, never ICU-trusted) plus the four
     countdown cells. Fully self-contained: the hero/card code below is
     byte-untouched, and the window state says "Starting now." — it NEVER
     infers the room is open from the clock alone. */
  if (variant === "blocks") {
    if (state.kind === "off") {
      return <p className="kit-body">Stay tuned, with love.</p>;
    }
    const nbsp = (s: string) => s.replace(/\s/g, "\u00A0");
    const loveTime = nbsp(`${clockAt(state.startsAtMs, schedule.tz)} ${zoneLabel(state.startsAtMs, schedule.tz)}`);
    const when = (
      <div className="kit-when">
        <p className="kit-when-day">{dayLabel(state.startsAtMs, schedule.tz)}</p>
        <p className="kit-when-time">{loveTime}</p>
        {visitorTz && visitorTz !== schedule.tz && (
          <p className="kit-text-quiet">
            {`Your time: ${nbsp(`${clockAt(state.startsAtMs, visitorTz)} ${zoneLabel(state.startsAtMs, visitorTz)}`)}`}
          </p>
        )}
      </div>
    );
    if (state.kind === "window") {
      return (
        <>
          {when}
          <p className="kit-body">Starting now.</p>
        </>
      );
    }
    const remainingMs = Math.max(0, state.startsAtMs - (tickMs ?? asOfMs));
    const totalSecs = Math.floor(remainingMs / 1000);
    const cells: Array<[string, string, number]> = [
      ["d", "days", Math.floor(totalSecs / 86_400)],
      ["h", "hours", Math.floor(totalSecs / 3600) % 24],
      ["m", "mins", Math.floor(totalSecs / 60) % 60],
      ["s", "secs", totalSecs % 60],
    ];
    return (
      <>
        {when}
        <ul className="kit-count" aria-label="Time until the reading">
          {cells.map(([u, unit, value]) => (
            <li key={u}>
              <span className="kit-count-num" data-u={u}>
                {String(value).padStart(2, "0")}
              </span>
              <span className="kit-count-unit">{unit}</span>
            </li>
          ))}
        </ul>
      </>
    );
  }

  if (state.kind === "off") {
    return variant === "hero" ? (
      <p className="kit-body">Stay tuned, with love.</p>
    ) : (
      <div className="kit-stack">
        <div>Stay tuned, with love.</div>
      </div>
    );
  }

  if (state.kind === "window") {
    return variant === "hero" ? (
      <p className="kit-body">Starting soon.</p>
    ) : (
      <div className="kit-stack">
        <div>Starting soon.</div>
      </div>
    );
  }

  if (variant === "hero") {
    return (
      <p className="kit-body">
        {`${weekdayName(state.startsAtMs, schedule.tz)} · ${clockAt(state.startsAtMs, schedule.tz)} ${zoneLabel(state.startsAtMs, schedule.tz)} · live online`}
      </p>
    );
  }

  return (
    <div className="kit-stack">
      <div>Next reading.</div>
      <div>{dayLabel(state.startsAtMs, schedule.tz)}</div>
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
  );
}
