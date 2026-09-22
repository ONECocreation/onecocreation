# work-claim — task-419 (OC · S · GUARD · census II — the operator side's button families and font declarations, fingerprinted by AST beside the style objects)

Lane: the home crew (Ms. Kimi's builder, K107, under Number One's gate). Base =
onecocreation main **269367227dfe6482818eef04e4872dda86f615be** (Merge pull request
#58 — T-415's merge, the base the Cut note names, confirmed by `git log -1` in
this worktree). Branch `feat/task-419-guard-census-families`. Worktree cut by
Number One at `~/dev/worktrees/task-419`, `npm ci` done before hand-off. Lane
ports **4754–4757** (reserved, unused — a pure scanner lane, no server started).
Brief: `~/dev/kimi/inbox/TASK-419-oc-guard-census-families.md`; the `## Verify
note — Number One, block 968,175` and `## Cut note — Number One, block 968,175`
at its tail SUPERSEDE wherever they contradict the body — their rulings as worked
here: two new metric arms ADDED to 415's scanner home (`buttonFamilies` metric 2,
`fontDecls` metric 3), two new TOP-LEVEL keys BESIDE `styleObjects` in the one
baseline (never inside a `styleObjects` record, each keyed by file exactly as
`styleObjects` is); 415's `styleObjects` arm and its tests stay byte-identical;
the write mode learns exactly one new move — a top-level key absent from the
baseline enters at its measured value, an existing key is never raised (min-merge
per key, decision A); the three disposed 415 slop notes (Verify note items 1–3)
are fixed here, one commit each.

What the lane builds: EDIT `tests/operator-census.test.ts` — metric 2 (every JSX
element whose statically-recoverable className carries one of the five families —
legacy `.button`/`.btn-pill*`, house `.btn*`, kit `.kit-btn*`, scar `.scar-*btn*`,
native/no-family; `className={helper(...)}` → `unresolved`, counted never
guessed), metric 3 (per sheet of the five — globals, scar, house, kit, cartridge —
each `font-family`/`font` declaration fingerprinted token-read vs literal; a
`var(--font-*)` read is token, anything else literal; the var()-fallback strip in
T-383's philosophy, re-implemented for CSS text, NO code shared) — plus their
unit suites and ratchet arms, and the extended one-line gate output. EDIT
`tests/operator-census.baseline.json` — VIA THE WRITE MODE ONLY, regenerated
once, committed as data. This lane fixes none of what it counts and touches
nothing under `src/`.

## OWNS

`work-claims/task-419.md` (this file, first commit),
`tests/operator-census.test.ts` (EDIT — additive metric arms + their unit tests +
the three disposed-note fixes only; 415's `styleObjects` arm byte-identical),
`tests/operator-census.baseline.json` (EDIT — write mode only; two new top-level
keys at measured values, no existing number moved). Exactly the three paths the
brief's OWNS names — nothing else.

READ-ONLY (grounding only, never edited): everything under `src/` (the scan's
inputs — the four trees, the five sheets),
`tests/design-drift.test.ts` + `tests/design-drift.ceilings.json` (T-383's
authority — never edited, never re-measured, `DESIGN_DRIFT_WRITE` never run in
any mode), `package.json`, `tsconfig.json`, `vitest.config.ts`,
`eslint.config.mjs`, every other test file.

## What is NOT in this lane

No file under `src/` touched. No new npm dependency, no vendored parser (AST via
the TypeScript compiler API, 415's idiom). Not a re-measurement of T-383's or
415's metrics; never re-derives serif-or-not or style objects. Not a fixer — it
changes nothing it scans. Not site-wide (the four operator trees + the five
sheets only). Not the fork's baseline. No hand-edit of the baseline. No existing
baseline number moved, including "fixed" ones. No push, no PR, no merge, no
fetch, no rebase, no config, no server start. Block-height stamps only.

## Cut note

Stamp per the brief's cut note, block 968,177 (claimed same block).
