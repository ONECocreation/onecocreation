"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ROOMS } from "@/lib/matrix-rooms";
import { roomGate, signInDoorLine, signInDoorHref } from "@/lib/room-access";
import type { Tier } from "@/lib/entitlement";

/**
 * THE AFTER-HOURS DOOR (TASK-236, 0018.06.23 a₿ — Love's call #3, "the
 * director's cut": "after a reading, Weekly Intuitive members join Love in
 * the members' room 45 minutes later for the deeper dive"). A NEW region on
 * the Stage, right after the video (StageView.tsx) — NOT inside
 * RoomVideoSlot, whose Jitsi branch is byte-pinned
 * (`tests/stage-shows-the-studio.test.ts`).
 *
 * The data rides the SAME site-wide live flag (`live.ts`'s `LiveState.
 * afterHours`) every room's Stage polls via ClassroomView's existing 20s
 * `/api/live` read — this leaf never fetches on its own, it only reads the
 * prop ClassroomView → StageView hand down. Visible while `at` is in the
 * future OR within the last 60 minutes past (a latecomer still finds the
 * door); older than that, or unset, renders NOTHING — not even the
 * region's own border (the whole wrapper lives here, not a StageView
 * shell, so a dark door leaves zero DOM behind).
 *
 * The DOOR itself: the after-hours room is a DIFFERENT room than whichever
 * Stage this mounts on, so it can't reuse that room's own `door` prop —
 * this reuses room-access.ts's ONE `roomGate` decision instead, against
 * the target room's own `minTier` (looked up here via `matrix-rooms.ts`'s
 * pure, client-importable ROOMS — never `live.ts`'s `roomForSlug`, whose
 * entitlement/mail-queue chain would drag the server-only vault into this
 * client bundle, the Turbopack lesson matrix-rooms.ts's own docblock
 * records):
 *  · satisfied (signed in, tier clears the room) → `btn btn-sm btn-ghost`
 *    "Go deeper in <room title>" → `/rooms/<slug>`;
 *  · signed in, tier too low → the deeper dive's own package line (not the
 *    stage's `packageDoorLine` — the STAGE is open to them; the dive is not) +
 *    a ghost link to `/packages/<packageSlug>`;
 *  · signed out → the sign-in door line (`signInDoorLine`) + a ghost
 *    "Sign in · join free" link.
 * Ghost only, everywhere — the gold pill stays the money/join door, never
 * this one (the house's gold law).
 *
 * Legibility: `.cl-after-hours` (classroom.css) rides the SAME `.card`
 * panel + `--ink-body`/`--muted` ink the rest of this file's regions
 * already prove at 4.5:1 in both themes — no new colors invented. The
 * countdown is WORDS ("we go deeper in N minutes" / "we're going deeper
 * now"), never a color-coded badge.
 */

export interface AfterHoursFeed {
  /** the target room's slug — resolvable through ROOMS, never the free
   *  Commons (the write route and the read-side sanitise both refuse it) */
  room: string;
  roomTitle: string;
  /** TIERS' own package name (the member-facing word — "Weekly Intuitive") */
  package: string;
  /** the /packages/[slug] door; null only if the config ever drifts —
   *  derive-or-dash, never a broken link */
  packageSlug: string | null;
  /** unix SECONDS */
  at: number;
}

function minutesLeft(atSeconds: number, nowMs: number): number {
  return Math.ceil((atSeconds * 1000 - nowMs) / 60_000);
}

export default function AfterHoursDoor({
  afterHours,
  signedIn,
  viewerTier,
}: {
  afterHours: AfterHoursFeed | null;
  signedIn?: boolean;
  viewerTier?: Tier | null;
}) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!afterHours) return;
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, [afterHours]);

  if (!afterHours) return null;
  const minsLeft = minutesLeft(afterHours.at, now);
  if (minsLeft < -60) return null; // more than an hour past — the door has closed

  const room = ROOMS.find((r) => r.id.slice(1, r.id.indexOf(":")) === afterHours.room);
  if (!room) return null; // the sanitise upstream should make this unreachable — honest nothing over a guess
  if (room.hidden) return null; // TASK-465: a hidden room's page 404s, so never a door to it

  const gate = roomGate(room.minTier, { signedIn: !!signedIn, tier: viewerTier ?? null });
  const line =
    minsLeft > 0
      ? `${afterHours.package} members — we go deeper in ${minsLeft} minute${minsLeft === 1 ? "" : "s"}`
      : "we're going deeper now";

  return (
    <div role="region" className="cl-region cl-area-after-hours" data-region="after-hours" aria-label="Deeper dive">
      <div className="card cl-after-hours">
        <p className="cl-after-hours__line">{line}</p>
        {gate === "open" ? (
          <Link href={`/rooms/${afterHours.room}`} className="btn btn-sm btn-ghost">
            Go deeper in {afterHours.roomTitle}
          </Link>
        ) : gate === "package" ? (
          <>
            <p className="cl-after-hours__sub">The deeper dive opens with the {afterHours.package} package — and everything above it.</p>
            {afterHours.packageSlug && (
              <Link href={`/packages/${afterHours.packageSlug}`} className="btn btn-sm btn-ghost">
                See the {afterHours.package} package
              </Link>
            )}
          </>
        ) : (
          <>
            <p className="cl-after-hours__sub">{signInDoorLine(afterHours.roomTitle)}</p>
            <Link href={signInDoorHref(afterHours.room)} className="btn btn-sm btn-ghost">
              Sign in · join free
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
