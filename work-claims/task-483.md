# TASK-483 claim

Builder: Number One
Block: 968,624+ (reading day, customer-facing)
Branch: feat/task-483
Worktree: /home/pac/dev/worktrees/task-483
Base: origin/main

GOAL: center the "Join the Housewarming" label on /reading's agenda.
Measured on production: the label is 222px wide inside a 256px button
with 24px side padding (208px content box), so it overflows right and
sits 24px from the left edge but 10px from the right. The other three
agenda buttons are centered to the pixel.

FIX: `.kit-day .kit-rows-end>.kit-btn` gets 12px side padding (232px
content box, fits the longest label). One declaration in kit.css.

OWNS:
- work-claims/task-483.md
- src/app/kit.css
