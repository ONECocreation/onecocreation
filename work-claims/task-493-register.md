# TASK-493 register

Claimed at block 969,308 · worktree /home/pac/dev/worktrees/task-493 ·
branch feat/task-493-every-letter-in-the-room · base d0f85c7 (main @ the
T-491/T-494 merges — PRs #119 and #120 both ancestors of the cut).

## Baseline at cut (before any edit)

`npx vitest run` on d0f85c7 + this claim commit's tree (identical src/):
- Test Files: 283 passed (283)
- Tests: 3803 passed (3803)
- Duration ~8.4s

The suite must grow from here; the two honestly-broken length pins
(tests/free-reading-path.test.ts:209, tests/letters-send.test.ts:177)
move 8 -> 9 as named lane edits, and the NEW suite
tests/letters-every-letter-in-the-room.test.ts adds its own pins.

## Ground-truth drift found at cut (vs the draft's block-969,095 line numbers)

- `sendReadWithLoveLetter`: draft said src/lib/lead-magnet.ts:68-106,
  real seat is :65-103 (the brief's own note anticipated a two-line
  drift; the merged base drifted it a little further).
- `EDITABLE_LETTERS` still src/lib/letters.ts:23-32; `LETTER_DEFAULTS`
  :97-231 (draft said :75-208); the two stale "seeded six" comments sit
  at :33-37 and :341 and :364 (draft named :317/:341 — the :317 one is
  now the seeded-set comment at :33-37, the listLetterKeys comment is
  :364).
- The preview iframe with T-494's `sandbox=""` sits at
  src/app/a/letters/page.tsx:310 exactly as drafted.
- Every trigger call site in the when-table re-greps true (subscribe
  route, verify route, store.ts settle, checkout, cart, offer-action,
  admin orders).

## Watch-list while building

- tests/read-with-love-letter.test.ts passes UNTOUCHED — the sender
  rewrite keeps its subject, rail words, moderator-presence pins, env
  override precedence and the subscribe-route branch pins.
- Ratchets: design-drift ceiling for src/app/a/letters/page.tsx is
  {styleBlocks: 22, colours: 1, styledButtons: 2}; operator-census
  baseline records styleObjects count 30 and buttonFamilies count 19
  for the page. Never raised; the group-label const is paid for by
  collapsing duplicated inline literals.
