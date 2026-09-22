# work-claims/task-403.md — task-403 (ONE Cocreation: B-1 — an early renewal adds days, never loses them)

Lane: the home crew (Sonnet builder, under Number One's gate). Base = onecocreation main
`ca2b692d25d88533bfea593ef7873237aa8021b2` (PR #48 on #47 on `11ef2f4`), cut at block 968,141.
Branch `feat/task-403-renewal-adds-days`. Worktree `~/dev/worktrees/task-403` (cut by
Number One), `npm ci` already done. Lane ports **4698–4701**.
Brief: `~/dev/kimi/inbox/TASK-403-oc-renewal-adds-days.md` (K99 Ask 3, drafter Ms. Kimi; the
CLAIMED banner + AMENDMENT block carry the superseding facts).

Claimed at block 968,142 (house beacon, fresh read at claim time).

## OWNS

- `work-claims/task-403.md` (NEW, this file)
- `src/lib/entitlement.ts` — the `:238-239` branch and the docblock's corrected sentence (anchored
  at `:215`, spilling onto extra wrapped lines since the AMENDMENT's honesty wording no longer fits
  one line) ONLY — every other line byte-identical
- `tests/entitlement-renewal.test.ts` (NEW)

## READ-ONLY (grounding, never edited)

`src/lib/entitlement-fulfil.ts` (the one caller — the writer trace confirms the fix cannot live
there), `src/lib/live.ts` (the other reader), `scripts/fixture-kv.cjs` + `scripts/fixture-kv.test.mjs`
(399's — this lane's inline KV fake stays inside their command surface but is a different file),
every component, page, and stylesheet (394's and 398's files included), the gate at
`entitlement.ts:172`, the rank rule, the retry guard, the permanent-clears/resists-taster
branches — named and pinned by the new test, never touched.

FORBIDDEN (per brief + AMENDMENT): a signature change to `grantTier`; a migration or backfill of
stored records; grace days for lapsed renewals (decision B); touching any other branch of the
ladder; `DESIGN_DRIFT_WRITE=1` (no `.tsx`, no stylesheet added by this lane); any civil-date stamp
(block heights only).

## AMENDMENT folded in before build (Number One, after `walk-968036/ASTRA-REVIEW-T403.md`, block 968,141)

Read in full before any code was written; shapes the test table and the docblock wording below —
SUPERSEDING any line of the original brief it contradicts:

- R1 — the recovered length is honest to the read: the caller encodes `now + days` BEFORE
  `grantTier` awaits the KV read (`:224`), so `opts.expiresAtMs − Date.now()` recovers the pass's
  own length minus the few ms that read took. Docblock and SUMMARY say exactly that — never "exact
  days" or "same instant".
- R2 — the retry guard (`:225`) is pinned for exactly what it does: an immediate retry of the
  CURRENT, still-standing same-tier order returns unchanged. Historical/interleaved replay (an
  older orderId after a newer grant already replaced it, `:244-247`) is out of scope, reported as
  such, never claimed as guaranteed.
- R3 — two more table rows (permanent-resists-taster `:235-237`; a different-length renewal so a
  hard-coded seven days cannot pass) plus an equality-boundary row pinning `:172`'s strict `>`
  (never `>=`) without touching the gate.
- R4 — no design-drift write mode; SUMMARY quotes the fresh repository-wide `expiresAtMs` writer
  grep; the Seams line reads "this PR must land before any 30-day membership item".

## Named decisions taken (brief's lean, all RULED per the CLAIMED banner — K100)

- A — the added length is `opts.expiresAtMs − Date.now()`, read inside `grantTier` after its own
  KV read (honest to the read per AMENDMENT R1, not an idealized exact-days figure).
- B — a renewal after the lapse gets no grace; fresh start, unchanged code path (`:240-241`), the
  docblock names why in words.
- C — test-first with the red captured; the early-renewal row ran RED against the untouched branch
  before the fix landed (numbers in SUMMARY).

Block height at claim: 968,142.
