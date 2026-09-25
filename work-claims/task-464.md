# TASK-464 claim

Builder: sonnet sub-agent for Number One
Block: 968,548 (the Admiral's answers to the two open /reading questions)
Branch: feat/task-464-reading-small-watch
Worktree: /home/pac/dev/worktrees/task-464
Base: 83f1a3f (main after #84/#85/#86)

Contract, the Admiral's two answers:
1. "yes": the /reading Playground banner's kicker "Stage 2 · the Playground"
   becomes "The Playground". The h2 "Want an encore?", body line and
   "Go to the Playground" button are unchanged.
2. "smaller": the live state's "Watch Love live" becomes
   `kit-btn kit-btn-main kit-btn-sm`. At full size it runs 3 px past its card
   on a 360 px phone (T-463 register). The link, label and quiet line are unchanged.

## OWNS
- `src/components/reading/ReadingStage.tsx`: the published-state Watch link's className, the banner kicker text, and the two doc-comment lines that name them.
- `tests/reading-buttons-phone-463.test.ts`: the live-Watch full-size pin, re-trued to small.
- `tests/reading-watch-heart-field-457.test.ts`: the published class pin, re-trued.
- `tests/reading-playground.test.ts`: the banner kicker pin, re-trued.
- `tests/reading-stage.test.ts`: the banner kicker pins, re-trued.
- `tests/reading-small-watch-464.test.ts`: NEW.
- `work-claims/task-464.md`, `work-claims/task-464-register.md`.

## READ-ONLY
kit.css, house.css, every other /reading button ("Watch again" and "Try again"
stay full size: their labels are short and fit), Stage2Details.tsx (its
"Stage 2 · after the reading" kicker is in the dead default export, a
post-Saturday follow-up), and /reading/playground.
