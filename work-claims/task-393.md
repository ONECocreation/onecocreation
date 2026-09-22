# work-claims/task-393.md — task-393 (ONE Cocreation: the toggle sweep — nothing unfinished renders broken)

Lane: the home crew (Sonnet builder, under Number One's gate). Base = onecocreation main
`bdcbc181b128933d672b55e2d27316d10338ce34` (main, PR #42 — Stage 2), re-pinned at cut, block
968,132. Branch `feat/task-393-toggle-sweep`. Worktree `~/dev/worktrees/task-393` (cut by Number
One), `npm ci` already done. Lane ports **4666–4669**. Brief:
`~/dev/kimi/inbox/TASK-393-oc-toggle-sweep.md`, amended block 968,133 (R1–R8, folded in below).

Claimed at block 968,133 (house beacon, fresh read at claim time).

## OWNS (brief OWNS + the amendment's four widenings, R1/R2/R3/R5)

- `work-claims/task-393.md` (NEW, this file)
- `src/lib/site-config.ts` — the ONE new `features` member (`largeSums: boolean`, default
  `false`) + its type/default lines only — every other line byte-identical
- `tests/site-config.test.ts` — the `:63` exact-key expectation extended by the one key,
  nothing else (R3)
- `src/lib/tiers-content.ts` — a one-line comment at `:130` naming the flag; stays data,
  nothing else (R1 — the gate itself does NOT live here)
- `src/app/packages/[slug]/page.tsx` — the ONE `TIER_ADDONS` consumer filter at `:135`
  (`Promise.all(TIER_ADDONS.map(...))`), widened into OWNS by R1
- `src/components/sections.tsx` — the `:451` gate (home shelf) + the `:328` copy line
  (original OWNS), WIDENED by R5 to three more unconditional payment promises in the same
  file: `:313` (jewelry lead), `:459` (affirmations lead), `:491-493` (donations paragraph) —
  copy/gate only, every other line byte-identical
- `src/lib/puck-seeds.ts` — the two Large-Sums seed spots only (`:415-416`, `:1402`) — every
  other line byte-identical
- `src/app/cart/page.tsx` — the `:65` copy line, now a 4-state rail-aware line per R4
- `src/components/store/BuyPanel.tsx` — conditional on the cut-time verify (Build 7) —
  untouched if the verify shows the copy is already btc-branch-only
- `src/app/a/site/SiteRoom.tsx` — ONE new `FEATURE_ROWS` row (`key: "largeSums"`), widened
  into OWNS by R2 — every other line byte-identical
- NEW `tests/feature-switches.test.ts` (the pins, widened by R8's switch→output contract)
- `src/components/console/NavEditor.tsx` — **named add, block 968,135**: ONE line
  (`largeSums: "Large Sums of Money"`) in the exhaustive `FEATURE_LABELS: Record<keyof
  SiteConfig["features"], string>` map (`:34`), forced by `tsc --noEmit` the moment
  `site-config.ts`'s `largeSums` member landed — the same shape TASK-187's `memberships` line
  already documents in this same file. Minimal, load-bearing, not a feature change: `largeSums`
  gates no nav route, so this label is never actually surfaced by `featuresFor()`. Every other
  line byte-identical.

## READ-ONLY (grounding, never edited)

`src/lib/payments.ts` (`liveAdapter`, `jarsOpen`, `ensureSquareVault`), `src/app/support/page.tsx`,
`src/components/me/ConstellationCard.tsx`, `src/components/booking/SlotPicker.tsx` (395's),
`src/app/api/cart/checkout/route.ts`, `src/app/api/store/checkout/route.ts`,
`src/lib/puck-blocks/cart-panel.tsx` (`applyCartRailsToPuck`, read for R6 only),
`src/lib/page-states.ts`, `src/lib/shinepages-recon.ts`, `src/app/kit.css`, `src/app/house.css`,
`src/app/cartridge.css`.

Block height at claim: 968,133. NavEditor.tsx named add at block 968,135.
