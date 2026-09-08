# TASK-179 — the old-style brand files retire, every use points at the new marks

- LANE: kimi
- HOUSE: ONE Cocreation (`~/dev/onecocreation`)
- BRANCH: feat/task-179-brand-files (worktree ~/dev/worktrees/task-179)
- BASE: 72bf77f (OC main at dispatch — newer than the spec's d86a116 floor)
- STAMP: 0018.06.18 a₿ · block 966098

OWNS: `src/components/MediaKit.tsx` · `public/brand/*gold*` (moves) ·
`docs/brand-archive/README.md` · tests · `work-claims/task-179.md`

Two exits for anything outside OWNS: flag-and-stop, or minimal forced edit + one-line
justification in the SUMMARY. Sibling lanes T-176 / T-177 / T-178 / T-183 run concurrently
on disjoint OWNS. The vanilla-template sweep is READ-ONLY — findings go in the SUMMARY.

Baseline at cut: `npx vitest run` → 40 files, 378 tests, all green.
