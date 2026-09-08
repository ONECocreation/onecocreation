"use client";

import Link from "next/link";
import JitsiRoom from "@/components/booking/JitsiRoom";
import { ROOMS } from "@/lib/matrix-rooms";
import {
  signInDoorLine,
  signInDoorHref,
  packageDoorLine,
  type RoomGate,
} from "@/lib/room-access";

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
 * live.ts itself, see that file's docblock). When either is absent the slot
 * degrades gracefully to the original text-only door: no domain/room means
 * no embed, only the honest fallback link.
 *
 * TASK-174 (0018.06.17 a₿ · block 966094) — the doors match:
 *  · the "Join Live Session" door leads to the room's OWN Stage
 *    (/rooms/<slug>, slug derived from the rooms registry by title —
 *    derive-or-dash: no match → /live, which embeds any live room since
 *    this lane), never to a page that cannot show it.
 *  · `door` is the SAME gate the chat follows (src/lib/room-access.ts's
 *    ONE roomGate decision + its shared door words), computed server-side
 *    by the room page and threaded down. Signed-out → the sign-in door
 *    with the room's name; a lower tier → "opens with the <package>" in
 *    words. (TASK-184: the Video/Materials/People vantages this once
 *    noted as unthreaded retired — the Stage, the only vantage mounting
 *    this slot, always threads the door.)
 */
export default function RoomVideoSlot({
  live,
  roomTitle,
  jitsiDomain,
  liveRoom,
  displayName,
  door,
  doorPackage,
}: {
  live: boolean;
  roomTitle: string;
  jitsiDomain?: string;
  liveRoom?: string;
  displayName?: string;
  /** TASK-174: the room page's gate decision for THIS visitor — absent
   *  reads as "open" (the pre-gate behavior, byte-identical). */
  door?: RoomGate;
  /** the package the door opens with (TIERS' own name, threaded server-side) */
  doorPackage?: string | null;
}) {
  const canEmbed = live && !!jitsiDomain && !!liveRoom;
  /* the room's own slug, derived from the registry by title (the title
     itself comes from the same registry at the page) */
  const own = ROOMS.find((r) => r.title === roomTitle);
  const slug = own ? own.id.slice(1, own.id.indexOf(":")) : null;
  const joinHref = slug ? `/rooms/${slug}` : "/live";
  const gate: RoomGate = door ?? "open";

  return (
    <div className="card cl-video-slot">
      <h3 className="cl-video-title">Video</h3>
      {live && gate === "signin" ? (
        /* the sign-in door — the SAME words the chat's door says */
        <div className="cl-video-stage">
          <div>
            <p style={{ margin: "0 0 12px", color: "var(--ink-body)", fontSize: ".9rem", maxWidth: 380 }}>
              {signInDoorLine(roomTitle)}
            </p>
            <Link href={signInDoorHref(slug)} className="btn btn-sm">
              Sign in · join free
            </Link>
          </div>
        </div>
      ) : live && gate === "package" ? (
        /* the lower-tier door — "opens with the <package>" in words */
        <div className="cl-video-stage">
          <div>
            <p style={{ margin: "0 0 6px", color: "var(--ink-body)", fontSize: ".9rem", maxWidth: 380 }}>
              🔒 {packageDoorLine(doorPackage ?? null)}
            </p>
            <p style={{ margin: "0 0 12px", color: "var(--muted)", fontSize: ".86rem", maxWidth: 380 }}>
              The lock is an invitation — everything inside stays waiting for you.
            </p>
            <Link href="/memberships" className="btn btn-sm">
              See the memberships
            </Link>
          </div>
        </div>
      ) : canEmbed ? (
        <div>
          <div style={{ aspectRatio: "16 / 9", borderRadius: 14, overflow: "hidden", marginBottom: 12 }}>
            <JitsiRoom domain={jitsiDomain!} room={liveRoom!} displayName={displayName} height="100%" />
          </div>
          <p style={{ margin: "0 0 12px", color: "var(--ink-body)", fontSize: ".9rem" }}>
            Love is live in {roomTitle} now — the stage is lit.
          </p>
          <Link href={joinHref} className="btn btn-gold" style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
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
              <Link href={joinHref} className="btn btn-gold" style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
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
