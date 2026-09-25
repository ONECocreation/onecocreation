# TASK-463 register

## What changed
- `ReadingStage.tsx` closed state: "Go to the Heart Field" is `kit-btn kit-btn-main kit-btn-sm` (was full size).
- `reading/page.tsx` bottom button: "Back to the reading ↑" → "Back to the reading".

## Why (measured, block 968,543)
Production www.onecocreation.com/reading, closed state:
- 360 px phone: the button is 406 px wide in a 316 px clip box (card 22–338), so 45 px are clipped each side and the ends of the words are cut.
- 390 px phone: 406 px in 346 px (22–368), clipped 30 px each side. The words just survive on the 40 px padding.
- The small kit button is about 250 px wide. It fits both.
The live state's "Watch Love live" (full size, 322 px) fits 390 (346 px card). At 360 it bleeds 3 px past each card edge with the words intact. Left alone: it is the primary call, and a change there is the Admiral's look call.

## Pins re-trued
- `tests/reading-watch-heart-field-457.test.ts` — the closed-state class regex.
- `tests/reading-look.test.ts` — the bottom-button label (the approved look 968,269 predates the no-arrow law 968,357).

## Obstacles
None.
