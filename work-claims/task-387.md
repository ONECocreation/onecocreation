# work-claims/task-387.md — task-387 (OC · studio chat: hidden per room, and a live on/off switch)

Lane: the home crew (Sonnet builder, under Number One's gate). Base = onecocreation main
**1c653f1d977e76bec4769c689e5de959f56c98d5** (PR #38, T-383 the design-drift guard — `git
rev-parse HEAD` on this worktree matched this sha exactly before any commit). Branch
`feat/task-387-studio-chat-switch`. Worktree `~/dev/worktrees/task-387`, `npm ci` run fresh
by this builder (550 packages, 0 vulnerabilities). Lane ports **4642–4645**. Brief:
`~/dev/kimi/inbox/TASK-387-oc-studio-chat-switch.md`.

Two controls over ONE honest state: a per-room `chat: "on" | "hidden"` default riding
`SiteConfig.rooms` (a NEW partial-keyed-map field, merged per-slug — unlike `reading`/`about`/
`nav`'s whole-object rule, a save carries only the changed slug(s) and every other stored slug
survives untouched), and the SAME switch is the live session toggle the operator flips at
`/a/site/chat` (Named decision A) — members' room pages re-read it on the EXISTING 20-second
`/api/live` poll inside `ClassroomView.tsx` (Named decision B, one new fetch inside the
existing tick, zero new timers), with first paint via the room page's own already-fetched
`getSiteConfig()` read (Named decision C) so a hidden room never flashes its chat even once.
Absent room entry means chat ON (Named decision D). A hidden chat renders NO `.cl-area-chat`
region at all on the Stage (video takes the width via the new `.cl-grid-stage--no-chat`
modifier) and no Room Chat mount at all on the Lesson Path — never a per-member mute, never
touching `room-access.ts`'s gate, never reaching into `RoomView.tsx`/`StageChat.tsx`.

## OWNS

NEW `src/app/a/site/chat/page.tsx`, NEW `src/components/console/SiteChatCard.tsx`, NEW
`tests/studio-chat-switch.test.ts`, this file (`work-claims/task-387.md`, first commit).

Additive, narrowly: `src/lib/site-config.ts` (the `rooms` field + `RoomChatConfig` type +
`sanitizeRooms` + `roomsPatchError` + the patch type's `rooms` field + the per-slug merge line
in `saveSiteConfig`), `src/app/api/admin/site/route.ts` (the operator PUT's `rooms` branch
only — the public GET half byte-identical), `src/components/console/SiteConsoleShell.tsx`
(one `SITE_SUBS` entry, "Room chat" → `/a/site/chat`), `src/app/rooms/[slug]/page.tsx` (the
`chatHidden` read off the already-fetched `switches` + one prop line),
`src/components/rooms/ClassroomView.tsx` (the `chatHidden` prop, the exported pure
`nextChatHidden` helper, the poll's one added `/api/admin/site` fetch, the two vantage prop
lines), `src/components/rooms/StageView.tsx` (the `chatHidden` prop, the conditional chat
region, the `cl-grid-stage--no-chat` modifier class), `src/components/rooms/LessonPathView.tsx`
(the `chatHidden` prop, the two conditional `RoomView` mounts), `src/components/rooms/
classroom.css` (one additive modifier rule, `.cl-grid-stage--no-chat`).

## READ-ONLY and FORBIDDEN

READ-ONLY: `src/lib/matrix-rooms.ts`, `src/components/rooms/RoomView.tsx` + `StageChat.tsx`,
`src/components/rooms/CircleView.tsx`, `src/components/rooms/vantage.ts`,
`src/lib/reading-room.ts`, `src/app/a/site/reading/*` + `ReadingScheduleCard.tsx`,
`src/components/console/glass.tsx`, `src/components/NavMenu.tsx` + `SiteFooter.tsx`,
`src/app/house.css`, `src/app/kit.css`.

FORBIDDEN: any new poll/timer/socket, any per-member or per-message chat state, any new CSS
file, any literal color or per-page ruleset, `RoomView.tsx`'s internals, the 6s timeline poll,
any production KV/Blob write beyond the operator's own Save, any civil-date stamp (block
heights only), touching `RoomView.tsx`/`StageChat.tsx`, hard-coding any schedule word, any
tier/payment/entitlement logic, treating hidden chat as Matrix access revocation, resetting the
video region on a chat transition.

## Gates

`npx vitest run` (includes T-383's design-drift guard) · `for f in scripts/*.test.mjs; do node
"$f"; done` · `npx eslint src tests --max-warnings=0` · `npx tsc --noEmit` · `npx next build`
(Number One's gate, after `git merge main`). This builder runs the first four inside the
worktree only; `next build`, `scripts/shots-fixture.sh`, and the Chrome walk are Number One's.

## Cut note

Stamp per the brief, block 968,088.
