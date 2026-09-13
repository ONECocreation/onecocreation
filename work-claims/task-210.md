# WORK-CLAIM — TASK-210 — ONE Cocreation: the site knows who is signed in

CLAIMED-BY: **Chief O'Brien** (guest builder, Hermes lane)
CLAIMED-AT: 0018.06.23 a₿ · block 966,819
BRANCH: `feat/task-210-signed-in`
WORKTREE: `~/dev/worktrees/task-210`
BASE: main @ `690ca0a` (T-198 merged)
REPO: `~/dev/onecocreation` (verify at cut)

## Grounding
OWNS phrases mapped to real paths in `~/dev/hermes/inbox/refs/T210-216-GROUNDING.md` §T-210 — those paths ARE my OWNS (re-grep at cut; main moves). NOT FOUND items = NEW work (say so in claim) or question for coordinator.

## The bugs (from the call)
1. Basket asks for email while visitor is signed in (00:23:40, 00:45:33)
2. Home page weekly-reading door does not know visitor is signed in (00:39:49, 00:44:11)
3. Weekly reading block "is broken right here" (00:39:32)
4. Community door check: Love's Matrix identity resolves to Admiral's name (00:21:46)
5. Reading-room link in user menu lands in wrong place (01:11:02)
6. Heart-field link lands in wrong place (01:53:35)

## Build
1. **One signed-in source of truth.** Find how the site knows the visitor (member session — cookie/JWT read in `src/lib/**` auth/session helpers). The basket, home weekly-reading door, and every member surface must read that one source — never ask for email when live session exists.
2. **The basket** stops asking signed-in visitors for an email; checkout pre-fills from the session (rides T-198's card→Square rail; do not touch the rail itself).
3. **The home weekly-reading door + block**: knows the signed-in visitor and routes to the reading; the "broken right here" block renders or dashes honestly (derive-or-dash).
4. **The Matrix identity check** (Community door check): Love's Matrix identity must resolve to Love, not the Admiral. Believed to ride `MATRIX_OCC_ADMIN_TOKEN` (operator row 10, /a/live errors 00:18:28) — verify whether the check reads the wrong account's token and fix the lookup, not the symptom.
5. **The two mis-routing links**: the reading-room link in the user menu and the heart-field link land on their real targets. Grep the nav/user-menu config for both hrefs; add a route test so they cannot drift again.
6. **Tests**: signed-in visitor → no email ask on the basket; the weekly-reading door's href for anon vs member; the two link targets; the Matrix check resolves Love's id to Love's display name (fixture the lookup).

## Shots
- The basket signed-in (no email field)
- The home weekly-reading block signed-in + anon
- The user menu — both themes, 1440 + 390

## Standing clauses (KIMI-WORKFLOW.md)
- WORK-CLAIM first
- Moving base (`git merge main` before final gates)
- Two OWNS exits (flag-and-stop / minimal-forced-edit with one line of justification)
- ## Seams — list every adjacent unowned file with the exact minimal diff
- ## Operator runbook — `MATRIX_OCC_ADMIN_TOKEN` on Vercel is operator row 10 (open before this lane) — if the identity check's fix needs the env present to verify, say so in SUMMARY and leave the click to Number One
- Shots BOTH themes (1440 + 390 where layout matters)
- Derive-or-dash
- Never the live site/vault
- No secrets
- Never push
- Never archive

## Gates (verbatim in SUMMARY)
- vitest (establish baseline at cut and paste it; the suite must grow)
- all scripts/*.test.mjs
- lint = 0
- tsc
- next build

Report → `~/dev/hermes/outbox/task-210/SUMMARY.md`, end with `LANE-DONE <full sha>`.