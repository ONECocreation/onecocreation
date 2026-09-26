# TASK-475 claim

Builder: sonnet sub-agent for Number One
Block: 968,624 (Love's live reading is Saturday 12:12 MDT)
Branch: feat/task-475
Worktree: /home/pac/dev/worktrees/task-475
Base: origin/main c8ca7d6

The Admiral's ruling: "i wanted one area for love to open each room as
needed on the host side. then i wanted one screen that the users would be
able to join and leave as long as they are signed in." T-473 (parallel
lane) builds the user screen. This lane is the HOST side, plus the Q&A
door's backend.

Three builds:

1. THE Q&A DOOR BACKEND — a small door-lifecycle factory
   (`src/lib/door-lifecycle.ts`) generalizes Stage 2's three-phase
   (closed -> prepared -> published) KV lifecycle. `stage2.ts` is
   refactored to use it, keeping its KV key (`stage2:state:${TENANT}`)
   and every existing export byte-identical in shape, so the existing
   Stage 2 tests pass untouched. A new `src/lib/qa-door.ts` uses the same
   factory for `qa:state:${TENANT}`. New routes `/api/qa-door` (member,
   mirrors `/api/stage2`'s shape) and `/api/admin/qa-door` (operator,
   mirrors `/api/admin/stage2`).

2. Q&A ENTITLEMENT — `src/lib/qa-entitlement.ts` exports `qaEntitled`
   (tier C OR a settled, non-refunded order carrying the Q&A pass item),
   with a pure core for tests. Wired into `/api/qa-door` and into
   `ReadingDay.tsx`'s existing `qaEntitled` prop line (today it's tier-C
   only, which locks out every Q&A buyer since Evening Star reads
   "Coming soon" — the brief's SHOW STOPPER).

3. ONE HOST AREA — `RoomsCard.tsx` (new) replaces the two separate
   Stage1Card/Stage2Card sections on `/a/site/reading` with one card,
   three identical rows (stage1, stage2, qa), each with the same two
   controls (Open/Close, Join on camera) built from one config array.
   Stage1Card.tsx and Stage2Card.tsx are NOT deleted (house law) — they
   stop being imported, with a one-line pointer comment added to each.

## OWNS

- `work-claims/task-475.md` — this file.
- `src/lib/door-lifecycle.ts` — NEW: the shared KV lifecycle factory
  (closed/prepared/published, the midnight close, fail-closed reads).
- `src/lib/stage2.ts` — EDIT: internals rebuilt on the factory; same KV
  key, same exports (`Stage2State`, `Stage2Phase`, `IDLE`,
  `stage2Expired`, `getStage2State`, `prepareStage2`, `publishStage2`,
  `closeStage2`).
- `src/lib/qa-door.ts` — NEW: the Q&A door's own lifecycle over
  `qa:state:${TENANT}`, same phases, same midnight close, the same
  closed->publish convenience path Stage 2 has.
- `src/lib/qa-entitlement.ts` — NEW: `qaEntitled(subject, tier)` + a pure
  core (`qaEntitledFromOrders`) tests can hit without KV.
- `src/app/api/qa-door/route.ts` — NEW: the member door.
- `src/app/api/admin/qa-door/route.ts` — NEW: the operator door.
- `src/components/reading/ReadingDay.tsx` — EDIT: ONE line — its
  `qaEntitled` prop now calls `qaEntitled(subject, tier)` instead of
  `tierSatisfies(tier, "C")` alone. Nothing else in this shared file
  changes.
- `src/app/a/site/reading/RoomsCard.tsx` — NEW: the one host card, three
  rows, one component, one config array.
- `src/app/a/site/reading/SiteReadingRoom.tsx` — EDIT: mounts
  `RoomsCard` instead of `Stage1Card`/`Stage2Card`; intro copy re-trued
  to one plain line (the old line carried two em dashes).
- `src/app/a/site/reading/Stage1Card.tsx` — EDIT: one-line comment only
  ("RoomsCard replaces it, T-475") — never deleted, never imported
  anywhere after this lane.
- `src/app/a/site/reading/Stage2Card.tsx` — EDIT: one-line comment only,
  same law.
- `src/app/a/site/reading/page.tsx` — EDIT: drops the now-unused
  `floorName`/`STAGE2_FLOOR_NAME` plumbing into `SiteReadingRoom` (Stage
  2's own floor name isn't shown on the new combined rows).
- `src/app/kit.css` — EDIT: one scoped rule for `.kit-rooms-card`'s
  two-control row end (Open/Close beside Join on camera), if the
  existing `.kit-rows-end` layout can't hold both without it.
- New test files under `tests/`: `qa-door-state.test.ts`,
  `qa-door-route.test.ts`, `admin-qa-door-route.test.ts`,
  `rooms-card.test.ts`, `reading-day-qa-entitled.test.ts` (exact names
  may shift slightly while building).

## READ-ONLY

Everything else, including (explicitly, per the brief):
`src/components/reading/ReadingStage*.tsx`, `src/lib/reading-parts.ts`,
`src/app/reading/page.tsx` — T-473 owns those.
