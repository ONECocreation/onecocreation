# WORK-CLAIM — TASK-269 (ONE Cocreation brand walk · L2 the /a rooms + console components)

CLAIMED-BY: Number One (Claude Fable 5.1), solo lane, no parallel runs.
CLAIMED-AT: 0018.06.24 a₿ (block 967,054 at claim; `curl https://mempool.space/api/blocks/tip/height` → 967054; day=6715, year=18, doy=163, month=6, day=24).
BRANCH: `feat/task-269`
WORKTREE: `~/dev/worktrees/task-269`
BASE: main @ `7b352e1` (T-264 follow-through) — re-verified at claim time (`git log -1` on the worktree matched).
BRIEF: `~/dev/home/inbox/TASK-269-oc-brand-walk-a-rooms.md`
RUNS IN PARALLEL WITH: T-268…T-273 — OWNS are directory-disjoint; never touched files outside `src/app/a/**`, `src/components/console/**`, the four named panels (TicketsPanel.tsx, SpacesPanel.tsx, ChatPanel.tsx, DeployPanel.tsx), the ONE `house.css` neutralisation line, and tests.

## Ground (re-grepped at claim)
- `src/app/house.css:461-468` — `.mgmt-body` neutralises `[class*="bg-panel"]`, `shadow-[`, `glow-`, `font-pixel`, `border-2/4`, `text-neon`, `text-pink`, `.button` — confirmed NO `font-arcade` rule exists yet.
- 7 room h1's carry `font-arcade text-4xl text-cyan glow-cyan`: `src/app/a/page.tsx:132`, `action/page.tsx:48`, `bots/page.tsx:78`, `status/page.tsx:38`, `sim/page.tsx:45`, `connections/page.tsx:57`, `testing/page.tsx:41` — these are the SCAR-chrome branch only (site chrome returns before reaching them on `/a`, and houseOnly rooms `redirect("/a")` under site chrome — confirmed in each page). The scar branch renders when `NEXT_PUBLIC_CONSOLE_CHROME` is unset (default `"scar"`), which is this worktree's state (no `.env.local`).
- `SITE_LABELS` (`src/components/console/SiteConsoleShell.tsx:34-45`) has no entries for bridge/duty/crew/sim/bots/fleet room keys (only `overview→"Home"` etc.) — confirmed the brief's plain-word list (Overview/Status/Actions/Testing/Simulator/Bots/Connections) is the correct 1:1 mapping onto the 7 room h1's in that order.
- `.mgmt-title` (`globals.css:912`) is the real site-dialect heading class, already used by `SiteConsoleShell.tsx:220` and a dozen public pages — theme-safe (CSS vars w/ fallbacks).
- `TicketsPanel.tsx`, `SpacesPanel.tsx`, `ChatPanel.tsx`, `DeployPanel.tsx` live under `src/components/` (NOT `console/`) — brief item 2 names these explicitly, so they're in-scope by brief instruction even though outside the general `console/**` OWNS glob. `BriefsConnectPanel.tsx`, `MempoolPanel.tsx`, `SignoffsPanel.tsx` are ALSO tagged `a-rooms-console` in the census but are NOT named in the brief's Build section and live outside `console/**` — leaving them untouched, flagged in Seams (another lane's OWNS).
- `CHAT_URL_DEFAULT` exported from `src/lib/nodeconfig.ts:90` (currently `"https://chat.frens.earth"`) — consuming it in `ChatPanel.tsx` instead of the hardcoded literal, per brief.
- `CONSOLE_OVERVIEW`/`CONSOLE_OFFICERS` — checked `main`@base for T-270 per-site config; not landed by claim time, so item 3's fallback applies (documented in Seams).
- Baseline established at cut on this worktree's HEAD (`7b352e1`): `npx vitest run` → **1144 passed (110 files)**; `scripts/*.test.mjs` → 70/181/58 passed; `npx eslint src tests --max-warnings=0` → 0; `npx tsc --noEmit` → 0. `dehouse-inventory.sh` before-state captured.

## Build (planned)
1. Add ONE `.mgmt-body [class*="font-arcade"]` neutralisation rule in `house.css` (minimal-forced-edit, justified below).
2. 7 room h1's: drop `font-arcade text-4xl text-cyan glow-cyan` → `mgmt-title`; text → Overview/Status/Actions/Testing/Simulator/Bots/Connections (the h2's in connections/page.tsx and the bots name span keep their existing classes — not in the brief's named h1 list, and covered defensively by the new CSS rule).
3. Re-voice docblocks across `src/app/a/**` (layout.tsx, page.tsx, action, brand, testing) and `src/components/console/**` (ConsoleShell, CardsRailCard, SiteConsoleShell) — arcade/frens words out, WHY kept, no identifier renamed.
4. Bin-A words: TicketsPanel (:138 crew subtitle, :148 @frens tag), SpacesPanel (:570, :572, :596), ChatPanel (:154-157 default banner + import CHAT_URL_DEFAULT, :174 placeholder, :246 caps line), DeployPanel (:207 Vercel project name), ConsoleShell (:48 THEME_LABEL value, :145 tooltip), RankTrackPanel (:84).
5. New test file pinning: no `src/app/a/**/page.tsx` h1 carries `font-arcade`, the `.mgmt-body .font-arcade` rule exists, the four panels' old strings are gone.
6. Shots: `/a`, `/a/status`, `/a/testing`, `/a/connections` with the operator fixture cookie, both themes (`data-oc-theme`), 1440 + 390 — rendered with `NEXT_PUBLIC_CONSOLE_CHROME` unset (default `scar`) so the fixed room h1's actually render (site chrome redirects these houseOnly rooms to `/a`).

## Standing clauses acknowledged
Moving base (`git merge main` before final gates), two OWNS exits (flag-and-stop default / minimal-forced-edit for the one house.css line), `## Seams`, `## Operator runbook`, shots both themes 1440+390, derive-or-dash, never live site/vault, no secrets, never push, never archive. Gates verbatim in SUMMARY. Bin B stays HOLD throughout (no identifier/class/key renames). a₿ dates only from a real block height.
