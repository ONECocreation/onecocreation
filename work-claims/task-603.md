# WORK-CLAIM - TASK-603 - ONE Cocreation: the Intuitive Q&A questions box, the Questions room, and the host-side sheet on the Q&A stage

CLAIMED-BY: Number One's builder, on the Admiral's A pressed at block 971,279 (plan card 971255), his box ruling (block 971,255), and his Desk answer on card 971566 (K182, block 972,726, verbatim: "Build it (Studio menu)").
BRANCH: `feat/task-603-qa-questions-build`
WORKTREE: `~/dev/worktrees/task-603`
BASE: origin/main (8f2fffe6)
BRIEF: ~/dev/kimi/inbox/TASK-603-intuitive-qa-questions-box-and-the-letter-button.md + ~/dev/kimi/inbox/K182-his-desk-presses-972726-t603-build-t605-build.md (the phase-2 build list governs)

PHASE 2: THE BUILD. Phase 1 (mockup, rounds 1-3) was claimed and drawn on `feat/task-603-qa-questions` (claim 03aa20c1, cherry-picked -x onto this branch per the unpushed-lane rebuild law); the drawings are archived in ~/dev/kimi/outbox/task-603/mockup/. This branch builds round 3 as drawn (forge set oc-qa-questions-r3), per K182's five items: the Studio sub item (not the Letters menu), the /qa/questions box + thanks state, the Questions room with Read and respond and auto-archive, the Questions button on the host controls at /a/site/reading/go/qa opening the right-side sheet, answered rows centred at phone width; the notice to Love rides the existing mail module only; the call area stays a placeholder until the in-page Jitsi room is built.

## OWNS (phase 2, firmed at cut from K182)
- `src/lib/qa-questions.ts` (NEW - the month-keyed questions store, the house dual-driver idiom: KV in prod, data/qa-questions/ files in dev; asker emails are PII, so no public-blob fallback)
- `src/app/api/qa/questions/` (NEW - the public POST: honeypot + the sign-in box's meter idiom, stores the question, mails Love the notice through the existing mail module)
- `src/app/api/admin/qa-questions/` (NEW - the operator GET list / PUT reply / PUT mark-answered, the qa-door gate shape)
- `src/app/qa/questions/` (NEW - the public box + thanks state)
- `src/app/a/letters/questions/` (NEW - the operator Questions room; the ROUTE stays here per the T-545 precedent, the menu lists it under Studio)
- `src/components/qa/` (NEW - the shared QuestionsPanel + the stage extras)
- `src/app/a/site/reading/go/[door]/GoRoom.tsx` (two optional slots on GoRoomBody + the qa door's Questions button/sheet; the file's pinned idioms kept - kit classes only, no inline styles in the pinned quotes)
- `src/components/console/SiteConsoleShell.tsx` (the Studio sub item + its own head words beside T-622's STUDIO_SUB_HEADS)
- `src/app/kit.css` (the kitx-form-col + kitx-qa-* rules, layout only)
- `tests/site-room-accordion.test.ts` (T-545's STUDIO_SUBS pin gains the questions row - a pin fix by name, inside OWNS per LESSONS 971,280)
- `tests/reading-page.test.ts` (the kitx- stem pin gains kitx-form and kitx-qa - a pin fix by name, same law)
- `tests/qa-questions.test.ts` (NEW)
- `.gitignore` (the dev-driver data/qa-questions/ files)
- `scripts/console-matrix.routes.json` (the policy row for the new /a/letters/questions room; Number One at the gate, 972,826)
- `~/dev/kimi/outbox/task-603/`
- `work-claims/task-603.md`

NOT IN THIS LANE (said so the next reader never hunts): the letter block in reading-week-drafts.ts rides T-601's lane; the round-2 marks on HousewarmingSwitchCard (T-614's PartSwitchCard rewrite superseded it) and ReadingScheduleCard (T-622's rework) are NOT re-applied; the round-1/2 reading-page QuestionsCard stayed a drawing (round 3 moved the list to its own room); the em dash Number One flagged in the Studio heading was already swept to a colon on main by T-622 (verified, no edit); the call area on the qa stage stays a placeholder box until the in-page Jitsi room lands.

READ-ONLY: everything else (qa-entitlement.ts, the Q&A door state, mail.ts and mail-queue.ts themselves - the notice and the reply call them, never edit them).
