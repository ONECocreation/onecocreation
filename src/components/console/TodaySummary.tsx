"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { SectionHead } from "@/components/console/glass";
import AttentionStrip from "@/components/console/AttentionStrip";

/**
 * T-326 (0018.06.26 a₿ — the Admiral accepted Astra's review-r1, findings
 * 3 + 9 + 10): Home's two always-on static cards ("Go live" pointer,
 * "Love's week" checklist) become ONE Today summary — the next session's
 * real time and title with its open/live action, then T-319's counted
 * pointer (mounted here unchanged), then the folded Routine checks (the
 * fold itself stays server-side in page.tsx).
 *
 * The next-session read happens SERVER-side (page.tsx → listBookings(),
 * the same vault the calendar feed draws from, without that route's
 * orders loop) and rides in as props — so there is no loading flash on
 * this line: the page load IS the load. The three states never blur
 * (finding 10): a failed read is loud rose with a genuine Retry
 * (router.refresh() re-runs the server read); a genuinely empty book is
 * one quiet line; only real data renders the session row.
 */

/** the slice of BookingRecord the summary needs, handed down from the page */
export interface TodayNext {
  serviceTitle: string;
  startUtc: string;
  endUtc: string;
  artistTz: string;
}

/** complete 24-hour time in HER zone — "Saturday, June 27, 14:00 – 15:30".
 *  The record carries artistTz (the artist's zone at time of booking), so
 *  the clock is real data, never the browser's guess. Diverges from
 *  AdminWeekGrid's browser-zone 12h idiom deliberately: the brief asks for
 *  a 24-hour read in her zone. */
export function formatSessionTime(next: TodayNext): string {
  const tz = next.artistTz || undefined;
  const start = new Date(next.startUtc).toLocaleString("en-US", {
    timeZone: tz, hour12: false,
    weekday: "long", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit",
  });
  const end = new Date(next.endUtc).toLocaleTimeString("en-US", {
    timeZone: tz, hour12: false, hour: "2-digit", minute: "2-digit",
  });
  return `${start} – ${end}`;
}

export default function TodaySummary({
  next,
  liveNow,
  liveTitle,
}: {
  next: TodayNext | null | "error";
  liveNow: boolean;
  liveTitle?: string;
}) {
  const router = useRouter();
  return (
    <>
      <SectionHead label="Today" />
      {liveNow && (
        <div style={{ marginBottom: 10, padding: "12px 16px", borderRadius: 12, fontSize: ".85rem",
          background: "rgba(197,110,139,.12)", border: "1.5px solid rgba(197,110,139,.5)", color: "var(--ink-body)",
          display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <span>🔴 <b>LIVE now</b>{liveTitle ? <> — {liveTitle}</> : null}</span>
          <Link href="/a/live" style={{ marginLeft: "auto", color: "var(--info)", textDecoration: "underline",
            display: "inline-flex", alignItems: "center", minHeight: 44 }}>
            open the Go-Live room →
          </Link>
        </div>
      )}
      {next === "error" ? (
        <div style={{ padding: "10px 16px", borderRadius: 12, fontSize: ".85rem",
          background: "rgba(231,178,195,.14)", border: "1.5px solid rgba(231,178,195,.5)", color: "var(--ink-body)",
          display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <span>⚑ couldn&apos;t load the schedule — something may be on the books.</span>
          <button type="button" className="btn btn-sm" style={{ minHeight: 44 }}
            onClick={() => router.refresh()}>
            Retry
          </button>
        </div>
      ) : next ? (
        <Link
          href="/a/booking"
          style={{ display: "flex", flexWrap: "wrap", alignItems: "baseline", gap: "2px 10px",
            padding: "12px 16px", minHeight: 44, borderRadius: 12, textDecoration: "none",
            background: "rgba(139,118,196,.10)", border: "1.5px solid rgba(139,118,196,.45)",
            color: "var(--ink-body)" }}
        >
          <b style={{ fontSize: ".82rem" }}>next session</b>
          <span style={{ fontSize: ".85rem" }}>
            {formatSessionTime(next)} · <b>{next.serviceTitle}</b>
          </span>
          <span style={{ marginLeft: "auto", fontSize: ".72rem", textTransform: "uppercase", letterSpacing: ".08em", color: "var(--muted)" }}>
            the calendar →
          </span>
        </Link>
      ) : (
        <p style={{ margin: 0, padding: "12px 16px", fontSize: ".82rem", color: "var(--muted)" }}>
          🌤 nothing scheduled — the day is yours.
        </p>
      )}
      {/* T-319's counted pointer, moved inside the summary unchanged — its
          own loading/failed/zero states stand (zero renders null by T-319's
          design; the summary's visible zero is the session line above) */}
      <AttentionStrip />
    </>
  );
}
