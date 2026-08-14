"use client";

import { useEffect, useState } from "react";
import ManageBooking from "@/components/booking/ManageBooking";

/**
 * The receipt — and the honest face of `processing`.
 *
 * An on-chain payment genuinely sits unconfirmed for 10–60+ minutes, so that
 * state gets real copy and a live poll, never a spinner that implies
 * something is stuck (spec §2). The poll drives the RECONCILE path server-
 * side: each GET asks the processor for the charge's true state, so a lost
 * webhook cannot leave a paid booking hanging.
 */

interface View {
  booking: {
    id: string;
    serviceId?: string;
    serviceTitle: string;
    startUtc: string;
    endUtc: string;
    artistTz: string;
    state: "held" | "confirmed" | "released" | "canceled";
    meetingUrl?: string;
  };
  payment: { state: string; amount: number; currency: string } | null;
}

function fmt(iso: string, tz: string, opts: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat(undefined, { timeZone: tz, ...opts }).format(new Date(iso));
}

function zoneLabel(tz: string): string {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: tz, timeZoneName: "short" }).formatToParts(new Date());
  return parts.find((p) => p.type === "timeZoneName")?.value ?? tz;
}

type Fetched = { ok: true; view: View } | { ok: false; reason: string };

/** Lives outside the component so the effect never setStates synchronously. */
async function fetchBooking(bookingId: string): Promise<Fetched> {
  try {
    const res = await fetch(`/api/bookings/${bookingId}`, { cache: "no-store" });
    const data = await res.json();
    return data.ok ? { ok: true, view: data as View } : { ok: false, reason: data.reason ?? "not found" };
  } catch {
    return { ok: false, reason: "could not reach the ship" };
  }
}

export default function BookingReceipt({ bookingId }: { bookingId: string }) {
  const [view, setView] = useState<View | null>(null);
  const [error, setError] = useState<string | null>(null);
  const viewerTz = Intl.DateTimeFormat().resolvedOptions().timeZone;

  useEffect(() => {
    let live = true;
    // Kept in the effect's own scope, not a ref: polling stops as soon as the
    // money lands, and nothing is written during render.
    let keepPolling = true;

    const apply = (r: Fetched) => {
      if (!live) return;
      if (r.ok) {
        setView(r.view);
        keepPolling = r.view.booking.state === "held";
      } else {
        setError(r.reason);
        keepPolling = false;
      }
    };

    fetchBooking(bookingId).then(apply);
    const t = setInterval(() => {
      if (keepPolling) fetchBooking(bookingId).then(apply);
    }, 15_000);

    return () => {
      live = false;
      clearInterval(t);
    };
  }, [bookingId]);

  if (error) return <p style={{ fontSize: ".9rem", color: "var(--err, #E7899E)", textAlign: "center" }}>◌ {error}</p>;
  if (!view) return <p style={{ fontSize: ".9rem", color: "var(--muted, #897f97)", textAlign: "center" }}>Loading your booking…</p>;

  const { booking, payment } = view;
  const zonesDiffer = booking.artistTz !== viewerTz;
  const dayOpts: Intl.DateTimeFormatOptions = { weekday: "long", month: "long", day: "numeric" };
  const timeOpts: Intl.DateTimeFormatOptions = { hour: "numeric", minute: "2-digit" };

  const glassCard: React.CSSProperties = {
    borderRadius: 20, border: "1px solid var(--glass-edge)",
    background: "var(--glass)", backdropFilter: "blur(8px)",
    boxShadow: "0 24px 60px -30px rgba(120,100,160,.55)", padding: "20px 22px",
  };

  return (
    <div style={{ textAlign: "center" }}>
      <p style={{ margin: 0, fontSize: ".7rem", letterSpacing: ".28em", textTransform: "uppercase",
        fontWeight: 700, color: "var(--rose, #c56e8b)" }}>
        {booking.state === "confirmed" ? "You're Booked" : "Your Booking"}
      </p>
      <h1 style={{ fontFamily: "var(--font-h1, sans-serif)", fontWeight: 400, fontSize: "1.8rem",
        color: "var(--ink-strong)", margin: ".2em 0 .6em" }}>
        {booking.serviceTitle}
      </h1>

      <div style={glassCard}>
        <p style={{ margin: 0, fontFamily: "var(--serif, sans-serif)", fontSize: "1.1rem", color: "var(--ink-strong)" }}>
          {fmt(booking.startUtc, viewerTz, dayOpts)}
        </p>
        <p style={{ margin: "4px 0 0", fontSize: "1.4rem", fontFamily: "var(--serif, sans-serif)", color: "var(--gold-deep, #b4862b)" }}>
          {fmt(booking.startUtc, viewerTz, timeOpts)}
        </p>
        <p style={{ margin: "4px 0 0", fontSize: ".8rem", color: "var(--muted, #897f97)" }}>
          your time ({zoneLabel(viewerTz)})
          {/* THE TIMEZONE LAW — the host's clock, always said out loud */}
          {zonesDiffer && <> · {fmt(booking.startUtc, booking.artistTz, timeOpts)} for the host ({zoneLabel(booking.artistTz)})</>}
        </p>
      </div>

      {booking.state === "held" && (
        <div style={{ ...glassCard, marginTop: 14, border: "1.5px solid rgba(180,134,43,.5)", background: "rgba(217,178,78,.12)" }}>
          <p style={{ margin: 0, fontWeight: 700, fontSize: ".9rem", color: "var(--warn, #EBCB77)" }}>◌ waiting on payment</p>
          <p style={{ margin: "4px 0 0", fontSize: ".8rem", color: "var(--warn, #EBCB77)", opacity: 0.85 }}>
            {payment?.state === "processing"
              ? "Your payment is on the chain — this takes 10–60 minutes. This page updates itself; your time is held."
              : "Your time is held until the invoice expires. This page updates itself."}
          </p>
        </div>
      )}

      {booking.state === "confirmed" && (
        <div style={{ ...glassCard, marginTop: 14, border: "1.5px solid rgba(78,138,95,.45)", background: "rgba(78,138,95,.1)" }}>
          <p style={{ margin: 0, fontWeight: 700, fontSize: ".9rem", color: "var(--ok, #7fb98f)" }}>✓ paid and confirmed</p>
          {booking.meetingUrl ? (
            <div style={{ marginTop: 12, display: "flex", justifyContent: "center" }}>
              <a href={booking.meetingUrl} className="btn btn-gold btn-sm" rel="noreferrer">
                Join the meeting →
              </a>
            </div>
          ) : (
            <p style={{ margin: "4px 0 0", fontSize: ".8rem", color: "var(--ok, #7fb98f)", opacity: 0.85 }}>
              The host will send the meeting link.
            </p>
          )}
        </div>
      )}

      {/* The calendar file works for a tentative hold too — and because the
          UID is stable, downloading again after payment updates that same
          entry in place rather than leaving a stale one behind. */}
      {(booking.state === "held" || booking.state === "confirmed") && (
        <>
          <div style={{ display: "flex", justifyContent: "center", marginTop: 16 }}>
            <a href={`/api/bookings/${booking.id}/ics`} className="btn btn-ghost btn-sm">
              Add to your calendar 🗓️
            </a>
          </div>
          <p style={{ margin: "8px 0 0", fontSize: ".76rem", color: "var(--muted, #897f97)" }}>
            your phone will remind you an hour before
          </p>
        </>
      )}

      {booking.state === "confirmed" && booking.serviceId && (
        <ManageBooking bookingId={booking.id} serviceId={booking.serviceId} startUtc={booking.startUtc} />
      )}

      {(booking.state === "released" || booking.state === "canceled") && (
        <p style={{ ...glassCard, marginTop: 14, fontSize: ".9rem", color: "var(--muted, #897f97)" }}>
          This booking was {booking.state}. The time went back on the board.
        </p>
      )}

      <p style={{ marginTop: 24, fontSize: ".72rem", color: "var(--muted, #897f97)", opacity: 0.7 }}>booking {booking.id}</p>
    </div>
  );
}
