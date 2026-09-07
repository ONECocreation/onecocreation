"use client";

import Link from "next/link";
import JitsiRoom from "@/components/booking/JitsiRoom";

/**
 * THE VIDEO SLOT (TASK-123, 0018.06.16 a₿ — first embed TASK-146, 0018.06.17
 * a₿). The video region all four restored classroom layouts share. A stage
 * frame that holds the room's title in the dark and, when this room is
 * actually live, raises the gold door AND — the first slice of the Stage
 * Room mockup (canvas bc0bbb78) — mounts the same on-site Jitsi embed
 * /meet/[bookingId] proves, right here in the slot. Rose accents ride the
 * --rose token name only (T-121 owns the values).
 *
 * `jitsiDomain` and `liveRoom` are OPTIONAL and come from the server page
 * (the room page reads the site switches + derives the room name via
 * live.ts's ONE liveRoomName() helper — this client leaf never imports
 * live.ts itself, see that file's docblock). Three of the four classroom
 * layouts (Materials/People/Stage) don't thread these through yet — an
 * unowned Seam, noted in this lane's SUMMARY — so this slot degrades
 * gracefully to the original text-only door when either is absent: no
 * domain/room means no embed, only the honest fallback link. That keeps
 * every existing caller compiling and rendering byte-identical.
 */
export default function RoomVideoSlot({
  live,
  roomTitle,
  jitsiDomain,
  liveRoom,
  displayName,
}: {
  live: boolean;
  roomTitle: string;
  jitsiDomain?: string;
  liveRoom?: string;
  displayName?: string;
}) {
  const canEmbed = live && !!jitsiDomain && !!liveRoom;

  return (
    <div className="card cl-video-slot">
      <h3 className="cl-video-title">Video</h3>
      {canEmbed ? (
        <div>
          <div style={{ aspectRatio: "16 / 9", borderRadius: 14, overflow: "hidden", marginBottom: 12 }}>
            <JitsiRoom domain={jitsiDomain!} room={liveRoom!} displayName={displayName} height="100%" />
          </div>
          <p style={{ margin: "0 0 12px", color: "var(--ink-body)", fontSize: ".9rem" }}>
            Love is live in {roomTitle} now — the stage is lit.
          </p>
          <Link href="/live" className="btn btn-gold" style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
            ● Join Live Session
          </Link>
        </div>
      ) : (
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
      )}
    </div>
  );
}
