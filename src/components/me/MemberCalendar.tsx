"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

interface MemberBooking {
  bookingId: string;
  title: string;
  startUtc: string;
  endUtc: string;
  state: string;
  meetingUrl: string | null;
  location: { address: string | null; geo: string | null; area: string | null } | null;
}

/** The member's sessions, soonest first — each with its doors: join the
 *  meeting, copy the studio's location, message Love, cancel/reschedule. */
export default function MemberCalendar() {
  const [bookings, setBookings] = useState<MemberBooking[] | null>(null);
  const [contactEmail, setContactEmail] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/member/bookings")
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { ok?: boolean; bookings?: MemberBooking[]; contactEmail?: string | null } | null) => {
        setBookings(d?.bookings ?? []);
        setContactEmail(d?.contactEmail ?? null);
      })
      .catch(() => setBookings([]));
  }, []);

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

  if (bookings === null) return <p style={{ color: "var(--muted)" }}>reading…</p>;
  if (bookings.length === 0) {
    return (
      <div>
        <p style={{ color: "var(--muted)" }}>No sessions on your calendar yet.</p>
        <Link className="btn btn-gold" href="/book" style={{ marginTop: 10, display: "inline-block" }}>
          Book a session
        </Link>
      </div>
    );
  }

  const now = Date.now();
  return (
    <ul style={{ listStyle: "none", padding: 0 }}>
      {bookings.map((b) => {
        const start = new Date(b.startUtc);
        const past = start.getTime() < now;
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
                <a className="btn btn-gold btn-sm" href={b.meetingUrl} target="_blank" rel="noreferrer">
                  Join the meeting
                </a>
              )}
              {hasLocation && (
                <button className="btn btn-gold btn-sm" onClick={() => copyLocation(b)}>
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
  );
}
