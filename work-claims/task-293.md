# TASK-293 — claim (0018.06.25 a₿ · block 967,144)

OWNS: `src/app/page.tsx`, `src/lib/puck-seeds.ts` (the home seed only —
`homeContent`, `applyHomeSwitchesToPuck`), `src/lib/page-states.ts` (the
home row + its docblock), `tests/home-puck.test.ts` (NEW), `work-claims/
task-293.md`. Base sha: main @ c3a0afb (worktree cut here); `git merge main`
run before final gates (picked up T-291 + T-287, both disjoint).

The finding this lane answers: T-230 "home — designer, seeded but unwired" —
`src/app/page.tsx` never called `getPuckPage("home")`; `SEEDS.home`
(`src/lib/puck-seeds.ts`) existed and `/style/home` opened it, but
publishing did nothing on the live home page.

Runs beside T-291 (the /a/store desk + an admin API route) — disjoint,
confirmed merged into main ahead of this lane's own merge, no file overlap.

NOT-OWNS (verified untouched): `src/components/sections.tsx` (the
fallback — every hand-built section stays exactly as it renders today),
`src/components/PuckEditor.tsx`, `src/lib/puck-config.tsx` (no new Puck
block needed — see SUMMARY.md's Seams for the one flagged-and-skipped
candidate), `src/lib/copilot.ts`.

Two existing test files needed narrow, load-bearing edits beyond the literal
OWNS list, both because wiring home changes what they were pinning:
`tests/pages-panel-states.test.ts` (the brief's own Build step 3 —
"tests/pages-panel-states.test.ts stays green" — its "home really doesn't
[read getPuckPage]" pin flips now that it really does) and
`tests/popup-trigger-condition.test.ts` (its "exactly one `<PopupHost/>`"
regex assumed page.tsx's old single-return shape; PopupHost now rides both
the Puck branch and the fallback, matching every other Puck-first page in
the app — the test's fix widens the invariant to "every return carries it"
rather than loosening it). Both changes are recorded in SUMMARY.md.

Named `git add` only, never `-A`. Never the live site, never the vault,
never push, never archive.
