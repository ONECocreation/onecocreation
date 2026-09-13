# WORK-CLAIM — TASK-221 — ONE Cocreation: prices read in sats first (H73 A)

CLAIMED-BY: **Number One**
CLAIMED-AT: 0018.06.23 a₿ · block 966,826
BRANCH: `feat/task-221-sats-first` · WORKTREE: `~/dev/worktrees/task-221` · BASE: main @ `913f1a3` (T-210 merged)

The Admiral's ruling (Hold Deck H73 A + note, 0018.06.23): the display defaults to SATS; only when the bitcoin rail is OFF and the card rail is ON does the display switch to fiat. OC now, the template follows.

OWNS: `src/lib/money-words.ts` (`defaultPreferOf` — the ONE default; every surface resolves through resolvePrefer), the pins in `tests/money-preference.test.ts`, `tests/price-line.test.ts`, `tests/store-cards.test.ts`. NOT the toggle, NOT the rails, NOT the member's saved word.
Gates: vitest (base 645/645), scripts/*.test.mjs, lint 0, tsc, next build; shots: the item page + the basket with both rails live (sats first), both themes, 1440 + 390.
