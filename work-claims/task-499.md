# WORK-CLAIM - TASK-499 - ONE Cocreation: the week without a Housewarming

CLAIMED-BY: Ms. Kimi's crew (builder subagent)
CLAIMED-AT: block 969,306
BRANCH: `feat/task-499-week-without-housewarming`
WORKTREE: `~/dev/worktrees/task-499`
BASE: main at cut = `f6e8f94c6345f248936c9c79ad095bfed8dd11d6` (origin/main; T-496 merged as PR #118, so the T-496 adjacency resolves by absorption - no stacking needed; T-490 and T-492 also merged). Verified at pickup: worktree HEAD == base.
LANE PORTS: 5136-5139
BRIEF: `~/dev/kimi/inbox/drafts/TASK-499-oc-week-without-housewarming.md`

## The lane in one line
A new operator switch on /a/site/reading - "Housewarming this week: on/off" - persisted as one boolean on the site-config doc; when off, /reading hides Part 1 everywhere a visitor can meet it (deck screen, agenda row, part deep link, "now open" flag, member-calendar pill) and the top countdown targets the reading's own time (`schedule.time`) instead of 12:12. ON (or never touched) is exactly today's behavior.

## OWNS (from the brief, verbatim)
NEW `src/app/a/site/reading/HousewarmingSwitchCard.tsx`, NEW `tests/housewarming-switch-499.test.ts`, `work-claims/task-499.md`, `work-claims/task-499-register.md` (the claim register the cut instructions require, carrying the pasted gates baseline); edits: `src/lib/site-config.ts` (the field, the sanitizer, the merge line), `src/app/api/admin/site/route.ts` (the one validation block), `src/app/a/site/reading/page.tsx` (the one mount, a fragment below `<SiteReadingRoom />`), `src/app/reading/page.tsx` (the switch read and the conditional derivations), `src/components/reading/ReadingStageDeck.tsx` (the `part1On` guard), `src/components/reading/ReadingDay.tsx` + `src/components/reading/ReadingDayBody.tsx` + `src/components/reading/ReadingDayOpenNotice.tsx` (the nullable prop, the skipped row, the forced-closed flag), `src/components/calendar/reading-marks.ts` + `src/components/calendar/useReadingSchedule.ts` (the flag and its hook) + `src/components/me/MemberCalendar.tsx` (the one threading line), `tests/reading-page.test.ts` and `tests/reading-countdown-top-489.test.ts` (the honest updates).

## Adjacency noted at cut (Seams in the brief)
- T-496 (Replays) MERGED (PR #118) before cut: base absorbs it; no stack. Its `src/app/reading/page.tsx` Replays section and `src/lib/site-config.ts` replays field are on the cut tip; this lane's edits land beside them.
- T-446's stale claim on `src/app/a/site/reading/SiteReadingRoom.tsx` STILL STANDS at cut (nothing cleared it): decision 3's mount is from the gate page `src/app/a/site/reading/page.tsx` directly below `<SiteReadingRoom />`, NOT inside SiteReadingRoom.tsx. That file is READ-ONLY for this lane.
- T-490's live strip is untouched (the switch off means Love never opens the door; the strip reads the door, not the switch - a strip-respects-switch follow-up is Number One's ruling, not this lane).
