import Link from "next/link";
import { clockWords } from "@/lib/reading-day";
import type { EncoreFloorDoor, QaDoor } from "@/lib/reading-day-doors";
import ReadingDayUnlockButton from "./ReadingDayUnlockButton";
import ReadingPartSelectLink from "./ReadingPartSelectLink";
import ReadingDayOpenNotice from "./ReadingDayOpenNotice";

/**
 * THE READING DAY BRICK (TASK-467, block 968,561; TASK-469, block
 * 968,567) — Love, the call with her, Thu 2026-09-24
 * (walk-968482/walk.txt, 42:41–45:03): "just put this whole room brick
 * right in the other on the weekly reading page … with three buttons of
 * the times … the reading, then the second stage, then the q&a." Drawn
 * in the Heart Field room brick's own shell — the exact `card room-card`
 * classes `PackageRoomsCard.tsx` pins verbatim — holding FOUR rows
 * instead of one package's rooms-list-plus-one-door: the
 * `kit-rows`/`kit-rows-end` grid `Stage1Card.tsx`/`Stage2Details.tsx`
 * already use elsewhere on this same page (one row, one control, on the
 * row's own right edge — the /a uniformity law's own shape, reused here
 * on the public side).
 *
 * TASK-469 (block 968,567): Love, passed on by the Admiral: "will you
 * make a 12:12 button that is linked straight to the stage where
 * everyone gets to see everyone? I wanna have housewarming with
 * introductions and movement before the reading." The Admiral: "yes lets
 * cut the 12:12 room." This adds only a new FIRST row, free, no lock, the
 * exact two buttons the Reading row already carries.
 *
 * TASK-471 (block 968,624) — Stage 1 becomes TWO-WAY and lives ON
 * /reading (ReadingStage.tsx mounts the room in place); the ONLY door for
 * a signed-in visitor is the stage section on THIS SAME PAGE (`#stage`),
 * never `/rooms/heart-field` — that door is retired from both of these
 * rows. A signed-out visitor still meets the sign-up anchor, unchanged.
 *
 * TASK-473 (block 968,624, the Admiral's flow ruling) — "the agenda rows'
 * buttons ARE the time buttons": every row's own control now picks that
 * part for the top screen (`ReadingPartSelectLink`, an in-page `#stage`
 * anchor that also flips the shared selection — no page change), never a
 * Link to `/reading/playground` or to the Q&A's room directly. Row 3's
 * title drops "the Encore in the Playground" for the neutral "The book
 * talk" (no "Encore"/"Playground" word survives anywhere on /reading);
 * its internal ids (`encoreFloor`, `encoreEntitled`, `ENCORE_TIME`) are
 * UNCHANGED — only visible copy moved. One quiet line above the rows
 * (`ReadingDayOpenNotice`) names whichever door just opened elsewhere —
 * "one control per row" stays true; the notice is not a second control.
 *
 * PURE presentation over already-derived props — no fetch, no
 * `Date.now()`, renderToStaticMarkup-testable for every state
 * (`tests/reading-day-467.test.ts`, `tests/housewarming-469.test.ts`).
 * `ReadingDay.tsx` (the async server wrapper) is the only caller and the
 * only place that reads the session, the schedule, and the live
 * store/entitlement sources.
 */

export interface ReadingDayBodyProps {
  /** the reading schedule's own IANA zone — every clock word below reads
   *  through it, never a second zone */
  tz: string;
  housewarmingStartsAtMs: number;
  readingStartsAtMs: number;
  encoreStartsAtMs: number;
  qaStartsAtMs: number;
  /** rows 1 and 2 only — rows 3/4 gate on entitlement alone (the cart
   *  itself meets a signed-out visitor with its own sign-in gate, spec's
   *  words) */
  signedIn: boolean;
  encoreEntitled: boolean;
  encoreFloor: EncoreFloorDoor;
  qaEntitled: boolean;
  qaOffer: QaDoor;
}

export default function ReadingDayBody({
  tz,
  housewarmingStartsAtMs,
  readingStartsAtMs,
  encoreStartsAtMs,
  qaStartsAtMs,
  signedIn,
  encoreEntitled,
  encoreFloor,
  qaEntitled,
  qaOffer,
}: ReadingDayBodyProps) {
  return (
    <div className="card room-card kit-day">
      <h2 className="kit-h2">The day&apos;s agenda</h2>
      <ReadingDayOpenNotice />
      <ul className="kit-rows" aria-label="The day's agenda">
        {/* ROW 1 — the Housewarming (TASK-469, block 968,567): free, no
            lock, before the reading, the same door as Row 2 (the two-way
            call itself is Love's own /a/studio action, no code here).
            TASK-473: the button picks Part 1 for the top screen — the
            SAME door as Row 2, so picking either just changes which
            clock word is highlighted, never a different room. */}
        <li>
          <span>
            <b>{`${clockWords(housewarmingStartsAtMs, tz)} · The Housewarming`}</b>
            <em>Free. Introductions and movement with Love. Everyone&apos;s on camera.</em>
          </span>
          <span className="kit-rows-end">
            {signedIn ? (
              <ReadingPartSelectLink part={1}>Watch the Housewarming</ReadingPartSelectLink>
            ) : (
              <Link className="kit-btn kit-btn-main kit-btn-sm" href="#sign-up">
                Sign me up
              </Link>
            )}
          </span>
        </li>

        {/* ROW 2 — the reading itself, free, in the two-way stage above */}
        <li>
          <span>
            <b>{`${clockWords(readingStartsAtMs, tz)} · The Reading`}</b>
            <em>Free. Love reads live, right here on this page.</em>
          </span>
          <span className="kit-rows-end">
            {signedIn ? (
              <ReadingPartSelectLink part={2}>Watch the Reading</ReadingPartSelectLink>
            ) : (
              <Link className="kit-btn kit-btn-main kit-btn-sm" href="#sign-up">
                Sign me up
              </Link>
            )}
          </span>
        </li>

        {/* ROW 3 — the book talk (TASK-473, block 968,624: neutral title,
            no "Encore"/"Playground" word anywhere on /reading; the item
            id, encoreFloor/encoreEntitled names and ENCORE_TIME constant
            are UNCHANGED — only the visible words moved). */}
        <li>
          <span>
            <b>{`${clockWords(encoreStartsAtMs, tz)} · The book talk`}</b>
            <em>A live group video call with Love, going deeper into the book.</em>
            {/* who it's for is always said; the price rides only when the
                store answers one (Number One's review, block 968,561).
                TASK-471 (block 968,624): the buy action is the $11
                one-time pass when it's live — "$11 once." — never the
                recurring membership's monthly price mislabeled as such. */}
            {!encoreEntitled && (
              <em>
                {encoreFloor.price
                  ? encoreFloor.passLive
                    ? `${encoreFloor.price} once.`
                    : `Comes with ${encoreFloor.name} and up. ${encoreFloor.price} a month.`
                  : `Comes with ${encoreFloor.name} and up.`}
              </em>
            )}
          </span>
          <span className="kit-rows-end">
            {encoreEntitled ? (
              /* TASK-473: picks Part 3 for the top screen, never a Link
                 to /reading/playground (that address is retired here). */
              <ReadingPartSelectLink part={3}>Join the book talk</ReadingPartSelectLink>
            ) : (
              /* TASK-467: "Unlock with {name}" measured 258–328px at
                 kit-btn-sm (nowrap, R-071) — wider than the card's own
                 content width (~308px) on a 360px phone even stacked full
                 width, and a future tier rename could only make it worse.
                 The name/price already live in the quiet line above; the
                 button itself stays short and constant. */
              <ReadingDayUnlockButton
                itemId={encoreFloor.itemId}
                label="Unlock the book talk"
                ariaLabel={`Unlock the book talk with ${encoreFloor.name}`}
              />
            )}
          </span>
        </li>

        {/* ROW 4 — the channeled Q&A with Love */}
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
              /* TASK-473 (course change, block 968,624): picks Part 4 for
                 the top screen, which mounts the room IN PLACE there
                 (ReadingStageDoor, door="qa") — never a Link to /rooms. */
              <ReadingPartSelectLink part={4}>Join the Q&A</ReadingPartSelectLink>
            ) : (
              <ReadingDayUnlockButton itemId={qaOffer.itemId} label="Unlock the Q&A" />
            )}
          </span>
        </li>
      </ul>
    </div>
  );
}
