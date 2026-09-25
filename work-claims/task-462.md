# TASK-462 claim

Builder: Number One
Block: 968,543
Branch: feat/task-462-taster-keeps-membership
Worktree: /home/pac/dev/worktrees/task-462
Base: 9db8532a23e01f705b2fb8a53d8d976f49fa1f99
Brief: /home/pac/dev/briefings/oc-sat-lanes-968543/TASK-462-taster-keeps-membership.md
Common rules: /home/pac/dev/briefings/oc-sat-lanes-968543/COMMON.md

Baseline at cut (on 9db8532, before any lane commit): 229 test files / 2884 tests, all green.

Contract: a taster grant (a package purchase with `opts.expiresAtMs` set — the $11/$22 week passes, the Q&A day pass) that outranks a LIVE standing grant no longer overwrites it. `Entitlement` gains one optional field, `under?: { tier: Tier; orderId: string; expiresAtMs?: number }`, holding the grant the taster sits on top of. `grantTier` sets it only on that one new branch (this call's tier truly outranks the existing live tier and this call carries an expiry); every other branch is untouched except that it now carries `under` forward unchanged (or clears it on a permanent purchase at/above the standing tier, per the brief). `getEntitlement` falls back to `under` once the top record's own `expiresAtMs` has passed and `under` is itself still live, returning it AS the current grant (tier/orderId/expiresAtMs swapped in, no nested `under` on the returned value) — old records with no `under` field read exactly as before. `revokeTier` gains an optional `orderId`; when it matches the LIVE record's own orderId and that record carries a live `under`, it falls back to `under` instead of closing the door; any other call (no orderId, or the `under`'s own order) closes everything exactly as today. `entitlement-fulfil.ts`'s refund/dispute branch is updated to pass `order.id` through to `revokeTier` so a refunded taster pass actually reaches this fallback.

Owned paths and limits:
- src/lib/entitlement.ts — the `under` field, `grantTier`'s one new branch + forwarding, `getEntitlement`'s fallback read, `revokeTier`'s optional-orderId fallback.
- src/lib/entitlement-fulfil.ts — only the refund/dispute branch's `revokeTier` call (pass `order.id`), and only if the letter/result logic needs a matching guard so a fallback is never reported as a closed membership.
- tests/taster-keeps-membership-462.test.ts — NEW.
- work-claims/task-462.md and work-claims/task-462-register.md.

**Round 3 widening (block 968,548, Number One's own instruction):** OWNS now also includes `src/lib/live.ts`, scoped to exactly ONE function, `classStartingAudience` — it re-derives its own revoked/lapsed liveness check inline and never knew about `under`, so a member whose taster had lapsed dropped out of every room's audience even when their live grant (per `getEntitlement`) is still a standing membership. The fix exports a new pure `liveGrant(rec, now?)` from `entitlement.ts` (holding exactly `getEntitlement`'s revoked/lapsed/`under` decision) and has `classStartingAudience` call it instead of its own inline check. Nothing else in `live.ts` is touched — not `LiveState`, not the letter/mail plumbing, not `emailForGrantKey`.

Read-only (never touched): matrix.ts, the webhook and checkout routes, the orders route, /a/store, room-access.ts, kit.css, member-tier.ts, src/app/api/admin/matrix/ceremony/route.ts, every other existing test file (existing pins run untouched), and everything in `live.ts` outside `classStartingAudience`.

No Matrix changes (brief item 5) — a lapsed/refunded taster still doesn't sweep Matrix rooms beyond the existing tier-room removal on refund; that gap is unchanged and noted in the register, not fixed here.

First commit is this claim. Subsequent commits: red tests, the entitlement.ts/entitlement-fulfil.ts build, the register. Tests must fail before implementation. Baseline vitest counts recorded above. Gate via ~/dev/shortcuts/oc-gate.sh.

No root WORK-CLAIM.md edits; no environment-file reads, secrets, vault, or server config changes; no new dependencies; no push/fetch/merge/rebase or git configuration changes; no Gregorian stamps anywhere. Any needed out-of-scope change is a seam and stops the lane.
