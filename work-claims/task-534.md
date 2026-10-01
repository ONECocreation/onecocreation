# WORK-CLAIM - TASK-534 (Wednesday half) - ONE Cocreation: letters drafted for Love's review

CLAIMED-BY: builder standing in for Ms. Kimi (paused)
BRANCH: `feat/task-534-letters-drafted-for-review`
WORKTREE: `~/dev/worktrees/task-534`
BASE: main at cut = `8ef0363` (T-493 merged as PR #123; T-499 Housewarming switch on main)
LANE PORTS: 5284-5287
BRIEF: `~/dev/kimi/inbox/TASK-534-oc-letters-drafted-for-review.md`, section "RULINGS + RELEASE (block 969,313)".

## Scope of THIS pass
The Wednesday "next reading" DRAFT letter only, plus its once-key, the review copy (direct sendMail, news@), the Reading-group placement in /a/letters, and the operator-only `?draft=now` poke. The recap/after-reading half is HELD until T-532 merges (`loadReplays`); a seam is left for it.

## Law
Nothing ever goes to the list without an operator's existing Approve and send. This lane mails only the operator recipient set.

## OWNS
`work-claims/task-534.md` + `work-claims/task-534-register.md` (NEW) · NEW `src/lib/reading-week-drafts.ts` · `src/app/api/mail/tick/route.ts` · NEW `src/lib/reading-draft-keys.ts` (the client-safe prefix list the room imports; the server module cannot be imported by a client page) · NEW `tests/reading-week-drafts-534.test.ts` · `src/app/a/letters/page.tsx` (Reading-group placement/tag only, released by T-493's merge). READ-ONLY: everything else named in the brief (letters.ts, reading-letters.ts, mail.ts, site-config.ts, admin/letters/**, vercel.json, packages/operator-auth).
