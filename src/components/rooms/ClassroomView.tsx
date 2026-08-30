"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import VantageSwitcher from "./VantageSwitcher";
import { useRoomVantage } from "./vantage";
import SanctuaryView from "./SanctuaryView";
import LessonPathView from "./LessonPathView";
import CircleView from "./CircleView";
import { TIER_SLUG } from "./tier-slug";
import type { RoomPin } from "@/lib/room-pins";
import "./classroom.css";

/**
 * THE CLASSROOM VANTAGE MOUNT (loves-desk-and-classroom-plan.md, Lane
 * ROOM) — sits at `/rooms/[slug]`, the room route the site already ships.
 * Reads the SAME `/api/matrix/rooms` feed RoomsShelf.tsx already proves
 * (tab list + honest tier pills, softly-locked doors) and `/api/live` (the
 * gold live door), then hands the member's chosen vantage
 * (`useRoomVantage`) off to one of Sanctuary / Lesson Path / Circle.
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
}

function RoomTabs({ feed, activeSlug }: { feed: RoomsFeed | null; activeSlug: string }) {
  if (!feed) return null;
  return (
    <div className="cls-tabs" role="tablist" aria-label="rooms">
      {feed.rooms.map((r) => {
        const active = r.slug === activeSlug;
        if (r.open) {
          return (
            <Link
              key={r.slug}
              href={`/rooms/${r.slug}`}
              role="tab"
              aria-selected={active}
              className="btn btn-sm"
              style={active ? { background: "linear-gradient(135deg,var(--gold-2),var(--gold))", color: "var(--gold-ink)", borderColor: "var(--gold-deep)" } : undefined}
            >
              {r.title}
            </Link>
          );
        }
        return (
          <Link
            key={r.slug}
            href={feed.signedIn ? (r.neededName ? `/packages/${TIER_SLUG[r.minTier] ?? ""}` : "/memberships") : "/login"}
            role="tab"
            aria-selected={false}
            className="btn btn-ghost btn-sm"
            title={r.neededName ? `opens with the ${r.neededName} package` : "opens with any membership"}
          >
            🔒 {r.title}
          </Link>
        );
      })}
    </div>
  );
}

export default function ClassroomView({ slug, alias, title, kind, pin }: Props) {
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
      {vantage === "sanctuary" && <RoomTabs feed={feed} activeSlug={slug} />}

      {vantage === "sanctuary" && (
        <SanctuaryView slug={slug} alias={alias} title={title} kind={kind} pin={pin} live={thisRoomLive} />
      )}
      {vantage === "lesson" && <LessonPathView slug={slug} alias={alias} title={title} kind={kind} />}
      {vantage === "circle" && <CircleView feed={feed} live={live} activeSlug={slug} />}
    </div>
  );
}
