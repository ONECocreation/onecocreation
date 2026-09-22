# work-claims/task-382.md — task-382 (OC · the reading room's next-reading notice)

Lane: the home crew (Sonnet builder, under Number One's gate). Base = onecocreation main
**c9ebcb94f2eec21570ecd9f15edcb3764dd8b7ef** (T-381 merged, PR #33 — `git rev-parse HEAD` on
this worktree matched this sha exactly before any commit, reconfirmed at cut). Branch
`feat/task-382-reading-notice`. Worktree `~/dev/worktrees/task-382`, `npm ci` run fresh by
this builder (550 packages, 0 vulnerabilities). Lane ports **4622–4625**. Brief:
`~/dev/kimi/inbox/TASK-382-oc-reading-notice.md`.

A slim `ReadingNotice` above the Stage, mounted from inside `ClassroomView.tsx` (never
`rooms/[slug]/page.tsx` directly), reading T-381's `reading-schedule.ts` source and
`SiteConfig.reading`, showing the reading room's visitors the next scheduled reading in
four honest states, stepping aside while the room's own live poll says Love is live. THE
MOCKUP NOD IS GIVEN — with changes (the Admiral, block 968,048): no letters door, no "Add
to my calendar" (a later lane); the off state is words only, "Stay tuned, with love." and
nothing else. Four RULED decisions (Number One, block 968,061, folding Astra's plan
review) this lane builds exactly as ruled: **ROLLOVER** — no stored `phase`, the notice
recomputes via `nextReading` fresh on every check and re-arms its own boundary timer,
never a fixed 7-day step; **DETERMINISTIC HYDRATION** — the first paint (server and the
matching first client paint alike) reads only the server snapshot
(`schedule`/`next`/`asOfMs`), never `Date.now()` during render; the visitor's own local
time is absent from that first paint and added by a post-mount effect;
**LIVE INITIAL STATE** — `ClassroomView`'s `live` state starts `null`, so the notice may
show for up to 20 seconds even if Love is already live when the visitor arrives (accepted,
no new poll); **SCOPE WORDING** — the two new `ClassroomView.tsx` imports both come from
the new sibling file, and this lane's diff to `ClassroomView.tsx`/`page.tsx`/
`SiteReadingRoom.tsx` is byte-identical except the named lines below.

## OWNS

NEW `src/components/rooms/ReadingNotice.tsx` (default component + named `ReadingNoticeProps`
+ named `noticeState`, Build 1/Tests), NEW `tests/reading-notice.test.ts`, this file
(`work-claims/task-382.md`, first commit).

Additive, narrowly — byte-identical except these named lines:
- `src/components/rooms/ClassroomView.tsx`: the two new import lines (`import ReadingNotice
  from "./ReadingNotice";` beside the sibling-view imports; `import type { ReadingNoticeProps }
  from "./ReadingNotice";` beside the other type-only imports), the `reading?: ReadingNoticeProps
  | null` field appended to `Props`, the destructuring line (`reading` added immediately
  before `cameraDoor`, preserving `named-guest-camera-door.test.ts`'s `"cameraDoor }: Props"`
  substring pin), and the one mount line between the `cls-bar` block and the vantage switch.
  `thisRoomLive`'s own computation and every other existing line stay byte-identical.
- `src/app/rooms/[slug]/page.tsx`: two new imports (`READING_ROOM_SLUG` from
  `@/lib/reading-room`; `nextReading`, `DEFAULT_READING_SCHEDULE` from
  `@/lib/reading-schedule`), the `reading`/`asOfMs` computation, and the one new
  `reading={reading}` JSX prop line — every other existing line stays byte-identical.
- `src/app/a/site/reading/SiteReadingRoom.tsx`: the intro paragraph's second sentence and
  the docblock comment (both now honest that the reading room shows the schedule above the
  video) — nothing else in that file, and nothing in `ReadingScheduleCard.tsx`, changes.

Any new shared CSS rule lands in `kit.css` (Template check) — named in the final report.

## READ-ONLY and FORBIDDEN

READ-ONLY: `src/app/a/site/reading/ReadingScheduleCard.tsx`, `src/lib/reading-schedule.ts`,
`src/lib/site-config.ts`, `src/lib/reading-room.ts`, `src/lib/live.ts`,
`src/components/studio-overlay/Countdown.tsx` (consumed, not edited),
`src/components/rooms/StageView.tsx`, `src/components/rooms/VantageSwitcher.tsx`,
`src/components/rooms/vantage.ts`.

FORBIDDEN: `src/components/rooms/RoomView.tsx` (T-380's file) and its three mount
call-sites, `StageView.tsx`'s internal `cl-grid-stage`, `LIVE_SCHEDULE`'s string value,
"Add to my calendar," any letters door or "Join the letters" words in the notice, any
production KV/Blob write, any civil-date stamp (block heights only).

## Gates

`npx vitest run` · `npx eslint src tests --max-warnings=0` · `npx tsc --noEmit` ·
`npx next build` (Number One's gate, after `git merge main`). This builder runs the first
three inside the worktree only; `next build`, `scripts/shots-fixture.sh`, and the Chrome
walk are Number One's.

## Cut note

Stamp per the brief, block 968,061.
