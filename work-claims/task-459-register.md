# TASK-459 register

Base: 9db8532a23e01f705b2fb8a53d8d976f49fa1f99
Code/pins revision: 65a4fdf (this register rides the final commit on top)
Builder: Number One
Block: 968,543 (Saturday lanes)
Brief: /home/pac/dev/briefings/oc-sat-lanes-968543/TASK-459-card-path-words.md

## What was built

- `src/app/store/page.tsx` — metadata description (:20) drops "— paid in
  bitcoin, straight to the artist." → "…from One Cocreation, straight to
  the artist."; the lead paragraph (:100) drops "Paid in bitcoin, " →
  "Straight to the artist."
- `src/app/store/memberships/page.tsx` — metadata description (:12) drops
  "Paid in bitcoin, straight to the artist." → "Straight to the artist."
- `src/components/sections.tsx` — three sentences:
  - Packages() lead (:277): dropped "Pay monthly in dollars or in
    bitcoin." — the sentence before it and `{PACKAGE_DOORS_WORDS}` stand
    unchanged either side.
  - Packages() gate note (:330): "pay in bitcoin (or dollars) →" →
    "once you pay,".
  - home Support() give line (:612-614 in the brief's line numbers, moved
    to ~612 after the edit): "A gift lands with Love <strong
    …>whole</strong> — no platform between, no cut taken. {giveLine}" →
    "A gift lands with Love. {giveLine}" — the `<strong>` wrapper and its
    inline colour style are gone with the words it wrapped.
- `src/app/support/page.tsx` — the hero lead (:90): "A gift lands with
  Love <b …>whole</b>: no platform between, no cut taken. Choose the jar
  it fills." → "A gift lands with Love. Choose the jar it fills." (matches
  the puck-seed's `su.rich` text for /support verbatim — see below, that
  seed sentence was already this exact wording).
- `src/lib/puck-seeds.ts` — the five brief-listed anchors (home :326/:370,
  packages :607/:612, store :694) got the same treatment as their live
  counterparts, plus two more occurrences of the SAME sentences found by
  grep and fixed under "the same sentences as above" (see Deviations 1):
  the packages seed's `root.props.description` and the store seed's
  `root.props.description`. The retreats seed ("sold by the seat, paid in
  bitcoin, straight to the artist.", content + its own root description)
  is untouched — ruled out of this lane. Line ~382 (Classes & Community
  list, another lane's territory) was not touched.
- `src/components/store/CartPanel.tsx` (:400-426) — the pay-what-you-can
  offer block: the editing state (input + offer/never-mind buttons) now
  requires `offerOpen === lineKey(l) && rails.btc`; the "make an offer"
  opener now requires `rails.btc` (`: rails.btc ? (<button>…</button>) :
  null`); the "remove offer — pay the listed price" branch is unchanged —
  `l.offerSats != null` alone, on any rail.

## Tests

New `tests/card-path-words-459.test.ts` (14 tests):
- source-text pins that the four sentences are gone from store/page.tsx,
  store/memberships/page.tsx, sections.tsx, support/page.tsx (with a
  positive check that "straight to the artist" and the gate-note/
  PACKAGE_DOORS_WORDS words survive the cut, grammatical);
- `SEEDS.home` / `SEEDS.packages` (content + root) / `SEEDS.store`
  (content + root) carry no bitcoin sentence; `SEEDS.support` /
  `SEEDS.home` still carry no "no cut taken" (T-420's pin restated, not
  weakened); a scope guard asserting `SEEDS.retreats` STILL contains
  "paid in bitcoin" (proof this lane never widened past its brief);
- CartPanel: the editing-state condition names `rails.btc`; the opener
  button's condition names `rails.btc`; the remove-offer branch's own
  condition does NOT name `rails.btc`; a static SSR render with
  `rails={btc:false,card:true}` never shows "make an offer"; a static SSR
  render with the default rails mounts without throwing.

No existing pin named any of the four old sentences (checked: `grep -rniE`
for all four phrases across `tests/*.ts` before the build — only hits were
`retreats-puck.test.ts:154` on the untouched retreats sentence and
`seeds-basket-words.test.ts` on the already-fixed "no cut taken" seeds
pins, both unrelated to this lane's cut). Nothing needed re-truing.

vitest counts: base (before this lane's own test file) 229 files / 2884
tests, all green. After: 230 files / 2898 tests, all green — the suite
grew by exactly the 14 new pins; no existing assertion's text changed.

## Deviations

1. **puck-seeds.ts got two more edits than the brief's five listed
   anchors** (the packages seed's `root.props.description` and the store
   seed's `root.props.description`, both carrying byte-identical
   duplicates of sentences the brief already named). Reason: the brief's
   own Build instruction says "puck-seeds.ts: the same sentences, the same
   new words" (not "these five lines only"), and the new test's own
   requirement — none of the four sentences survive in the owned files —
   would otherwise fail on these two lines. Grepped the whole file first
   (`grep -niE` for all four phrases) to find them and to confirm the only
   other hits are the retreats seed's two occurrences, which are
   explicitly ruled out of this lane and were left untouched (guarded by
   its own new test assertion).
2. **support/page.tsx's new sentence wasn't spelled out in the brief**
   (only "drop 'no cut taken' the same way; keep 'Choose the jar it
   fills.'; keep it grammatical"). Landed on "A gift lands with Love.
   Choose the jar it fills." — which turns out to be the EXACT text
   already sitting in the /support puck seed (`su.rich`, unchanged by this
   lane), so the hand-built page and its seed now agree word for word,
   same as before this cut (they agreed on the old wording too).

## Rule 9 (row alignment)

Not applicable — no field+button row was added or touched. The gate only
adds a condition to three EXISTING button/input elements; no new row, no
new class, no new inline style, no colour literal (two colour literals —
`--gold-deep` on the `<strong>`/`<b>` wrappers around "whole" — were
REMOVED, not added).

## Gate (actual output)

`~/dev/shortcuts/oc-gate.sh /home/pac/dev/worktrees/task-459`:

```
 Test Files  230 passed (230)
      Tests  2898 passed (2898)
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

## Verification

Red tests committed first (14 failing → 9 failed / 5 passed on the bare
tree before the build — the 5 passes were the already-true seed/scope-
guard/render-smoke checks), then the six-file build, then this register.
Also spot-ran the neighbouring suites most likely to collide
(packages-puck, seeds-basket-words, retreats-puck, cart-puck,
pink-shimmer-doors, support-jars-basket, memberships-lion, store-sections,
store-cards): 100/100 green, no re-truing needed anywhere. No shots taken
— this lane is words + one boolean gate, no new visual state.

Final HEAD: this register's own commit — reported in the hand-back
message.

## Review fix (Number One, block 968,543)
The adversarial review (two lenses) found nothing blocking and one genuine miss outside the brief's anchor list: the home Services() line `sections.tsx:451` (and its seed twin `puck-seeds.ts:451`) said "pay in sats or dollars", unconditionally, on the card path. Now "Pick a session → choose a real open time → pay → confirmed with a calendar file, held with love." (true on every rail, no rail read needed). Pinned by one new test in `tests/card-path-words-459.test.ts` (15 tests now).
Noted, not changed (after Saturday / read-only): a line that ALREADY carries a sats offer still prints "your offer: N sats" (CartPanel.tsx:332) and the anyOffer banner "your sats come straight back" (:485-486); the checkout 409 words mention "pay by bitcoin" (api/cart/checkout:114). With bitcoin off no new offer can be made, so these only reach a buyer holding an offer from before.
