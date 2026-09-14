# work-claim — TASK-253: /store cards stand uniform: one height per row, prices and doors level

LANE: home crew (sonnet) · worktree `~/dev/worktrees/task-253` · branch `lane/task-253` · base main @ `45187c9`.
OWNS: `src/components/store/StoreItemCard.tsx`, `src/components/store/FreeMeditationCard.tsx`,
`src/components/store/ShelfSection.tsx`, the `.card`/`.flip-card`/`.item-flip`/`.flip-scroll`/`.card-title`/
`.card-sub`/`.push` rules in `src/app/house.css`, `tests/store-cards-uniform.test.ts` (NEW). ADDENDUM (the Admiral,
0018.06.24 a₿): two descriptions — also touches `src/lib/store.ts` (`StoreItem.description`, sanitiser,
`fullStoryOf`), `src/app/api/admin/store/route.ts` (PUT sanitiser wiring), `src/app/store/[id]/page.tsx` (full view
prefers `description`), `src/app/a/store/page.tsx` (desk textarea + hints) — none of these are owned by T-252
(About()/cartridge.ts) or T-254 (Packages()/packages/**/.shine-hover/.feat/.tier-name-pill).
Do NOT touch: `sections.tsx`, `src/brand/cartridge.ts`, `src/app/packages/**`, button classes/words, the
`.shine-hover`/`.feat`/`.tier-name-pill` rules in house.css.
