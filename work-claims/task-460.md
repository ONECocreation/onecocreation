# TASK-460 claim — the Weekly Intuitive room becomes "The Playground", with a door to the call

Builder: Number One (Claude Sonnet 5)
Block: 968,543 (Saturday lanes)
Branch: feat/task-460-playground-room-name
Worktree: /home/pac/dev/worktrees/task-460
Base: 9db8532a23e01f705b2fb8a53d8d976f49fa1f99 (origin/main tip at cut)
Brief: /home/pac/dev/briefings/oc-sat-lanes-968543/TASK-460-playground-room-name.md
Common rules: /home/pac/dev/briefings/oc-sat-lanes-968543/COMMON.md

Ruling: 968,516 (the Admiral, verbatim in the brief) — rename the top of the
Weekly Intuitive room from "Clair Senses — Foundations" to "Playground",
and the tab too. 968,543, decision cw-playground-where, OPTION B: rename
the room and its tab to The Playground, and put a "Join the Playground"
link in it that opens the Playground call. NOT option C — the call is not
wired into that room's own stage.

## OWNS

- `src/lib/matrix-rooms.ts` — line 19 only (the `clair-senses` room's
  `title` field: "Clair Senses — Foundations" → "The Playground"; id, slug,
  kind, minTier untouched).
- `src/lib/puck-seeds.ts` — line ~382 only (the Classes column's seed line
  for this one room; another lane edits other lines of this file).
- `src/lib/reading-room.ts` — a new named constant, `PLAYGROUND_ROOM_SLUG`,
  beside the existing `READING_ROOM_SLUG` (the brief's own Build 3
  instruction: "gated by a named constant... never a bare string twice").
  Not listed verbatim in the brief's OWNS block; flagged here as the
  minimal edit the brief's own Build section directs.
- `src/components/rooms/Stage2Door.tsx` — words only (aria-label,
  `signInDoorLine` argument, the two package-door template strings, the
  Join button label, the unreachable line, both click-failure notes).
- `src/components/rooms/StageView.tsx` — one hunk: the import line plus one
  new `{slug === PLAYGROUND_ROOM_SLUG && (...)}` block, mirroring the
  existing `READING_ROOM_SLUG` block's wrapper shape.
- `src/components/rooms/PlaygroundDoor.tsx` — NEW leaf file, not named in
  the brief's OWNS list; required by the operator census ratchet (see
  Deviations in the register — StageView's `buttonFamilies` baseline is 1,
  exactly TASK-450's own precedent for `StoryTimePill.tsx`).
- `src/app/api/admin/stage2/route.ts` — the PUT handler's action dispatch,
  wrapped in try/catch exactly like `admin/stage1/route.ts`'s own SEC-4
  block.
- `src/app/a/site/reading/Stage2Card.tsx` — the `act()` function's response
  read only (defensive `.json().catch(...)` + optional chaining).
- `tests/playground-room-460.test.ts` — NEW.
- `tests/stage2-door.test.ts` — pins re-trued for the words Build 4 changed
  (not literally named in the brief's OWNS list, but required by COMMON.md's
  own law: "re-true exactly the pins that name those words").
- `tests/package-names.test.ts` — one pin re-trued at line 78 (named by the
  brief directly).
- `tests/live-puck.test.ts` — three pins re-trued (the brief's own ground
  truth flagged this file as a fixture that "only needs changing if it
  reads ROOMS" — it does, via the real `clair-senses` room lookup; the one
  OTHER "Clair Senses — Foundations" occurrence in this same file, an
  injected literal prop unrelated to ROOMS, is untouched).
- `work-claims/task-460.md`, `work-claims/task-460-register.md`.

## READ-ONLY (never touched)

`src/components/rooms/RoomVideoSlot.tsx` (byte-pinned), `StoryTimePill.tsx`,
`src/components/reading/JitsiViewer.tsx`, `src/components/reading/playground/PlaygroundIsland.tsx`,
`src/lib/stage2-access.ts`, `src/components/reading/ReadingStage.tsx`
(another lane), `src/app/api/admin/matrix/ceremony/route.ts` (the ceremony
route), `src/app/kit.css`, `src/app/house.css`, every other existing test
file not named above, every other lane's OWNS.

## Build order

1. Claim (this file).
2. Red tests: `tests/playground-room-460.test.ts` (new) plus the re-trued
   pins in `tests/stage2-door.test.ts`, `tests/package-names.test.ts` and
   `tests/live-puck.test.ts`, committed against the UNCHANGED source (22
   failures confirmed by temporarily stashing the source-side changes and
   running the suite before restoring them — see the register).
3. The build: matrix-rooms.ts, puck-seeds.ts, reading-room.ts,
   PlaygroundDoor.tsx (new), StageView.tsx, Stage2Door.tsx,
   admin/stage2/route.ts, Stage2Card.tsx.
4. Register.

## Laws

COMMON.md binds this lane in full: never push/fetch/merge/rebase/PR; never
read `.env*` or secrets; never delete files; narrow the change, OWNS-only,
any needed change outside OWNS is a seam to report; one CSS stack, no new
class, no inline `style=`, no colour literal; no idle motion, no arrow/emoji
on a button label; block-height dates only; re-true pins honestly, never
weaken or delete a test; card-only words (bitcoin OFF).
