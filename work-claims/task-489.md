# TASK-489 claim

Builder: Number One (Claude Opus 5.5)
Block: 968,624+ (reading day, before the 12:12 Housewarming)
Branch: feat/task-489
Worktree: /home/pac/dev/worktrees/task-489
Base: origin/main fbb3c24 (PR #113, T-488)

GOAL: the Admiral, reading day: "we are missing the countdown. are we
able to add that back to the top of the page. it can be till the 12:12
mountain time." Since TASK-481 gave the Housewarming its own screen, the
blocks countdown lived only inside Part 2's screen (ReadingStage), and
before 12:12 the page opens on Part 1, so no countdown showed. The deck
now puts the same countdown (already targeting 12:12) above Parts 1, 3
and 4 until 12:12. Part 2 keeps its own, unchanged.

## OWNS

- `work-claims/task-489.md` — this file. Committed alone.
- `src/components/reading/ReadingStageDeck.tsx` — EDIT: the countdown
  above the non-Part-2 screens until the Housewarming starts.
- `src/app/reading/page.tsx` — EDIT: pass the Housewarming start instant
  and the first-paint clock to the deck.
- `tests/reading-countdown-top-489.test.ts` — NEW.
