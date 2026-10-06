# WORK-CLAIM - TASK-560 - ONE Cocreation: the three emoji on /memberships get their own line

CLAIMED-BY: Lumen, on the Admiral's word at block 970,084 (pinned on a review picture of /memberships): "these 3 emojies should be on the next line. and they should be much larger, and they should have suffecient padding on the top and bottom. take sample from the /book page. we have emoji's in the header area. this is what we are trying to create similar but here."
BRANCH: `feat/task-560-memberships-emoji-line`
WORKTREE: `~/dev/worktrees/task-560`
BASE: origin/main `5a2db38`

## THE RULE
The three emoji that ended the second paragraph of the memberships welcome move to a line of their own right under it. They wear the /book header's own class (`.constellation`) in one new large size (`.constellation-lg`: 2.4rem, centred, 28px above and below). No word of Love's copy changes, and the /book header's own line is as it was.

## OWNS
- `work-claims/task-560.md` (NEW)
- `src/app/memberships/page.tsx` (the emoji leave the sentence and ride their own line)
- `src/app/house.css` (one new rule, `.constellation-lg`, beside `.constellation`)
- `tests/memberships-emoji-line-560.test.ts` (NEW)

READ-ONLY: everything else.

## FOUND, NOT IN THIS LANE
- The heading on this page carries an em dash ("Welcome to The Heart Field — where ..."), and so do two sentences in the "You..." block. Public copy, Love's words. Not touched here.
- The sparkling heart at the end of the "You..." block stays in its sentence. The pin named the three in the first block only.
