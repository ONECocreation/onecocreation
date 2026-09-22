# work-claim — task-380 (OC · the reading room opens at the video, not the bottom of chat)

Lane: the home crew (Sonnet builder, under Number One's gate). Base = onecocreation main
**9552f74bb3e212b6aac412df449018ddef07a9ac** (Merge PR #30, T-365 walk polish — matches
the brief's base exactly, verified via `git log -1` at cut, block 968,047). Branch
`feat/task-380-reading-room-opens-at-the-video`. Worktree cut by Number One at
`~/dev/worktrees/task-380`, `npm ci` run fresh by this builder. Lane ports **4614–4617**.
Brief: `~/dev/kimi/inbox/TASK-380-oc-reading-room-opens-at-the-video.md`. The Admiral's
words, his production walk, item D4: "the reading room button should link to the top of
the page not bottom of chat. focus on video for them."

A behavior-only fix inside `src/components/rooms/RoomView.tsx`: the two effects that drag
the page and steal the keyboard on mount (`bottom.current?.scrollIntoView({block:"end"})`
keyed on `msgs.length`, and a bare `autoFocus` on the composer) are replaced with a follow
rule that only ever touches the messages pane's OWN scroll box (`scrollTop`, never
`scrollIntoView`), keyed on the newest message's identity (not the window-count), with
intent ("is the reader near the bottom") captured by a scroll listener BEFORE any update
lands. `autoFocus` is removed outright, no opt-in. Two pure helpers (`isNearBottom`,
`shouldFollow`) carry the decision and are unit-tested directly, plus two negative source
pins (`not.toContain("scrollIntoView(")`, `not.toContain("autoFocus")`).

## OWNS

`src/components/rooms/RoomView.tsx` (the follow effect, the new container ref + scroll
listener, the two pure helpers, the removed `autoFocus`), the new test file under `tests/`
(named in SUMMARY.md), `work-claims/task-380.md` (this file, first commit). Three files —
the lane's own size cap, hit exactly.

READ-ONLY (per brief, untouched): `src/components/rooms/StageChat.tsx`,
`src/components/rooms/StageView.tsx`, `src/components/rooms/ClassroomView.tsx`,
`src/components/rooms/vantage.ts`, `src/components/rooms/LessonPathView.tsx`,
`src/app/rooms/[slug]/page.tsx`, `src/lib/reading-room.ts`, `src/lib/matrix-rooms.ts`,
`src/components/door/door-machine.ts`, `src/components/NavMenu.tsx`,
`src/components/rooms/classroom.css`, `src/app/kit.css`, `src/app/house.css`,
`src/app/cartridge.css`, every other test file in `tests/`.

## Gates

`npx vitest run` · `npx eslint src tests --max-warnings=0` · `npx tsc --noEmit` (this
builder's own verify pass — Number One runs the full gate including `next build` and the
`scripts/*.test.mjs` files).

## What is NOT in this lane

No chat bubble redesign, no reaction picker/timeline logic change (`parseTimelineChunk`,
`reactionSendPath` untouched), no Stage layout/video embed/resources card/after-hours
door/roster change, no next-reading notice (T-382), no styling change, no new dependency,
no change to any of RoomView's three mount call-sites, no fix to the door states or
`room-access.ts`.

## Cut note

Stamp per the brief, block 968,047 (claimed).
