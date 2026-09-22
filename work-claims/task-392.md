# work-claims/task-392.md — task-392 (OC · Stage 2, the after-reading Jitsi pilot)

Lane: the home crew (Sonnet builder, under Number One's gate). Base = onecocreation main
**a19d69e114412aebe3452117f2afacbad464b8a3** (`git rev-parse HEAD` on this worktree matched
this sha exactly before any commit — merge of PR #40, T-387 the studio chat switch, itself on
top of PR #39, T-391 the Saturday reading page). Branch `feat/task-392-stage-2-jitsi-pilot`.
Worktree `~/dev/worktrees/task-392` (cut by Number One), `npm ci` run fresh by this builder
(550 packages, 0 vulnerabilities). Lane ports **4662–4665**. Brief:
`~/dev/kimi/inbox/TASK-392-oc-stage-2-jitsi-pilot.md`.

A pilot "Stage 2" for the free reading room (the Heart Field, `minTier:"all"`): an operator
card on `/a/site/reading` runs a three-phase lifecycle (`closed` → `prepared` → `published`) —
PREPARE mints a fresh random room on the house Jitsi privately, Love opens it and logs in as
`love` to become moderator, then PUBLISH reveals a gated "Join Stage 2" door to every
signed-in member. Joining swaps the Stage's video region from the studio embed into the Jitsi
room in place (`JitsiRoom.tsx`, reused unmodified) — Stage 1 stops the instant the swap
happens because `RoomVideoSlot` unmounts — and an always-visible "Leave Stage 2" control is
the only way back (`JitsiRoom.tsx` gives its parent no ended/failed callback, confirmed absent
this session). The member route re-authorizes FRESH at the instant of the click, never off the
20s display poll, and never hands back a room name to an unpublished or unreachable state. This
is member-gated link ISSUANCE, not member-only conferencing — the deployed Jitsi has no
lobby (run-sheet §11); once a member holds a working link they are in, like every other room
on this deployment.

RE-GREP note (the brief's own instruction, since its line numbers predate T-387): `StageView.tsx`
and `classroom.css` were re-read fresh this session. T-387 added the `chatHidden` prop/branch to
`StageView.tsx` and a THIRD `grid-template-areas` block, `.cl-grid-stage--no-chat` (unconditional
one column, chat hidden at any width), beside the two the brief anticipated (desktop two-column,
phone one-column). The brief's own instruction says "place the Stage 2 region and its grid-area
beside the after-hours ones as they now stand" — since `.cl-grid-stage--no-chat` now also carries
its own `afterhours` row, the `stage2` token was added there too (a single-token row, the same
mechanism as the phone block), so a room with chat hidden AND Stage 2 published never lands the
new region on an undefined named area. Named here as an applied correction beyond the brief's
literal "two blocks" count, not a silent scope-creep — the mechanism is identical, only the block
count changed under my feet.

## OWNS

NEW: `src/lib/stage2.ts`, `src/app/api/admin/stage2/route.ts`, `src/app/api/stage2/route.ts`,
`src/components/rooms/Stage2Door.tsx`, `src/app/a/site/reading/Stage2Card.tsx`,
`tests/stage2-state.test.ts`, `tests/stage2-door.test.ts`, `tests/stage2-route.test.ts`, this
file (`work-claims/task-392.md`, first commit).

Additive-narrow (existing files, described diff only): `src/components/rooms/StageView.tsx`
(three import lines, one `useState`, the video-region swap — the always-visible "Leave Stage 2"
control plus `<JitsiRoom/>` vs. the existing `<RoomVideoSlot/>` call, that call itself untouched
— and one new sibling-region mount line, gated `slug === READING_ROOM_SLUG`);
`src/components/rooms/classroom.css` (one grid-area token in the desktop `grid-template-areas`
block, its single-token twin in the phone block AND in `.cl-grid-stage--no-chat` per the re-grep
note above, + one new one-line `.cl-area-stage2` rule); `src/app/a/site/reading/SiteReadingRoom.tsx`
(one `SectionHead` + one component line); `tests/design-drift.ceilings.json` (ratchet-regenerated,
data only, once the five new files exist).

## READ-ONLY and FORBIDDEN

READ-ONLY (grounding/reuse, never edited): `src/lib/live.ts`, `src/lib/live-links.ts`,
`src/lib/matrix-rooms.ts`, `src/lib/reading-room.ts`, `src/lib/reading-schedule.ts`,
`src/lib/member-auth.ts`, `src/lib/operator-auth.ts`, `src/lib/room-access.ts`,
`src/lib/studio/jitsi-door.ts`, `src/lib/tenant.ts`, `src/lib/store.ts`, `src/lib/site-config.ts`
(cited, `getSiteConfig()` only, never a write), `src/app/api/admin/site/route.ts`,
`src/app/a/site/reading/ReadingScheduleCard.tsx`, `src/components/rooms/AfterHoursDoor.tsx`,
`src/components/rooms/ReadingNotice.tsx`, `src/components/booking/JitsiRoom.tsx`,
`src/components/booking/VdoRoom.tsx`, `src/components/studio-overlay/JitsiDoorCard.tsx`,
`src/app/meet/[bookingId]/page.tsx`, `src/app/kit.css`, `src/app/house.css`, `src/app/cartridge.css`.

FORBIDDEN: `src/lib/site-config.ts` (write), `src/app/api/admin/site/route.ts`,
`src/components/rooms/ClassroomView.tsx`, `src/app/rooms/[slug]/page.tsx`,
`src/components/rooms/RoomView.tsx`, `src/lib/matrix-rooms.ts` (write), any new CSS class or
literal colour beyond the one grid-area rule, any `btn-gold`/gold styling on a Stage 2 BUTTON,
any lobby/waiting-room/queueing feature, any recording wiring, any change to
`tests/design-drift.test.ts` itself, any civil-date stamp in this lane's commits/claim.

## Gates

This builder runs, inside this worktree only: `npx vitest run` (whole suite), each live
`scripts/*.test.mjs`, `npx eslint src tests --max-warnings=0`, `npx tsc --noEmit`. `next build`,
the Rehearsal Gate, and the Chrome walk are Number One's / the Admiral's, per this lane's own
Release gates section.

## Cut note

Ground truth as of block 968,091 (house beacon), per the brief.
