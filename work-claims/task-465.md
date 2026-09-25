# TASK-465 claim — the Playground moves to the Observer floor, Weekly Intuitive's room hides

Builder: Number One (Claude Opus 5.5, sonnet sub-agent)
Block: 968,561 (the Admiral's answers, verbatim below)
Branch: feat/task-465-playground-observer
Worktree: /home/pac/dev/worktrees/task-465
Base: a2cc258 (origin/main tip after PRs #87/#88)

## Contract, the Admiral's words verbatim (block 968,561)

A) Who the Playground is for: "the playground is for members of the
observer or better package. users can be presented with an upgrade
option. if they upgrade they would have a button to watch the playground.
they can even buy the q&a for the one time 33, or if they are part of the
evening star they get q&a included."

B) Where the room/door live — asked to choose since TASK-460 (968,543) put
"The Playground" on the Weekly Intuitive room (`#clair-senses`, tier A),
he picked "Move to Observer": "option 1, weekly intuitive room for clair
senses room can be hidden for now. we are only going to have the
playground in that room area. it will replace that stage button title
called the playground."

C) No em dash in visible copy: "the big - needs to be replaced we have a
new line that should be started here. this would be considered slop."
Rule applied to every visible string this lane touches: no `—`; end the
sentence and start a new one instead.

This REVERSES ruling 1 of block 968,218 (Stage 2 floor = Weekly Intuitive,
tier A) and TASK-460's room pick (968,543, decision cw-playground-where,
option B — clair-senses). The new ruling is block 968,561; the old ones
stand as history in each docblock this lane touches.

## OWNS

- `src/lib/stage2-access.ts` — `STAGE2_MIN_TIER` "A" → "B"; docblock.
- `src/lib/matrix-rooms.ts` — `#clair-senses` title → "Clair Senses",
  gains `hidden: true`; `#weekly-reading` title → "The Playground";
  `MatrixRoom` interface gains an optional `hidden?: true` field; docblock.
- `src/lib/reading-room.ts` — `PLAYGROUND_ROOM_SLUG` "clair-senses" →
  "weekly-reading"; docblock re-trued.
- `src/lib/week-pass.ts` — `deriveWeekPass()` derives its item id from
  `STAGE2_MIN_TIER` + `TIER_PAGES` instead of the hardcoded
  `"weekly-one-week"` literal, so it follows Stage 2's own floor.
- `src/components/rooms/VantageSwitcher.tsx` — new optional `stageLabel`
  prop overriding the "Stage" tab's own label, default unchanged.
- `src/components/rooms/ClassroomView.tsx` — one hunk: import
  `PLAYGROUND_ROOM_SLUG`, pass `stageLabel="The Playground"` to
  `VantageSwitcher` only when `slug === PLAYGROUND_ROOM_SLUG`.
- `src/components/rooms/PlaygroundDoor.tsx` — words only (Observer floor,
  no em dash, shorter now that the door sits inside the Observer room
  itself); docblock.
- `src/components/rooms/Stage2Door.tsx` — the two package-door template
  strings, the "Try one week" button label, and both click-failure notes:
  no em dash, two sentences where one held a dash; docblock.
- `src/components/reading/playground/PlaygroundIsland.tsx` — the signin
  and package paragraphs (Observer floor, derived via the existing
  `observerName` prop), the "Try one week" button label, both
  click-failure notes: no em dash. Words and floor only, no
  className/layout changes.
- `src/app/reading/page.tsx` — the "What you will experience" list line
  (~line 143) only: derives the floor's name from
  `TIERS[STAGE2_MIN_TIER].name` instead of the literal "Weekly
  Intuitive". The `<ReadingStage …/>` props block and the host section are
  untouched (TASK-466 edits those hunks in parallel).
- `src/app/reading/playground/page.tsx` — the "What happens in the
  Playground" list line only: uses the page's own `observerName` var
  instead of the literal "Weekly Intuitive".
- `src/lib/puck-seeds.ts` — the Classes column's three seed lines: the
  `clair-senses` line removed (hidden, not listed), the `weekly-reading`
  line renamed to "✦ The Playground · Observer".
- `src/app/api/matrix/rooms/route.ts` — filters `ROOMS` down to
  non-hidden rooms before mapping the feed (the ONE place every public
  rooms listing — the packages shelf, /classes, the Circle vantage — reads
  from).
- `src/app/rooms/[slug]/page.tsx` — `bySlug` excludes hidden rooms, so a
  direct visit to `/rooms/clair-senses` notFounds.
- `src/components/door/door-machine.ts` — `continueLabel`'s `ROOMS.find`
  excludes hidden rooms too (the `/welcome?next=` door-continue label).
- `tests/playground-observer-465.test.ts` — NEW (red tests).
- `tests/stage2-access.test.ts` — floor/name/href/item-id pins re-trued.
- `tests/stage2-route.test.ts` — the shared tier-A mock re-trued to tier B.
- `tests/stage2-paid-door.test.ts` — the free-member package name/item-id
  and the tier-satisfies-the-minimum describe re-trued (A no longer
  satisfies; B now does).
- `tests/stage2-door.test.ts` — the em-dash package/Try-one-week/unreachable
  pins re-trued to the two-sentence, no-dash words.
- `tests/playground-room-460.test.ts` — re-trued throughout: the room
  title/hidden pin, the seed-line pin, PlaygroundDoor's words, the
  PLAYGROUND_ROOM_SLUG value and its StageView fixtures.
- `tests/reading-playground.test.ts` — the `week-pass.ts` item-id pin
  re-trued to the derived shape.
- `tests/reading-look.test.ts` — the /reading list-line pin re-trued to
  the derived floor name.
- `tests/package-names.test.ts` — the puck-seeds line pins re-trued (the
  clair-senses line removed, the weekly-reading line renamed).
- `tests/live-puck.test.ts` — the three real-ROOMS-derived "The
  Playground" pins (via `mockLive({ room: "clair-senses" })` → the real
  title lookup) re-trued to "Clair Senses".
- `tests/community-readiness.test.ts` — WIDENED (discovered running the
  full suite): the public `/api/matrix/rooms` feed's room count and
  live:true count re-trued (6 rooms, not 7 — clair-senses is hidden from
  this feed; `roomsLive()` itself still probes it, untouched).
- `tests/door-machine.test.ts` — WIDENED: `continueLabel("/rooms/weekly-
  reading")` re-trued to "Continue to The Playground"; a new case added
  for the hidden room's own slug (never named).
- `tests/join-the-reading.test.ts` — WIDENED: the registry pin for
  weekly-reading's title re-trued to "The Playground".
- `tests/room-doors.test.ts` — WIDENED: the `RoomVideoSlot` fixture's
  `roomTitle` re-trued from the old literal to "The Playground" (the
  component looks the title up against real ROOMS by string equality —
  the stale fixture stopped matching any room once the title changed).
- `tests/after-hours-door.test.ts` — WIDENED: one `GET /api/live`
  `afterHours.roomTitle` pin (a real ROOMS lookup on `weekly-reading`)
  re-trued to "The Playground".
- `tests/package-names.test.ts` — WIDENED beyond the claim's original
  scope (was already named): confirmed via the full-suite run, no new
  file, listed again here for completeness.
- `work-claims/task-465.md`, `work-claims/task-465-register.md`.
- `src/components/reading/Stage2Details.tsx` — WIDENED by Number One's review (block 968,561): `Stage2Rows` is LIVE (the Playground page's tier rows), not dead; it listed Weekly Intuitive under "from Observer up". Rows now start at the floor; the week row names the floor tier. The dead default export stays untouched.

- WIDENED by the T-465 adversarial review (block 968,561, verdict BLOCK, two findings):
  - `src/app/api/admin/live/route.ts`: the GET rooms feed skips hidden rooms; POST `open` and `after-hours` refuse a hidden room (400).
  - `src/app/a/studio/page.tsx`: the `goLiveRooms` list skips hidden rooms.
  - `src/app/api/live/route.ts`: the public live read never names a hidden room (no room, no title, no after-hours).
  - `src/components/rooms/AfterHoursDoor.tsx`: renders nothing for a hidden room.
  - `src/app/a/site/reading/page.tsx`, `SiteReadingRoom.tsx`, `Stage2Card.tsx`: Love's Stage 2 card names the floor from `STAGE2_FLOOR_NAME` (a prop threaded from the server page; stage2-access.ts cannot enter a client bundle).
  - `tests/hidden-room-465.test.ts` (NEW): pins for the above. `tests/after-hours-door.test.ts` (already owned) re-trues its clair-senses fixtures to a room that is not hidden.

## READ-ONLY

Everything else, in particular: `src/lib/entitlement.ts` (TIERS names/
prices unchanged — only the Stage 2 FLOOR moves, not the tier ladder),
`src/lib/tiers-content.ts` (already carries `observer-one-week` at $22),
`src/lib/room-access.ts`, `src/components/rooms/StageView.tsx` (the
`PLAYGROUND_ROOM_SLUG`-guarded block needs no edit — it picks up the new
slug value automatically), `src/app/reading/page.tsx`'s
`<ReadingStage …/>` props block and host section (TASK-466, parallel
lane), `src/lib/matrix.ts` / `src/lib/community-readiness.ts` (admin
provisioning + readiness probes read ALL rooms including hidden ones —
Love still operates `#clair-senses` even though it's hidden from public
listings; this is a deliberate scope line, see the register), every admin
surface (`LovesDesk.tsx`, `LiveDoorCard.tsx`, `go-live-room.tsx`,
`WeekAltitude.tsx`, the admin routes), `src/components/reading/
Stage2Details.tsx` (known dead default export, untouched), every other
existing test file not named above, every other lane's OWNS.

## Build order

1. Claim (this file).
2. Red tests: `tests/playground-observer-465.test.ts` (new), proven to
   fail against the unchanged base.
3. Build: the source files above.
4. Re-true the existing pins named above.
5. Register.
