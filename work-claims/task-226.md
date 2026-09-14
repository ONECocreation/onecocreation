# work-claim — TASK-226: the operator seat is found in any door of the cookie

LANE: home crew (sonnet) · worktree `~/dev/worktrees/task-226` · branch `lane/task-226`
base: `main @ 1db98ef` (T-225's merge)

## Baseline (established at cut, before any change)

`npx vitest run`:
```
 Test Files  78 passed (78)
      Tests  790 passed (790)
```

`node scripts/calendar-view.test.mjs`: 70 passed, 0 failed
`node scripts/cartridge-identity.test.mjs`: 181 passed, 0 failed
`node scripts/square-payments.test.mjs`: 58 passed, 0 failed

## Scope (OWNS, per the brief)

- `packages/operator-auth/src/index.ts` + its test — `operatorFromCookieHeader()` finds the
  FIRST allowlisted email seat in ANY slot of the fren cookie, not just slot 0; a new
  `hasOperatorEmailSeat()` export for the admin/session route to report the email door's
  allowlist status without leaking env names or values.
- `src/app/api/admin/session/route.ts` — `GET` gains `emailSeat: boolean` beside `eligible`;
  `configured` untouched.
- `src/components/OperatorGate.tsx` — one honest line when an email door exists but isn't
  the operator's: "Signed in as `<handle>`, but this address is not on the operator list."
  Plus its test.

NOT touched: `src/lib/fren-auth.ts`, `src/lib/identity-config.ts` (or equivalent),
`middleware.ts`, the `fe-operator` cookie's attributes (stays `SameSite=Strict`).

## Gates to run (verbatim)

`npx vitest run` (must grow by >= 3 over the 790 baseline) · `node scripts/calendar-view.test.mjs`
· `node scripts/cartridge-identity.test.mjs` · `node scripts/square-payments.test.mjs` ·
`npx eslint` · `npx tsc --noEmit` · `npx next build`.

## Shots

`/a` with a fixture email seat sitting in slot 2 of the `pa-fren` cookie, dark + dawn theme,
1440 + 390 wide — production `next start`, fixture KV, fixture `SEAT_SECRET`, minted cookie.
Harness pattern from `~/dev/home/archive/task-216`.

Report → `~/dev/home/outbox/task-226/SUMMARY.md`.
