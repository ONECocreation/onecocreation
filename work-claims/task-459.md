# TASK-459 claim

Builder: Number One
Block: 968,543 (Saturday lanes)
Branch: feat/task-459-card-path-words
Worktree: /home/pac/dev/worktrees/task-459
Base: 9db8532a23e01f705b2fb8a53d8d976f49fa1f99
Brief: /home/pac/dev/briefings/oc-sat-lanes-968543/TASK-459-card-path-words.md
Governing rules: /home/pac/dev/briefings/oc-sat-lanes-968543/COMMON.md

Contract: no bitcoin words on the card path, no dead "make an offer" opener
when bitcoin is off. Strike four sentences from the owned files — "Paid in
bitcoin, straight to the artist." (store header + metadata), "Pay monthly in
dollars or in bitcoin." (packages lead), "pay in bitcoin (or dollars) →"
(the gate note), and "no cut taken" (the support promise, false once Square
takes its fee) — and gate CartPanel's "pay what you can — make an offer"
opener on `rails.btc` so a card-only visitor is never offered a door the
checkout route (`/api/cart/checkout:110-118`) will refuse. A line that
already carries an offer keeps its own way out ("remove offer — pay the
listed price") on any rail.

Owned paths and limits:
- src/app/store/page.tsx — metadata description (:20) and the lead
  paragraph (:100) only.
- src/app/store/memberships/page.tsx — metadata description (:12) only.
- src/components/sections.tsx — the Packages() lead sentence (:277), the
  gate-works note (:330), and the home Support() give line (:612-614) only.
- src/app/support/page.tsx — the hero lead sentence (:90) only.
- src/lib/puck-seeds.ts — the listed sentences only (home :326/:370,
  packages :607/:612, store :694, plus the packages/store root
  descriptions carrying the same duplicated sentences — see register for
  the exact set). Line ~382 (Classes & Community list) belongs to another
  lane and is not touched. The retreats seed ("sold by the seat, paid in
  bitcoin, straight to the artist.") is ruled OUT of this lane and is not
  touched.
- src/components/store/CartPanel.tsx — the pay-what-you-can offer block
  gate only (:400-423).
- tests/card-path-words-459.test.ts — NEW.
- work-claims/task-459.md and work-claims/task-459-register.md.

Read-only (never touched): OrderStatus.tsx, every /api route, money-words.ts,
payments.ts, kit.css, house.css, and every file/line not named above
(including src/components/store/BuyPanel.tsx's own bitcoin-only sentence,
which is out of scope for this lane and untouched).

Not this lane (ruled after Saturday, left alone): the "⚡ ≈ N sats" price
lines, the pay-what-you-can floor, the privacy/terms payment paragraphs,
the retreats page.

First commit is this claim. Subsequent commits: red tests, the build, the
register. Tests must fail before the build lands. Gate via
~/dev/shortcuts/oc-gate.sh, run bare. No push/fetch/merge/PR, no secret
reads, no ssh, no new dependencies, no deletions, no new CSS class/inline
style/colour literal (removals only), no arrow/emoji on button labels, no
Gregorian dates in comments.
