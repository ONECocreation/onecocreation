"use client";

import Link from "next/link";

/**
 * THE VIDEO SLOT (TASK-123, 0018.06.16 a₿) — the video region all four
 * restored classroom layouts share. Honest by the house's own evidence:
 * live sessions open through the gold door at /live (TASK-37 ships no
 * stream embed — "the door in — which is the member door"), and Jitsi
 * exists only for CONFIRMED bookings (booking/JitsiRoom at
 * /meet/[bookingId]) — no classroom has a configured stream to embed. So
 * this is the embed slot: a stage frame that holds the room's title in the
 * dark and, when this room is actually live, raises the same gold door
 * SanctuaryView already proves. The day a per-room stream lands, the frame
 * is where it mounts. Rose accents ride the --rose token name only (T-121
 * owns the values).
 */
export default function RoomVideoSlot({ live, roomTitle }: { live: boolean; roomTitle: string }) {
  return (
    <div className="card cl-video-slot">
      <h3 className="cl-video-title">Video</h3>
      <div className="cl-video-stage">
        {live ? (
          <div>
            <p style={{ margin: "0 0 12px", color: "var(--ink-body)", fontSize: ".9rem" }}>
              Love is live in {roomTitle} now — the stage is lit.
            </p>
            <Link href="/live" className="btn btn-gold" style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
              ● Join Live Session
            </Link>
          </div>
        ) : (
          <p style={{ margin: 0, color: "var(--muted)", fontSize: ".86rem", maxWidth: 340 }}>
            The stage is dark until this room goes live — the door lights right here when it does.
          </p>
        )}
      </div>
    </div>
  );
}
