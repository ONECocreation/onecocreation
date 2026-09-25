import Link from "next/link";
import { clockWords } from "@/lib/reading-day";
import type { EncoreFloorDoor, QaDoor } from "@/lib/reading-day-doors";
import ReadingDayUnlockButton from "./ReadingDayUnlockButton";

/**
 * THE READING DAY BRICK (TASK-467, block 968,561) — Love, the call with
 * her, Thu 2026-09-24 (walk-968482/walk.txt, 42:41–45:03): "just put this
 * whole room brick right in the other on the weekly reading page … with
 * three buttons of the times … the reading, then the second stage, then
 * the q&a." Drawn in the Heart Field room brick's own shell — the exact
 * `card room-card` classes `PackageRoomsCard.tsx` pins verbatim — holding
 * THREE rows instead of one package's rooms-list-plus-one-door: the
 * `kit-rows`/`kit-rows-end` grid `Stage1Card.tsx`/`Stage2Details.tsx`
 * already use elsewhere on this same page (one row, one control, on the
 * row's own right edge — the /a uniformity law's own shape, reused here
 * on the public side).
 *
 * PURE presentation over already-derived props — no fetch, no
 * `Date.now()`, renderToStaticMarkup-testable for every state
 * (`tests/reading-day-467.test.ts`). `ReadingDay.tsx` (the async server
 * wrapper) is the only caller and the only place that reads the session,
 * the schedule, and the live store/entitlement sources.
 */

export interface ReadingDayBodyProps {
  /** the reading schedule's own IANA zone — every clock word below reads
   *  through it, never a second zone */
  tz: string;
  readingStartsAtMs: number;
  encoreStartsAtMs: number;
  qaStartsAtMs: number;
  /** row 1 only — rows 2/3 gate on entitlement alone (the cart itself
   *  meets a signed-out visitor with its own sign-in gate, spec's words) */
  signedIn: boolean;
  encoreEntitled: boolean;
  encoreFloor: EncoreFloorDoor;
  qaEntitled: boolean;
  /** the tier-C community room's own address (derived in the wrapper from
   *  matrix-rooms.ts, never a literal room path here) */
  qaRoomHref: string;
  qaOffer: QaDoor;
}

export default function ReadingDayBody({
  tz,
  readingStartsAtMs,
  encoreStartsAtMs,
  qaStartsAtMs,
  signedIn,
  encoreEntitled,
  encoreFloor,
  qaEntitled,
  qaRoomHref,
  qaOffer,
}: ReadingDayBodyProps) {
  return (
    <div className="card room-card kit-day">
      <h2 className="kit-h2">The day&apos;s agenda</h2>
      <ul className="kit-rows" aria-label="The day's agenda">
        {/* ROW 1 — the reading itself, free, in the Heart Field */}
        <li>
          <span>
            <b>{`${clockWords(readingStartsAtMs, tz)} · The Reading`}</b>
            <em>Free. Love reads live in the Heart Field.</em>
          </span>
          <span className="kit-rows-end">
            {signedIn ? (
              <Link className="kit-btn kit-btn-main kit-btn-sm" href="/rooms/heart-field">
                Go to the Heart Field
              </Link>
            ) : (
              <Link className="kit-btn kit-btn-main kit-btn-sm" href="#sign-up">
                Sign me up
              </Link>
            )}
          </span>
        </li>

        {/* ROW 2 — the Encore in the Playground */}
        <li>
          <span>
            <b>{`${clockWords(encoreStartsAtMs, tz)} · The Encore in the Playground`}</b>
            <em>A live group video call with Love, going deeper into the book.</em>
            {/* who it's for is always said; the price rides only when the
                store answers one (Number One's review, block 968,561) */}
            {!encoreEntitled && (
              <em>
                {encoreFloor.price
                  ? `Comes with ${encoreFloor.name} and up. ${encoreFloor.price} a month.`
                  : `Comes with ${encoreFloor.name} and up.`}
              </em>
            )}
          </span>
          <span className="kit-rows-end">
            {encoreEntitled ? (
              <Link className="kit-btn kit-btn-main kit-btn-sm" href="/reading/playground">
                Join the Playground
              </Link>
            ) : (
              /* TASK-467: "Unlock with {name}" measured 258–328px at
                 kit-btn-sm (nowrap, R-071) — wider than the card's own
                 content width (~308px) on a 360px phone even stacked full
                 width, and a future tier rename could only make it worse.
                 The name/price already live in the quiet line above; the
                 button itself stays short and constant. */
              <ReadingDayUnlockButton
                itemId={encoreFloor.itemId}
                label="Unlock the Encore"
                ariaLabel={`Unlock the Encore with ${encoreFloor.name}`}
              />
            )}
          </span>
        </li>

        {/* ROW 3 — the channeled Q&A with Love */}
        <li>
          <span>
            <b>{`${clockWords(qaStartsAtMs, tz)} · The Q&A with Love`}</b>
            <em>Bring your questions. Love answers live.</em>
            {!qaEntitled && qaOffer.passLive && qaOffer.price && <em>{`${qaOffer.price} once.`}</em>}
            {/* Evening Star always named (it includes the Q&A); its price
                only when the store answers one */}
            {!qaEntitled && (
              <em>
                {qaOffer.passLive && qaOffer.price ? "Or it comes with " : "Comes with "}
                <Link href={qaOffer.eveningStar.href}>{qaOffer.eveningStar.name}</Link>
                {qaOffer.eveningStar.price ? `. ${qaOffer.eveningStar.price} a month.` : "."}
              </em>
            )}
          </span>
          <span className="kit-rows-end">
            {qaEntitled ? (
              <Link className="kit-btn kit-btn-main kit-btn-sm" href={qaRoomHref}>
                Join the Q&A
              </Link>
            ) : (
              <ReadingDayUnlockButton itemId={qaOffer.itemId} label="Unlock the Q&A" />
            )}
          </span>
        </li>
      </ul>
    </div>
  );
}
