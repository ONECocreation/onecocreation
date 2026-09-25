# TASK-469 claim

Builder: sonnet sub-agent for Number One
Block: 968,567 (the Admiral passed Love's ask + "yes lets cut the 12:12 room")
Branch: feat/task-469-housewarming-row
Worktree: /home/pac/dev/worktrees/task-469
Base: 865773d (main after #89–#92)

Love, passed on by the Admiral (block 968,567): "will you make a 12:12
button that is linked straight to the stage where everyone gets to see
everyone? I wanna have housewarming with introductions and movement
before the reading." The Admiral: "yes lets cut the 12:12 room."

The two-way call itself already exists and needs NO code — at 12:12,
Love opens the Heart Field's live room from /a/studio and every
signed-in visitor on `/rooms/heart-field` gets a two-way Jitsi call.
This lane is ONLY the button: a new FIRST row on /reading's "The day's
agenda" card (TASK-467, merged as #92), free, no lock, same two buttons
(signed in / signed out) as the existing Reading row, pointed at the
same `/rooms/heart-field` door.

## OWNS
- `src/lib/reading-day.ts`: EDIT — add `HOUSEWARMING_TIME = "12:12"`.
- `src/components/reading/ReadingDay.tsx`: EDIT — compute and pass `housewarmingStartsAtMs`.
- `src/components/reading/ReadingDayBody.tsx`: EDIT — new first `<li>` row, new prop, docblock to four rows.
- `tests/housewarming-469.test.ts`: NEW.
- `tests/reading-day-467.test.ts`: EDIT — re-true `bodyProps` for the new mandatory prop (register lists the diff).
- `work-claims/task-469.md`, `work-claims/task-469-register.md`.

## READ-ONLY
Everything else on `/reading` and its supporting libs (`src/lib/reading-day-doors.ts`,
`src/lib/reading-schedule.ts`, `src/lib/booking-time.ts`, `src/lib/matrix-rooms.ts`,
`src/lib/entitlement.ts`, `src/lib/member-auth.ts`, `src/lib/member-tier.ts`,
`src/lib/site-config.ts`, `src/lib/stage2-access.ts`,
`src/components/reading/ReadingDayUnlockButton.tsx`, `src/app/reading/page.tsx`,
`src/app/kit.css`, `src/app/house.css`) — this lane needs no new CSS and no page
mount change (the card is already mounted by TASK-467/#92).
