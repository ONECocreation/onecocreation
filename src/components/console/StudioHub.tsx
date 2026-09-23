"use client";

/**
 * StudioHub — TASK-330 (0018.06.26 a₿ · Admiral's pitch · RULED Studio;
 * folded in after review, Ms. Kimi REVIEW-DRAFTS-330-333 + Astra r4 §4,
 * 0018.06.26 · 12:00 a₿): Live + Studio merge into ONE room, "Studio".
 * Being in the studio opens the go-live door too — this is the wrapper
 * that stacks the two, DESK FIRST, LIVE SECOND (Astra r4 §4's ruled
 * shape — never a tab switcher).
 *
 * Both children stay exactly what they always were:
 *  - StudioRoom (src/components/studio-overlay/StudioRoom.tsx, T-333's
 *    territory — read-only here) — the director's desk: room links, Send
 *    to user, then its own collapsed scene/overlay fold.
 *  - GoLiveRoom (src/app/a/live/go-live-room.tsx, unowned by this lane,
 *    imported unchanged) — the four go-live doors (Read live on the
 *    site, YouTube, Discovery call, Co-create), including its own
 *    after-hours row once the "Read live" door is opened.
 *
 * The room-state line at the top ("Studio · Live" / "Studio · Not live")
 * is a READ of the SAME /api/admin/live flag GoLiveRoom already polls —
 * never a write, never a second store, and never fired by mounting this
 * page: opening Studio never starts streaming, changes door access, or
 * notifies guests. Relay readiness (the overlay token) rides its own
 * separate line, straight from `overlayReady` — the same
 * overlayConfigured() the page already computed server-side for
 * StudioRoom, just also surfaced here (no new derivation).
 *
 * "Go to live controls" is a plain in-page anchor to #studio-live — no
 * JS required, works the same with or without hydration.
 */

import { useEffect, useState } from "react";
import StudioRoom from "@/components/studio-overlay/StudioRoom";
import GoLiveRoom, { type GoLiveMeeting } from "@/app/a/live/go-live-room";
import { SectionHead, Chip } from "@/components/console/glass";
import type { StudioDoc } from "@/lib/studio/doc";
import type { StudioSceneId } from "@/lib/studio/scenes";
import type { DoorRoom } from "@/components/console/LiveDoorCard";
import type { TodaySession } from "@/lib/live";

interface RoomStateFeed {
  live: boolean;
  scene?: { active: StudioSceneId; startsAt?: string };
}

/** Read-only poll of the same flag GoLiveRoom's own `load()` reads — this
 *  is a second GET of an idempotent, side-effect-free endpoint, never a
 *  write and never threaded into GoLiveRoom (that component is unowned
 *  here and keeps its own independent fetch, unchanged). */
function useRoomState(): RoomStateFeed | null {
  const [state, setState] = useState<RoomStateFeed | null>(null);
  useEffect(() => {
    let stopped = false;
    fetch("/api/admin/live", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (stopped || !d?.ok) return;
        setState({ live: !!d.state?.live, scene: d.scene });
      })
      .catch(() => {
        if (!stopped) setState(null);
      });
    return () => {
      stopped = true;
    };
  }, []);
  return state;
}

function roomStateLine(state: RoomStateFeed | null): string {
  if (!state) return "Studio · reading…";
  if (state.live) return "Studio · Live";
  if (state.scene?.active === "starting" && state.scene.startsAt) {
    const t = new Date(state.scene.startsAt);
    if (!Number.isNaN(t.getTime())) {
      const when = t.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
      return `Studio · Not live — starts ${when}`;
    }
  }
  return "Studio · Not live";
}

export interface StudioHubProps {
  /* ── the director's desk (StudioRoom's own props, unchanged) ────────── */
  initial: StudioDoc;
  overlayUrls: Record<StudioSceneId, string | null>;
  overlayReady: boolean;
  vdo: { room: string; push: string; guest: string };
  director: string;
  showInStudioUrls: Record<StudioSceneId, string | null>;
  showTitleFallback: string;
  roomTitle?: string;
  roomKeyed?: boolean;
  guestDoor: string;
  /* TASK-337: the Jitsi one-time door's own props — pass-through only, no
     StudioHub-owned logic. */
  jitsiDomain?: string;
  initialJitsiRoom?: string | null;
  /* ── the go-live door (GoLiveRoom's own props, unchanged) ────────────── */
  goLiveRooms: DoorRoom[];
  goLiveSessions: TodaySession[];
  meeting: GoLiveMeeting;
  youtube: string;
}

export default function StudioHub({
  initial,
  overlayUrls,
  overlayReady,
  vdo,
  director,
  showInStudioUrls,
  showTitleFallback,
  roomTitle,
  roomKeyed,
  guestDoor,
  jitsiDomain,
  initialJitsiRoom,
  goLiveRooms,
  goLiveSessions,
  meeting,
  youtube,
}: StudioHubProps) {
  const state = useRoomState();

  return (
    <div>
      <div
        style={{
          display: "flex", flexWrap: "wrap", alignItems: "center", gap: "6px 14px",
          margin: "0 0 14px",
        }}
      >
        <Chip tone={state?.live ? "rose" : "grey"}>{roomStateLine(state)}</Chip>
        <span style={{ fontSize: ".76rem", color: "var(--muted)" }}>
          {overlayReady ? "Relay ready" : "Relay not configured"}
        </span>
        <a href="#studio-live" className="btn btn-sm btn-ghost" style={{ marginLeft: "auto" }}>
          Go to live controls ↓
        </a>
      </div>

      {/* desk first (Astra r4 §4) */}
      <StudioRoom
        initial={initial}
        overlayUrls={overlayUrls}
        overlayReady={overlayReady}
        vdo={vdo}
        director={director}
        showInStudioUrls={showInStudioUrls}
        showTitleFallback={showTitleFallback}
        roomTitle={roomTitle}
        roomKeyed={roomKeyed}
        guestDoor={guestDoor}
        jitsiDomain={jitsiDomain}
        initialJitsiRoom={initialJitsiRoom}
      />

      {/* live second (Astra r4 §4) */}
      <div id="studio-live" style={{ marginTop: 22, borderTop: "2px solid rgba(139,118,196,.35)", paddingTop: 4 }}>
        <SectionHead label="Live session" />
        <GoLiveRoom
          rooms={goLiveRooms}
          studioVdo={vdo}
          studioDirector={director}
          studioGuestDoor={guestDoor}
          sessions={goLiveSessions}
          meeting={meeting}
          youtube={youtube}
        />
      </div>
    </div>
  );
}
