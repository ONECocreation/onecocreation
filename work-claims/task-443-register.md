# TASK-443 register

Block: 968336.
Status: implementation complete; acceptance BLOCKED by the unrelated reading-letter clock tests. Not an all-green hand-back.

Base: 8ca76077f95340e41f3bb5d9aa1b8141179190bf
Claim: 33b9604ac7921425e22a747f427b4c992235f77a
Red test: 2dc00c04afbeae184bd5ff46cd495dc9320b6363
Build: c67f125210630ba67ce31aeca6a85ee780f783ac

Changed only the brief's DoorSheet class strings, suffix token, and conditional night root. Added source pins and real static-render checks. Copy, forms, handlers, native button types, existing styles, CSS and existing tests are unchanged. The historical root WORK-CLAIM.md remains untouched, as the brief explicitly assigns this lane's claim to work-claims/task-443.md.

## Verification — pasted command output

Red: npx vitest run tests/sign-in-sheet-kit.test.ts
 Test Files  1 failed (1)
      Tests  8 failed | 2 passed (10)
EXIT_CODE=1

Green: npx vitest run tests/sign-in-sheet-kit.test.ts
 Test Files  1 passed (1)
      Tests  10 passed (10)
EXIT_CODE=0

Named regression set including design drift:
 Test Files  9 passed (9)
      Tests  172 passed (172)
EXIT_CODE=0

Gate: npx vitest run
 Test Files  1 failed | 213 passed (214)
      Tests  3 failed | 2573 passed (2576)
EXIT_CODE=1

Gate: for f in scripts/*.test.mjs; do node "$f"; done
70 passed, 0 failed
179 passed, 0 failed
14 passed, 0 failed
45 passed, 0 failed
58 passed, 0 failed
EXIT_CODE=0

Gate: npx eslint src tests --max-warnings=0
npm notice run onecocreation@0.1.0 npx
npm notice run 'eslint' src tests --max-warnings=0
EXIT_CODE=0

Gate: npx tsc --noEmit
npm notice run onecocreation@0.1.0 npx
npm notice run 'tsc' --noEmit
EXIT_CODE=0

Gate: npx next build
✓ Compiled successfully in 6.1s
EXIT_CODE=0

Build also reports middleware deprecation and dynamic filesystem tracing warnings in unmodified recon/reference routes. Vitest reports its config-loader warning. No warning suppression or out-of-scope fixes applied.

Exact transformation and added-line scan:
DoorSheet exact allowed transformation: PASS
All other DoorSheet bytes preserved: PASS
Full-width button styles: base=5 current=5
kit-btn kit-btn-main kit-btn-sm: 4
kit-btn kit-btn-quiet: 3
kit-btn kit-btn-second kit-btn-sm: 1
Existing tests and CSS unchanged: True
ADDED-LINE SECURITY SCAN
hardcoded_secrets: 0
shell_injection: 0
eval_exec: 0
unsafe_deserialization: 0
sql_interpolation: 0

Independent read-only review returned passed=true, empty security_concerns, logic_errors, and suggestions. It confirmed the exact production scope and required test coverage.

## Seams — flag and stop

The full Vitest gate fails in tests/reading-letters.test.ts, in the enqueueReadingDayOf day-of-gate describe block. The positive-send assertions use TICK_15Z without freezing Date.now(). src/lib/reading-letters.ts deliberately rechecks the real clock in sendReadingDayOf and returns skippedLate after startsAtMs. The live clock is beyond the fixture start. These files are unchanged from the base; no baseline checkout or baseline test run was performed.

Isolation: npx vitest run tests/reading-letters.test.ts
 Test Files  1 failed (1)
      Tests  3 failed | 37 passed (40)
EXIT_CODE=1

Clock probe output:
{"fixtureStartMs":1790190660000,"observedNowMs":1790213782935,"realClockPastFixtureStart":true}

Proposed minimal test-only diff, NOT APPLIED OR VERIFIED; requires Number One's authorization in another lane. Insert immediately inside the enqueueReadingDayOf day-of-gate describe block in tests/reading-letters.test.ts:

    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(TICK_15Z);
    });

The existing global afterEach already calls vi.useRealTimers(). Production send-time guards should remain unchanged. Full acceptance requires resolving this seam and rerunning the full gate; this lane does not waive it.

## Hand-back

Screenshots, geometry, contrast measurements and live account sign-in: not run; assigned to Number One and the Admiral by the brief. No visual or contrast claims are made from static tests. No production account was created, no push/fetch/merge/config operation performed, no environment file read, and DESIGN_DRIFT_WRITE was never set.

Raw command logs: node_modules/.cache/task-443-proof/ in this worktree (ignored generated evidence).
Full outbox report: /home/pac/dev/hermes/outbox/task-443-gpt-6-astra/SUMMARY.md
The outbox report carries the final register commit revision and complete gate output.
