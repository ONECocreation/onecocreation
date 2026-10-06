# WORK-CLAIM - TASK-552 - ONE Cocreation: the letters room rebuild, lane 1 (the room on the kit)

CLAIMED-BY: Number One's builder, on the Admiral's word at block 970,203: "we do want the letters page rebuilt ... build the letters let's get this rolling this week before the reading."
BRANCH: `feat/task-552-letters-room`
WORKTREE: `~/dev/worktrees/task-552`
BASE: origin/main `61c160a9`
PLAN: `~/dev/briefings/oc-letters-m17v3-969725/PLAN-T552-T553.md` section 4 (this lane only), rulings: a letter leaves Drafted when Love presses Publish; her published letters get a "Your letters" group under Drafted; the editor is its own page later (553a); no mail change.

## OWNS
- `work-claims/task-552.md` (NEW)
- `src/app/a/letters/page.tsx`
- `src/lib/letters.ts` (optional meta fields, derived-key suffix, `touchLetterMeta`; `letterHtml` untouched)
- `src/lib/letters-drafts.ts` (NEW)
- `src/app/api/admin/letters/route.ts` (GET meta fields, PUT stamp)
- `src/app/kit.css` (`kitx-group`, `kitx-row`)
- `tests/letters-render-golden.test.ts` and `tests/fixtures/letters-render-golden.json` (NEW)
- `tests/letters-room-552.test.ts` (NEW)
- `tests/reading-page.test.ts` (kitx stem pin, +2 stems)
- `tests/reading-week-drafts-534.test.ts` (the Drafted pin)
- `tests/design-drift.ceilings.json`, `tests/operator-census.baseline.json` (this page's entries, lowered only)

READ-ONLY: `src/lib/mail.ts`, `letterHtml`, `bodyToHtml`, the send route, the send panel page `[key]/page.tsx`, the preview route.

## FOUND, NOT IN THIS LANE
- Bulk send (his mark: "love may want to send these individually or request that a bulk of them go out") is new mail behaviour: proposed lane, a "Send selected" bar in the room that hands several letters to the existing send panel flow one at a time, each keeping its typed-headcount gate.
- Editing the text of system letters rows 2 to 5 (his mark) is lane 553a; this lane only says plainly which parts are fixed.
- The drag handle on its own line (phone mark light-390-fF) belongs to the editor drawer, lane 553c2; the room has no drag.
- The toolbar with standard icons instead of spelled-out words (dark-1440-fC) is lane 553b. The old editor still has "link", "preview" words, an emoji and arrows in its toolbar labels until then.
- A reading draft the helper wrote and Love already reviewed before this lane has no `reviewedAtMs`, so it shows in Drafted once until she presses Publish.
