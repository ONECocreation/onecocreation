# TASK-467 claim

Builder: sonnet sub-agent for Number One
Block: 968,561 (the Admiral's tracker note + today's answers)
Branch: feat/task-467-reading-day-brick
Worktree: /home/pac/dev/worktrees/task-467
Base: a2cc258 (main after #87/#88)

Contract, the call with Love (walk-968482/walk.txt, 00:29:27–00:45:03) +
the Admiral's own notes (see the brief, block 968,561): one Heart-Field-
room-brick-shaped card on `/reading`, three rows — the reading, the
Encore in the Playground, the Q&A with Love — each with a time, a name,
one plain line, a price where one applies, and ONE `kit-btn-sm` button.
Signed-out/free/locked rows point at sign-up or the store; entitled rows
point at the room. No tier letter or store item id is ever a literal
outside `src/lib/reading-day.ts`.

## OWNS
- `src/lib/reading-day.ts`: NEW — the two clock times, the Q&A item id, `clockWords`, `sameDayAt`.
- `src/lib/reading-day-doors.ts`: NEW — `encoreFloorDoor`/`qaDoor`, the async live-store derivations.
- `src/components/reading/ReadingDay.tsx`: NEW — the async server wrapper (session, tier, fail-closed).
- `src/components/reading/ReadingDayBody.tsx`: NEW — the pure card, three rows.
- `src/components/reading/ReadingDayUnlockButton.tsx`: NEW — the kit-classed add-to-basket lock button.
- `src/app/reading/page.tsx`: ONE new import line + ONE new `<section>` mounting `<ReadingDay />`, inserted immediately before the "WHAT YOU WILL EXPERIENCE" comment block. Nothing else in this file.
- `src/app/kit.css`: ONE new rule, `.kit-lock-icon` (spacing/baseline for the inline lock svg — the same rule TASK-466 needs for its own lock, added here too so both match).
- `tests/reading-day-467.test.ts`: NEW.
- `work-claims/task-467.md`, `work-claims/task-467-register.md`.

## READ-ONLY
`src/lib/stage2-access.ts` (TASK-465 moves `STAGE2_MIN_TIER` there — this
lane only imports it), `src/lib/matrix-rooms.ts`, `src/lib/entitlement.ts`,
`src/lib/tiers-content.ts`, `src/lib/store.ts`, `src/lib/money-words.ts`,
`src/lib/member-auth.ts`, `src/lib/member-tier.ts`, `src/lib/site-config.ts`,
`src/lib/reading-schedule.ts`, `src/lib/booking-time.ts`,
`src/components/rooms/PackageRoomsCard.tsx`, `src/components/rooms/RoomsShelf.tsx`,
`src/components/reading/ReadingStage.tsx` (TASK-466's own lane),
`src/components/store/AddTierButton.tsx` (read for its logic, not edited —
see the register for why a sibling), every other hunk of
`src/app/reading/page.tsx` (TASK-465/466/468 own those), `src/app/house.css`.
