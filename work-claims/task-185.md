# work-claim — task-185

- **Task:** TASK-185 — ONE Cocreation: THE FRONT DOOR — sign in and sign up as one short walk (PHASE A: design + prototype)
- **Lane:** kimi
- **House/repo:** onecocreation (`~/dev/onecocreation`)
- **Worktree:** `~/dev/worktrees/task-185` · branch `feat/task-185-front-door`
- **Base:** main @ 909e2cd (all five of the previous wave merged: T-176/177/178/179/183)
- **Phase:** A only — deliverable is `outbox/task-185/DESIGN.md` + prototype shots; ends `DESIGN-READY <sha>`, never LANE-DONE.
- **OWNS (verbatim, both phases):** `src/components/LoginPanel.tsx`, `src/app/login/**`, `src/app/welcome/**`, `src/components/welcome/**`, `src/components/TagClaim.tsx` (retire or hide), `src/components/SiteHeader.tsx` (the button + the sheet mount + the member menu), NEW `src/components/door/**`, tests. NOT `src/app/api/auth/**` except additive reads — flag anything they need.
- **Stamp:** claimed 0018.06.18 a₿ (block ~966101)

## Phase B note (0018.06.18 a₿, block ~966113)
- **Phase B GO** — the Admiral ruled on DESIGN.md @ ca3acc1 (spec's RULED section): the design stands; four rulings + K7 (proof badge, code-door rate limit, no captcha).
- **Re-based:** merged main @ 7693fb2 (T-184's three rooms, T-186's one-currency, the middleware door on /rooms/* + /live — kept, no second signed-out gate in any page of mine). Baseline after the merge: **52 files / 551 tests green**.
- **Sanctioned OWNS exception (dispatcher, 0018.06.18 a₿):** ONE minimal additive edit inside `src/app/api/auth/email/**` — the code-door rate limit (K7). Everything else outside OWNS is the ruling's own named retirements/callers (FrenBadge.tsx; EmailDoor's callers ReadWithLove + the puck join blocks; LoginPanel's two console previews) — each justified in SUMMARY.md.
