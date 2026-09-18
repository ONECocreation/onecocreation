import type { Metadata } from "next";
import { headers } from "next/headers";
import OperatorGate from "@/components/OperatorGate";
import { operatorFromCookieHeader, operatorsConfigured } from "@/lib/operator-auth";
import { cartridge } from "@/brand/cartridge";
import { getSiteConfig } from "@/lib/site-config";
import {
  studioVdoLinks,
  studioRoomKey,
  slugOfRoom,
  confirmedToday,
  liveRoomPrefix,
  LIVE_YOUTUBE,
} from "@/lib/live";
import { meetStudioUrl, directorDeskUrl } from "@/lib/live-links";
import { STUDIO_SCENES, type StudioSceneId } from "@/lib/studio/scenes";
import { overlayConfigured, overlayQuery } from "@/lib/studio/overlay-token";
import { getStudioDoc } from "@/lib/studio/roster";
import { listBookings } from "@/lib/booking-orders";
import { ROOMS } from "@/lib/matrix-rooms";
import StudioHub from "@/components/console/StudioHub";

/**
 * /a/studio — THE DIRECTOR'S DESK, now also THE STUDIO ROOM (TASK-191,
 * 0018.06.18 a₿ · block 966119; the three full-frame scenes' "Starts at"/
 * "After-hours line" fields and the "Show in the studio" links added
 * TASK-244; TASK-330, 0018.06.27 a₿, folds the go-live door in here too —
 * being in the studio opens the go-live controls, and /a/live redirects).
 * The /a/studio word is reclaimed with /studio (the Admiral's GROUND
 * ruling: T-175's thin redirect to the page designer is deleted — the
 * designer lives at /style now). This room holds the broadcast studio's
 * inputs: the scene picker (six chips, grouped "On camera" / "Full
 * screen"), the host's own lower third, the guest roster (name +
 * specialty), the show title, the countdown target and the after-hours
 * line, the copy-able overlay URL per scene, the full scenes' extra
 * "show in the studio" URL (VDO.Ninja's own &website source parameter),
 * and the VDO push/guest links derived from the meeting config's room
 * prefix (T-137) — AND, folded in by T-330, the four go-live doors (Read
 * live on the site, YouTube, Discovery call, Co-create) that used to live
 * at /a/live, stacked below the desk (StudioHub, desk first, live
 * second). Same room, same key: the go-live door reuses this page's own
 * `vdo`/`director` derivations rather than re-deriving them — one room,
 * one key, every door agrees. The on-stage panel (the cameras' live
 * state) is Phase 2 — it comes with the studio kit, and the room says so.
 *
 * Same gate as every /a room: no operator cookie, the door renders.
 */

export const metadata: Metadata = {
  title: "Studio — admin",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function StudioRoomPage() {
  const cookie = (await headers()).get("cookie");
  const operator = operatorFromCookieHeader(cookie);
  if (!operator) {
    return <OperatorGate configured={operatorsConfigured()} />;
  }

  const h = await headers();
  const proto = h.get("x-forwarded-proto") ?? "http";
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost";
  const origin = `${proto}://${host}`;

  /* TASK-330: the go-live door's own fetch (listBookings, for today's
     confirmed calls) joins the existing two — the union of what
     /a/live/page.tsx used to fetch on its own, added here rather than a
     second Promise.all. ROOMS and LIVE_YOUTUBE need no fetch (static). */
  const [doc, config, bookings] = await Promise.all([getStudioDoc(), getSiteConfig(), listBookings()]);

  /* the copy-able overlay URL per scene — null when the seat secret is
     unset and the room says so honestly instead of minting a dead link */
  const overlayUrls = Object.fromEntries(
    STUDIO_SCENES.map((s) => {
      const q = overlayQuery(s.id);
      return [s.id, q ? `${origin}/studio/overlay?${q}` : null];
    }),
  ) as Record<StudioSceneId, string | null>;

  /* TASK-261: the VDO room derives from the meeting config's prefix
     (T-137) via the ONE shared derivation (live.ts's studioVdoLinks) —
     this page used to hand-build the same `{room, push, guest}` shape
     inline (a second, driftable copy of T-243's derivation); now it
     calls the shared builder like every other caller. `director` is the
     director seat's own link (studioDirectorLink), the desk this lane
     adds. */
  /* TASK-305: the room name doesn't depend on the key, so it's derived
     once (this SAME shared builder, never re-spelled) to compute the
     key, then the real links are minted keyed — every door into the room
     must carry the SAME password (T-292 DESIGN.md §4.1). No SEAT_SECRET
     (local dev) → roomKey stays undefined and every link mints unkeyed
     (derive-or-dash, live.ts's studioRoomKey docblock). */
  const roomKey = studioRoomKey(studioVdoLinks(config.meeting.vdoRoomPrefix, config.meeting.vdoHost).room) ?? undefined;
  const vdo = studioVdoLinks(config.meeting.vdoRoomPrefix, config.meeting.vdoHost, roomKey);

  /* TASK-306 (0018.06.25 a₿): the director's desk door is the SITE route
     /a/studio/room/<room> on the request's own origin (T-292 DESIGN.md §2
     Page A) — the keyed studio URL leaves this href and the CopyGhost
     beside it: the desk route's own server mints the key into its iframe
     src at request time, so nothing keyed ever sits in this page's HTML
     (the residual exposure T-306's brief names). The PUSH door above
     stays a studio URL — that's HER camera seat, not a room she manages. */
  const director = directorDeskUrl(origin, vdo.room);

  /* TASK-297 (0018.06.25 a₿): the guest door Love hands out is the SITE
     url — /meet/studio/<room> on the request's own origin (T-292 DESIGN.md
     §2 Page B: "the URL the site hands out is OURS, never the vdo host";
     the studio host now appears only inside the iframe src that page's
     own frame route mints, key included — this URL carries none). TASK-306:
     the director door follows the same law (the SITE route below). The
     PUSH door alone stays a studio URL — that's HER camera seat, not a
     link anyone is handed. */
  const guestDoor = meetStudioUrl(origin, vdo.room);

  /* TASK-300: the room's plain human name — brand/rooms.json on the fork
     (~/dev/apps/onecocreation-studio/brand/rooms.json, TASK-262:
     "onecocreation-studio": { title: "Heart Field · the studio" }) — a
     separate repo/deployment this app has no route to, so it rides down
     as a small hardcoded constant, the same way showTitleFallback
     already does for cartridge.copy.productName below. */
  const roomTitle = "Heart Field · the studio";

  /* TASK-244: VDO.Ninja can load a web page as a room source with its own
     "&website=<url-encoded page>" parameter — VERIFIED present in Love's
     fork (ONECocreation/studio, main.js: the non-director AND director
     branches both read urlParams "website" (or its "iframe" alias) and
     publish it as a stream into the room; see SUMMARY for the read-out).
     T-243 landed config.meeting.vdoHost on main before this lane rebased
     onto it, so the studio host reads straight from there — never a new
     literal, and never re-derived from the vdo links above. */
  const studioOrigin = `https://${config.meeting.vdoHost}`;
  const showInStudioUrls = Object.fromEntries(
    STUDIO_SCENES.map((s) => {
      const overlayUrl = overlayUrls[s.id];
      if (s.kind !== "full" || !overlayUrl) return [s.id, null];
      const q = `room=${encodeURIComponent(vdo.room)}&website=${encodeURIComponent(overlayUrl)}&push=scene`;
      return [s.id, `${studioOrigin}/?${q}`];
    }),
  ) as Record<StudioSceneId, string | null>;

  /* TASK-330: the go-live door's own props — the room chips (with minTier
     threaded so the after-hours picker can filter the free Commons out,
     same as /a/live/page.tsx used to do), today's confirmed sessions, the
     meeting rail, and the YouTube channel. studioVdo/studioDirector reuse
     the SAME `vdo`/`director` this page already derived above — one room,
     one key, every door agrees. */
  return (
    <StudioHub
      initial={doc}
      overlayUrls={overlayUrls}
      overlayReady={overlayConfigured()}
      vdo={vdo}
      director={director}
      showInStudioUrls={showInStudioUrls}
      showTitleFallback={cartridge.copy.productName}
      roomTitle={roomTitle}
      roomKeyed={roomKey !== undefined}
      guestDoor={guestDoor}
      goLiveRooms={ROOMS.map((r) => ({ slug: slugOfRoom(r), title: r.title, kind: r.kind, minTier: r.minTier }))}
      goLiveSessions={confirmedToday(bookings)}
      meeting={{
        rail: config.meeting.rail,
        jitsiDomain: config.meeting.jitsiDomain,
        jitsiPrefix: liveRoomPrefix(),
        vdoRoomPrefix: config.meeting.vdoRoomPrefix,
        vdoHost: config.meeting.vdoHost,
        siteOrigin: origin,
      }}
      youtube={LIVE_YOUTUBE}
    />
  );
}
