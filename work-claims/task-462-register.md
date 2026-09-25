# TASK-462 register

Base: 9db8532a23e01f705b2fb8a53d8d976f49fa1f99
Code/pins revision: 76850b1636520b65572963faeef39b04e13a363b (this register rides the final commit on top)
Builder: Number One
Block: 968,543
Brief: /home/pac/dev/briefings/oc-sat-lanes-968543/TASK-462-taster-keeps-membership.md
Fix round: coordinator message (Number One), block 968,543, F1-F4 below

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

## Fix round (block 968,543) — F1, F2, F3, F4

The coordinator (Number One) found four real holes in the round-1 build above and sent four fixes, each with its own red-test-first requirement. All four addressed; none needed a change outside `entitlement.ts` / `entitlement-fulfil.ts`.

**F1 — `revokeTier` was deciding from `getEntitlement`, not the raw record.** Refunds usually land AFTER the event: by the time Love refunds a taster's day pass, it has often already lapsed. `getEntitlement` was already showing the lapsed taster AS its `under` (a reconstructed view with the `under`'s own orderId, no `under` field of its own) — so `revokeTier(npub, qaOrderId)`'s exact-match check (`rec.orderId === orderId`) missed entirely, fell through to the full-revoke path, and closed the member's PERMANENT membership on a refund of the pass that had already ended. Fixed: `revokeTier` now reads `readRec` (the raw stored record) first. If `orderId` matches the raw record's own `orderId` (live or lapsed — this is the one thing that changed) and its `under` is itself still live, it falls back to `under`, `revokedAtMs` left unset. Any other call (no `orderId`, the `under`'s own order, an `under` that's no longer live, or an order that names nothing currently live) closes exactly as before — including the explicit "do not change" case: an order that no longer holds any door at all (fully superseded — e.g. an outranked purchase whose own orderId was never even chained as `under`) still gets today's blunt full-revoke; there is no code path that treats a non-matching orderId as anything but a full close, so this needed no special-casing, only confirming.

**F2 — the refund/dispute branch never re-invited after a fallback.** `removeFromTierRooms` is tier-blind — it kicks the member from EVERY gated room their old tier held, run BEFORE the revoke/fallback decision (unchanged, still needed to know which rooms to clear). On a genuine close that's correct and complete. On a fallback it isn't: the member still holds a tier, just a lower one, and was left with no rooms at all until their next matrix login re-synced them (if anything does). Fixed: after a fallback, `inviteToTierRooms(held.mxid, after.tier)` (the existing helper, import-only — `matrix.ts` itself untouched) re-invites to the tier they actually still hold, and those outcomes are folded into `rooms`. The close path — the kick, the `if (!fellBack)` letter guard, `revoked: true` — is unchanged in behavior; only the final `return` line's `rooms` field changed textually (`[...rooms, ...inviteRooms]`, where `inviteRooms` is always `[]` on a close, so the close case's actual `rooms` value is unchanged too).

**F3 — an outranked purchase (the standing grant beats it) was simply dropped, AND it silently clobbered the winning record's own orderId.** Two bugs in one branch: (1) the purchase that lost the top slot vanished entirely — no `under` update — so a permanent B bought while a C taster (under A) was live got lost the moment the C pass closed, falling back to A instead of the more valuable B; (2) the ORIGINAL code (`orderId,` on the final `rec`, present since before this task) always wrote the INCOMING call's `orderId` onto the record regardless of which tier won, so the standing grant's own audit trail — and, critically, the exact-orderId match both the retry guard and `revokeTier`'s F1 fix depend on — silently pointed at the losing purchase's order instead. Fixed: in the outranked branch, the standing grant's own `orderId` (not just tier/expiry) now stands exactly as it was, and the incoming (losing) purchase becomes the new `under` via new helper `underBeats` when it beats whatever `under` already stands (nothing there yet, a strictly higher rank, or the same rank with this purchase permanent against a taster `under`) — otherwise the existing `under` is left exactly as is.

**F4 — the 3-layer case (permanent + taster + taster-on-taster).** Pinned via a new test rather than changed: a permanent A + a B week pass (under=A) + a C day pass bought WHILE the B pass is live compresses to exactly one level, keeping the higher-ranked of {B, A} (which is B) as the new `under` — A is compressed OUT the moment C is bought on top of B. Once C closes, reads B (still its own taster window); once B's own window closes too, reads nothing — A is not reachable, by the spec's own explicit "never chain more than one level" rule. `underFrom` (round 1) was already doing this correctly; no source change was needed, only the test to prove it.

New tests (7, all in `tests/taster-keeps-membership-462.test.ts`): F1's lapsed-refund-falls-back row; F3a (a mid-tier permanent purchase survives as the new `under`), F3b (refunding the ORIGINAL order after an outranked purchase falls back to that purchase, and proves the orderId-preservation fix), F3c (the retry guard still no-ops after an outranked purchase); F4's 3-layer compression row; F2's two `settleEntitlementFromOrder` rows (fallback: kick then invite, no letter; close: kick only, letter goes out) — the latter needed new module-level mocks for `@/lib/store` (`getItem`, the `tests/stage2-access.test.ts` idiom), `@/lib/matrix` (all five exports, extending `tests/ceremony-revoke-own-door.test.ts`'s idiom with call-tracking arrays for `inviteToTierRooms`/`removeFromTierRooms`), and `@/lib/mail-queue` (`enqueue`, so the closing letter never touches a real queue) — `entitlement.ts` itself stays real throughout, backed by the same KV fixture as every other test in the file. An email-shaped npub (`"love-guest@example.com@email"`) sidesteps needing a `@/lib/registry` mock: `npubOfOrder`'s own `space === "email"` shortcut returns the subject unchanged.

Each of the four fixes was proven red first: F1/F3/F4's tests were added and run together against the round-1 build (4 failed exactly as predicted, 1 test-file-run before any of this round's source edits); F2's two tests were added and run against the round-1 `entitlement-fulfil.ts` (the fallback-reinvite assertion failed, the close-only assertion already passed since that behavior was unchanged) — then each fix applied and re-verified green. Commits: red tests (`903edca`), F1+F3 build (`a3d6758`), F2 build (`76850b1`), each on top of the round-1 commits.

## Pins re-trued

None in either round. No existing test's expected VALUE changed at any point — the 8 pre-existing-behavior rows in the round-1 test file, `tests/entitlement-renewal.test.ts`'s 8 rows, and the fix round's F2 close-only assertion were all already green before their respective builds (they pin unrelated or already-correct behavior). `tests/ceremony-revoke-own-door.test.ts` fully mocks `@/lib/entitlement` and `@/lib/entitlement-fulfil`, so neither round's changes reach it at all — confirmed both rounds.

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
      Tests  2904 passed (2904)
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

Baseline at cut (on 9db8532, before any lane commit): 229 test files / 2884 tests, all green. Round 1 final: 230 files / 2897 tests. Fix round final: 230 files / 2904 tests, all green — the suite grew by exactly this round's own 7 new pins on top of round 1's 13; no existing assertion's expected value changed in either round.

## Verification

Round 1: the new test file was run against the UNMODIFIED `entitlement.ts`/`entitlement-fulfil.ts` before any build edit — 5 of 13 failed exactly on the confirmed bug, 8 already passed (today's unrelated behavior, re-pinned rather than newly asserted).

Fix round: F1/F3/F4's tests (5 new `it`s at that point) were run together against the round-1 build BEFORE any fix-round source edit — 4 failed exactly as predicted (F1's lapsed-refund, F3a/b/c), F4's row already passed (confirming `underFrom` needed no change). F2's two tests were added and run against the round-1 `entitlement-fulfil.ts` next — the fallback-reinvite assertion failed, the close-only assertion already passed. Each fix was then applied and re-verified green in isolation before moving to the next. Neither round's red state was re-proven via an isolated checkout of the red-only commit (the shared stash stack across worktrees made a stash-based re-check unnecessarily risky for a fact already established by direct measurement) — stated plainly rather than implying a checkout-based re-proof happened.

Final HEAD: this register's own commit — reported in the hand-back message.

## Obstacles

- Round 1: item 2's "never chain more than one level" clause (a taster on a taster on a permanent grant, three layers) had no test in the brief's required list. I implemented the compression (`underFrom`) by hand reasoning, unverified. **Resolved this round**: F4's new test confirms `underFrom`'s round-1 logic was already correct — no source change needed, only the test.
- Fix round F3 surfaced a bug that predates TASK-462 entirely: `grantTier`'s final `rec` object always wrote the INCOMING call's `orderId`, even in the branch where the standing grant wins and that incoming purchase is otherwise fully ignored — clobbering the winning record's own audit trail with a losing purchase's order id. This had no test anywhere in the codebase before this round (`grep -rn "grantTier(" tests` outside this lane's own file returns nothing), so it shipped unnoticed through round 1 too, until F3's own test (checking `revokeTier` against the ORIGINAL order after an outranked purchase) exposed it. Fixed as part of F3; flagged here because it's a correctness fix slightly broader than F3's literal ask (which only mentioned `under`), the same class of judgment call as round 1's letter guard.
- Confirming F1/F2/F3's "Do NOT change" boundary (a refund of a fully superseded order keeps today's blunt full-revoke) required tracing by hand rather than a dedicated test: the fix's exact-orderId match on the RAW record's own `orderId` only ever matches the record that is CURRENTLY the top slot's own order, live or lapsed — a truly superseded order (compressed out of the `under` chain entirely, e.g. by F4's 3-layer rule, or replaced by a same-tier renewal) can never coincidentally match, so no special-casing was needed and none was added; this is reasoning, not a new pin, so a determined future refactor could still break it silently.
- No dead ends on the KV/timer test idiom (round 1) or on mocking `@/lib/store`/`@/lib/matrix`/`@/lib/mail-queue` for F2 (round 2) — `tests/entitlement-renewal.test.ts` (T-403) and `tests/stage2-access.test.ts`/`tests/ceremony-revoke-own-door.test.ts` were complete, directly reusable templates for both.
