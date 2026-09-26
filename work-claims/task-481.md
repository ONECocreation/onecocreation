# TASK-481 claim

Builder: sonnet sub-agent for Number One
Block: 968,624+ (ground truth as of block 968,624 and later)
Branch: feat/task-481
Worktree: /home/pac/dev/worktrees/task-481
Base: origin/main e136672

The Admiral's ruling: "was there going to be 4 rooms in the /a/site/reading
room. i'm seeing 3. we spoke about one line per meeting time." T-475's
`RoomsCard.tsx` shipped THREE rows because Parts 1 and 2 (the Housewarming,
12:12, and the Reading, 1:11) shared Stage 1's one door. This lane gives
the Housewarming its OWN door, so every meeting time gets its own room and
its own line: FOUR rows, four doors.

Three builds:

1. THE HOUSEWARMING DOOR BACKEND — `src/lib/housewarming-door.ts`, a new
   tenant of the shared `door-lifecycle.ts` factory (T-475's own factory,
   already carrying `stage2.ts` and `qa-door.ts`): KV
   `housewarming:state:${TENANT}`, the same three phases, the same
   midnight-Mountain close, the same closed->publish convenience path.
   New routes `/api/housewarming-door` (member, the SAME `{ok, open,
   decision, reachable?, room?}` envelope `/api/stage2`/`/api/qa-door`
   answer with, but FREE — no tier/entitlement branch, any signed-in
   caller is entitled) and `/api/admin/housewarming-door` (operator,
   mirrors `/api/admin/qa-door`).

2. THE FOURTH ROOMS-CARD ROW — `SiteReadingRoom.tsx`'s `DOORS` config
   array grows a new first entry ("Housewarming · 12:12", id
   "housewarming", `/api/admin/housewarming-door`); the existing "stage1"
   row's label narrows from "Free room · 12:12 Housewarming and 1:11
   Reading" to "Reading · 1:11" (it is Part 2's door alone now).
   `RoomsCard.tsx` itself is untouched — it was already door-agnostic,
   config-driven.

3. /READING'S FOURTH DOOR — a new `ReadingStagePart1.tsx` (a thin caller
   of `ReadingStageDoor`, door `"housewarming"`, the exact
   `ReadingStagePart3`/`4` shape, minus the `notOwned` branch: the
   Housewarming is free). `ReadingStageDeck.tsx` gains a `part1` prop and
   an `if (selected === 1) return <ReadingStagePart1 {...part1} />;`
   branch; `ReadingStage.tsx` (Stage 1) is now Part 2's screen ALONE — its
   own file is untouched (T-479 is live in its live branches this same
   block; this lane never edits it). `ReadingStageDoor.tsx`'s `door` union
   and `doorPath()` map grow the one new case, minimally (T-479 is also
   live in this file's own live branches — the touch here is the type
   union + the path map only). `/reading/page.tsx`'s default-part inputs
   now read the Housewarming door's own state (fail-closed, the same
   `qaState` idiom) instead of reusing `stage1Phase` for Part 1; T-480 is
   live in this same file's `?part=` read, so the touch here stays
   confined to the `doors: PartDoorInfo[]` array and the new `part1` prop
   handed to `ReadingStageDeck`. `ReadingDayOpenNotice.tsx`'s poll grows a
   fourth fetch (`/api/housewarming-door`) so Part 1's own flag stops
   reading Stage 1's.

## OWNS

- `work-claims/task-481.md` — this file.
- `src/lib/housewarming-door.ts` — NEW: the Housewarming door's own
  lifecycle over `housewarming:state:${TENANT}`, built on
  `door-lifecycle.ts` (T-475's factory), same phases, same midnight close,
  the same closed->publish convenience path qa-door.ts/stage2.ts take.
- `src/app/api/housewarming-door/route.ts` — NEW: the member door. Same
  wire envelope as `/api/stage2`/`/api/qa-door`, but free — `decision:
  "open"` for any signed-in caller, no tier/entitlement/package branch.
  Reuses `probeJitsiReachable` imported from `/api/stage2/route.ts`.
- `src/app/api/admin/housewarming-door/route.ts` — NEW: the operator
  door, mirrors `/api/admin/qa-door/route.ts`'s shape.
- `src/components/reading/ReadingStagePart1.tsx` — NEW: Part 1's own top
  screen, a thin `ReadingStageDoor` caller (door `"housewarming"`), the
  `ReadingStagePart3`/`4` shape minus `notOwned`.
- `src/components/reading/ReadingStageDeck.tsx` — EDIT: new `part1` prop,
  new `if (selected === 1) return <ReadingStagePart1 {...part1} />;`
  branch ahead of the existing 3/4 branches; the fallthrough
  (`<ReadingStage {...stage1} />`) is now Part 2 alone.
- `src/components/reading/ReadingStageDoor.tsx` — EDIT, MINIMAL (T-479 is
  live in this file's own live branches): the `ReadingDoorKind` union
  gains `"housewarming"`, and `doorPath()`'s map gains the one new case
  (`/api/housewarming-door`).
- `src/app/a/site/reading/SiteReadingRoom.tsx` — EDIT: `DOORS` grows a new
  first entry; the "stage1" row's label narrows to "Reading · 1:11".
- `src/app/reading/page.tsx` — EDIT, MINIMAL (T-480 is live in this same
  file's `?part=` read): the `doors: PartDoorInfo[]` array's Part 1 entry
  reads the Housewarming door's own state (fail-closed) instead of
  `stage1Phase`; a new `part1` prop is handed to `ReadingStageDeck`.
- `src/components/reading/ReadingDayOpenNotice.tsx` — EDIT: a fourth poll
  target (`/api/housewarming-door`), Part 1's flag reads it instead of
  reusing Stage 1's `open1`.
- `src/lib/reading-parts.ts` — EDIT, DOC ONLY: the module docblock's "Parts
  1 and 2 share ONE door" line is re-trued to the new split; every
  exported function is untouched (already generic over `PartDoorInfo[]`).
- New test files: `tests/housewarming-door-state.test.ts`,
  `tests/housewarming-door-route.test.ts`,
  `tests/admin-housewarming-door-route.test.ts` (exact names may shift
  slightly while building).
- Re-trued existing tests (assumed Parts 1/2 shared Stage 1's one door):
  `tests/reading-parts-473.test.ts`, `tests/reading-stage-deck-473.test.ts`,
  `tests/rooms-card.test.ts`.
- `tests/reading-page.test.ts` — EDIT (OWNS widened): adds source-pin
  coverage for the default-part inputs' new Housewarming read, confined
  to the same describe block the existing `qaState` fix-round pin lives
  in; never touches T-480's own `?part=` read.

## READ-ONLY

Everything else, including (explicitly, per the brief):
`src/components/reading/ReadingStage.tsx`, `src/components/booking/JitsiRoom.tsx`
(T-479's own live branches/file), the `?part=` read and any other part of
`src/app/reading/page.tsx` beyond the default-part inputs (T-480's own
lane), `src/lib/door-lifecycle.ts`, `src/lib/stage2.ts`, `src/lib/qa-door.ts`,
`src/lib/stage1.ts`, `src/app/a/site/reading/RoomsCard.tsx` (already
door-agnostic, config-driven — no edit needed).
