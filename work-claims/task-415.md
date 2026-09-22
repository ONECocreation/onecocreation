# work-claim — task-415 (OC · S · GUARD · census ★ — the operator side's style objects, fingerprinted by AST)

Lane: the home crew (Ms. Kimi's builder, K106, under Number One's gate). Base =
onecocreation main **d4caffe7418e87aba03f39917e4f2c89a7fea016** (Merge pull request
#55 — the base the cut note names, confirmed by `git log -1` in this worktree).
Branch `feat/task-415-guard-census`. Worktree cut by Number One at
`~/dev/worktrees/task-415`, `npm ci` done before hand-off. Lane ports **4738–4741**
(unused — a pure scanner lane, no server started). Brief:
`~/dev/kimi/inbox/TASK-415-oc-guard-census.md`; the `## Cut note — Number One, block
968,172` at its tail SUPERSEDES wherever it contradicts the body — its rulings as
worked here: **metric 1 ONLY** (style objects that reach a `style=` attribute by any
path; button-class families and font declarations are TASK-419's, not this lane's —
the baseline JSON is keyed by metric name so 419 adds its keys BESIDE, never inside);
a **ratchet, not an identity guard** (the per-file COUNT is asserted and monotone,
the sorted fingerprint-name list is recorded only, never asserted); the scanner
shares NO code with T-383 — AST via the TypeScript compiler API (`typescript@^5`,
already a devDependency; no new dependency, no vendored parser).

What the lane builds: one NEW AST scanner + unit suite + ratchet check in ONE test
file (`tests/operator-census.test.ts`, the T-383 house pattern), and one NEW
baseline (`tests/operator-census.baseline.json`) generated in this worktree via
`CENSUS_WRITE=init`, then committed as data. It fingerprints, per file under the
four operator trees (`src/app/a`, `src/components/console`,
`src/components/studio-overlay`, `src/components/rooms`), every object literal that
reaches a `style=` attribute however it travels — inline literal, named const
(`style={ident}`, the real `SiteChatCard.tsx` shape), conditional expression,
spread source. This lane fixes none of what it counts and touches nothing under
`src/`.

## OWNS

`work-claims/task-415.md` (this file, first commit),
`tests/operator-census.test.ts` (NEW — scanner + unit suite + ratchet check, one
file), `tests/operator-census.baseline.json` (NEW — generated at lane time,
committed). Exactly three NEW files — the lane's OWNS list, hit exactly.

READ-ONLY (grounding only, never edited): everything under `src/` (the scan's
inputs — the four trees and the five sheets),
`tests/design-drift.test.ts` + `tests/design-drift.ceilings.json` (the authority
this lane integrates, never edits, never re-measures, never runs
`DESIGN_DRIFT_WRITE` in any mode), `package.json` (the typescript devDep proof),
`tsconfig.json`, `vitest.config.ts`, `eslint.config.mjs`, every other test file.

## What is NOT in this lane

No file under `src/` touched. No new npm dependency, no vendored parser. No
button-class-family census, no font-declaration census (TASK-419's keys, added
BESIDE `styleObjects` later — the file layout leaves the seam, builds nothing for
it). Not site-wide (the four operator trees only; the scanner takes its root list
as data so widening is config, not a rewrite). Not the fork baseline (the
fork-adapter lane's, separate repo track). No hand-edit of
`tests/operator-census.baseline.json` outside a write mode. No push, no PR, no
merge, no fetch, no rebase, no archive, no server start. Block-height stamps only.

## Cut note

Stamp per the brief's cut note, block 968,172 (cut and claimed same block).
