"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Card from "@/components/kit/Card";
import { signInDoorLine, signInDoorHref, packageDoorLine } from "@/lib/room-access";
import { READING_ROOM_SLUG } from "@/lib/reading-room";
import type { Stage2Decision, Stage2PackageDoor } from "@/lib/stage2-access";

/**
 * STAGE 2 DOOR (TASK-392, Build 5; TASK-439, block 968,218 + Amendment 1
 * of block 968,222) — the member-facing door into the after-reading Jitsi
 * pilot, now a PAID door. The tier check lives in the ROUTE
 * (`/api/stage2`, ruling 1 — tier A and above); this component renders
 * the route's `decision` and nothing else. It never imports site-config,
 * matrix-rooms, entitlement or member-tier.
 *
 * The four render states follow the decision: `hidden` (and the pre-poll
 * and joined states) render NOTHING — AfterHoursDoor.tsx's own `if
 * (!afterHours) return null` idiom, no DOM left behind; `signin` offers
 * the sign-in door; `package` names the package (and, when the one-week
 * pass is on the shelf, offers it — the pass fetch repeats the tier
 * page's basket-button ten-line shape on kit buttons, never importing
 * that button: it renders legacy gold); `open` shows the join button, or the unreachable
 * line when the host isn't answering. Buttons ride the kit, as /reading
 * does — no legacy `.btn`, no gold, no inline style, no new CSS.
 *
 * The polled state below is DISPLAY ONLY (Astra's review, finding 3):
 * the "Join" click does its OWN fresh, uncached re-check at the instant
 * of the click and joins ONLY on that fresh answer (`decision === "open"`
 * && reachable && room) — a click after the poll's last snapshot but
 * after a logout, a close, a midnight-Denver expiry, or a rotation
 * elsewhere always re-authorizes against the current truth rather than
 * replaying a stale one. The fresh answer is applied to the displayed
 * state AT ONCE, so a changed decision shows on the click, not one poll
 * later; a network failure or non-ok answer says so in words.
 *
 * There is no leave-callback prop on this component — it returns `null`
 * the instant `joined` is true, so a callback it could never invoke would
 * be dead code; the leave control lives in `StageView.tsx` itself, always
 * visible, since `JitsiRoom.tsx` gives its parent no way to know the call
 * ended or failed.
 */

export interface Stage2DoorProps {
  jitsiDomain: string;
  joined: boolean;
  onJoin: (room: string) => void;
  signedIn?: boolean;
  /** where the signin door points — T-438 passes
   *  "/login?next=%2Freading" from /reading; defaults to today's door
   *  back into the reading room. */
  signInHref?: string;
}

interface PolledState {
  decision: Stage2Decision | null;
  reachable: boolean | null;
  room: string | null;
  pkg: Stage2PackageDoor | null;
}

const CLOSED: PolledState = { decision: null, reachable: null, room: null, pkg: null };
/** mirrors ClassroomView.tsx's own /api/live poll cadence — a sibling
 *  poll, not a shared one; this leaf is self-contained by design. */
const POLL_MS = 20_000;

/** The wire body -> display state. `decision` is the contract; the
 *  `open` fallback only shields a stale deploy pairing. */
function toPolled(d: {
  decision?: Stage2Decision;
  open?: boolean;
  reachable?: boolean | null;
  room?: string | null;
  package?: Stage2PackageDoor | null;
}): PolledState {
  return {
    decision: d.decision ?? (d.open ? "open" : "hidden"),
    reachable: d.reachable ?? null,
    room: d.room ?? null,
    pkg: d.package ?? null,
  };
}

export interface Stage2DoorBodyProps {
  decision: Stage2Decision | null;
  reachable: boolean | null;
  pkg: Stage2PackageDoor | null;
  joining: boolean;
  weekBusy: boolean;
  note: string | null;
  signInHref?: string;
  onJoinClick: () => void;
  onTryWeek: (itemId: string) => void;
}

/** The pure render — props in, markup out (the repo has no jsdom; the
 *  tests render every decision through renderToStaticMarkup). */
export function Stage2DoorBody({
  decision,
  reachable,
  pkg,
  joining,
  weekBusy,
  note,
  signInHref = signInDoorHref(READING_ROOM_SLUG),
  onJoinClick,
  onTryWeek,
}: Stage2DoorBodyProps) {
  if (decision === null || decision === "hidden") return null;
  const week = decision === "package" && pkg ? pkg.week : null;
  return (
    <div role="region" className="cl-region cl-area-stage2" data-region="stage2" aria-label="The Playground">
      <Card>
        <div className="kit-stack">
          {decision === "signin" && (
            <>
              <div className="kit-body">{signInDoorLine("The Playground")}</div>
              <div className="kit-btn-row kitx-actions">
                <Link href={signInHref} className="kit-btn kit-btn-second kit-btn-sm">
                  Sign in
                </Link>
              </div>
            </>
          )}
          {decision === "package" && (
            <>
              {/* Amendment 2 (A8, block 968,230 — the Admiral: Stage 2 is
                  opened by the BOTTOM tier and by a one-week pass, so the
                  shared "and everything above it" line reads wrong here;
                  packageDoorLine itself stays untouched for the five room
                  doors that share it). A6: the label says nothing the line
                  above already says — and fits the kit's 320px box.
                  TASK-465 (block 968,561, ruling C — no em dash in visible
                  copy, "this would be considered slop"): the one-line,
                  one-dash sentence became two plain sentences. */}
              <div className="kit-body">
                {pkg
                  ? week
                    ? `The Playground comes with every membership from ${pkg.name} up. Or try it with a one-week pass.`
                    : `The Playground comes with every membership from ${pkg.name} up.`
                  : packageDoorLine(null)}
              </div>
              {pkg && (
                <div className="kit-btn-row kitx-actions">
                  <Link href={pkg.href} className="kit-btn kit-btn-second kit-btn-sm">
                    See the package
                  </Link>
                  {week && (
                    <button
                      type="button"
                      className="kit-btn kit-btn-second kit-btn-sm"
                      disabled={weekBusy}
                      onClick={() => onTryWeek(week.itemId)}
                    >
                      {weekBusy ? "Adding…" : `Try one week for ${week.price}`}
                    </button>
                  )}
                </div>
              )}
            </>
          )}
          {decision === "open" &&
            (reachable ? (
              <div className="kit-btn-row kitx-actions">
                <button type="button" className="kit-btn kit-btn-main kit-btn-sm" disabled={joining} onClick={onJoinClick}>
                  {joining ? "Joining…" : "Join the Playground"}
                </button>
              </div>
            ) : (
              <div>The Playground isn&apos;t answering right now.</div>
            ))}
          {note && <div className="kit-text-quiet">{note}</div>}
        </div>
      </Card>
    </div>
  );
}

export default function Stage2Door({ joined, onJoin, signInHref }: Stage2DoorProps) {
  const [state, setState] = useState<PolledState>(CLOSED);
  const [joining, setJoining] = useState(false);
  const [weekBusy, setWeekBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    if (joined) return;
    let alive = true;
    function poll() {
      fetch("/api/stage2", { cache: "no-store" })
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => {
          if (alive && d?.ok) setState(toPolled(d));
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

  /* the door disappears entirely (no DOM left behind) while StageView is
     already showing the embed */
  if (joined) return null;

  async function join() {
    setJoining(true);
    setNote(null);
    try {
      const res = await fetch("/api/stage2", { cache: "no-store" });
      const fresh = res.ok ? await res.json() : null;
      if (fresh?.ok) {
        /* the fresh answer repaints the door AT ONCE — a decision that
           changed since the last poll shows on this click, not 20 s
           later; the join itself rides the fresh answer only */
        setState(toPolled(fresh));
        if (fresh.decision === "open" && fresh.reachable && fresh.room) {
          onJoin(fresh.room as string);
        }
      } else {
        setNote("The Playground couldn't be reached just now. Try again.");
      }
    } catch {
      setNote("The Playground couldn't be reached just now. Try again.");
    } finally {
      setJoining(false);
    }
  }

  /* the one-week pass (Amendment A3) — the tier page's basket-button
     fetch shape, on kit buttons; the route's own sentence (or these
     words) shows beneath on a failed add */
  async function tryWeek(itemId: string) {
    setWeekBusy(true);
    setNote(null);
    const res = await fetch("/api/cart", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ itemId }),
    })
      .then((r) => r.json())
      .catch(() => null);
    if (res?.ok) {
      window.dispatchEvent(new Event("oc-cart-changed"));
      window.location.assign("/cart");
    } else {
      setNote(res?.reason ?? "could not add. Try again.");
      setWeekBusy(false);
    }
  }

  return (
    <Stage2DoorBody
      decision={state.decision}
      reachable={state.reachable}
      pkg={state.pkg}
      joining={joining}
      weekBusy={weekBusy}
      note={note}
      signInHref={signInHref}
      onJoinClick={join}
      onTryWeek={tryWeek}
    />
  );
}
