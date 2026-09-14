"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  BftMonthGrid,
  WeekRibbon,
  CalendarOptions,
  bftMonthGrid,
  bftToday,
  type CalendarEventPill,
  type CalendarDayMarks,
  type CalendarDayMarksLookup,
} from "@/components/calendar";

interface MemberBooking {
  bookingId: string;
  title: string;
  startUtc: string;
  endUtc: string;
  state: string;
  meetingUrl: string | null;
  location: { address: string | null; geo: string | null; area: string | null } | null;
}

const MONTH_WORDS = [
  "One", "Two", "Three", "Four", "Five", "Six", "Seven",
  "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen",
] as const;
const pad4 = (n: number) => String(n).padStart(4, "0");

/**
 * TASK-211 (0018.06.23 a₿, Love's call #9/#18): "My sessions" → "Calendar" —
 * week view leads (the DEFAULT), a week/month toggle sits beside it, and
 * your booked sessions ride the grid as gold pills, keyed by their own
 * civil day. #9 (01:34:18): the member's month view squares were wrong —
 * the fix is to REUSE the community calendar's own grid component
 * (BftMonthGrid/WeekRibbon, src/components/calendar — the same atoms
 * CircleView and Love's Desk ride), never rebuild one. Pure + exported for
 * tests/member-calendar.test.ts (the house pins the model, not the render).
 */
export function buildBookingMarks(bookings: MemberBooking[] | null): CalendarDayMarksLookup {
  return (cell): CalendarDayMarks | undefined => {
    const hits = (bookings ?? []).filter((b) => b.startUtc.slice(0, 10) === cell.civilKey);
    if (hits.length === 0) return undefined;
    const pills: CalendarEventPill[] = hits
      .slice(0, 3)
      .map((b) => ({ id: b.bookingId, label: b.title, variant: "gold" }));
    return { pills };
  };
}

/** The member's sessions, soonest first — each with its doors: join the
 *  meeting, copy the studio's location, message Love, cancel/reschedule.
 *  The calendar leads now; this list stays underneath for the per-session
 *  actions the grid has no room for. */
export default function MemberCalendar() {
  const [bookings, setBookings] = useState<MemberBooking[] | null>(null);
  const [contactEmail, setContactEmail] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  /* "now" as of the visit (initializer — the one render-adjacent place
     Date.now() may run); only read once bookings land client-side */
  const [nowMs] = useState(() => Date.now());
  const [view, setView] = useState<"week" | "month">("week"); // week is the DEFAULT (#18)

  const today = useMemo(() => bftToday(nowMs), [nowMs]);
  const [bftYear, setBftYear] = useState(today.year);
  const [bftMonth, setBftMonth] = useState(today.month);
  const weekOfMonth = Math.ceil(today.day / 7);

  useEffect(() => {
    fetch("/api/member/bookings")
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { ok?: boolean; bookings?: MemberBooking[]; contactEmail?: string | null } | null) => {
        setBookings(d?.bookings ?? []);
        setContactEmail(d?.contactEmail ?? null);
      })
      .catch(() => setBookings([]));
  }, []);

  const marks = useMemo(() => buildBookingMarks(bookings), [bookings]);

  function stepMonth(dir: -1 | 1) {
    let m = bftMonth + dir;
    let y = bftYear;
    if (m < 1) { m = 13; y -= 1; }
    if (m > 13) { m = 1; y += 1; }
    setBftMonth(m);
    setBftYear(y);
  }

  const grid = useMemo(() => bftMonthGrid(bftYear, bftMonth), [bftYear, bftMonth]);
  const firstCell = grid.cells[0];
  const lastCell = grid.cells[grid.cells.length - 1];
  const civilRangeLabel = firstCell && lastCell
    ? `${firstCell.civilMonthAbbr} ${firstCell.civilDayNum} – ${lastCell.civilMonthAbbr} ${lastCell.civilDayNum}`
    : "";
  const header = `Month ${MONTH_WORDS[bftMonth - 1]}, ${pad4(bftYear)} a₿ · civil ≈ ${civilRangeLabel}`;

  async function copyLocation(b: MemberBooking) {
    const parts = [
      b.location?.address,
      b.location?.geo,
      !b.location?.address && b.location?.area
        ? `your area: ${b.location.area} — Love confirms the exact spot`
        : null,
    ].filter(Boolean);
    if (parts.length === 0) return;
    try {
      await navigator.clipboard.writeText(parts.join("\n"));
      setCopied(b.bookingId);
      setTimeout(() => setCopied(null), 2200);
    } catch {
      /* clipboard blocked — the receipt still carries the details */
    }
  }

  function messageHref(b: MemberBooking, kind: "hello" | "change"): string {
    const when = new Date(b.startUtc).toLocaleString(undefined, {
      weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
    });
    if (!contactEmail) return "/contact";
    const subject =
      kind === "change"
        ? `Cancel / reschedule — ${b.title}, ${when} (${b.bookingId.slice(0, 8)})`
        : `About my session — ${b.title}, ${when}`;
    return `mailto:${contactEmail}?subject=${encodeURIComponent(subject)}`;
  }

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
        <button type="button" className={`btn btn-sm btn-ghost${view === "week" ? " btn-on" : ""}`} aria-pressed={view === "week"} onClick={() => setView("week")}>Week</button>
        <button type="button" className={`btn btn-sm btn-ghost${view === "month" ? " btn-on" : ""}`} aria-pressed={view === "month"} onClick={() => setView("month")}>Month</button>
        <CalendarOptions />
      </div>

      {view === "week" ? (
        <WeekRibbon bftYear={today.year} bftMonth={today.month} weekOfMonth={weekOfMonth} marks={marks} />
      ) : (
        <>
          <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "0 0 10px", flexWrap: "wrap" }}>
            <button type="button" className="btn-round" aria-label="previous month" onClick={() => stepMonth(-1)}>‹</button>
            <p style={{ flex: 1, minWidth: 160, margin: 0, fontSize: ".82rem", color: "var(--ink-body)" }}>{header}</p>
            <button type="button" className="btn-round" aria-label="next month" onClick={() => stepMonth(1)}>›</button>
          </div>
          <BftMonthGrid bftYear={bftYear} bftMonth={bftMonth} marks={marks} />
        </>
      )}

      <h3 style={{ fontFamily: "var(--font-h3)", fontWeight: 400, fontSize: "1.02rem", margin: "26px 0 12px", color: "var(--ink-strong)" }}>
        Your sessions
      </h3>

      {bookings === null ? (
        <p style={{ color: "var(--muted)" }}>reading…</p>
      ) : bookings.length === 0 ? (
        <div>
          <p style={{ color: "var(--muted)" }}>No sessions on your calendar yet.</p>
          <Link className="btn" href="/book" style={{ marginTop: 10, display: "inline-block" }}>
            Book a session
          </Link>
        </div>
      ) : (
        <ul style={{ listStyle: "none", padding: 0 }}>
          {bookings.map((b) => {
            const start = new Date(b.startUtc);
            const past = start.getTime() < nowMs;
            const hasLocation = !!(b.location && (b.location.address || b.location.geo || b.location.area));
            return (
              <li
                key={b.bookingId}
                style={{
                  padding: "16px 20px",
                  borderRadius: 16,
                  /* house glass, not paper — the white cards washed out on the dark ground */
                  border: "1px solid var(--glass-edge)",
                  background: "var(--glass)",
                  backdropFilter: "blur(8px)",
                  marginBottom: 12,
                  opacity: past ? 0.7 : 1,
                }}
              >
                <b style={{ fontFamily: "var(--font-h3)", fontWeight: 400, fontSize: "1.05rem", color: "var(--ink-strong)" }}>{b.title}</b>
                <div style={{ color: "var(--muted)", fontSize: ".9rem", marginTop: 4 }}>
                  {start.toLocaleString(undefined, {
                    weekday: "long",
                    month: "long",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })}{" "}
                  · {b.state}
                </div>
                <div style={{ display: "flex", gap: 12, marginTop: 8, flexWrap: "wrap" }}>
                  {b.meetingUrl && (
                    <a className="btn btn-sm" href={b.meetingUrl} target="_blank" rel="noreferrer">
                      Join the meeting
                    </a>
                  )}
                  {hasLocation && (
                    <button className={`btn btn-sm btn-ghost${copied === b.bookingId ? " btn-on" : ""}`} onClick={() => copyLocation(b)}>
                      {copied === b.bookingId ? "Copied ✓" : "📍 Location"}
                    </button>
                  )}
                  {!past && (
                    <>
                      <a className="btn btn-ghost btn-sm" href={messageHref(b, "hello")}>
                        Message Love
                      </a>
                      <Link className="btn btn-ghost btn-sm" href={`/book/receipt/${b.bookingId}#manage`}>
                        Cancel · Reschedule
                      </Link>
                    </>
                  )}
                  <Link className="btn btn-ghost btn-sm" href={`/book/receipt/${b.bookingId}`}>
                    Receipt & calendar file
                  </Link>
                </div>
                {hasLocation && !b.location?.address && (
                  <p style={{ color: "var(--muted)", fontSize: ".78rem", marginTop: 6 }}>
                    the studio travels — Love confirms the exact spot in your area before the day.
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
