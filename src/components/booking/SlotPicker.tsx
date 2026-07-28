"use client";

import { useEffect, useMemo, useState } from "react";

/**
 * The slot picker — step 2, and the whole timezone law made visible.
 *
 * ⏰ Every slot arrives as a UTC instant. This component renders it in the
 * VISITOR's zone (detected, and switchable), and ALWAYS shows the artist's
 * zone beside the chosen time. A customer who shows up an hour late is a
 * refund and a bad feeling; the second label costs one line and prevents it.
 */

interface Slot {
  startUtc: string;
  endUtc: string;
  serviceId: string;
}

interface ServiceView {
  id: string;
  title: string;
  durationMin: number;
  artistTz: string;
  pricingMode: "fixed" | "pwyc";
}

function fmtTime(iso: string, tz: string): string {
  return new Intl.DateTimeFormat(undefined, {
    timeZone: tz,
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
}

function fmtDayHeading(iso: string, tz: string): string {
  return new Intl.DateTimeFormat(undefined, {
    timeZone: tz,
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(new Date(iso));
}

/** Group key = the calendar day AS THE VIEWER'S ZONE sees it, not UTC's. */
function dayKey(iso: string, tz: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(iso));
}

/** "PDT", "GMT+1" — the short label a human recognizes. */
function zoneLabel(tz: string): string {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: tz, timeZoneName: "short" }).formatToParts(new Date());
  return parts.find((p) => p.type === "timeZoneName")?.value ?? tz;
}

export default function SlotPicker({ serviceId }: { serviceId: string }) {
  const [slots, setSlots] = useState<Slot[]>([]);
  const [service, setService] = useState<ServiceView | null>(null);
  const [chosen, setChosen] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // checkout
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [note, setNote] = useState("");
  const [amountSats, setAmountSats] = useState("");
  const [rail, setRail] = useState<"lightning" | "onchain">("lightning");
  const [busy, setBusy] = useState(false);
  const [bookError, setBookError] = useState<string | null>(null);

  // The visitor's own zone, detected — and switchable, because travellers and
  // people booking on someone else's behalf both exist.
  const detected = useMemo(() => Intl.DateTimeFormat().resolvedOptions().timeZone, []);
  const [viewerTz, setViewerTz] = useState(detected);

  useEffect(() => {
    let live = true;
    (async () => {
      try {
        const res = await fetch(`/api/bookings/slots?service=${encodeURIComponent(serviceId)}`);
        const data = await res.json();
        if (!live) return;
        if (!data.ok) {
          setError(data.reason ?? "could not load times");
        } else {
          setSlots(data.slots ?? []);
          setService(data.service ?? null);
        }
      } catch {
        if (live) setError("could not load times");
      } finally {
        if (live) setLoading(false);
      }
    })();
    return () => {
      live = false;
    };
  }, [serviceId]);

  const days = useMemo(() => {
    const grouped = new Map<string, Slot[]>();
    for (const s of slots) {
      const key = dayKey(s.startUtc, viewerTz);
      const list = grouped.get(key);
      if (list) list.push(s);
      else grouped.set(key, [s]);
    }
    return [...grouped.entries()];
  }, [slots, viewerTz]);

  const artistTz = service?.artistTz ?? "UTC";
  const zonesDiffer = artistTz !== viewerTz;

  async function book() {
    if (!chosen) return;
    setBusy(true);
    setBookError(null);
    try {
      const res = await fetch("/api/bookings/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serviceId,
          startUtc: chosen,
          rail,
          amountSats: service?.pricingMode === "pwyc" ? Number(amountSats) : undefined,
          customer: { name, email, note },
        }),
      });
      const data = await res.json();
      if (!data.ok) {
        setBookError(data.reason ?? "could not book that time");
        // 409 = someone else took it while this page was open; refresh the board
        if (res.status === 409) {
          const again = await fetch(`/api/bookings/slots?service=${encodeURIComponent(serviceId)}`);
          const fresh = await again.json();
          if (fresh.ok) {
            setSlots(fresh.slots ?? []);
            setChosen(null);
          }
        }
        return;
      }
      // hand off to the processor; the receipt is the redirect target
      window.location.href = data.payUrl ?? `/book/receipt/${data.bookingId}`;
    } catch {
      setBookError("could not reach the ship");
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <p className="mt-8 text-sm text-neutral-400">Finding open times…</p>;
  if (error) return <p className="mt-8 text-sm text-amber-300">◌ {error}</p>;

  return (
    <div className="mt-8">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-xs uppercase tracking-widest text-cyan-300">Pick a time</p>
        <label className="text-xs text-neutral-400">
          times shown in{" "}
          <select
            value={viewerTz}
            onChange={(e) => setViewerTz(e.target.value)}
            className="border border-neutral-700 bg-transparent px-1 py-0.5 text-neutral-200"
          >
            {[...new Set([detected, artistTz, "UTC"])].map((tz) => (
              <option key={tz} value={tz}>
                {tz} ({zoneLabel(tz)})
              </option>
            ))}
          </select>
        </label>
      </div>

      {days.length === 0 ? (
        <p className="mt-6 text-sm text-neutral-400">No open times in this window yet.</p>
      ) : (
        <div className="mt-4 space-y-6">
          {days.map(([key, daySlots]) => (
            <div key={key}>
              <h3 className="text-sm font-semibold text-neutral-200">
                {fmtDayHeading(daySlots[0].startUtc, viewerTz)}
              </h3>
              <ul className="mt-2 flex flex-wrap gap-2">
                {daySlots.map((s) => {
                  const isChosen = chosen === s.startUtc;
                  return (
                    <li key={s.startUtc}>
                      <button
                        type="button"
                        onClick={() => setChosen(s.startUtc)}
                        aria-pressed={isChosen}
                        className={`border px-3 py-1.5 text-sm transition ${
                          isChosen
                            ? "border-cyan-400 bg-cyan-400/10 text-cyan-200"
                            : "border-neutral-700 text-neutral-200 hover:border-cyan-600"
                        }`}
                      >
                        {fmtTime(s.startUtc, viewerTz)}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      )}

      {chosen && (
        <div className="mt-6 border border-cyan-800 px-3 py-3 text-sm">
          <p className="text-neutral-200">
            {fmtDayHeading(chosen, viewerTz)} · <strong>{fmtTime(chosen, viewerTz)}</strong>{" "}
            <span className="text-neutral-400">your time ({zoneLabel(viewerTz)})</span>
          </p>
          {/* THE TIMEZONE LAW — the artist's clock, always said out loud */}
          {zonesDiffer && (
            <p className="mt-1 text-neutral-400">
              {fmtTime(chosen, artistTz)} for the host ({zoneLabel(artistTz)})
            </p>
          )}
          <p className="mt-2 text-xs text-neutral-500">{service?.durationMin} minutes</p>

          <div className="mt-4 space-y-2 border-t border-neutral-800 pt-3">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="your name"
              className="w-full border border-neutral-700 bg-transparent px-2 py-1 text-sm"
            />
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email (for your confirmation)"
              type="email"
              className="w-full border border-neutral-700 bg-transparent px-2 py-1 text-sm"
            />
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="anything the host should know (optional)"
              rows={2}
              className="w-full border border-neutral-700 bg-transparent px-2 py-1 text-sm"
            />

            {/* pwyc: the customer names the price, and it buys the same session */}
            {service?.pricingMode === "pwyc" && (
              <label className="block text-xs text-neutral-400">
                <span className="mb-1 block">what you can give (sats)</span>
                <input
                  value={amountSats}
                  onChange={(e) => setAmountSats(e.target.value)}
                  inputMode="numeric"
                  placeholder="21000"
                  className="w-full border border-neutral-700 bg-transparent px-2 py-1 text-sm"
                />
              </label>
            )}

            <label className="block text-xs text-neutral-400">
              <span className="mb-1 block">paying by</span>
              <select
                value={rail}
                onChange={(e) => setRail(e.target.value as "lightning" | "onchain")}
                className="w-full border border-neutral-700 bg-transparent px-2 py-1 text-sm text-neutral-100"
              >
                <option value="lightning">lightning — settles in seconds</option>
                <option value="onchain">on-chain — holds your time for 90 minutes</option>
              </select>
            </label>

            {/* the honest wait, said BEFORE they commit, never after */}
            {rail === "onchain" && (
              <p className="text-xs text-amber-300">
                on-chain payments take 10–60 minutes to confirm. Your time is held the whole while.
              </p>
            )}

            {bookError && <p className="text-xs text-amber-300">◌ {bookError}</p>}

            <button
              type="button"
              disabled={busy}
              onClick={book}
              className="w-full border border-cyan-600 px-3 py-2 text-sm text-cyan-300 hover:bg-cyan-900/30 disabled:opacity-50"
            >
              {busy ? "holding your time…" : "book this time"}
            </button>
            <p className="text-center text-xs text-neutral-500">bitcoin only · paid straight to the host</p>
          </div>
        </div>
      )}
    </div>
  );
}
