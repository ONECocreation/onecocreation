# WORK-CLAIM — TASK-273 (ONE Cocreation brand walk · L6 docs · scripts · tests voice)

CLAIMED-BY: Number One (Claude Fable 5.1), solo lane, no parallel runs.
CLAIMED-AT: 0018.06.24 a₿ (block 967,055).
BRANCH: `feat/task-273`
WORKTREE: `~/dev/worktrees/task-273`
BASE: main @ `7b352e1` (T-264 follow-through merged) — re-verified at claim time (`git rev-parse HEAD` = `7b352e18b07db8a0bd3e50c5126fca0284bbfc57`).
BRIEF: `~/dev/home/inbox/TASK-273-oc-brand-walk-docs-scripts-tests.md`
CENSUS: `~/dev/kimi/outbox/task-263/CENSUS.md` — lane 6 "docs-scripts-tests-voice" (fix-lane cut, line 88), rows at lines 792-975.

## Ground (re-grepped at claim)
- `docs/**`: only one live hit outside `docs/meeting notes/**` — `docs/payments-square.md:172` ("a Pac's Arcade feature, out of scope"). Confirmed with `grep -rniE "frens|pacsarcade|\barcade\b" docs/ --include="*.md"` (meeting-notes transcripts excluded, bin D, leave).
- `public/**`: 0 hits — confirmed with `grep -rniE "frens|pacsarcade|\barcade\b" public/` (exit 1, no matches).
- `scripts/**`: census names three scripts. `check-no-leaked-assets.mjs:57` is the KNOWN_LEAKS institutional-memory string — bin C **leave** (append-never-prune leak guard, census says leave). `sync-briefs.mjs:19` is a Windows example path naming `frens.earth` — bin C, reword to the OC layout. `setup.mjs`/`reset-registry.mjs`'s `"frens"`/`"frens.earth"` fallback env VALUES are bin B (HELD) — not comments, not touched.
- `tests/**`: comments only. The `door-machine.test.ts` ARCADE enforcement block (lines 129-157, the brief's cited 155-156 inside it) is entirely bin B/HOLD or census "keep" — untouched. Several other C rows are explicitly "reword **with** module/route/space/package/cookie rename" — those renames are all bin B (HELD this wave), so those rows stay as-is too (same precedent as `next.config.ts:6`'s "reword when the rename ruling lands"). Actionable now (prose only, no identifier/route/cookie/package touched): `login-card.test.ts:23,31`, `matrix-identity.test.ts:6`, `one-header-treatment.test.ts:41`, `operator-auth-email-seat.test.ts:6,93`, `operator-gate-email-seat.test.ts:33`.
- `work-claims/**`, `incoming/**`, `docs/meeting notes/**` — bin D, leave-only, listed in SUMMARY.

## Plan (as scoped by the brief)
1. `docs/payments-square.md:172` — reword "a Pac's Arcade feature" → "a template-fleet feature", keep the separation-law WHY.
2. `scripts/sync-briefs.mjs:19` — reword the Windows/pacsarcade example path to the OC repo layout.
3. `tests/**` — reword the 6 actionable prose lines above (fren → member/visitor, frens.earth → "the old brand"), touching only comment/string text inside `it(...)`/docblocks, never an assertion, import, identifier, route, or cookie.
4. Run all gates (vitest, scripts/*.test.mjs, eslint, tsc, next build), dehouse-inventory before/after (my OWNS are never scanned by that script — src/app + src/components only — so both passes are identical; noted in SUMMARY).

OWNS (per brief): `docs/**` (not `docs/meeting notes/`), `scripts/**`, `tests/**` comments only, `public/**`. NOT `src/**`, NOT `README.md`, NOT `package.json`.

LANE-DONE pending build + gates + commit.
