import type { Metadata } from "next";
import { headers } from "next/headers";
import OperatorGate from "@/components/OperatorGate";
import { operatorFromCookieHeader, operatorsConfigured } from "@/lib/operator-auth";
import { ROOMS } from "@/lib/matrix-rooms";
import { slugOfRoom, studioVdoLinks, studioDirectorLink, studioRoomKey, confirmedToday, liveRoomPrefix, LIVE_YOUTUBE } from "@/lib/live";
import { listBookings } from "@/lib/booking-orders";
import { getSiteConfig } from "@/lib/site-config";
import GoLiveRoom from "./go-live-room";

/**
 * /a/live — THE GO-LIVE DOOR (TASK-192, 0018.06.18 a₿ · H69 ruled A). One
 * door on Love's desk, four ways in: Read live on the site (the folded-in
 * class door), YouTube live (T-191's studio VDO links), Discovery call 1:1
 * (today's confirmed bookings from the booking store), Co-create with a
 * guest (the meeting config's rails). The client half holds the strip and
 * the one-door-at-a-time state; this page only GATE-KEEPS and DERIVES —
 * every prop below is a read, nothing is invented.
 *
 * Same gate as every /a room: no operator cookie, the door renders.
 */

export const metadata: Metadata = {
  title: "Go live — admin",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function GoLivePage() {
  const cookie = (await headers()).get("cookie");
  const operator = operatorFromCookieHeader(cookie);
  if (!operator) {
    return <OperatorGate configured={operatorsConfigured()} />;
  }

  const [config, bookings] = await Promise.all([getSiteConfig(), listBookings()]);
  /* TASK-305: same room, so the SAME key every other door into it carries
     (T-292 DESIGN.md §4.1) — the room name is derived once (unkeyed) to
     compute the key, then studioVdo is minted for real, keyed. */
  const roomKey = studioRoomKey(studioVdoLinks(config.meeting.vdoRoomPrefix, config.meeting.vdoHost).room) ?? undefined;
  const studioVdo = studioVdoLinks(config.meeting.vdoRoomPrefix, config.meeting.vdoHost, roomKey);

  return (
    <GoLiveRoom
      rooms={ROOMS.map((r) => ({ slug: slugOfRoom(r), title: r.title, kind: r.kind, minTier: r.minTier }))}
      studioVdo={studioVdo}
      studioDirector={studioDirectorLink(config.meeting.vdoHost, studioVdo.room, roomKey)}
      sessions={confirmedToday(bookings)}
      meeting={{
        rail: config.meeting.rail,
        jitsiDomain: config.meeting.jitsiDomain,
        jitsiPrefix: liveRoomPrefix(),
        vdoRoomPrefix: config.meeting.vdoRoomPrefix,
        vdoHost: config.meeting.vdoHost,
      }}
      youtube={LIVE_YOUTUBE}
    />
  );
}
