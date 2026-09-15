# WORK-CLAIM — TASK-275 (ONE Cocreation: rename the console theme's stored "arcade" key)

CLAIMED-BY: Number One (Claude Fable 5.1), solo lane, no parallel runs.
CLAIMED-AT: 0018.06.25 a₿ · block 967,125 (per the brief's own ruling stamp — H110, A).
BRANCH: `feat/task-275`
WORKTREE: `~/dev/worktrees/task-275`
BASE: main @ `ec703a4` (T-231 merge — verified via `git log -1` on the worktree at claim time).
BRIEF: `~/dev/home/inbox/TASK-275-oc-console-theme-key.md`
RUNS BESIDE: T-274 (a different worktree) — OWNS are directory-disjoint (T-274 owns `src/brand/**`, `scripts/*`; this lane owns only `src/lib/console-fx.ts` + `src/components/console/ConsoleShell.tsx`). Merge order: 274 then 275.

## Word choice
The brief leaves the new key word to this lane. Picked **`"default"`** — the display label (`THEME_LABEL`) already reads "DEFAULT" (T-269), so the stored value and the label now agree, per the brief's own hint.

## OWNS
- `src/lib/console-fx.ts` (the type union, THEME_ORDER, storedTheme(), the migration line)
- `src/components/console/ConsoleShell.tsx` (THEME_LABEL key, the SSR-snapshot literal, the two comments)
- `work-claims/task-275.md`

NOT-OWNS: `src/app/globals.css` / `src/app/house.css` (no CSS selector for `"arcade"` exists — none needed for `"default"` either, per the brief's own grep verification) · `src/lib/shiplog.ts` (history, leave) · Ms. Kimi's live lanes (`src/lib/puck-seeds.ts`, `src/lib/puck-blocks/**`, `src/lib/page-states.ts`, `src/components/style/**`, `src/components/PuckEditor.tsx`, `src/app/packages/**`, `src/app/style/**`).

## Ground (re-grepped at claim)
- `src/lib/console-fx.ts:20,23,32,34` — the type union, THEME_ORDER, and the two `"arcade"` fallback literals in `storedTheme()`, confirmed present exactly as the brief describes.
- `src/components/console/ConsoleShell.tsx:29,48,50,64` — the two comments, `THEME_LABEL`'s `arcade` key (display word already "DEFAULT" per T-269), and the `useSyncExternalStore` SSR-snapshot literal, confirmed present.
- `src/app/globals.css` — confirmed via grep: only `[data-console-theme="lcars"]` selectors exist (:666-719); no `[data-console-theme="arcade"]` block anywhere in `globals.css` or `house.css`. No CSS edit in this lane.
- `src/lib/shiplog.ts:39` — the historical seed entry naming "Pac's Arcade (default)" — left verbatim, not touched.
- Importers of `console-fx` besides `ConsoleShell.tsx`: `src/components/console/ScarRail.tsx` imports only `tabBleep` (no `ConsoleTheme`/`THEME_ORDER` reference) — not a seam for the type rename.

## Standing clauses acknowledged
Claim file first commit. `git add <named files>` only, never `-A`/`.`. Stay inside OWNS; unowned touches go to `## Seams` in SUMMARY, not into a diff. No CSS selector edits (brief step 3). `git merge main` before final gates if main moved. Gates verbatim in SUMMARY, pasted not typed. One new test file allowed under `tests/`. Shots both themes (dark + dawn) at 1440 + 390 of the console THEME control, fixture-harness pattern (production build+start on :4275, fixture operator cookie), saved to `~/dev/home/outbox/task-275/shots/`, listener killed after. Commit messages `TASK-275: ...` with BFT stamp `0018.06.25 a₿` and the `Claude Fable 5.1` trailer. Never push, never archive, never touch the live site or secrets. BFT dates only.

LANE-DONE pending build + gates + commit.
