# TASK-474 claim

Builder: Number One
Block: 968,624. The Admiral: "love wantd the mail to go out 2a mountain time" and "why are we putting this job on the vps".
Branch: feat/task-474
Worktree: /home/pac/dev/worktrees/task-474
Base: origin/main 0486441 (after #96)

The day-of reading letter is gated at 02:00 in the schedule's zone (reading-letters.ts), but the only clock was ONE daily Vercel cron at 15:00 UTC (09:00 MDT). TASK-389 left the 2 AM send to a VPS crontab poke. This lane moves it onto Vercel: two added daily runs of the SAME tick, 08:05 UTC (02:05 MDT) and 09:05 UTC (02:05 MST). The run that lands before 02:00 local sends nothing. The 15:00 run stays the backstop. No code path changes.

## OWNS
- `vercel.json`: EDIT, two added cron entries.
- `tests/reading-letters.test.ts`: EDIT, the pinned cron test re-trued to three runs, with the reason.
- `work-claims/task-474.md`: this file.

## READ-ONLY
Everything else, including `src/app/api/mail/tick/route.ts` and `src/lib/reading-letters.ts`.
