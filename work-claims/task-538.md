# WORK-CLAIM - TASK-538 - ONE Cocreation: the after-reading replay letter, drafted for Love's review

CLAIMED-BY: builder standing in for Ms. Kimi (out of credits)
BRANCH: `feat/task-538-after-reading-replay-draft`
WORKTREE: `~/dev/worktrees/task-538`
BASE: main `fbd6015`
LANE PORTS: 5300-5303
BRIEF: `~/dev/kimi/inbox/TASK-538-oc-after-reading-replay-draft.md`

## Law
No queue, no list send, no subscriber reads. Review copies go only to reviewRecipients(). No new cron.

## OWNS
- `work-claims/task-538.md`, `work-claims/task-538-register.md` (NEW)
- `src/lib/reading-week-drafts.ts` (the recap step, its helpers, the `DraftStats.replay` type ONLY; the next-reading half byte-identical)
- `src/lib/reading-draft-keys.ts` (only if a helper is needed)
- `tests/after-reading-draft-538.test.ts` (NEW)
- `tests/reading-week-drafts-534.test.ts` (only the `replay: "held"` pins this lane disturbs, comment naming T-538)

READ-ONLY: replays-source.ts, letters.ts, mail.ts, mail-queue.ts, src/app/a/letters/**, src/app/api/admin/letters/**, src/app/api/mail/tick/route.ts, vercel.json.
