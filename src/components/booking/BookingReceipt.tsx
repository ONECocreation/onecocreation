"use client";

import { useEffect, useState } from "react";

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

  if (error) return <p className="text-sm text-amber-300">◌ {error}</p>;
  if (!view) return <p className="text-sm text-neutral-400">Loading your booking…</p>;

  const { booking, payment } = view;
  const zonesDiffer = booking.artistTz !== viewerTz;
  const dayOpts: Intl.DateTimeFormatOptions = { weekday: "long", month: "long", day: "numeric" };
  const timeOpts: Intl.DateTimeFormatOptions = { hour: "numeric", minute: "2-digit" };

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-widest">
        {booking.state === "confirmed" ? "YOU'RE BOOKED" : "YOUR BOOKING"}
      </h1>
      <p className="mt-1 text-sm text-cyan-300">{booking.serviceTitle}</p>

      <div className="mt-6 border border-neutral-800 p-4">
        <p className="text-sm text-neutral-100">{fmt(booking.startUtc, viewerTz, dayOpts)}</p>
        <p className="mt-1 text-lg text-neutral-100">
          {fmt(booking.startUtc, viewerTz, timeOpts)}{" "}
          <span className="text-xs text-neutral-400">your time ({zoneLabel(viewerTz)})</span>
        </p>
        {/* THE TIMEZONE LAW — the host's clock, always said out loud */}
        {zonesDiffer && (
          <p className="mt-1 text-sm text-neutral-400">
            {fmt(booking.startUtc, booking.artistTz, timeOpts)} for the host ({zoneLabel(booking.artistTz)})
          </p>
        )}
      </div>

      {booking.state === "held" && (
        <div className="mt-4 border border-amber-800 px-3 py-3 text-sm">
          <p className="text-amber-300">◌ waiting on payment</p>
          <p className="mt-1 text-xs text-neutral-400">
            {payment?.state === "processing"
              ? "Your payment is on the chain — this takes 10–60 minutes. This page updates itself; your time is held."
              : "Your time is held until the invoice expires. This page updates itself."}
          </p>
        </div>
      )}

      {booking.state === "confirmed" && (
        <div className="mt-4 border border-cyan-800 px-3 py-3 text-sm">
          <p className="text-cyan-300">✓ paid and confirmed</p>
          {booking.meetingUrl ? (
            <p className="mt-2">
              <a href={booking.meetingUrl} className="text-cyan-300 underline" rel="noreferrer">
                the meeting link
              </a>
            </p>
          ) : (
            <p className="mt-1 text-xs text-neutral-400">The host will send the meeting link.</p>
          )}
        </div>
      )}

      {/* The calendar file works for a tentative hold too — and because the
          UID is stable, downloading again after payment updates that same
          entry in place rather than leaving a stale one behind. */}
      {(booking.state === "held" || booking.state === "confirmed") && (
        <a
          href={`/api/bookings/${booking.id}/ics`}
          className="mt-4 block border border-neutral-700 px-3 py-2 text-center text-sm text-neutral-200 hover:border-cyan-600 hover:text-cyan-300"
        >
          add to your calendar
        </a>
      )}
      {(booking.state === "held" || booking.state === "confirmed") && (
        <p className="mt-2 text-center text-xs text-neutral-500">
          your phone will remind you an hour before
        </p>
      )}

      {(booking.state === "released" || booking.state === "canceled") && (
        <p className="mt-4 border border-neutral-700 px-3 py-3 text-sm text-neutral-400">
          This booking was {booking.state}. The time went back on the board.
        </p>
      )}

      <p className="mt-6 text-xs text-neutral-600">booking {booking.id}</p>
    </div>
  );
}
