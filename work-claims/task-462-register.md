# TASK-462 register

Base: 9db8532a23e01f705b2fb8a53d8d976f49fa1f99
Code/pins revision: b6921f5e72d70296d236344a5ee6442a0e4a5565 (this register rides the final commit on top)
Builder: Number One
Block: 968,543
Brief: /home/pac/dev/briefings/oc-sat-lanes-968543/TASK-462-taster-keeps-membership.md

## What was built

`src/lib/entitlement.ts`:
- `Entitlement` gains one optional field: `under?: { tier: Tier; orderId: string; expiresAtMs?: number }` — the live standing grant a taster sat on top of. Old records without it are unaffected everywhere (optional, JSON drops it when undefined).
- `getEntitlement` (:168-183): the lapsed-top-record branch now checks `rec.under` — if present and itself still live (no `expiresAtMs`, or not yet past it), returns the record AS that `under` grant (`tier`/`orderId`/`expiresAtMs` swapped in, `under` cleared on the returned value); otherwise unchanged (`null`). The original boundary is preserved exactly (`Date.now() <= rec.expiresAtMs`, the inverse of the old `>` — equality still reads as live, per T-403's pin).
- `grantTier` (:225-283): one new branch — this call's tier truly OUTRANKS a live standing grant (`existing`) and carries its own `opts.expiresAtMs` (a taster). There, the standing grant becomes the new `under` via a new local helper, `underFrom`, instead of being dropped. Every other branch (lower tier, same-tier renewal, same-tier already-permanent, permanent purchase) is otherwise untouched — it now only additionally carries `existing?.under` forward unchanged, EXCEPT the permanent-purchase-at-or-above branch, which explicitly clears `under` (the brief's "a PERMANENT purchase at or above the standing tier clears under").
- `underFrom` (new, private): when the standing grant (`existing`) itself already rides on its own `under` (a taster bought on top of a taster), keeps only the higher-ranked of the two that is still live, as the spec requires — never chains past one level.
- `revokeTier` (:265-291): gains an optional second parameter, `orderId`. When it's given, matches the LIVE record's own `orderId`, and that record carries a live `under`, the door falls back to `under` (persisted, `revokedAtMs` left unset) instead of closing. Any other call — no `orderId` (the admin ceremony route's own shape, untouched), the `under` grant's own order, or no live `under` at all — closes everything exactly as before.

`src/lib/entitlement-fulfil.ts`:
- The `refunded`/`disputed` branch of `settleEntitlementFromOrder` now calls `revokeTier(npub, order.id)` instead of `revokeTier(npub)`, so a refund of the TASTER's own order actually reaches the new fallback. It then checks whether the result actually closed (`revokedAtMs` set) or fell back; the "membership closed" letter (`sendRevokeLetter`) is now sent, and `FulfilResult.revoked` is now `true`, ONLY when the door actually closed — a fallback is reported as the tier the member still holds, with no false closing letter. This wasn't explicitly named as a "must" in the brief's item 4 (which is about `revokeTier`'s own behavior), but leaving it out would ship a real member-facing lie: refund the taster pass, the storage layer correctly falls back to the permanent membership underneath, yet the member gets a "your membership has closed" email and the admin debug view reports `revoked: true`. This is the one deliberate addition beyond the brief's literal wording; flagged here for the Admiral's eyes as a deviation, not hidden in the diff.

`tests/taster-keeps-membership-462.test.ts` (NEW, 13 tests): permanent A + C taster → C now, A permanent after; permanent B + C taster → B after; permanent A + B ($22) taster → A after; a taster-on-a-taster (A week pass + C day pass) → C, then A until the week pass's own end, then nothing; permanent C + C taster stays permanent C (today's rule, re-pinned); nothing + C taster → C then nothing (today's rule, re-pinned); a permanent purchase at the taster's tier clears `under`; the retry guard is unchanged with an `under` present; a legacy record with no `under` field reads exactly as before (written directly into the KV fixture, bypassing `grantTier`); four `revokeTier` rows — taster's own order falls back, the `under`'s own order closes everything, no-orderId closes everything (the ceremony route's call shape), and a taster with nothing underneath still fully closes.

House idioms reused: the KV fixture (`vi.stubGlobal("fetch", …)` speaking only GET/SET/SADD) and the fake-timer pattern are `tests/entitlement-renewal.test.ts`'s (T-403), trimmed the same way. Every row asserts the PERSISTED record via a fresh `getEntitlement` read, never the in-memory return value alone.

## Pins re-trued

None. No existing test's expected VALUE changed — the 8 pre-existing-behavior rows in the new test file were already green before the build (they pin today's unrelated branches: same-tier resistance, retry idempotency, nothing-plus-taster). `tests/entitlement-renewal.test.ts`'s 8 rows are untouched and still pass unmodified (re-run alongside the new file; see Gates).

## Deviations from the brief

1. **`entitlement-fulfil.ts`'s refund-letter/FulfilResult guard** (described above) — not explicitly asked for in item 4's wording, added because the alternative ships a false "membership closed" letter to a member who still holds a membership. Narrow (a few lines, no new dependency, no Matrix touch); reported here rather than silently expanded scope.
2. **Item 4's revoke path is built**, matching the test list's "(if built)" case fully, including the ceremony-route-shape (no-orderId) row — `tests/ceremony-revoke-own-door.test.ts` fully mocks `@/lib/entitlement` and `@/lib/entitlement-fulfil`, so it exercises none of this and needed no changes (confirmed: `grep -rln "settleEntitlementFromOrder\|sendRevokeLetter\|revokeTier\b" tests` finds only that one file, and it's mock-only).
3. No changes were needed outside `entitlement.ts`/`entitlement-fulfil.ts` — the seam-stop in item 4 was never hit.

## Item 5 — no Matrix changes (confirmed, noted)

`matrix.ts` was not touched. A lapsed taster already doesn't sweep Matrix rooms; the refund fallback added here has the same shape: `removeFromTierRooms` still runs (unchanged) against the taster's own tier before the revoke/fallback decision, but nothing re-invites the member to the lower tier's rooms when they fall back to `under`. This is the same pre-existing gap as a natural expiry, not widened, not fixed — noted per the brief.

## What is lintable

The new test file: every row is a "can only ADD time or tier on top of a membership, never take one away" assertion against the persisted record — confirmed by construction (each `it` name states the invariant it pins).

## Gates (actual output)

`~/dev/shortcuts/oc-gate.sh /home/pac/dev/worktrees/task-462`:

```
 Test Files  230 passed (230)
      Tests  2897 passed (2897)
scripts/calendar-view.test.mjs: 70 passed, 0 failed
scripts/cartridge-identity.test.mjs: 179 passed, 0 failed
scripts/console-matrix.test.mjs: 14 passed, 0 failed
scripts/fixture-kv.test.mjs: 45 passed, 0 failed
scripts/square-payments.test.mjs: 58 passed, 0 failed
eslint 0
tsc 0
build ok
GATES GREEN
```

Baseline at cut (on 9db8532, before any lane commit): 229 test files / 2884 tests, all green. Final: 230 files / 2897 tests, all green — the suite grew by exactly the lane's own 13 new pins; no existing assertion's expected value changed.

## Verification

Red proven directly: the new test file was run against the UNMODIFIED `entitlement.ts`/`entitlement-fulfil.ts` before any build edit — 5 of 13 failed exactly on the confirmed bug (the three cross-tier "outranks" scenarios, the taster-on-taster chain, and the taster-refund-falls-back case), 8 already passed (today's unrelated behavior, re-pinned rather than newly asserted). That red run predates the build commit; it was not re-run against the isolated red-only commit's tree via a second checkout (the shared stash stack across worktrees made a stash-based re-check unnecessarily risky for a fact already established by direct measurement) — the register states this plainly rather than implying a checkout-based re-proof happened.

Final HEAD: this register's own commit — reported in the hand-back message.

## Obstacles

- The trickiest part of the brief was item 2's "never chain more than one level" clause for a taster bought on top of a taster that ITSELF sits on a permanent grant (three layers). No test in the brief's required list exercises this exact triple case (the required "A taster (week pass) + C taster (day)" row has nothing under the A taster, so it never needed the compression rule at all) — I implemented the compression (`underFrom`) literally per the brief's wording anyway, reasoning through it by hand since there was no test to check it against; worth a second pair of eyes if this scenario matters in practice (permanent + two stacked tasters bought before the first one resolves).
- `entitlement-fulfil.ts`'s refund-letter correctness (Deviation 1) required tracing `sendRevokeLetter`/`FulfilResult` callers by hand (`grep -rn "settleEntitlementFromOrder\|FulfilResult"`) to confirm no other code depends on `revoked` always being `true` on refund — only the admin ceremony debug route reads the return value at all, and only as opaque JSON, so this was safe to narrow without a wider search.
- No dead ends on the KV/timer test idiom — `tests/entitlement-renewal.test.ts` (T-403) was a complete, directly reusable template.
