# WORK-CLAIM — TASK-498 — ONE Cocreation: the tip jars move to the store's bottom; "gifts of gratitude" leaves /support

CLAIMED-BY: Ms. Kimi's crew (builder subagent)
CLAIMED-AT: block 969,095+
BRANCH: `feat/task-498-tip-jars-to-store-bottom`
WORKTREE: `~/dev/worktrees/task-498`
BASE: main @ `f6e8f94c6345f248936c9c79ad095bfed8dd11d6` (verified at pickup: cut from origin/main; HEAD == base)
LANE PORTS: 5132-5135
BRIEF: `~/dev/kimi/inbox/drafts/TASK-498-oc-tip-jars-to-store-bottom.md`
RULING OF RECORD: R-072. The brief's two Admiral questions settled by its own named leans (Number One confirms at gate; recorded at the brief's tail before build): (1) the drawer is NOT a shelf section — STORE_SECTIONS keeps four entries with sessions last, the drawer mounts below the shelf in store/page.tsx; (2) "only under Store" read literally — home's Donations section loses its TipJar widget (Build 4 ships; SUMMARY says which shipped so the ruling can be reversed at gate).

## The lane in one line
/support loses its whole jars block; the store gains a bottom `<details>` drawer holding the existing TipJar widget under the same double gate (jarsOpen() AND live shelf items); the three jar items leave the shelf grid and the related row (their item pages stay, crumb reads Gifts pointing at /store#gifts); home's Donations loses the widget; no new copy, no new route, rail, KV, or env.

## OWNS (from the brief, verbatim)

- `work-claims/task-498.md` (NEW, first commit), `work-claims/task-498-register.md` (NEW)
- `src/app/support/page.tsx` (the jars block, the two jar-word clauses, the docblock; nothing else on the page)
- `src/components/store/GiftDrawer.tsx` (NEW)
- `src/app/store/page.tsx` (the drawer mount and its gate; nothing else)
- `src/components/store/ShelfSection.tsx` (`shelfGroups` jar exclusion only)
- `src/components/store/RelatedItems.tsx` (`relatedItems` jar exclusion only)
- `src/lib/store-sections.ts` (`sectionForItem` additive; `STORE_SECTIONS` untouched)
- `src/app/store/[id]/page.tsx` (the one crumb line)
- `src/components/sections.tsx` (the Donations hunk only; pending question 2 — lean ships)
- `src/app/a/money/page.tsx` (the :191 title attribute only)
- `src/lib/puck-seeds.ts` (the `supportContent` jar bands only)
- `tests/store-gift-drawer.test.ts` (NEW), `tests/feature-switches.test.ts` (:133-136 only), `tests/item-page.test.ts`, `tests/shelf-pass-last.test.ts`

NAMED ADD (mid-lane, house law "honestly-broken pins are updated with honest comments, never deleted"): `tests/card-path-words-459.test.ts` — the T-459 pin on /support's hero jar sentence was honestly broken by Build 2 (the jar clause left with the jars); the pin was updated, its no-cut-taken substance unchanged. Also within the already-owned `tests/feature-switches.test.ts`, a second honestly-broken pin at :224 (the /support jarsOpen gate pin) was updated alongside :133-136.

READ-ONLY: `src/components/TipJar.tsx` (reused as-is; its words are Love's to reword, not owned here), `src/lib/jars.ts`, `src/lib/payments.ts`, `src/lib/store.ts`, `src/app/a/store/page.tsx` and `src/app/api/admin/store/route.ts` (T-422's desk), `src/app/api/cart/**`, `src/lib/letters.ts` (:172's jar mention stays), `src/components/NavMenu.tsx`, `src/components/SiteFooter.tsx`, `src/app/a/page.tsx`, `src/components/store/BuyPanel.tsx`, `tests/support-jars-basket.test.ts` (stays green untouched).

NOT a fifth shelf section; NOT a new ItemKind; NOT category-driven shelves; NOT the desk scoreboard; NOT any route, rail, KV, or env change.

## Baseline gates at cut (block 969,095+, base f6e8f94)

- `npx vitest run` — green (281 files, 3756 tests, all passed)
- `for f in scripts/*.test.mjs; do node "$f"; done` — calendar-view 70 passed 0 failed · cartridge-identity 179 passed 0 failed · console-matrix 14 passed 0 failed · fixture-kv 45 passed 0 failed · square-payments 58 passed 0 failed
- `npx eslint src tests --max-warnings=0` — rc 0
- `npx tsc --noEmit` — rc 0
- `npx next build` — (baseline recorded in SUMMARY from the final gate pair)

## Ground-truth drift noted at re-grep (brief drafted at 7b33fb6; cut at f6e8f94 after T-490/T-492/T-496 merged)

- All brief Ground file:line references re-grepped at cut: line numbers drifted by ±1 in a few files but every named anchor holds (greps are the law):
  - `src/lib/jars.ts:20-24` — JAR_ITEMS map intact (love: tip-love, onecocreation: tip-one-cocreation, payforward: gifts-of-gratitude). Desk read of the three jar items was UNAVAILABLE at build time (production /a/store unreachable from this lane); the lane depends only on the ids, not the price.
  - `src/app/support/page.tsx` — jars block at :94-127 (imports :8-9,16; locals :76-77; metadata :31; hero lead :87-90; docblock :18-27). Holds as briefed.
  - `src/components/sections.tsx` — Donations hunk at :584-636; widget mount :615; liveJarKeys :574-582; TipJar import :14. Holds.
  - `src/app/store/page.tsx` — groups.map block :117-124; pills :102-108. Holds.
  - `src/components/store/ShelfSection.tsx` — shelfGroups :78-85, SHELF_GROUPS :34. Holds.
  - `src/components/store/RelatedItems.tsx` — relatedItems :24-32. Holds.
  - `src/lib/store-sections.ts` — STORE_SECTIONS :30-63 (four entries, sessions last, 0018.05.11 comment :14-15), sectionForKind :73-75. Holds.
  - `src/app/store/[id]/page.tsx` — crumb line `sectionForKind(item.kind)` at :98; crumb link derives from section.anchor (:132). Holds.
  - `src/app/a/money/page.tsx:191` — title attribute "the doors live on /support". Holds.
  - `src/lib/puck-seeds.ts` — supportContent :621-…; jar bands: the "Gifts of Gratitude" panel band at :628-635 and the "Where Pay It Forward Flows" band at :636-641 (brief said :619-640; actual bands one line deeper — the greps are the law). Seed root description at :1944 says "Pay It Forward" (the seed's own wording, distinct from the page metadata's "Gifts of Gratitude" — see Build 7 note in SUMMARY).
  - `src/app/contact/page.tsx:96-111` — the `<details>` idiom. Holds.

## Adjacency noted (Seams in the brief)

- `src/lib/puck-seeds.ts` is shared seed infrastructure — only the two supportContent jar bands are touched; checked for a live lane owning the seeds at cut (T-420 leftovers): none claimed in work-claims at cut.
- `src/components/sections.tsx` is a big shared module — the Donations hunk is this lane's one touch.
