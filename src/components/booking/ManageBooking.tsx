"use client";

import { useState } from "react";
import SlotPicker from "@/components/booking/SlotPicker";

/**
 * SELF-SERVE (Admiral, 0018.05.17): reschedule and cancel live ON the
 * receipt — the booking id already proves it's yours. Changes close 24h
 * before the session; inside that window the door says so and points at
 * Love instead of failing coldly.
 */
export default function ManageBooking({
  bookingId,
  serviceId,
  startUtc,
}: {
  bookingId: string;
  serviceId: string;
  startUtc: string;
}) {
  const [open, setOpen] = useState<"none" | "reschedule" | "cancel">("none");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  const withinCutoff = Date.parse(startUtc) - Date.now() < 24 * 3600 * 1000;

  async function cancel() {
    setBusy(true);
    setNote(null);
    try {
      const res = await fetch(`/api/bookings/${bookingId}/change`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "cancel" }),
      });
      const d = (await res.json()) as { ok: boolean; reason?: string; giftReopened?: boolean; giftUrl?: string; refundLink?: string | null };
      if (!d.ok) {
        setNote(d.reason ?? "that didn't take — try again");
        return;
      }
      setDone(
        d.giftReopened
          ? "Canceled — and the gift is safe. A letter with the choose-again door is on its way."
          : d.refundLink
            ? "Canceled with love — a letter with your refund claim link is on its way."
            : "Canceled with love — the time went back on the board.",
      );
      setTimeout(() => window.location.reload(), 2600);
    } catch {
      setNote("couldn't reach the server — try again");
    } finally {
      setBusy(false);
    }
  }

  const glassCard: React.CSSProperties = {
    marginTop: 16, borderRadius: 20, border: "1px solid var(--glass-edge)",
    background: "var(--glass)", backdropFilter: "blur(8px)",
    boxShadow: "0 24px 60px -30px rgba(120,100,160,.55)", padding: "18px 20px", textAlign: "center",
  };

  if (done) {
    return (
      <p style={{ ...glassCard, fontSize: ".9rem", color: "var(--ok, #7fb98f)",
        border: "1.5px solid rgba(78,138,95,.45)", background: "rgba(78,138,95,.1)" }}>
        {done}
      </p>
    );
  }

  return (
    <div style={glassCard} id="manage">
      <p style={{ margin: 0, fontSize: ".7rem", letterSpacing: ".18em", textTransform: "uppercase",
        fontWeight: 700, color: "var(--muted, #897f97)" }}>Need a change?</p>
      {withinCutoff ? (
        <p style={{ margin: "8px 0 0", fontSize: ".88rem", color: "var(--muted, #897f97)" }}>
          Changes close 24 hours before your session — write to Love and she&apos;ll make it right.
        </p>
      ) : (
        <>
          <div style={{ display: "flex", justifyContent: "center", gap: 10, flexWrap: "wrap", marginTop: 12 }}>
            <button
              onClick={() => setOpen(open === "reschedule" ? "none" : "reschedule")}
              className={`btn btn-sm ${open === "reschedule" ? "btn-gold" : "btn-ghost"}`}
            >
              {open === "reschedule" ? "Keep my time" : "Reschedule"}
            </button>
            <button
              onClick={() => setOpen(open === "cancel" ? "none" : "cancel")}
              className="btn btn-ghost btn-sm"
            >
              Cancel session
            </button>
          </div>
          {open === "reschedule" && (
            <div style={{ marginTop: 14, borderTop: "1px solid rgba(139,118,196,.25)", paddingTop: 8, textAlign: "left" }}>
              <SlotPicker serviceId={serviceId} rescheduleBookingId={bookingId} />
            </div>
          )}
          {open === "cancel" && (
            <div style={{ marginTop: 14, borderTop: "1px solid rgba(139,118,196,.25)", paddingTop: 14 }}>
              <p style={{ margin: 0, fontSize: ".88rem", color: "var(--ink-body)" }}>
                Sure? A gifted session&apos;s gift stays safe to rebook; a paid one gets a refund
                claim link by email.
              </p>
              <div style={{ display: "flex", justifyContent: "center", marginTop: 12 }}>
                <button onClick={cancel} disabled={busy} className="btn btn-rose btn-sm">
                  {busy ? "Canceling…" : "Yes — cancel my session"}
                </button>
              </div>
            </div>
          )}
          {note && <p style={{ margin: "10px 0 0", fontSize: ".8rem", color: "var(--err, #E7899E)" }}>◌ {note}</p>}
        </>
      )}
    </div>
  );
}
