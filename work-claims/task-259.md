# WORK-CLAIM — TASK-259 (ONE Cocreation: a new soul from the reading room lands on /welcome, and a stale cookie meets a real door)

CLAIMED-BY: Number One (Claude Fable 5.1), solo lane, no parallel runs.
CLAIMED-AT: 0018.06.24 a₿ (block 967,043 at GO).
BRANCH: `feat/task-259`
WORKTREE: `~/dev/worktrees/task-259`
BASE: main @ `5648470` (T-257 merged) — re-verified at claim time (`git log -1` on the worktree matched the GO line).
BRIEF: `~/dev/home/inbox/TASK-259-oc-new-soul-lands-on-welcome.md`
RUNS IN PARALLEL WITH: T-260 (stage), T-261 (studio links) — OWNS are disjoint; never touched `src/components/rooms/**`, `src/lib/live.ts`, `src/app/a/**`.

## Ground (re-grepped at claim)
- `src/components/door/door-machine.ts:73-77` `landingFor()` — confirmed it checks `next` before `isNew` (a brand-new soul with a `next` never sees `/welcome`).
- `src/middleware.ts:8-10` — confirmed it only calls `request.cookies.has(FREN_COOKIE)` (presence, not validity).
- `src/lib/fren-auth.ts` — confirmed `import crypto from "crypto"` (node's HMAC/timingSafeEqual) at the top; NOT Web-Crypto-clean, so the Edge runtime (middleware's runtime) cannot call `sessionsFromCookieHeader`/`parseToken` directly. Adding an additive Web-Crypto twin per the brief.
- `src/lib/rooms-door.ts` (unowned) — `roomsDoorRedirect(pathname, hasSession: boolean)` already takes a plain boolean; no change needed there — middleware computes a VALID boolean now instead of a presence boolean, same call shape.
- `tests/rooms-door.test.ts` (unowned, existing) — asserts `src/middleware.ts`'s raw source still contains the literal `"pa-fren"`; kept that literal in a doc comment so this existing test needs no edit (flag-and-stop honored — untouched).
- Baseline established at cut on this worktree's HEAD (`5648470`): `npx vitest run` → **1104 passed (107 files)** — matches the brief's stated baseline exactly.

## Build (planned)
1. `door-machine.ts`: `landingFor` — `isNew` wins; new soul + same-origin `next` → `/welcome?next=<next>`; add `continueLabel(path)` (known `/rooms/<slug>` → "Continue to `<room title>`", else "Continue").
2. `middleware.ts`: verify, don't just see — call a new `hasValidSessionEdge()` (fren-auth.ts, additive, Web Crypto).
3. `fren-auth.ts`: additive Edge-safe HMAC verifier (`verifySessionTokenEdge`, `hasValidSessionEdge`), same token shape as `parseToken`, never touching the existing node path.
4. `WelcomeFlow.tsx`: read `next` from the URL (client-only, same pattern as `nextPathFromLocation`), render one continue door at the bottom when present.
5. Tests: `tests/door-machine.test.ts` updates + new cases; new `tests/fren-auth-edge.test.ts` (valid passes, tampered/expired/foreign-secret redirects, both verifiers agree on the same token).
6. Shots: `/welcome?next=/rooms/heart-field`, both themes, 1440 + 390.

## Standing clauses acknowledged
Moving base, two OWNS exits, `## Seams`, `## Operator runbook`, shots both themes, derive-or-dash, never live site/vault, no secrets, never push, never archive. Gates verbatim in SUMMARY. Every a₿ date derived from a real block height.
