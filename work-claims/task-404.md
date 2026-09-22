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

**AMENDMENT 2 (block 968,146, the Admiral's ruling on Number One's walk — Go-Live Sheet card b5,
his comment on the desktop after-image: "this one is the best version, let's make the pills the
same size though") — SUPERSEDES decision A, the FORBIDDEN line on `.lockpill`, and pin (a):**
- **The look, ruled (not a lean):** the pill sits UNDER the title on every row at every width
  (a one-line title, the pill on its own line right-pulled below it); the glyph stays beside the
  title, never alone on a line; all seven pills render the SAME size.
- **The recipe replaces `flex-wrap:wrap` outright.** `house.css:368` `.roomrow` becomes a
  two-column grid: `display:grid;grid-template-columns:auto 1fr;align-items:center;gap:10px;
  text-align:left` — `padding:10px 0`, `border-bottom:1px solid rgba(139,118,196,.3)`,
  `color:var(--ink-body)` all stay; `flex-wrap:wrap` (this lane's own AMENDMENT-1 addition) comes
  back OUT; the base `display:flex` becomes `display:grid`. The glyph `<span>` auto-places at
  (1,1); the bare title text (anonymous grid item) auto-places at (1,2) and wraps inside its own
  column; the pill is given `grid-column:2`, landing it at (2,2) by auto-placement, where its own
  existing `margin-left:auto` right-pulls it inside the cell. `text-align:left` keeps the title
  flush after the glyph (the card's own centred text would otherwise centre the grid's contents).
- **Uniform pills, `house.css:371` `.lockpill` (previously FORBIDDEN, now ruled):** gains
  `grid-column:2` (inert outside a grid context) + `min-width` (the widest label's rendered
  width, rounded up) + `text-align:center`. No `white-space` (394's pin `tests/package-names.test.ts:171-174`
  stands); the `.card .nowrap` utility and the row markup (`sections.tsx`) stay untouched; no
  media query.
- **Pin (a), re-pinned (SUPERSEDING the AMENDMENT-1 text):** after stripping CSS comments, the
  `.roomrow{…}` block contains `display:grid` AND `grid-template-columns:auto 1fr` AND does NOT
  contain `flex-wrap`; the `.lockpill{…}` block contains `grid-column:2` AND `min-width:` AND
  `text-align:center` AND carries no `white-space`. Pins (b)–(d) unchanged.
- **Min-width value:** chosen by reasoning from source + the 394 walk's own measurement, not a
  fresh live measurement this pass (both sanctioned by AMENDMENT 2's own text — "measure … if you
  can … or reason from the 394 walk's 120 px"). Only four distinct pill-label strings exist
  site-wide (`src/lib/entitlement.ts` TIERS: "Weekly Intuitive" / "Observer" / "Evening Star",
  plus `sections.tsx:439`'s `label()` special case "All members" for tier "all") — "Weekly
  Intuitive" is the longest by character count (16 vs. 12 / 11 / 8) and is the exact string the
  394 walk measured at 120 px rendered, on this same `.lockpill` font-size/padding recipe
  (untouched by this lane). Picked **128px** — the brief's own example value, ≥120px with an 8px
  margin for rendering variance. Named in SUMMARY with this same reasoning.

## OWNS (nothing else) — widened by AMENDMENT R2/R5 (block 968,146, folded before any source edit)

- `work-claims/task-404.md` (NEW, this file)
- `src/app/house.css` — `:368` the `.roomrow` rule (AMENDMENT 2 — a two-column grid recipe,
  `flex-wrap:wrap` OUT, replaced by `display:grid;grid-template-columns:auto 1fr;text-align:left`;
  `align-items:center`/`gap:10px`/`padding:10px 0`/`border-bottom:…`/`color:…` stay); `:371` the
  `.lockpill` rule (AMENDMENT 2 — gains `grid-column:2` + `min-width:128px` + `text-align:center`
  only; every existing declaration stays, no `white-space` added); `:848-851` FOUR lines out (R5:
  the two-line "signed-in soul's name" comment leaves WITH the two `.room-card-name` rules it
  documents — no orphan comment left behind) — nothing else in `house.css`
- `src/app/cartridge.css` — comments ONLY, FIVE sites, no value moves anywhere: `:102` and `:116`
  (the two stale "never theme-flips" tails reworded, decision C); `:425` (R2 — one clause
  re-trued: "and the sky light overrides out-specify the repaint" was false); the "THE FOUR
  SKIES" docblock `:464-466` (decision D + R2's "where both match" qualifier, marker `never win`
  exactly once, scoped to this docblock only); `:481-482` (R2 — one clause in 400's services
  comment re-trued: the canvas's dawn stars sit over the blanket cream, not the sky-veil wash,
  which never wins there). The four sky rules `:467-470` stay byte-identical (R3 — 396's pin
  covers two of the four, `sky-night` + `sky-warm`, not all four; the retirement stays closed
  regardless of that correction)
- `tests/shelf-and-pill.test.ts` (NEW) — four source pins (a)–(d), R4's lexical contracts, pin (a)
  RE-PINNED by AMENDMENT 2 (`.roomrow` carries `display:grid` + `grid-template-columns:auto 1fr`,
  no `flex-wrap`; `.lockpill` carries `grid-column:2` + `min-width:` + `text-align:center`, no
  `white-space`); (b) and (c) count comments too (no tombstone comment under `src/` naming the
  retired class); (d) is scoped to the THE FOUR SKIES docblock only, not a global count

## READ-ONLY and FORBIDDEN

READ-ONLY: `src/components/sections.tsx` (the row markup — pinned, no markup edit),
`src/components/rooms/PackageRoomsCard.tsx` + `RoomsShelf.tsx` (401's files), `tests/package-names.test.ts`,
`tests/two-card-colors.test.ts`, `tests/grey-paint-family.test.ts` (398's family — decision B says
a new file, not an extension of this one), `tests/keep-dark-bands.test.ts`, `tests/classes-cards.test.ts`
(401's absence-pins — not consumers, left untouched), `tests/light-mode-photos.test.ts` (396's
untouched-rules pin), every other file.

FORBIDDEN: touching the `.card .nowrap` utility; touching `.lockpill` beyond AMENDMENT 2's three
named additions (`grid-column:2`, `min-width:128px`, `text-align:center`) — no `white-space`, no
change to its existing `margin-left`/`font-size`/`text-transform`/`color`/`background`/
`border-radius`/`padding`/`font-weight`; any value change in `cartridge.css`; retiring anything
beyond the four named lines (`house.css:848-851`); a phone media query restacking title over
pill; a markup change to `sections.tsx`'s row loops; any civil-date stamp (block heights only);
`DESIGN_DRIFT_WRITE`
(this lane's only new file is a `.test.ts` — the design-drift ratchet never records it, and both
edited stylesheets are comment/declaration-only, so no ceiling should move); a tombstone comment
under `src/` naming the retired `room-card-name` class (R4 — the retirement note lives only in
this claim and in the test); the withdrawn R1 rendering promise ("the pill drops to its own
line, the title's words whole above it") anywhere in this claim, source comments, or SUMMARY —
containment is Number One's walk, not this builder's claim.

## Decisions as ruled (Number One, at cut, block 968,146)

- **A — SUPERSEDED by AMENDMENT 2: RULED by the Admiral directly (not a lean), after his own walk.**
  The flex/`flex-wrap:wrap` recipe (AMENDMENT 1) is OUT. `.roomrow` (`:368`) is now a two-column
  CSS grid — `display:grid;grid-template-columns:auto 1fr;align-items:center;gap:10px;
  text-align:left`, existing `padding`/`border-bottom`/`color` unchanged. The glyph auto-places
  at (1,1), the bare title text at (1,2) and wraps inside its own column, and `.lockpill`
  (`:371`) is given `grid-column:2` so auto-placement lands it at (2,2) — its own
  `margin-left:auto` right-pulls it inside that cell, putting the pill UNDER the title on every
  row at every width, the glyph always beside the title. `.lockpill` also gains `min-width:128px`
  (reasoning below) + `text-align:center` so all seven pills render the same size; no
  `white-space` (394's pin stands). No media query, no markup change. This is the Admiral's own
  picked look (Go-Live Sheet card b5, the desktop after-image) — not a claim this builder is
  making about containment elsewhere; Number One's re-walk confirms `scrollWidth == clientWidth`
  at 390/760/1440 and that all seven pill widths match.
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
re-committing it ahead of the `house.css`/`cartridge.css`/test changes. AMENDMENT 2 (same block,
the Admiral's ruling on Number One's walk, superseding decision A / the `.lockpill` FORBIDDEN
line / pin (a)) folded the same way, in its own commit, before the `.roomrow`/`.lockpill` grid
edit and the re-pinned test.
