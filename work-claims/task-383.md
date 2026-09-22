# work-claim — task-383 (OC · a machine ceiling on design drift)

Lane: the home crew (Sonnet builder, under Number One's gate). Base = onecocreation
main **9552f74bb3e212b6aac412df449018ddef07a9ac** (Merge pull request #30 from
ONECocreation/feat/task-365-walk-polish — the base the brief names, confirmed by
`git log -1` in this worktree). Branch `feat/task-383-design-drift-guard`. Worktree cut
by Number One at `~/dev/worktrees/task-383`, `npm ci` run fresh this session (550
packages, 0 vulnerabilities). Lane ports **4626–4629** (unused — no server started).
Brief: `~/dev/kimi/inbox/TASK-383-oc-design-drift-guard.md`. Astra's plan review folded
into the brief as RULINGS R1–R12 (block 968,048) — these win over the brief's own Build
section wherever the two differ; every ruling is cited in the scanner's own docblock.

The Admiral's words (verbatim, from the brief): "since this is a template we should have
a common css throughout the page." · "the website has framework foundations for the
template we need to adhere to that, and not build individual pages and rulesets, that's
why we have so much rework." · on buttons: "that was reinvented."

A measurement-only ratchet: one vitest file scans every `.tsx` file under `src/` and
every stylesheet under `src/` (R4 — discovered fresh each run, not a fixed list) for four
drift metrics — inline `style={{` blocks (minus the custom-property-only exemption),
hand-typed colours, `style=` tags whose className carries a `btn`/`kit-btn` token, and
`!important`/real-serif in CSS — and fails only when a file's measured count exceeds a
number committed in `tests/design-drift.ceilings.json`. The ceilings are captured from
today's tree; this lane fixes zero lines of the drift it counts. Two write modes only
(`DESIGN_DRIFT_WRITE=init` once, `DESIGN_DRIFT_WRITE=1` to ratchet down), both monotone —
neither can ever raise a ceiling.

## OWNS

`tests/design-drift.test.ts` (the scanner + its own unit tests + the ratchet test),
`tests/design-drift.ceilings.json` (generated in this worktree via WRITE MODE, then
committed as data), `work-claims/task-383.md` (this file, first commit). Three files —
the lane's size cap, hit exactly.

READ-ONLY (grounding only, never edited): `src/app/layout.tsx`, `src/app/a/layout.tsx`,
`src/components/rooms/ClassroomView.tsx`, every stylesheet under `src/` (`globals.css`,
`cartridge.css`, `house.css`, `cartridges.css`, `kit.css`, `scar.css`,
`components/rooms/classroom.css`, plus six more found by this session's own recursive
`*.css` search under R4: `app/style/preview.css`, `app/style/puck-theme.css`,
`app/style/studio-tokens.css`, `components/calendar/calendar-view.css`,
`components/console/desk/loves-desk.css`, `lib/puck-blocks/parallax.css` — thirteen
total, not the brief's original seven; R4 explicitly supersedes the hard-coded list),
`src/components/kit/*.tsx`, `src/components/door/SignInCard.tsx`, `shortcuts/oc-gate.sh`
(lives at `~/dev/shortcuts/oc-gate.sh`, outside this repo entirely — read for the gate
shape, never touched), `vitest.config.ts`, `eslint.config.mjs`, `tsconfig.json`, every
other file in `tests/`.

## Gates

`npx vitest run` (design-drift.test.ts first, then the full suite) · each live
`scripts/*.test.mjs` · `npx eslint src tests --max-warnings=0` · `npx tsc --noEmit` ·
`npx next build` (Number One's gate, after `git merge main` — brief's 5b). This builder
does not run `next build` or the full gate script; Number One runs the gate at pickup.

## What is NOT in this lane

No file under `src/` touched. No change to `shortcuts/oc-gate.sh`. No new npm dependency.
No `scripts/*.mjs` file. No AST/parser library — regex plus a small bracket-depth walk
only. No hand-edit of `tests/design-drift.ceilings.json` outside WRITE MODE. No lowering
of any ceiling (Number One's job, a future `GUARD ·` lane only). No push, no PR, no
merge, no archive, no server start.

## Cut note

Stamp per the brief, block 968,048 (claimed and ruled same block).
