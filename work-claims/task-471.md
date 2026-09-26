# TASK-471 claim

Builder: sonnet sub-agent for Number One
Block: 968,624 (the Admiral's Saturday-night minimal fix, walk-968624/ACTIONS.md
+ VERDICT-968624.md + L2L3-TRACE.md + ASTRA-REVIEW.md)
Branch: feat/task-471
Worktree: /home/pac/dev/worktrees/task-471
Base: origin/main a80ada9

Tomorrow is Love's first live reading. The Admiral ruled a MINIMAL fix
tonight (the full tabbed one-page /reading comes after Saturday):

1. Stage 1 (12:12 Housewarming + 1:11 The Reading, free) becomes TWO-WAY
   and mounts IN PLACE on /reading — no more "Go to the Heart Field" door.
2. Every remaining Heart Field door on /reading is retired.
3. Part 3 (2:22 book talk) gates on its OWN $11 one-time pass, not
   Observer — overruling TASK-465's floor for this room only.
4. Rows 3/4: owned → join button; not owned → unlock/buy with price.
5. S8 (the 12:12/1:11 schedule mixup) — reported, not coded around.
6. Admin copy only (Stage1Card/Stage2Card, via SiteReadingRoom.tsx) —
   plain steps, "one-way" wording removed.
7. Tests updated/added for all of the above.

A parallel review (TASK-472, mid-lane) added one more constraint: the
shared "Try one week" taster (`stage2-access.ts`'s `stage2PackageDoor().week`
/ `week-pass.ts`'s `deriveWeekPass()`) fulfils a STANDING MEMBERSHIP TIER
for N days — a side door into whichever tier it targets, and specifically
wrong while Observer/Evening Star go "Coming soon" (task-472's own lane).
That mechanism is now fully retired from /reading and /reading/playground;
Part 3's buy action is its own dedicated item id,
`READING_BOOK_TALK_ITEM_ID` (`reading-day.ts`), derive-or-dash exactly
like `QA_ITEM_ID`'s own pattern.

## OWNS

- `src/app/kit.css` — EDIT (Number One, Lumen's brand pass L-004): ONE rule, `.kit-day .kit-rows-end>.kit-btn` = one 256px width for every agenda-card button.
- `src/components/reading/ReadingStage.tsx` — REWRITTEN. Stage 1 mounts
  `JitsiRoom` (booking's two-way embed) in place when published+signedIn;
  never `JitsiViewer`. No more `watching`/`failed`/`onWatch`/`onTryAgain`
  (the click-based Watch flow is retired — the poll itself is now the
  fresh authorization, and JitsiRoom owns its own script-load failure).
  New `signedIn` prop; new `left`/`onRejoin` in-page rejoin (no navigation).
  Every `/rooms/heart-field` reference removed.
- `src/components/reading/ReadingDayBody.tsx` — rows 1/2's button is
  `#stage` (an in-page anchor, "Back to the reading"), never
  `/rooms/heart-field`. Row 3's price line reads "$X once." when the
  book-talk pass is live, else the old "Comes with {name} and up. {price}
  a month." shape.
- `src/lib/reading-day.ts` — new `READING_BOOK_TALK_ITEM_ID` constant
  (the book talk's own dedicated item id).
- `src/lib/reading-day-doors.ts` — `encoreFloorDoor()` now reads
  `READING_BOOK_TALK_ITEM_ID` first (derive-or-dash), falling back to the
  floor membership exactly as before; new `passLive` field on
  `EncoreFloorDoor`. Never reads `stage2PackageDoor().week` any more.
- `src/lib/stage2-access.ts` — `STAGE2_MIN_TIER` moved from `"B"` back to
  `"A"` (the $11 pass grants tier A; "or any higher tier" already admits
  via the progressive ladder). Docblock records the full A→B→A chain.
- `src/app/reading/page.tsx` — `signedIn` threaded into `ReadingStage`;
  the "one-week pass" clause dropped from "What you will experience"
  (that was the retired shared taster); `deriveWeekPass` import removed.
  SECOND PASS (S8, see the section below): the hero countdown's
  `schedule`/`next` props swapped for a Housewarming-only variant
  (`housewarmingNext`, `deriveReading()`) — decoupled from
  `schedule.time` entirely, per item 5.
- `src/app/reading/playground/page.tsx` — the hardcoded literal
  `TIER_PAGES.find(p.tier === "B")` fixed to follow `STAGE2_MIN_TIER`
  itself (a latent bug independent of this task, now exposed by the floor
  move); computes `bookTalkPass` via `encoreFloorDoor()` and passes it to
  `PlaygroundIsland`; `Stage2Rows` gets `weekPass={null}` (no more taster
  row on this page); `deriveWeekPass` import removed.
- `src/components/reading/playground/PlaygroundIsland.tsx` — new
  `bookTalkPass` prop; the free-member ("package") state's ONE main
  button is the book talk pass ("Buy the pass for {price}") when live,
  else the membership Link — never "Try one week", never `pkg.week`.
- `src/app/a/site/reading/SiteReadingRoom.tsx` — the two `SectionHead`
  labels renamed: "Free room: 12:12 Housewarming and 1:11 Reading" /
  "Paid room: 2:22 Book talk" (item 6, plain steps Love can follow).
- `src/app/a/site/reading/Stage1Card.tsx` — copy only: "The one-way
  stage —" → "The stage —"; the published state's words no longer claim
  a Heart Field hand-off ("Published — signed-in visitors join right on
  /reading."). No logic touched (same `Stage1CardBody`/fetch/PUT shape).
- `src/app/a/site/reading/Stage2Card.tsx` — READ, unchanged: no "one-way"
  wording existed there to remove, and its own floor-name line
  (`{floorName} and above can come in.`) already derives from
  `STAGE2_FLOOR_NAME`, so it reads "Weekly Intuitive" correctly now with
  zero edits.
- Tests (full paths, house convention — see Obstacles for why this line
  needed re-writing on the second pass): `tests/reading-stage.test.ts`
  (rewritten), `tests/reading-watch-heart-field-457.test.ts` (rewritten as
  the retirement's own record), `tests/reading-small-watch-464.test.ts`
  (rewritten), `tests/reading-polish-466.test.ts` (re-shaped to the new
  phases), `tests/reading-love-cover-456.test.ts`,
  `tests/reading-buttons-phone-463.test.ts` (rewritten),
  `tests/reading-day-467.test.ts`, `tests/housewarming-469.test.ts`,
  `tests/stage2-access.test.ts` (rewritten for A),
  `tests/playground-observer-465.test.ts`, `tests/hidden-room-465.test.ts`,
  `tests/reading-look.test.ts`, `tests/reading-playground.test.ts`,
  `tests/stage2-paid-door.test.ts`, `tests/saturday-polish-454.test.ts` —
  all edited to match; new assertions added for the $11 pass admitting
  Part 3, JitsiRoom (not JitsiViewer) mounting, Observer never the main
  buy button, and no `/rooms/heart-field` anywhere on the touched
  surfaces.
- `tests/reading-page.test.ts` — WIDENED (block 968,624, second pass,
  Number One): one new source-pin test for S8's real fix, below. No
  existing test in this file needed re-truing — the new `<ReadingHeroCountdown
  schedule={{ ...schedule, time: HOUSEWARMING_TIME }}>` mounts don't touch
  any string this file's existing assertions already pin (checked by hand
  against `nextReading(schedule, next.endsAtMs)`/`following={` staying
  literal, and the file's own "no 1:11 anywhere in this page" law, which a
  first pass at the new docblock actually tripped — see Obstacles).
- `work-claims/task-471.md` — this claim itself: the first pass's own
  "Tests:" line named every test file WITHOUT its `tests/` directory (e.g.
  `reading-stage.test.ts`, not `tests/reading-stage.test.ts`) — a real
  staged path never equals or sits under a bare filename, so the law
  guard's own prefix/equality check (`.githooks/pre-commit`) would have
  refused every one of those files at commit time. Re-written above with
  full repo-relative paths; this file added to its own OWNS (a claim's own
  path is never implicitly exempt from the check it enforces on everything
  else — see Obstacles).

## S8 — the 12:12/1:11 schedule mixup: FIXED (second pass, Number One)

The first pass reported this rather than fixing it (see the note this
replaces, kept below for the record). On a second read of
VERDICT-968624.md ("S8: Countdown targets Housewarming at 12:12 without
moving the reading from 1:11" — listed under "MUST work before doors
open," not the "do by hand" list) and the task's own explicit item 5
("The countdown targets 12:12 (the first part); the Reading row keeps the
schedule's reading time"), this is a real, in-scope code fix, not an
admin data fix.

**The fix** (`src/app/reading/page.tsx` only — no shared component
touched): the top-of-page countdown (`ReadingHeroCountdown`, both the
`countdown` and `countdownWhen` props on `<ReadingStage>`) now reads a
schedule-shaped object with `time` swapped to `HOUSEWARMING_TIME`
(reading-day.ts's own constant, the same one Row 1 already reads) instead
of the real `schedule`/`next`. `deriveReading()` grew a second pure
derivation, `housewarmingNext = nextReading({ ...schedule, time:
HOUSEWARMING_TIME }, asOfMs)` — reusing `nextReading()`'s own walk, never
a second date-math implementation, and never touching `ReadingNotice.tsx`
or `noticeState`/`nextBoundaryMs` (the shared freshness contract those
two files' docblocks describe — untouched, unforked, still read by
whatever else mounts `ReadingNotice` with the real schedule elsewhere).

This decouples the hero countdown from `schedule.time` ENTIRELY: no
matter what Love types into `ReadingScheduleCard` for the Reading's own
time (1:11, 12:12, or anything else), the top countdown always counts to
12:12 on the reading's own day — because, per the ruling, that's the
first thing that happens. Row 2 (`ReadingDayBody.tsx`, `readingStartsAtMs
= next.startsAtMs`) is untouched and still shows the schedule's own
configured reading time, exactly per item 5's second clause. Row 1
(`housewarmingStartsAtMs`, `reading-day.ts`'s `sameDayAt` + the same
`HOUSEWARMING_TIME` constant) was already correct before this fix and
stays that way.

**Still true, unchanged by this fix:** the Admiral should still set the
reading schedule's own time to 1:11 PM at `/a/site/reading`
(`ReadingScheduleCard`) if Love's 12:12 save was a mistake meant for the
Housewarming — Row 2 and "What you will experience"'s weekday derivation
both still read that field directly, and this fix does not touch it or
guess at it.

<details><summary>First-pass note (reported, not fixed — superseded by
the fix above)</summary>

Per instruction, this was NOT worked around in code. As traced in
L2L3-TRACE.md §2: `HOUSEWARMING_TIME` (`reading-day.ts`) is a hardcoded
`"12:12"` constant, independent of the admin-editable `ReadingSchedule.time`
field (currently, per the walk, holding `"12:12"` because Love edited it
during the call meaning to set the day's own start time, not realizing
that field is specifically "The Reading"'s own time, still ruled to be
1:11 PM). Before this fix: the top-of-page countdown (`ReadingHeroCountdown`,
fed by `nextReading(schedule, ...)`) counted to `schedule.time` — the same
literal field Row 2 shows — so both moved together whenever Love edited
the schedule, with no way to pin the countdown to the Housewarming
specifically. That coupling is what the fix above removes.

</details>

## READ-ONLY / NOT TOUCHED

`src/components/reading/JitsiViewer.tsx` (retired from this page, file
itself untouched — still used by its own tests), `src/components/booking/
JitsiRoom.tsx` (reused as-is, per the ruling), `src/lib/week-pass.ts`
(still exists, still used by `Stage2Rows`/`Stage2Details.tsx` on the
actual membership package pages — out of `/reading`'s scope, untouched),
`src/components/rooms/Stage2Door.tsx` (not reachable from `/reading` or
`/reading/playground` — only `StageView.tsx` imports it, for other matrix
rooms; if TASK-472 needs its own "Try one week" wording removed there,
that is a different file than any in this lane's OWNS), `src/components/
reading/Stage2Details.tsx` (shared with membership package pages,
untouched — this lane only stopped feeding it a `weekPass` on
`/reading/playground`), `src/app/reading/playground/PlaygroundIsland.tsx`'s
`stage2Rows` consumer paths elsewhere (none — `/reading/playground` is
its only mount).

## Kit classes reused / new CSS

Zero new CSS. Reused verbatim: `.kit-stage`, `.kit-stage-media`,
`.kit-stage-viewer` (already built for `JitsiViewer`/`JitsiRoom` alike —
`PlaygroundIsland.tsx` already wraps `JitsiRoom` in the same class),
`.kit-stage-controls`, `.kit-stage-chip`, `.kit-btn kit-btn-main
kit-btn-sm` (the one button size on `/reading`, unchanged), `.kit-rows`/
`.kit-rows-end`, `.kit-lock-icon`. No page-local styles, no inline styles.

## S8 — the 12:12/1:11 schedule mixup (reported, NOT coded around)

Per instruction, this was NOT worked around in code. As traced in
L2L3-TRACE.md §2: `HOUSEWARMING_TIME` (`reading-day.ts`) is a hardcoded
`"12:12"` constant, independent of the admin-editable `ReadingSchedule.time`
field (currently, per the walk, holding `"12:12"` because Love edited it
during the call meaning to set the day's own start time, not realizing
that field is specifically "The Reading"'s own time, still ruled to be
1:11 PM). Today, unchanged by this lane:
- The top-of-page countdown (`ReadingHeroCountdown`, fed by
  `nextReading(schedule, ...)`) counts to `schedule.time` — currently
  12:12, by the same coincidence.
- Row 2 ("The Reading") also shows `schedule.time` — also currently 12:12.
- Row 1 ("The Housewarming") shows the hardcoded `HOUSEWARMING_TIME`
  ("12:12") — always correct regardless of the schedule field.

**Action needed from the Admiral:** set the reading schedule's time back
to 1:11 PM at `/a/site/reading` (`ReadingScheduleCard`). Once that's done,
the top countdown and Row 2 will both correctly read 1:11 again, and Row
1 will still correctly read 12:12 (it never depended on the schedule
field at all). No code change was made to decouple the countdown from
`schedule.time`, per the explicit instruction not to code around this.

## Gate

`bash /home/pac/dev/shortcuts/oc-gate.sh /home/pac/dev/worktrees/task-471`:

```
Test Files  243 passed (243)
     Tests  3147 passed (3147)
scripts/calendar-view.test.mjs: 70 passed, 0 failed
scripts/cartridge-identity.test.mjs: 179 passed, 0 failed
scripts/console-matrix.test.mjs: 14 passed, 0 failed
scripts/fixture-kv.test.mjs: 45 passed, 0 failed
scripts/square-payments.test.mjs: 58 passed, 0 failed
eslint 0
tsc 0
build ok
GATES GREEN
```

## What was NOT done (narrowed, out of scope for tonight)

- No shots/visual walk (Chrome-shots method) were taken — this report is
  source + test verified only, not eyes-verified in a real browser. The
  Admiral/Number One should do a real Chrome walk of `/reading` (signed
  in and out) and `/reading/playground` before Saturday.
- The live store catalog was never read (gitignored, not in this repo).
  `READING_BOOK_TALK_ITEM_ID = "reading-book-talk"` is a NEW, UNVERIFIED
  id — it almost certainly does not exist in the live catalog yet. Until
  the Admiral creates it in `/a/store` (or hands over the real id to swap
  in, the one place it would need to change), Part 3's row/card falls
  back HONESTLY to selling the Weekly Intuitive membership itself
  (derive-or-dash — no price is ever guessed).
- S1/S2/S6 (the actual Jitsi two-way media/moderation trace — whether
  guests really see each other's video) are NOT this lane's scope at all
  (L1's territory per ACTIONS.md's own lane split) and were not touched
  or verified.
- Waiting audio / camera-driven artwork (Love's ask) — explicitly MUST
  WAIT per ASTRA-REVIEW.md §1, not built.
- `src/app/a/site/reading/Stage2Card.tsx`'s own lifecycle (Prepare/
  Publish/Close, `.btn`/`.btn-ghost` legacy classes) was NOT modernized
  to `Stage1Card.tsx`'s `kit-rows` shape — that's a pre-existing gap
  named in L2L3-TRACE.md §4, not part of tonight's "admin copy only" ask.
- Part 4 (Q&A) admin lifecycle (no open/close control exists at all,
  per L2L3-TRACE.md §4) was NOT built — out of scope, price/room
  untouched per instruction.

## Obstacles

1. **The $11 pass's real identity was never settled.** L2L3-TRACE.md §3
   flagged a genuine ruling collision: TASK-465 raised the Encore's floor
   to Observer, but ACTIONS.md's own content note assumes the (then Tier-A)
   $11 pass should open Part 3. This task's own instructions resolved the
   ENTITLEMENT side (floor back to A) but a mid-lane coordinator message
   (citing a parallel TASK-472 review) then flagged that the natural
   "cheapest fix" — reusing `stage2-access.ts`'s existing floor-tier
   one-time-pass mechanism — is itself the wrong item semantically (a
   membership taster, not a single-event pass), and specifically dangerous
   while Observer is going "Coming soon." Both fixes required real
   back-and-forth mid-build; a dedicated `READING_BOOK_TALK_ITEM_ID`
   ended up narrower and more correct than my first pass, but it means
   the actual catalog item still needs to be created by the Admiral
   before Part 3 is truly buyable — see "What was NOT done" above.
2. **Lowering `STAGE2_MIN_TIER` has a wide blast radius.** It is read by
   six+ files across `/reading`, `/reading/playground`, and the
   membership package pages (`Stage2Details.tsx`'s tier listing). All of
   them derive off the constant correctly (no literal-tier bugs found
   except the one fixed in `playground/page.tsx`), so the change was
   safe, but it touched an unusually large number of pre-existing test
   files (`stage2-access.test.ts`, `playground-observer-465.test.ts`,
   `hidden-room-465.test.ts`, `stage2-paid-door.test.ts`,
   `reading-look.test.ts`) that had pinned TASK-465's Observer-floor
   ruling by name. Each was re-trued individually rather than deleted or
   skipped, per the never-delete law and the instruction to update
   affected tests.
3. **`ReadingHeroCountdown`/`ReadingNotice.tsx` were deliberately left
   untouched — SUPERSEDED, second pass.** The first pass's own docblock
   reasoning (their freshness contract, "both flip at the exact instant
   the room's own `ReadingNotice` does") was right that the SHARED
   FUNCTIONS (`noticeState`/`nextBoundaryMs`, `ReadingNotice.tsx`) must
   stay untouched — but wrong that decoupling the countdown required
   touching them. Both `nextReading()` and `noticeState()` take a plain
   `ReadingSchedule`-shaped VALUE, not a reference to "the" schedule; a
   second object with only `time` swapped (`{ ...schedule, time:
   HOUSEWARMING_TIME }`) drives the exact same pure functions to the exact
   same freshness/hydration guarantees, targeting a different instant. No
   file outside `src/app/reading/page.tsx` was touched to land this. The
   real, unmodified `schedule`/`next` still feed `ReadingStage` and Row 2
   unchanged. Caught on a second read of VERDICT-968624.md, which lists
   S8 under "MUST work before doors open," not the "do by hand" list —
   the first pass's own brief said "reported, not coded around" and this
   pass's task brief said the opposite (item 5); the second reading is
   the one that matches the ruling's own priority list.
4. **No live rehearsal of the two-way embed itself.** JitsiRoom's own
   ended/failed states were reasoned about from its source and from
   `PlaygroundIsland.tsx`'s own established pattern (which already wraps
   it and handles `onEnded` the same way), never from a real Jitsi
   session — S1/S2 (whether guests actually see video through the
   bridge) are unverified and out of this lane's scope per the ruling's
   own lane split (L1).
5. **The docblock's own first draft of the S8 fix tripped the page's own
   "no literal 1:11 anywhere" test** (`tests/reading-page.test.ts`,
   "no literal weekday name and no \"1:11\"") by naming the literal clock
   reading in prose inside a comment. Fixed by describing it in words
   instead of digits — a small, mechanical catch, but a reminder that
   this file's own house law reads comments too, not just live strings.
6. **The claim's own "Tests:" line would have failed the commit it was
   written for.** Every test filename in the first pass's OWNS bullet was
   written bare (`reading-stage.test.ts`), never with its real repo path
   (`tests/reading-stage.test.ts`). `.githooks/pre-commit`'s named-adds
   check only accepts an exact path match or a real directory-prefix match
   against each OWNS token — a bare filename matches neither a staged
   `tests/*.test.ts` path nor anything under it, so the FIRST commit
   attempt would have been refused for nearly every test file this lane
   touches, on the very last step of an otherwise-finished lane. Caught by
   reading the hook's actual matching logic line by line before
   committing, not by trusting the claim's own prose. Fixed by rewriting
   the line with full paths (see OWNS above) and adding
   `work-claims/task-471.md` itself to its own OWNS, which the first pass
   never listed at all.
