# work-claims/task-404.md — task-404 (ONE Cocreation: the post-398 stylesheet sweep — the shelf and pill fixes)

Lane: the home crew (Sonnet builder, under Number One's gate). Base = onecocreation main
`5d375ab609fb749a7f9d2f244804722e789e5757` (PR #53 — TASK-400 — on #52 — TASK-401 — on #51 —
TASK-403; none of them touches `house.css`; every `cartridge.css` anchor this lane cites sits at
or before `:470` and holds). Branch `feat/task-404-stylesheet-sweep`. Worktree
`~/dev/worktrees/task-404` (cut by Number One), `npm ci` already done. Lane ports **4702–4705**.
Brief: `~/dev/kimi/inbox/TASK-404-oc-stylesheet-sweep.md`.

Claimed at block **968,146** (Number One's cut, house beacon).

**AMENDMENT (block 968,146, after Astra's plan review, `walk-968036/ASTRA-REVIEW-T404.md`) —
five rulings, all folded, all SUPERSEDING the brief lines they contradict; Astra found no P1,
A/B/C/D stand:**
- **R1** — decision A's rendering promise is re-worded, not the fix: `.roomrow` holds three flex
  items (glyph, bare title text, pill), the row may break between any of them, the pill alone on
  its own line is held by its own `margin-left:auto`. The brief's "title's words whole above it"
  promise is WITHDRAWN. Containment is Number One's walk; a bad grouping is a SUMMARY report
  under A, never a fix.
- **R2** — decision D's docblock gets a "where both match" qualifier (the scrim-class exemptions
  don't line up between the blanket and the skies), plus two more comment sites carrying the
  same false fact join the reword: `:425` and `:481-482`. Named seam, not fixed: `:557`
  (`main.lions-gate-dark section`).
- **R3** — 396's pin covers `sky-night` + `sky-warm` only, two of the four, not all four (the
  brief overstated this); retirement stays closed regardless. SUMMARY quotes the diff proving
  `:467-470` untouched.
- **R4** — the four pins' lexical contracts, adopted verbatim: (a) comment-stripped
  `.roomrow{…}` contains `flex-wrap:wrap`; (b) `room-card-name` occurs nowhere under `src/`
  INCLUDING comments (no tombstone comment); (c) `never theme-flips` occurs nowhere in
  `cartridge.css` including comments; (d) `Higher specificity than the blanket` occurs nowhere in
  `cartridge.css`, and the exact marker `never win` occurs exactly once, scoped to the THE FOUR
  SKIES docblock only.
- **R5** — OWNS widened: `house.css:848-851` (the orphan comment leaves with its two rules — four
  lines out, not two); reflected above.

## OWNS (nothing else) — widened by AMENDMENT R2/R5 (block 968,146, folded before any source edit)

- `work-claims/task-404.md` (NEW, this file)
- `src/app/house.css` — `:368` one declaration (`flex-wrap:wrap` added to `.roomrow`); `:848-851`
  FOUR lines out (R5: the two-line "signed-in soul's name" comment leaves WITH the two
  `.room-card-name` rules it documents — no orphan comment left behind) — nothing else
- `src/app/cartridge.css` — comments ONLY, FIVE sites, no value moves anywhere: `:102` and `:116`
  (the two stale "never theme-flips" tails reworded, decision C); `:425` (R2 — one clause
  re-trued: "and the sky light overrides out-specify the repaint" was false); the "THE FOUR
  SKIES" docblock `:464-466` (decision D + R2's "where both match" qualifier, marker `never win`
  exactly once, scoped to this docblock only); `:481-482` (R2 — one clause in 400's services
  comment re-trued: the canvas's dawn stars sit over the blanket cream, not the sky-veil wash,
  which never wins there). The four sky rules `:467-470` stay byte-identical (R3 — 396's pin
  covers two of the four, `sky-night` + `sky-warm`, not all four; the retirement stays closed
  regardless of that correction)
- `tests/shelf-and-pill.test.ts` (NEW) — four source pins (a)–(d), R4's lexical contracts:
  (b) and (c) count comments too (no tombstone comment under `src/` naming the retired class);
  (d) is scoped to the THE FOUR SKIES docblock only, not a global count

## READ-ONLY and FORBIDDEN

READ-ONLY: `src/components/sections.tsx` (the row markup — pinned, no markup edit),
`src/components/rooms/PackageRoomsCard.tsx` + `RoomsShelf.tsx` (401's files), `tests/package-names.test.ts`,
`tests/two-card-colors.test.ts`, `tests/grey-paint-family.test.ts` (398's family — decision B says
a new file, not an extension of this one), `tests/keep-dark-bands.test.ts`, `tests/classes-cards.test.ts`
(401's absence-pins — not consumers, left untouched), `tests/light-mode-photos.test.ts` (396's
untouched-rules pin), every other file.

FORBIDDEN: touching `.lockpill` or the `.card .nowrap` utility; any value change in either
sheet; retiring anything beyond the four named lines (`house.css:848-851`); a phone media
query restacking title over pill; any civil-date stamp (block heights only); `DESIGN_DRIFT_WRITE`
(this lane's only new file is a `.test.ts` — the design-drift ratchet never records it, and both
edited stylesheets are comment/declaration-only, so no ceiling should move); a tombstone comment
under `src/` naming the retired `room-card-name` class (R4 — the retirement note lives only in
this claim and in the test); the withdrawn R1 rendering promise ("the pill drops to its own
line, the title's words whole above it") anywhere in this claim, source comments, or SUMMARY —
containment is Number One's walk, not this builder's claim.

## Decisions as ruled (Number One, at cut, block 968,146)

- **A — TAKEN as leaned, rendering promise re-worded by R1.** `.roomrow{flex-wrap:wrap}` (one
  declaration); the pill keeps `margin-left:auto`; no media query. `.roomrow` holds THREE flex
  items (the glyph span, the bare title text, the pill) — not a glyph+title unit and a pill; the
  row may break between any of them, the title may wrap internally, and a pill alone on its own
  line is right-aligned by its existing `margin-left:auto`. The rejected recipe (a ≤390px
  breakpoint that stacks title over pill) is out. Containment (`scrollWidth <= clientWidth`) is
  Number One's walk to verify, not a claim made here; a bad glyph/title/pill grouping, if seen,
  is reported under A in SUMMARY, never fixed with new markup/style/breakpoint.
- **B — TAKEN.** The pins live in a NEW file, `tests/shelf-and-pill.test.ts`, not appended to
  398's `tests/grey-paint-family.test.ts` — a different fix family, its own file history.
- **C — TAKEN.** "Always night" stays for the dropdown (`:102`'s `--pop-bg` family is still
  true); only the header clause is corrected — the bar follows the theme through `--header-bg`
  (TASK-398), the nav gold and dropdown stay night.
- **D — RULED: comment, not retire (not a lean), qualified by R2.** The skies docblock
  `cartridge.css:464-466` is re-trued to say the four rules `:467-470` never win against the
  blanket `:456` WHERE BOTH MATCH (blanket (0,5,3) beats each sky (0,4,3), both `!important`;
  both families exclude `.lions-gate`, the blanket additionally excludes the two scrim classes —
  no known consumer combines a sky class with a scrim class, unverified, said so and no more) —
  pinned on purpose by 396's `light-mode-photos.test.ts:557-566` (R3: covers `sky-night` +
  `sky-warm`, two of the four, not all four — the retirement stays closed regardless) — the four
  rule lines stay byte-identical; making them win is a look decision for the Admiral, not this
  lane. Two more false sites of the same fact join the reword (R2, comments only): `:425` and
  `:481-482`. Named seam, NOT fixed: `cartridge.css:557` (`main.lions-gate-dark section` also
  loses to the blanket on unexempted sections) — unverified, reported in SUMMARY only.

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
retire). This claim written at block 968,146; AMENDMENT R1–R5 (same block, after Astra's plan
review) folded into this same claim, before any source edit, by editing this file and
re-committing it ahead of the `house.css`/`cartridge.css`/test changes.
