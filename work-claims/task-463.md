# TASK-463 claim

Builder: Number One
Block: 968,543 (Saturday lanes, follow-up found on the T-458/T-460 shot walk)
Branch: feat/task-463-reading-buttons-phone
Worktree: /home/pac/dev/worktrees/task-463
Base: a176f7c9c3a66989469e74ceb69cabcce3cd3587

Contract: /reading's closed-state "Go to the Heart Field" (TASK-457, merged
#82) is the full-size kit button. `kit-btn` never wraps (kit.css:29,
R-071), so on production the label is 406 px wide inside a card whose clip
box is 316 px at a 360 px phone. The ends of the words get cut off
(measured on www.onecocreation.com/reading, block 968,543). It becomes
`kit-btn kit-btn-main kit-btn-sm`, the same size as every other
secondary kit button on the page. Also: /reading's bottom button "Back to
the reading ↑" loses its arrow (the no-arrow-buttons law, 968,357, is
later than the approved reading look, 968,269).

## OWNS
- `src/components/reading/ReadingStage.tsx` — the closed-state Heart Field link's className only.
- `src/app/reading/page.tsx` — the bottom button's label only.
- `tests/reading-watch-heart-field-457.test.ts` — the one closed-state class pin, re-trued.
- `tests/reading-look.test.ts` — the one bottom-button label pin, re-trued.
- `tests/reading-buttons-phone-463.test.ts` — NEW.
- `work-claims/task-463.md`, `work-claims/task-463-register.md`.

## READ-ONLY
kit.css, house.css, every other button on /reading (the live "Watch Love
live" at full size is 322 px, which fits a 390 px phone's 346 px card; at
360 px it bleeds 3 px past the card edge with the words intact, so it is
noted in the register, not changed).
