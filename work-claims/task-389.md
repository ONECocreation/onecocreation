# work-claims/task-389.md — task-389 (OC · the two reading emails: confirmation + day-of)

Lane: the home crew (Sonnet builder, under Number One's gate). Base = onecocreation main
**bdcbc181b128933d672b55e2d27316d10338ce34** (`git rev-parse HEAD` on this worktree matched
this sha exactly before any commit — merge of PR #42, T-392 Stage 2). Branch
`feat/task-389-reading-emails`. Worktree `~/dev/worktrees/task-389` (cut by Number One),
`npm ci` already done. Lane ports **4650–4653**. Brief:
`~/dev/kimi/inbox/TASK-389-oc-reading-emails.md`.

The subscribe route's `"reading"` branch (TASK-388, on main) tags a soul but sends nothing —
this lane turns that silence into a confirmation letter on sign-up, and adds a second
"don't forget" letter on the reading's own day, riding the EXISTING hourly-cadence mail tick
(decision A: no new cron, no new queue). Both letters carry the Stage link
(`siteBase() + READING_ROOM_PATH`) and the rail's own unsubscribe headers, composed through
`brandShell` with literal-hex inline styles exactly as `lead-magnet.ts` does — zero new CSS.

**AMENDMENT applied (Number One, after `walk-968036/ASTRA-REVIEW-T389.md`, block 968,132
later) — R1 through R7, superseding the original Build 3 in behavior (not in OWNS):** every
send (day-of AND the confirmation backlog sweep) is DIRECT through `sendMail`, never
`mail-queue.enqueue()` (R1 — a letter queued after the tick's own drain would ride TOMORROW's
single daily cron); `capRemaining() > 0` is checked before each send and `nowMs < startsAtMs`
is re-evaluated at the moment of each one, never a stale value (R1); `isSubscribed(email)`
sits immediately before every send, all four call sites (R2); once-keys are PER RECIPIENT —
day-of `reading-dayof:<startsAtMs>:<email>` (7 days), confirmation `reading-confirm:<email>`
(24h) shared by BOTH the sign-up route and the sweep so the two can never double-send the
same soul (R3); the sign-up path checks capacity BEFORE claiming, so a spent meter never
burns the claim and the next tick's sweep is the honest retry (R4); the schedule policy is
`getSiteConfig().reading ?? DEFAULT_READING_SCHEDULE` — an absent config now uses the default
(which is `on: true`), only an explicit `on: false` silences the day-of letter, withdrawing
Build 3's original "absent = no-op" (R5); `READING_ROOM_PATH` (`string | null`) links `/reading`
when null, never a broken `siteBase()+null` href (R6); the wall-clock/clock-words helpers live
in `reading-letters.ts` itself via `Intl.DateTimeFormat` directly — `booking-time.ts` untouched
(R7). Every ruling is named as taken in the hand-back SUMMARY, with the exact reasoning for
each ordering choice (capacity → claim → send → stamp) that the amendment's prose left to the
builder's judgment.

## OWNS

NEW: `src/lib/reading-letters.ts`, `tests/reading-letters.test.ts`, this file
(`work-claims/task-389.md`, first commit). Additive, narrowly: `src/app/api/subscribe/route.ts`
(inside the `"reading"` branch only — every other source's path byte-identical);
`src/app/api/mail/tick/route.ts` (one import + one added call + the `reading` field on the
JSON response — the auth lines and the existing `tick()` drain call byte-identical);
`src/lib/subscribers.ts` (three additions only — `readingConfirmedAt?` on `SubscriberRecord`,
`listSubscribersByTag`, `markReadingConfirmed` — every existing line byte-identical).

## READ-ONLY and FORBIDDEN

READ-ONLY (grounding/reuse, never edited): `src/lib/mail.ts`, `src/lib/mail-queue.ts`,
`src/lib/reading-schedule.ts`, `src/lib/reading-room.ts`, `src/lib/booking-time.ts`,
`src/lib/lead-magnet.ts`, `src/app/api/admin/letters/send/route.ts`, `vercel.json`.

FORBIDDEN: any new cron entry, route, queue, or service; any send outside the rail's hourly
meter and `onceWithin` guard; any letter to an opted-out or untagged address; any hard-coded
weekday; a live countdown in email; any shell/header restyle (TASK-390's window); any
production KV/Blob write beyond the mail rail's own records; any civil-date stamp in
commits/claim/SUMMARY (block heights only).

## Gates

This builder runs, inside this worktree only: `npx vitest run` (whole suite), each live
`scripts/*.test.mjs`, `npx eslint src tests --max-warnings=0`, `npx tsc --noEmit`,
`npx next build`. Number One's own `oc-gate.sh` and the Chrome walk are his, not this
builder's.

## Cut note

Ground truth as of block 968,132 (house beacon), per the brief; the amendment above landed
later at the same block. Fresh beacon read at hand-back: block 968,135.
