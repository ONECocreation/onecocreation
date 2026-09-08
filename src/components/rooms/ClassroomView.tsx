"use client";

import { useEffect, useState } from "react";
import VantageSwitcher from "./VantageSwitcher";
import { useRoomVantage } from "./vantage";
import LessonPathView from "./LessonPathView";
import CircleView from "./CircleView";
import StageView from "./StageView";
import type { RosterResult } from "./RoomPresence";
import type { RoomPin } from "@/lib/room-pins";
import type { RoomGate } from "@/lib/room-access";
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
}

export default function ClassroomView({ slug, alias, title, kind, pin, jitsiDomain, liveRoom, door, doorPackage, roster }: Props) {
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

  return (
    <div>
      <div className="cls-bar">
        <VantageSwitcher />
      </div>

      {/* TASK-184: exactly three vantages, in the ruling's order */}
      {vantage === "stage" && (
        <StageView slug={slug} alias={alias} title={title} kind={kind} pin={pin} live={thisRoomLive} jitsiDomain={jitsiDomain} liveRoom={liveRoom} door={door} doorPackage={doorPackage} roster={roster} />
      )}
      {vantage === "lesson" && <LessonPathView slug={slug} alias={alias} title={title} kind={kind} door={door} doorPackage={doorPackage} />}
      {vantage === "circle" && <CircleView feed={feed} live={live} activeSlug={slug} slug={slug} title={title} door={door} doorPackage={doorPackage} />}
    </div>
  );
}
