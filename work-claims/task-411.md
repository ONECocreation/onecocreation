# work-claims/task-411.md — task-411 (ONE Cocreation: W-16 — /support gifts become an order with a receipt, bitcoin on-chain only)

Lane: the home crew (Ms. Kimi's builder, under Number One's gate). Base = onecocreation main
`d4caffe7418e87aba03f39917e4f2c89a7fea016` (PR #55), cut at block 968,170.
Branch `feat/task-411-support-gifts-basket`. Worktree `~/dev/worktrees/task-411` (cut by
Number One), `npm ci` already done. Lane ports **4730–4733**.
Brief: `~/dev/kimi/inbox/TASK-411-oc-support-gifts-basket.md` (incl. Pointer corrections and
Cut note, block 968,170, and AMENDMENT 1 — SUPERSEDING build 1's ids).

Claimed at block 968,170 (house beacon, fresh read at claim time).

AMENDMENT 1 confirmed by reading the desk's create path: `src/app/a/store/page.tsx` has no id
input (grep: only DELETE-by-id at `:293` and display of `item.id` at `:487`), and
`src/app/api/admin/store/route.ts:56` derives the id from the title. The three jar itemIds are
therefore the DERIVED ids: `tip-love`, `tip-one-cocreation`, `gifts-of-gratitude`.

## OWNS

- `work-claims/task-411.md` (NEW, this file)
- `src/components/TipJar.tsx` — rebuilt on the basket: give() POSTs /api/cart add + set-offer,
  `oc-cart-changed` event + in-basket note with a /cart door (BuyPanel.tsx:420-433 pattern);
  `payInModal` import gone; JAR_ITEMS map (derived ids) beside JARS; preset pills move from
  inline styles to existing `.btn btn-sm` (btn-gold selected / btn-ghost unselected —
  BuyPanel.tsx:414/:432 precedent); Give button prints `Give {amount} sats`; docblock re-trued
- `src/app/support/page.tsx` — the three lightning-word sites (`:78` kicker ⚡, `:96`, `:100-102`)
  re-worded; the two TipJar mounts additionally gate on live shelf items (derive-or-dash)
- `src/app/api/tip/route.ts` — DELETED (the brief's sanctioned `git rm`; decision B)
- `src/components/sections.tsx` — ONE hunk only: the `Donations()` live-jar check (`:542-570`
  region) + the `:564` kicker's ⚡ (decision C lean, ruled words pending). NOWHERE near
  `:131-135` (406's hunk)
- `tests/support-jars-basket.test.ts` — NEW (the lane's own pin file, the brief's 5 pins)
- `tests/tip-receipt.test.ts` — DISCLOSED SEAM (see below): amended, not deleted, to keep
  T-223's intent green against the retired route's ground
- `tests/feature-switches.test.ts` (`:133-136` only) — DISCLOSED SEAM: the Donations() mount
  pin follows build 3's extended gate
- `tests/studio-publish.test.ts` (`:210` only) — DISCLOSED SEAM: the hand-built /support
  kicker pin follows decision C's lean (the ⚡ goes with the words)

## Disclosed seams (edits outside the brief's OWNS, forced by the brief's own build steps — named, minimal)

- `tests/tip-receipt.test.ts` — T-223's pin hard-imports `@/app/api/tip/route`; the brief's
  consumer grep was scoped to `src/` and missed it. Retiring the route without retiring the
  pin leaves `npx vitest run` red. Amended in place to keep T-223's intent (the receipt names
  the gift) in the new world: asserts the route is gone and the three jar words survive as the
  JARS table's titles (the shelf items' titles — checkout names lines by title).
- `tests/feature-switches.test.ts` (`:133-136`) — pins the Donations() mount as exactly
  `{open && <TipJar />}`; build 3's live-jar gating necessarily changes that mount expression.
  Pin updated to the new gate (jarsOpen() AND live shelf items), same describe, minimal diff.
- `tests/studio-publish.test.ts` (`:210`) — pins the hand-built /support StackedHero kicker as
  "Support This Work — Gently ⚡"; decision C's lean removes the glyph, so the expected string
  follows (with a comment marking the ruling pending — if the Admiral keeps the glyph, the
  expected kicker gains its ⚡ back).

## Build (the brief's steps 1–6, AMENDMENT 1 applied)

1. Jar items are desk-made (operator runbook), ids derived: `tip-love`, `tip-one-cocreation`,
   `gifts-of-gratitude`; titles `Tip Love` / `Tip One Cocreation` / `Gifts of Gratitude`;
   digital, 0 sats, no fiat, no media; hidden first, live after the merge.
2. TipJar.tsx rebuilt on the basket (see OWNS).
3. Derive-or-dash on the shelf: server faces check `getItem(JAR_ITEMS[key])?.status === "live"`
   and pass only live jars via `only`. The RSC boundary (payments.ts:656's own note: a server
   page cannot call a client-module export) means the key→itemId map rides twice: TipJar.tsx's
   JAR_ITEMS (client, give()) and the server helper exported from sections.tsx
   (`liveJarKeys()`), which support/page.tsx imports — home page precedent
   (src/app/page.tsx:17 imports sections).
4. The lightning words go (both ⚡ kickers lose the glyph — decision C lean, ruled words
   pending the Admiral).
5. `api/tip` retired; `src/lib/tips.ts` STAYS (historical ledger, decision F).
6. Preset pills become `.btn btn-sm` classes; NO css file opened (classes confirmed extant:
   house.css:117 `.btn`, :147 `.btn-gold`, :154 `.btn-ghost`, :156 `.btn-sm`).

## Decisions (leans, the Admiral rules)

- A — jar-as-item, PWYC offer on a zero-priced digital item (the §1 note's own shape).
- B — `api/tip` RETIRED, not left.
- C — the ⚡ goes with the words (LEAN BUILT; ruled words pending).
- D — the offer floor follows the basket's law (111 sats), not api/tip's old 210.
- E — preset pills become `.btn btn-sm` (btn-gold/btn-ghost), zero CSS opened.
- F — the Money-room jar split is a named follow-up (W-16b), not this lane.
