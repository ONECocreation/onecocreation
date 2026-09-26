# TASK-484 claim

Builder: sonnet sub-agent for Number One
Block: 968,624+ (Saturday, reading day)
Branch: feat/task-484
Worktree: /home/pac/dev/worktrees/task-484
Base: origin/main 81608d2

Two items, one PR.

## A. The /a/letters send panel says what happened (walk item S7)

TRACE finding: `sendList()` (`[key]/page.tsx`) already produced a `note`
string for every route outcome (a 409, the 429 dedupe, a fetch failure
falling back to a literal string, the success line) — the miss was that
ONE shared `note` state served BOTH the test button and the list button,
rendered in exactly one place under the LIST section, `var(--muted)`
throughout with no visual break between success and failure. A test
click's own confirmation could land far from the button that caused it;
a failure and a success looked identical at a glance. The 2-of-6 queue
count is most consistent with the 409 path actually firing (a stale
panel's segment count from page load racing the route's fresh
`list.length` read at click time) — a real send never firing, the 2
items being unrelated leftovers, not this click's own send.

Build: `testOutcome`/`listOutcome` are now separate, four-state values
(idle/sending/err/ok-or-progress), each rendered as its OWN
`aria-live="polite"` line right next to its own button, reusing kit.css's
new `.kit-note`/`.kit-note-ok`/`.kit-note-err` (no per-page style
object — design-drift and operator-census both sit at THIS file's own
ceiling already, zero headroom). A real list send now carries a `sendId`
(`crypto.randomUUID()`), written to `letters:send:<sendId>` (KV hash:
queued/sent/dropped/key/segment/scheduledFor/createdAtMs, 14-day TTL) by
`mail-queue.ts`'s new `initSendRecord`; `tick()` bumps sent/dropped
against it as it drains. The send route's new GET (`?sendId=` or `?key=`)
reads it back; the panel polls every 15s, stops when done or after 30
min, and lists the last few sends for this letter (from `?key=`) so they
survive a reload.

## B. A late reading sign-up still gets the reading-day letter (#2)

Verified FIRST, with a test against the real `enqueueReadingDayOf` (not a
mock of it): the existing tick already reaches a late sign-up at the very
next tick — `sendDayOfIfDue` lists every `reading`-tagged subscriber
fresh on EVERY call and sends through `sendReadingDayOf`'s per-recipient
once-key, so a soul who joins between ticks is simply unclaimed until
the next one finds them. **It already held.** The only real gap was
time — up to 10 minutes, the VPS crontab's own cadence.

Build: factored the tick's own due-check into `dueOccurrenceNow(nowMs)`
(reading-letters.ts), shared by `sendDayOfIfDue` (unchanged behavior) and
the new exported `sendDayOfToOneIfDue(email, nowMs)`, wired into
`/api/subscribe`'s `reading` branch right after the confirmation send for
a genuinely new sign-up. Shares `sendReadingDayOf`'s own once-key, so the
tick can never send it twice.

## OWNS

- `work-claims/task-484.md` — this file.
- `src/app/a/letters/[key]/page.tsx` — EDIT: the send panel's real
  outcome states (test/list, separate), the sendId poll, the recent-sends
  list; auto-slot row and everything above it untouched.
- `src/app/api/admin/letters/send/route.ts` — EDIT: POST now mints a
  `sendId` and writes its record for a real list send (never a test
  copy); NEW GET (`?sendId=` / `?key=`), operator-gated like the POST.
- `src/lib/mail-queue.ts` — EDIT: `QueuedMail.sendId`; the new send-record
  helpers (`initSendRecord`, `recordSendForLetter`, `getSendRecord`,
  `recentSendsForLetter`); `tick()` bumps sent/dropped against a sendId
  as it drains (guard drops, permanent failures, and real sends alike).
- `src/app/kit.css` — EDIT: `.kit-note`/`.kit-note-ok`/`.kit-note-err`
  (the one status-line idiom, reused by both buttons) and
  `.kit-sends-list` (the recent-sends divider) — no `!important`, no new
  font declaration (both ratcheted at zero headroom).
- `src/lib/reading-letters.ts` — EDIT: `dueOccurrenceNow()` factored out
  of `sendDayOfIfDue` (behavior unchanged); new exported
  `sendDayOfToOneIfDue(email, nowMs)`.
- `src/app/api/subscribe/route.ts` — EDIT: the `reading` branch calls
  `sendDayOfToOneIfDue` right after the confirmation send, for a
  genuinely new sign-up only, swallowed on failure like the confirmation
  already is.
- `tests/letters-send-tracking-484.test.ts` — NEW: the sendId/KV record/
  tick-bump/GET-readback plumbing, its own in-memory vault (extends
  `letters-send.test.ts`'s idiom with hash ops).
- `tests/letters-send-panel-status-484.test.ts` — NEW: the panel's pure
  outcome-line/poll-stop functions, plus source-text pins for the /a
  uniformity law (one line per button, aria-live, no em dash/arrow/emoji).
- `tests/reading-day-of-immediate-484.test.ts` — NEW: the "verify it
  already holds" test against the real tick, then the immediate-send
  wiring (due/not-due/begun/wrong-day/sign-up-then-tick/confirmation-first).

## READ-ONLY

Everything else. In particular: `src/lib/mail.ts`, `src/lib/letters.ts`,
`src/lib/subscribers.ts`, `src/lib/booking-time.ts`,
`src/app/api/admin/letters/route.ts`, `src/app/api/admin/letters/slots/route.ts`,
`src/lib/reading-schedule.ts`. No other lane's files.
