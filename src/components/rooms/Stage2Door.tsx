"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Card from "@/components/kit/Card";
import { signInDoorLine, signInDoorHref } from "@/lib/room-access";
import { READING_ROOM_SLUG } from "@/lib/reading-room";

/**
 * STAGE 2 DOOR (TASK-392, Build 5) — the member-facing door into the
 * after-reading Jitsi pilot. Mirrors `AfterHoursDoor.tsx`'s region/gate
 * shape: a sibling region on the Stage, mounted from `StageView.tsx`
 * right after `AfterHoursDoor` — never inside `RoomVideoSlot`.
 *
 * This is member-gated link ISSUANCE, never member-only CONFERENCING
 * (Ground) — the deployed Jitsi has no lobby; once a member holds a
 * working link they are in, the same as every other room on this
 * deployment. The polled state below is DISPLAY ONLY (Astra's review,
 * finding 3): the "Join" click does its OWN fresh, uncached re-check at
 * the instant of the click and joins ONLY on that fresh answer — a click
 * after the poll's last snapshot but after a logout, a close, or a
 * rotation elsewhere always re-authorizes against the current truth
 * rather than replaying a stale one.
 *
 * No `onLeave` prop — this component returns `null` while `joined`, so a
 * prop it could never render would be dead code; the leave control lives
 * in `StageView.tsx` itself, always visible, since `JitsiRoom.tsx` gives
 * its parent no way to know the call ended or failed.
 */

export interface Stage2DoorProps {
  jitsiDomain: string;
  joined: boolean;
  onJoin: (room: string) => void;
  signedIn?: boolean;
}

interface PolledState {
  open: boolean;
  reachable: boolean | null;
  room: string | null;
}

const CLOSED: PolledState = { open: false, reachable: null, room: null };
/** mirrors ClassroomView.tsx's own /api/live poll cadence — a sibling
 *  poll, not a shared one; this leaf is self-contained by design. */
const POLL_MS = 20_000;

export default function Stage2Door({ joined, onJoin, signedIn }: Stage2DoorProps) {
  const [state, setState] = useState<PolledState>(CLOSED);
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    if (joined) return;
    let alive = true;
    function poll() {
      fetch("/api/stage2", { cache: "no-store" })
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => {
          if (alive && d?.ok) setState({ open: !!d.open, reachable: d.reachable ?? null, room: d.room ?? null });
        })
        .catch(() => {
          /* a missed poll leaves the last-known display state — the
             click-time re-check below is what actually authorizes a
             join, never this poll */
        });
    }
    poll();
    const id = setInterval(poll, POLL_MS);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [joined]);

  /* the door disappears entirely (no DOM left behind) while there is
     nothing to show — AfterHoursDoor.tsx's own `if (!afterHours) return
     null` idiom — or while StageView is already showing the embed */
  if (joined || !state.open) return null;

  async function join() {
    setJoining(true);
    try {
      const res = await fetch("/api/stage2", { cache: "no-store" });
      const fresh = res.ok ? await res.json() : null;
      if (fresh?.ok && fresh.open && fresh.reachable && fresh.room) {
        onJoin(fresh.room as string);
      }
      /* a fresh answer that fails open/reachable/room shows the matching
         branch instead on the next poll tick — never a silent no-op */
    } finally {
      setJoining(false);
    }
  }

  return (
    <div role="region" className="cl-region cl-area-stage2" data-region="stage2" aria-label="Stage 2">
      <Card>
        <div className="kit-stack">
          {!signedIn ? (
            <>
              <div>{signInDoorLine("Stage 2")}</div>
              <Link href={signInDoorHref(READING_ROOM_SLUG)} className="btn btn-sm btn-ghost">
                Sign in · join free
              </Link>
            </>
          ) : !state.reachable ? (
            <div>Stage 2 isn&apos;t answering right now.</div>
          ) : (
            <button type="button" className="btn btn-ghost btn-sm" disabled={joining} onClick={join}>
              {joining ? "Joining…" : "Join Stage 2 — come up"}
            </button>
          )}
        </div>
      </Card>
    </div>
  );
}
