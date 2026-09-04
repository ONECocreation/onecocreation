# WORK-CLAIM — TASK-112 (house-wide lint cleanup — main is red: 65 errors / 9 warnings)

CLAIMED-BY: **kimi** (Kimi Code CLI, guest builder lane for Pac)
CLAIMED-AT: BFT derive-or-dash — claimed at session start, cut 0018.06.13 a₿ brief
BRANCH: `feat/task-112-lint-cleanup`
WORKTREE: `~/dev/worktrees/task-112`
BASE: main tip `2185ceb` (the T-97 claim retirement; local main is ahead of origin — the house merges locally, this lane never pushes)
ROOM: `npm run lint` red on main across ~39 untouched files — react-hooks/set-state-in-effect, react-hooks/purity, react-hooks/refs, exhaustive-deps, no-unused-vars, no-unescaped-entities, no-html-link-for-pages, prefer-const. Fix the code, not the rules (rule changes only where provably wrong, documented per file:line). Does NOT touch `.env.local`, package.json / lockfile, :3000/prod, or any deployment. The stale locked worktree `.claude/worktrees/square-rail-port` is ignored, never entered.
LAW: LANE-CLAIM before building (K5 ruling 1). Commit at gates — one commit per rule class. Never merge to main, never push. ENGLISH-PIN. BFT dating in comments.

Files this lane touches:
- `WORK-CLAIM.md` (this claim)
- every file carrying one of the 65 errors / 9 warnings from the T-97 baseline (re-measured on this branch base; per-rule table goes to `outbox/task-112/SUMMARY.md`)
- `eslint.config.mjs` ONLY if a rule proves wrong for a relied-on pattern (each change documented with the file:line it saves)

Brief: `~/dev/kimi/inbox/TASK-112-oc-lint-cleanup.md` (cut 0018.06.13 a₿)
Gates: G1 lint exit 0 · G2 vitest + tsc + build clean · G3 studio DOM snapshot byte-identical (T-97 G1 harness, dev server on a high port, stopped after) · G4 SUMMARY in `~/dev/kimi/outbox/task-112/`
Questions → Number One.
