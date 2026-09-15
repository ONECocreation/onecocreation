# WORK-CLAIM — TASK-230 (ONE Cocreation · /style pages panel — every route, its state, the Archive group)

CLAIMED-BY: Ms. Kimi's sub-agent (Kimi Code), solo lane, no parallel runs.
CLAIMED-AT: 0018.06.25 a₿ (block 967,125 at claim; `curl https://mempool.space/api/blocks/tip/height` → 967125; bftDate(967125) → 0018.06.25 a₿).
BRANCH: `feat/task-230`
WORKTREE: `~/dev/worktrees/task-230`
BASE: main @ `ec703a4` (T-231 merged — /retreats designer page) — `git merge main` fast-forwarded the branch from `7b352e1` at claim time; vitest baseline is now **1216** per K21.
BRIEF: `~/dev/kimi/inbox/TASK-230-oc-style-pages-panel.md` (+ K21 lane notes: baseline 1216, named adds only, never `git add -A`).
RUNS IN PARALLEL WITH: T-233 (PuckEditor.tsx — never touched here), T-268…T-273 brand-walk lanes (directory-disjoint OWNS; never touched).

## Ground (re-grepped at claim, on ec703a4)
- `src/components/style/PagesPanel.tsx` exists, full-featured (create/rename/duplicate/delete/reorder), enumeration at :42-48, seed protection at :199-215, recon reference group at :228-244 fed by `src/lib/shinepages-recon.ts:35-58`.
- The sixteen `-old` seeds in `src/lib/puck-seeds.ts:1242-1257` — grouping is presentational, no seed edits.
- No per-page state marker exists anywhere — greenfield; the manifest `src/lib/page-states.ts` is NEW and OWNS'd by this lane.
- `home` is seeded but `src/app/page.tsx` never reads it — manifest records `home` as designer-seeded-but-unwired, stated plainly; NOT wired in this lane.
- Puck core's 360px mobile default viewport comes from `@puckeditor/core` `defaultViewports[0]`; this lane adds NO `ui`/`viewports` prop — pins the inherited default with a source-pin test asserting `PuckEditor` passes no viewport override (style-route idiom). PuckEditor.tsx itself is T-233's OWNS — read-only here.
- Baseline per K21 on ec703a4: vitest **1216 passed**; `scripts/*.test.mjs` 70/181/58; eslint 0; tsc 0; next build ✓. Re-verified at gate time in SUMMARY.

## Build (per spec steps 1-6)
1. NEW `src/lib/page-states.ts` — typed manifest of every public route with state `designer` / `words` / `reference`; derive-or-dash, commented as the wave-2 scoreboard; `packages/page-store` untouched.
2. PagesPanel lists every manifest route with state badges beside the KV ∪ SEEDS ∪ stored-order enumeration; seeded/locked protection unchanged; `reference` rows read-only links.
3. Archive group: the sixteen `-old` seeds under a collapsed-by-default "Archive" group, state in localStorage (Site-room accordion idiom, `SiteConsoleShell` SITE_SUBS precedent). Seeds stay editable/publishable.
4. Default device stays mobile — source-pin test: PuckEditor passes no viewport override to `<Puck>`. No `ui`/`viewports` prop added.
5. Enumeration stays as-is unless wrong; switcher (PuckEditor.tsx:303-304) is T-233's OWNS — any wanted change goes in ## Seams as an exact diff.
6. Tests: manifest covers every public route exactly once (walk `src/app/*/page.tsx`, dash on deliberate exclusions /a + /api); panel groups `-old` under Archive collapsed by default; state badges render per manifest; no viewport override prop; `tests/style-route.test.ts:59-71` word-law pins keep passing.

## Standing clauses acknowledged
Claim file first (this file, named add only) · moving base (merge done at claim) · two OWNS exits · ## Seams · ## Operator runbook · shots both themes 1440+390 on the fixture harness, never the live site · derive-or-dash · no secrets · never push · never archive. Gates verbatim in SUMMARY: vitest (baseline 1216 pasted, must grow) · scripts/*.test.mjs (70/181/58) · eslint 0 · tsc · next build. BFT dates only from a real block height; named `git add` only, never `-A`.
