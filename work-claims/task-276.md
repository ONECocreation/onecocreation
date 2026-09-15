# WORK-CLAIM — TASK-276 (ONE Cocreation: `--font-arcade`/`.font-arcade`/`ArcadeFonts` → `--font-display`/`.font-display`/`DisplayFonts`)

CLAIMED-BY: Number One (Claude Fable 5.1), solo lane, no parallel runs.
CLAIMED-AT: 0018.06.25 a₿ · block 967,125 (per the brief's own ruling stamp — H111, A).
BRANCH: `feat/task-276`
WORKTREE: `~/dev/worktrees/task-276`
BASE: main @ `41c6312` (T-274 + T-275 merged — verified via `git log -1` on the worktree at claim time).
BRIEF: `~/dev/home/inbox/TASK-276-oc-font-arcade-sweep.md`
RUNS BESIDE: T-277 (a different worktree) — reads `identity-config.ts`, `FrenProfile.tsx` only (does not write). This lane owns `FrenProfile.tsx`'s classNames per the brief.

## OWNS
`src/components/ArcadeFonts.tsx` (renamed to `src/components/DisplayFonts.tsx`), `src/app/layout.tsx`, `src/app/a/layout.tsx`, `src/app/a/bots/page.tsx`, `src/app/a/connections/page.tsx`, `src/app/bb/page.tsx`, `src/app/bday/page.tsx`, `src/app/media/page.tsx`, `src/app/time/layout.tsx`, `src/app/u/[handle]/layout.tsx`, `src/app/u/[handle]/not-found.tsx`, `src/app/cartridge.css`, `src/app/cartridges.css`, `src/app/globals.css`, `src/app/house.css` (the one neutralisation rule + its comment only), `src/components/ArtistRegistry.tsx`, `src/components/bb/Hatchery.tsx`, `src/components/BrandTester.tsx`, `src/components/BriefsConnectPanel.tsx`, `src/components/BriefsPanel.tsx`, `src/components/ChatPanel.tsx`, `src/components/console/RankTrackPanel.tsx`, `src/components/DecisionsPanel.tsx`, `src/components/FrenProfile.tsx`, `src/components/GameOverTag.tsx`, `src/components/Markdown.tsx`, `src/components/MediaKit.tsx`, `src/components/MempoolPanel.tsx`, `src/components/MudPanel.tsx`, `src/components/PokeArcadeCard.tsx`, `src/components/SpacesPanel.tsx`, `src/components/TicketsPanel.tsx`, `work-claims/task-276.md`.

NOT-OWNS: Ms. Kimi's live lanes — `src/lib/puck-seeds.ts`, `src/lib/puck-blocks/**`, `src/lib/page-states.ts`, `src/components/style/**`, `src/components/PuckEditor.tsx`, `src/app/packages/**`, `src/app/style/**` — re-verified at claim: none of these appear in the `font-arcade`/`ArcadeFonts` grep results.

## Ground (re-grepped at claim, 41c6312)
`grep -rn "font-arcade\|ArcadeFonts" src` → 67 hits across 31 files, all inside OWNS. Matches the brief's verified list with two drifts since T-274 landed:
- `src/app/cartridges.css` — the pacman CSS twin is gone (T-274 follow-through), so only **4** `--font-arcade` declarations remain (now at `:401,480,754,1040`, not the brief's pre-T-274 line numbers `:42,450,529,803,1089`), and there is **no comment hit at `:24`** any more (the brief's Bin-C item for that line is a no-op — nothing to reword there; noting it, not editing anything extra).
- All other files/lines match the brief's verified list as written.

## Seams
- `tests/door-machine.test.ts:132` — the `ARCADE` source-voice pin array includes `/font-arcade/`; after this sweep that regex can never match (string leaves the tree), so the assertion still passes but vacuously. Not touching that file (not in OWNS); flagging in SUMMARY per the brief.
- `src/app/layout.tsx:23-27` docblock also names the "PACMAN cartridge" pouring `var(--font-press-start)` from a `cartridges.css` twin that T-274 already deleted — rewording that mention alongside the ArcadeFonts/font-arcade token renames (comment-only, Bin C, no functional/font-loading code change — `pressStart2P` itself stays, out of this lane's scope).

## Standing clauses acknowledged
Claim file first commit. `git add <named files>` only, never `-A`/`.`. `git mv` for the component rename. Stay inside OWNS; unowned touches go to `## Seams`, never into a diff. house.css:469 selector rename in the SAME commit as the className sweep (step 4, do-not-miss). `git merge main` before final gates if main moved. Gates verbatim in SUMMARY, pasted not typed. One new test file under `tests/` pinning grep-zero + the house.css `[class*="font-display"]` rule. Shots both themes (dark + dawn) at 1440 + 390, fixture harnesses from T-274/T-275 outboxes, ports 4276/4277, saved to `~/dev/home/outbox/task-276/shots/`, listeners killed after. Commit messages `TASK-276: ...` with BFT stamp `0018.06.25 a₿` and the `Claude Fable 5.1` trailer. Never push, never archive, never touch the live site or secrets. BFT dates only.

LANE-DONE pending build + gates + commit.
