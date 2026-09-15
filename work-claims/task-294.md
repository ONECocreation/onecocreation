# TASK-294 claim

Owner: home crew (Sonnet 5)
Base sha: 0ea1be2
Branch: feat/task-294
Ruling: GO (Number One), 0018.06.25 a₿ · block 967,178

## Why
Ms. Kimi's pickup feedback R3 ask 2: two T-295 pair sub-agents independently
wrote the same `--seed-puck` shim into their outboxes this run rather than
landing it once in the shared harness. T-301 hit a seam: `--cookie none`
never sets OPERATOR_NPUBS, so the operator door always renders its "no
keys configured" branch instead of the real signed-out Verify button. The
Admiral has a standing wish for full-page shots. This lane folds all three
into the ONE shared `scripts/shots-fixture.sh` harness.

## Build
1. `--seed-puck <slug>[,<slug>…]` — each slug's `SEEDS[slug]` (or a hand-made
   `<slug>:<json-file>`) lands at `puck:page:<slug>` in the fixture KV.
2. `--seed-store <json-file>` — seeds `store:catalog` (T-291's shape).
3. `--full-page` — `fullPage: true` in shots-fixture.cjs; filenames gain `-full`.
4. Operator keys minted in EVERY cookie mode (member/none too), OPERATOR_NPUBS
   always set on the fixture server so OperatorGate never shows "NO OPERATOR
   KEYS CONFIGURED" (T-301's seam).
5. USAGE block updated; `bash -n`; one smoke run per new flag.

## OWNS
- `scripts/shots-fixture.sh` (edit)
- `scripts/shots-fixture.cjs` (edit — `--full-page`)
- `scripts/fixture-kv.cjs` (read/reference only; edit only if the seed
  flags need it — the wire protocol already speaks SET)
- `scripts/README` or header docblocks (whichever the repo uses — this repo
  uses header docblocks; no `scripts/README` exists)
- `tests/shots-harness-flags.test.ts` (NEW — greps the script for each flag
  + the OPERATOR_NPUBS-in-every-mode line, no puppeteer)
- `work-claims/task-294.md`

## NOT-OWNS (explicit)
- `src/**`, any page, any seed file (`src/lib/puck-seeds.ts` etc. — read
  only, to confirm the `SEEDS[slug]` / `getPuckPage` shapes cited by
  file:line in SUMMARY.md).
- Every other file under `tests/`.

## Sources folded in (read both, credited in the docblock)
- `~/dev/kimi/outbox/task-295/privacy-terms/shots-fixture-seeded.sh` —
  `--seed-puck <slug>:<json-file>` (repeatable), POSTs
  `["SET","puck:page:<slug>", <json>]` to the fixture KV right after its
  health check.
- `~/dev/kimi/outbox/task-295/welcome-meditation/shots-fixture-puck-seeded.sh`
  + `dump-seed.mjs` — same idea, `<slug>=<json-file>` pair syntax and a
  standalone `dump-seed.mjs` tsx-resolve-hook step that dumps
  `SEEDS[slug]` from `src/lib/puck-seeds.ts` to a JSON file.
- `~/dev/home/archive/task-291/patches/task-291/shots-fixture-seeded.sh` —
  `--seed <json-file>` seeding `store:catalog` (T-291's shape), generalized
  here to `--seed-store` alongside `--seed-puck`.

## Ports
4374-4377 only (app, kv, tenant-override, spare) — unchanged port rule,
ports come ONLY from `--ports`.
