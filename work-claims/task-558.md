# WORK-CLAIM - TASK-558 - ONE Cocreation: slightly rounded corners on every button

CLAIMED-BY: Lumen, on the Admiral's word at block 970,055 (pinned on a review picture of /reading): "can we slightly round the corners for all the buttons for the one cocreation site. similar arch to what we have in the forge."
BRANCH: `feat/task-558-rounded-button-corners`
WORKTREE: `~/dev/worktrees/task-558`
BASE: origin/main `5a2db38`

## THE RULE
One token, `--btn-radius` (6px, the forge's own arc), read by every square-cornered button class. No size, colour, padding, font, copy or layout change. Pills, round buttons and chips stay as they are.

## OWNS
- `work-claims/task-558.md` (NEW)
- `src/app/cartridge.css` (the token)
- `src/app/kit.css` (`.kit-btn-main`, `.kit-btn-second`)
- `src/app/house.css` (`.btn`)
- `tests/rounded-buttons-558.test.ts` (NEW)

READ-ONLY: everything else.
