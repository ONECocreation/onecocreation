# work-claims/task-404.md — task-404 (ONE Cocreation: the post-398 stylesheet sweep — the shelf and pill fixes)

Lane: the home crew (Sonnet builder, under Number One's gate). Base = onecocreation main
`5d375ab609fb749a7f9d2f244804722e789e5757` (PR #53 — TASK-400 — on #52 — TASK-401 — on #51 —
TASK-403; none of them touches `house.css`; every `cartridge.css` anchor this lane cites sits at
or before `:470` and holds). Branch `feat/task-404-stylesheet-sweep`. Worktree
`~/dev/worktrees/task-404` (cut by Number One), `npm ci` already done. Lane ports **4702–4705**.
Brief: `~/dev/kimi/inbox/TASK-404-oc-stylesheet-sweep.md`.

Claimed at block **968,146** (Number One's cut, house beacon).

## OWNS (nothing else)

- `work-claims/task-404.md` (NEW, this file)
- `src/app/house.css` — `:368` one declaration (`flex-wrap:wrap` added to `.roomrow`); `:850-851`
  the two `.room-card-name` rules out — nothing else
- `src/app/cartridge.css` — comments ONLY: the `:102` and `:116` stale tails reworded, and the
  "THE FOUR SKIES" docblock `:464-466` re-trued per decision D; no value moves; the four sky
  rules `:467-470` stay byte-identical
- `tests/shelf-and-pill.test.ts` (NEW) — four source pins (a)–(d) exactly as the brief states
  them

## READ-ONLY and FORBIDDEN

READ-ONLY: `src/components/sections.tsx` (the row markup — pinned, no markup edit),
`src/components/rooms/PackageRoomsCard.tsx` + `RoomsShelf.tsx` (401's files), `tests/package-names.test.ts`,
`tests/two-card-colors.test.ts`, `tests/grey-paint-family.test.ts` (398's family — decision B says
a new file, not an extension of this one), `tests/keep-dark-bands.test.ts`, `tests/classes-cards.test.ts`
(401's absence-pins — not consumers, left untouched), `tests/light-mode-photos.test.ts` (396's
untouched-rules pin), every other file.

FORBIDDEN: touching `.lockpill` or the `.card .nowrap` utility; any value change in either
sheet; retiring anything beyond the two named dead rules (`house.css:850-851`); a phone media
query restacking title over pill; any civil-date stamp (block heights only); `DESIGN_DRIFT_WRITE`
(this lane's only new file is a `.test.ts` — the design-drift ratchet never records it, and both
edited stylesheets are comment/declaration-only, so no ceiling should move).

## Decisions as ruled (Number One, at cut, block 968,146)

- **A — TAKEN as leaned.** `.roomrow{flex-wrap:wrap}` (one declaration); the pill keeps
  `margin-left:auto`; no media query. The rejected recipe (a ≤390px breakpoint that stacks title
  over pill) is out.
- **B — TAKEN.** The pins live in a NEW file, `tests/shelf-and-pill.test.ts`, not appended to
  398's `tests/grey-paint-family.test.ts` — a different fix family, its own file history.
- **C — TAKEN.** "Always night" stays for the dropdown (`:102`'s `--pop-bg` family is still
  true); only the header clause is corrected — the bar follows the theme through `--header-bg`
  (TASK-398), the nav gold and dropdown stay night.
- **D — RULED: comment, not retire (not a lean).** The skies docblock `cartridge.css:464-466` is
  re-trued to say the four rules `:467-470` never win against the blanket `:456` (specificity,
  pinned on purpose by 396's `light-mode-photos.test.ts:557-566`, which asserts the four rules
  UNTOUCHED) — the four rule lines stay byte-identical; making them win is a look decision for
  the Admiral, not this lane.

## Gates

This builder runs, inside this worktree only: the named-file run first
(`tests/shelf-and-pill.test.ts tests/package-names.test.ts tests/two-card-colors.test.ts
tests/light-mode-photos.test.ts tests/grey-paint-family.test.ts tests/classes-cards.test.ts
tests/design-drift.test.ts`), then the five gates: `npx vitest run` (whole suite), each live
`scripts/*.test.mjs`, `npx eslint src tests --max-warnings=0`, `npx tsc --noEmit`, `npx next build`.

## Cut note

Ground truth as of block 968,143 (K100 Ask 1, first cut, drafter Ms. Kimi, re-grepped on
`24eb45c`); cut on main `5d375ab609fb749a7f9d2f244804722e789e5757` at block 968,146 (Number One —
re-grepped again on this tip, every anchor held; A/B/C taken as leaned, D ruled: comment, not
retire). This claim written at block 968,146.
