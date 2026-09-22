# work-claims/task-388.md — task-388 (OC · the reading sign-up block, T-370)

Lane: the home crew (Sonnet builder, under Number One's gate). Base = onecocreation main
**1c653f1** (`git rev-parse HEAD` on this worktree matched this sha exactly before any
commit). Branch `feat/task-388-reading-sign-up-block`. Worktree `~/dev/worktrees/task-388`,
`npm ci` run fresh by this builder. Lane ports **4646–4649** (`~/dev/kimi/TASK-NUMBERS.md`).
Brief: `~/dev/kimi/inbox/TASK-388-oc-reading-sign-up-block.md`. Drafter: Ms. Kimi (K93),
review fold at block 968,088 (Astra + Number One).

ONE new component, `ReadingSignUp`, mounted INSIDE `ReadingNotice.tsx` (decision A — the
notice is the natural host; T-387 owns `ClassroomView.tsx` this window, untouched here).
Two states landing today: a signed-in email member gets one centred button, "Count me in
for the weekly reading," writing their own email tag `reading` through a new narrow seam
on the subscribers rail; a key-signed member (no email on file, decision B) gets the email
field instead of a silent skip. The signed-out state (email field + the `/news` letters
door) is carried for this component's future public mounts (TASK-391) — the reading room
itself is members-only, so it never renders there today. The subscribe route's `"reading"`
branch sends NO letter (decision C) — success reads "You're on the list for the reading."
verbatim; TASK-389 is the next lane that adds the confirmation. The block shows only in
`upcoming`/`soon`/`window`, never while the room is live (decision D, unchanged — the host
mount's own `!thisRoomLive` gate).

## OWNS

NEW `src/components/rooms/ReadingSignUp.tsx` (default `ReadingSignUp` + named
`ReadingSignUpCard`, the pure-presentational inner render — see SUMMARY for why),
NEW `src/components/rooms/reading-sign-up-state.ts` (`classifySignUpKind`, `reduceSubmit`,
`INITIAL_SUBMIT_STATE`, associated types), NEW `tests/reading-sign-up.test.ts`, NEW
`tests/reading-sign-up-route.test.ts`, this file (`work-claims/task-388.md`, first commit).

Additive, narrowly — byte-identical except the named lines:
- `src/components/rooms/ReadingNotice.tsx`: one new import (`ReadingSignUp` from the new
  sibling file), and the "window" return and the "upcoming"/"soon" return each wrapped in a
  Fragment with one new `<ReadingSignUp state={state} />` line after their existing `<Card>`.
  The "off" return, `noticeState`/`nextBoundaryMs`, the boundary-timer effect, and every
  other line stay byte-identical.
- `src/app/api/subscribe/route.ts`: one new import (`addReadingTag`) and one new branch —
  `(body.source ?? "") === "reading"` calls the seam and returns `{ ok: true, outcome }`,
  sending no letter. Every other source's path is byte-identical.
- `src/lib/subscribers.ts`: one new optional `tags?: string[]` field on `SubscriberRecord`,
  and one new exported function `addReadingTag(email)`. `addSubscriber`, `removeSubscriber`,
  `listSubscribers`, `subscriberSegments`, `isSubscribed`, and every other existing export
  are byte-identical.

## READ-ONLY and FORBIDDEN

READ-ONLY: `src/hooks/useMemberSession.ts`, `src/lib/reading-schedule.ts`,
`src/components/studio-overlay/Countdown.tsx`, `src/app/news/page.tsx`, `src/lib/mail.ts`,
`src/lib/lead-magnet.ts` (read for the letter precedent only, not touched).

FORBIDDEN: `src/components/rooms/ClassroomView.tsx`, `src/app/rooms/[slug]/page.tsx`
(T-387's window), any second clock/timer/schedule fetch, any letter send from this lane,
any "Add to my calendar" control, any new CSS class or file, any literal color, any
production KV/Blob write beyond the subscribe route's own record, any civil-date stamp.

## Gates

`npx vitest run` · `for f in scripts/*.test.mjs; do node "$f"; done` ·
`npx eslint src tests --max-warnings=0` · `npx tsc --noEmit` · `npx next build` — run in
this worktree only, per the brief's Gates section (verbatim, `shortcuts/oc-gate.sh`).
`scripts/shots-fixture.sh` and the Chrome walk are Number One's.

## Cut note

Stamp per the brief, block 968,088.
