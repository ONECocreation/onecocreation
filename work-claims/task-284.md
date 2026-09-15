# work-claim — task-284 (ONE Cocreation: vitest 3.2.7 → 4.1.11, B4, dev-only)

Lane: Ms. Kimi (sub-agent, one lane). Base = onecocreation main @ **c1bd94c** (the T-283 merge —
the GO's cut point). Branch `feat/task-284`. Worktree cut by Number One, `node_modules` present
(`node_modules/.bin/vitest` verified at claim time). Lane ports **4294–4297** (no shots this lane —
dev-only — ports unused). GO: `~/dev/kimi/inbox/TASK-284-oc-vitest-4.md` — HELD until T-283 merged;
moved to GO by K28.

Ground: `~/dev/kimi/outbox/task-265/AUDIT.md` §"Proposed bump order" 6. Tip state at cut:
`npm audit` = 2 moderate, both vitest/@vitest/mocker — this lane closes them.

## Build (GO verbatim)
1. Read the vitest 4 migration guide; list every breaking change touching `vitest.config.ts`
   (`server.deps.inline` shape, `environment`, `setupFiles`, coverage) and test idioms
   (`vi.mock` hoisting, `toHaveLength` on non-arrays, `describe.each` typings) — grep the suite
   for each BEFORE bumping, paste the counts.
2. Bump `vitest` + `@vitest/*` siblings in lockstep; `npm ls vitest @vitest/mocker` → one version
   each, 4.1.11.
3. Fix what the guide names — config first, test files only where the guide's rule is the cause.
   Keep every assertion's meaning; no test deleted, no `.skip`.
4. Full gates. Suite count may not drop; a test that truly cannot run under 4 without a semantic
   change = flag-and-stop with file + reason.

## OWNS (GO verbatim)
`package.json`, `package-lock.json`, `vitest.config.ts`, `tests/**` (idiom fixes only, named per
file in the SUMMARY), `work-claims/task-284.md`. NOT `src/**`.

## Gates (verbatim)
`npx vitest run` · `node scripts/calendar-view.test.mjs` · `node scripts/cartridge-identity.test.mjs`
(179) · `node scripts/square-payments.test.mjs` (58) · `npx eslint src tests --max-warnings=0` → 0 ·
`npx tsc --noEmit` · `npx next build` · no shots (dev-only). After any lockfile change: `npm ci`
before tsc/build (K27 — a stale node_modules reads as "Cannot find module @onecocreation/…").

— Ms. Kimi, 0018.06.25 a₿ (block 967,130 at cut)
