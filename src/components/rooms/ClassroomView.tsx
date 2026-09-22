"use client";

import { useEffect, useState } from "react";
import VantageSwitcher from "./VantageSwitcher";
import { useRoomVantage } from "./vantage";
import LessonPathView from "./LessonPathView";
import CircleView from "./CircleView";
import StageView from "./StageView";
import ReadingNotice from "./ReadingNotice";
import type { RosterResult } from "./RoomPresence";
import type { RoomPin } from "@/lib/room-pins";
import type { RoomGate } from "@/lib/room-access";
import type { StudioSceneId } from "@/lib/studio/scenes";
import type { Tier } from "@/lib/entitlement";
import type { AfterHoursFeed } from "./AfterHoursDoor";
import type { ReadingNoticeProps } from "./ReadingNotice";
import "./classroom.css";

/**
 * THE CLASSROOM VANTAGE MOUNT — a classroom is THREE rooms (TASK-184,
 * 0018.06.18 a₿, the Admiral's ruling; born C4 of
 * loves-desk-and-classroom-plan.md): **Stage** (the Video layout's shape —
 * live embed, the chat beside it, who's-here folded in as the roster),
 * **Lesson Path** (recordings + previous sessions + the Materials merged
 * in as resources), **The Circle** (the weekly ribbon over the month, the
 * classrooms strip in the standard card layout). The Sanctuary and the
 * separate Video/Materials/People vantages retired — a stale stored pick
 * resolves to the Stage in vantage.ts, never a 404.
 *
 * Sits at `/rooms/[slug]`. Reads the SAME `/api/matrix/rooms` feed
 * RoomsShelf.tsx already proves (the Circle's rooms strip) and `/api/live`
 * (the gold live door), then hands the member's chosen vantage
 * (`useRoomVantage`) off to one of the three.
 */

export interface RoomCardFeedItem {
  slug: string;
  alias: string;
  title: string;
  kind: "class" | "community";
  minTier: string;
  neededName: string | null;
  open: boolean;
}
export interface RoomsFeed {
  signedIn: boolean;
  handle: string | null;
  tier: string | null;
  tierName: string | null;
  rooms: RoomCardFeedItem[];
}
export interface LiveFeed {
  ok: boolean;
  live: boolean;
  kind: "class" | "community" | null;
  room: string | null;
  roomTitle: string | null;
  startedAt: number | null;
  /** TASK-251: the studio doc's active FULL scene (starting/brb/ending) or
   *  null — polled every 20s (same s-maxage=15 cache as the rest of this
   *  feed) so the Stage's video slot can react when Love changes it while
   *  a viewer watches. The room page's own SSR `fullScene` prop below
   *  carries the first paint; this poll carries the updates. */
  scene: Extract<StudioSceneId, "starting" | "brb" | "ending"> | null;
  /** TASK-236: the after-hours door's own state — the SAME live flag's
   *  `afterHours` field, resolved into words server-side. null when unset
   *  or cleared (the room closing clears it for free too). No SSR first
   *  paint (unlike `scene`) — the door is purely poll-driven, the same 20s
   *  breath as the rest of this feed. */
  afterHours: AfterHoursFeed | null;
}

interface Props {
  slug: string;
  alias: string;
  title: string;
  kind: "class" | "community";
  pin: RoomPin | null;
  /** TASK-146: pass-through only — the room page's own site-switches read,
   *  handed to the Stage so it can mount the live embed. See
   *  RoomVideoSlot's docblock for why this client tree never imports
   *  live.ts's liveRoomName() directly. */
  jitsiDomain?: string;
  liveRoom?: string;
  /** TASK-174: pass-through only — the room page's gate decision
   *  (room-access.ts's roomGate, computed server-side), riding ALL THREE
   *  vantages (TASK-184): the Stage's video slot, the Lesson Path's
   *  recordings, the Circle's events all follow the SAME door as the chat. */
  door?: RoomGate;
  doorPackage?: string | null;
  /** TASK-184 · the 429 hunt: the page's ONE roster/presence read per open
   *  (matrix.ts's rosterForRequest — per-request cached, bot-seat), handed
   *  to the Stage's roster. null = the gate closed the room for this
   *  visitor and no read was taken. */
  roster?: RosterResult | null;
  /** TASK-245: pass-through only, the room page's site-switches read
   *  (same shape as jitsiDomain/liveRoom above) — which rail the Stage's
   *  video slot draws and, on the vdo rail, the studio's own address. */
  rail?: "jitsi" | "vdo" | "static";
  vdoHost?: string;
  studioRoom?: string;
  /** TASK-305 (Seam, flagged in work-claims/task-305.md — this file isn't
   *  in the lane's OWNS, but is the only pass-through path to
   *  RoomVideoSlot's view-link mint): pass-through only, same shape as
   *  vdoHost/studioRoom above — the room's derived password
   *  (`live.ts`'s studioRoomKey), or absent when SEAT_SECRET isn't set. */
  roomKey?: string;
  /** TASK-245: pass-through only — the room page's own derivation off the
   *  director's guest roster, handed to the Stage's gallery. */
  onCameraMxids?: readonly string[];
  /** TASK-245: present souls who ARE the stage (the director by name) — never a gallery tile. */
  stageMxids?: readonly string[];
  /** TASK-249: pass-through only — the room page's own derivation: this
   *  viewer's own camera door, set only when Love named THEM as today's
   *  guest and they're present on camera. Null = nothing rendered. */
  cameraDoor?: string | null;
  /** TASK-251: pass-through only — the room page's own derivation off the
   *  studio doc's activeScene (null unless its kind is `full`), the FIRST
   *  paint of what `LiveFeed.scene`'s poll keeps current afterward. */
  fullScene?: Extract<StudioSceneId, "starting" | "brb" | "ending"> | null;
  /** TASK-251: pass-through only — the studio doc's own show title/start
   *  time/after-hours line, SSR'd once alongside fullScene (never
   *  re-polled — only the scene id itself updates live, see LiveFeed.scene). */
  fullSceneShowTitle?: string;
  fullSceneStartsAt?: string;
  fullSceneAfterHoursLine?: string;
  /** TASK-236: this visitor's own signed-in state + tier, server-derived
   *  (the room page's `session`/`visitorTier`) — the after-hours door's own
   *  gate (its target room is a DIFFERENT room than this one, so it can't
   *  reuse `door` above). */
  signedIn?: boolean;
  viewerTier?: Tier | null;
  /** TASK-382: pass-through only — the room page's own T-381 schedule read
   *  (`SiteConfig.reading`, or the reader's own default) plus the ONE
   *  server clock reading (`asOfMs`) both it and `nextReading` used, so the
   *  notice's first paint never calls `Date.now()` itself. Null off the
   *  reading room; the notice mounts only while this AND `!thisRoomLive`
   *  both hold (below). */
  reading?: ReadingNoticeProps | null;
}

export default function ClassroomView({ slug, alias, title, kind, pin, jitsiDomain, liveRoom, door, doorPackage, roster, rail, vdoHost, studioRoom, roomKey, onCameraMxids, stageMxids, fullScene, fullSceneShowTitle, fullSceneStartsAt, fullSceneAfterHoursLine, signedIn, viewerTier, reading, cameraDoor }: Props) {
  const [vantage] = useRoomVantage();
  const [feed, setFeed] = useState<RoomsFeed | null>(null);
  const [live, setLive] = useState<LiveFeed | null>(null);

  useEffect(() => {
    let alive = true;
    fetch("/api/matrix/rooms", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (alive && d?.ok) setFeed(d); })
      .catch(() => {});
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    let alive = true;
    function poll() {
      fetch("/api/live", { cache: "no-store" })
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => { if (alive && d?.ok) setLive(d); })
        .catch(() => {});
    }
    poll();
    const timer = setInterval(poll, 20_000);
    return () => { alive = false; clearInterval(timer); };
  }, []);

  const thisRoomLive = !!live?.live && live.room === slug;
  /* TASK-251: first paint = the room page's own SSR derivation (fullScene
     prop); once the poll above answers, its `scene` field takes over — the
     doc can change while a viewer watches. */
  const activeFullScene = live ? live.scene : fullScene ?? null;

  return (
    <div>
      <div className="cls-bar">
        <VantageSwitcher />
      </div>

      {/* TASK-382: the next-reading notice — vantage-independent (shows
          above whichever of Stage/Lesson Path/Circle is picked), gated OUT
          the instant the room's own live poll (thisRoomLive, above) says
          Love is live. */}
      {reading && !thisRoomLive && <ReadingNotice schedule={reading.schedule} next={reading.next} asOfMs={reading.asOfMs} />}

      {/* TASK-184: exactly three vantages, in the ruling's order */}
      {vantage === "stage" && (
        <StageView slug={slug} alias={alias} title={title} kind={kind} pin={pin} live={thisRoomLive} jitsiDomain={jitsiDomain} liveRoom={liveRoom} door={door} doorPackage={doorPackage} roster={roster} rail={rail} vdoHost={vdoHost} studioRoom={studioRoom} roomKey={roomKey} onCameraMxids={onCameraMxids} stageMxids={stageMxids} cameraDoor={cameraDoor} fullScene={activeFullScene} fullSceneShowTitle={fullSceneShowTitle} fullSceneStartsAt={fullSceneStartsAt} fullSceneAfterHoursLine={fullSceneAfterHoursLine} afterHours={live?.afterHours ?? null} signedIn={signedIn} viewerTier={viewerTier} />
      )}
      {vantage === "lesson" && <LessonPathView slug={slug} alias={alias} title={title} kind={kind} door={door} doorPackage={doorPackage} />}
      {vantage === "circle" && <CircleView feed={feed} live={live} activeSlug={slug} slug={slug} title={title} door={door} doorPackage={doorPackage} />}
    </div>
  );
}
