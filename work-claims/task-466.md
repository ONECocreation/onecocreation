# TASK-466 claim

Builder: sonnet sub-agent for Number One
Block: 968,561 (the Admiral's notes on the /reading block picture)
Branch: feat/task-466-reading-polish
Worktree: /home/pac/dev/worktrees/task-466
Base: a2cc258 (main after #87/#88)

Contract, the Admiral verbatim:
1. On the ended card's "Watch again" button: "all of these buttons would be
   centered. and the watch again is not going to happen right now. but we
   can change this to the watch 2nd part in the playground if the user isnt
   a member for that package we would show a lock icon and have them go
   through the added to cart pay function."
2. On "The reading has ended — thank you for being here.": "this would be an
   item where the big - needs to be replaced we have a new line that should
   be started here. this would be considered slop."
3. On the page as a whole: "noticing all the buttons here are not the same
   size everything it doesnt look like like our style team looked at this
   before hand."
4. The Playground (part two) is for Observer members and up — the floor
   NAME/TIER must always be derived from `STAGE2_MIN_TIER` /
   `TIERS[STAGE2_MIN_TIER].name` (src/lib/stage2-access.ts), never a literal,
   so this lane stays true once the parallel TASK-465 lane moves that floor
   from A to B.

## OWNS
- `src/components/reading/ReadingStage.tsx`: one button size (`kit-btn-sm`)
  everywhere in the card and the Playground banner; no em dash in any
  visible string; the ended card's "Watch again" replaced by one link to
  `/reading/playground` ("Watch part two in the Playground") carrying a
  lock icon + quiet floor-name line when the visitor isn't entitled; the
  "left" state kept (rejoining the live show), resized only.
- `src/app/reading/page.tsx`: ONLY the `<ReadingStage/>` props block and the
  server-side `playgroundLock` derivation right above `return` (never the
  "What you will experience" list — TASK-465 owns that hunk).
- `src/app/kit.css`: ONE new small rule, the lock glyph's inline spacing
  (`.kit-lock-icon`) — no other kit.css change; every button-row centering
  need is already met by existing rules (`.kit-stage-controls .kit-btn-row`,
  `.kitx-actions`).
- `tests/reading-polish-466.test.ts`: NEW — the red suite for this lane.
- `tests/reading-stage.test.ts`: the ended-state pins ("Watch again", the
  em-dash sentence, the button-size counts), re-trued.
- `tests/reading-watch-heart-field-457.test.ts`: the ended-state Heart Field
  link pin, re-trued (ended no longer links to `/rooms/heart-field`).
- `tests/reading-small-watch-464.test.ts`: the "Watch again keeps its
  full-size button" pins (ended + left), re-trued.
- `tests/reading-love-cover-456.test.ts`: its `ReadingStageBodyProps`
  fixture, widened with the new required `playgroundLock` field (no
  assertion in that file changes — it never renders the ended button row).
- `tests/reading-buttons-phone-463.test.ts`: same widening, no assertion
  change (it never renders the ended state).
- `tests/reading-page.test.ts`: the "no tier or payment logic anywhere on
  this page" pin, re-trued to allow the ONE sanctioned entitlement read
  (`tierForSubject` + `tierSatisfies` + `STAGE2_MIN_TIER`) while still
  banning payment logic and any literal tier value.
- `work-claims/task-466.md`, `work-claims/task-466-register.md`.

## READ-ONLY
`src/lib/stage2-access.ts` (TASK-465 owns `STAGE2_MIN_TIER`'s value — this
lane only ever reads it and `TIERS[STAGE2_MIN_TIER].name`, never a literal
tier letter or name), `src/lib/entitlement.ts`, `src/lib/member-tier.ts`,
`src/app/api/stage2/route.ts`, `src/app/reading/playground/**` (the
Playground page already handles sign-in, the package door and the join —
this lane only links to it), `src/components/rooms/ReadingSignUp.tsx` (its
one button is already centered by `.kit-inline-form`'s existing
`justify-content:center` — no change needed, noted in the register), the
"What you will experience" list in `reading/page.tsx` (~line 143, TASK-465's
hunk), `house.css`, `cartridge.css`.
