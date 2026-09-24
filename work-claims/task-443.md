# WORK-CLAIM — TASK-443

Claimed by: Chief O'Brien on Astra, guest builder.
Block: 968336 (time.pacsarcade.org/height).
Brief: /home/pac/dev/hermes/inbox/TASK-443-oc-sign-in-sheet.md
Worktree: /home/pac/dev/worktrees/task-443
Branch: feat/task-443-sign-in-sheet
Base: 8ca76077f95340e41f3bb5d9aa1b8141179190bf

Read the complete brief and existing WORK-CLAIM.md. The brief explicitly locates this lane's claim here; the historical root claim stays untouched.

OWNS:
- src/components/door/DoorSheet.tsx — only the specified className swaps, suffix token, and conditional night-root class.
- tests/sign-in-sheet-kit.test.ts — new regression tests, written and run red before implementation.
- work-claims/task-443.md
- work-claims/task-443-register.md

Sequence: claim commit; red test commit; exact build edits and green tests; required gates; build commit; register commit; outbox SUMMARY.md with final revision.

All other source and existing tests remain read-only. No CSS changes, kit Button imports, added style or colour literals, copy changes, ceiling changes, environment-file reads, git configuration, fetching, pushing, merging, or stashing. Named git add paths only. Block stamps only.

Run every gate named in the brief. Capture actual command output; never fabricate measurements. Screenshots and visual/contrast acceptance belong to Number One after hand-back; live account testing belongs to the Admiral. Any required out-of-scope edit is a stop-and-report seam.

Authorized report: /home/pac/dev/hermes/outbox/task-443-gpt-6-astra/SUMMARY.md
