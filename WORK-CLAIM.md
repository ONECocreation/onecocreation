# WORK-CLAIM — TASK-145 (the item editor Love knows — sale USD, type + category, inventory, the ShinePages shelf shape)

CLAIMED-BY: **kimi** (Kimi Code CLI, guest builder lane for Pac)
CLAIMED-AT: 0018.06.17 a₿ · block 966,060
BRANCH: `feat/task-145-item-editor`
WORKTREE: `~/dev/worktrees/task-145`
BASE: main tip `7c320a9` (T-134…138, T-153, T-159, T-160 already merged).
ROOM: `/a/store` — the item editor + shelf list. The Admiral: "when I'm
editing the price of an item it doesn't have a way for me to add the USD
money… I would like this edit-item menu more similar to the way the items
were set up in ShinePages" (captures `troubleshooting/onecocreation/
shine-store1…7.png`). Main already ships (1032ddb + d55d20e): `price.fiat`
beside sats in the editor, the shelf drops the "~", whole-dollar words via
`src/lib/money-words.ts` dollars() — NOT rebuilt here, built upon.
Remaining per the SCOPE UPDATE: sale price in USD beside sale sats · type +
category (the ShinePages shape; map to the existing ItemKind — a missing
kind is SAID, not invented) · a Categories view derived from items (rename
a category = rename on its items) · inventory (count or blank = unlimited;
counts down on paid orders — additive, no fulfilment wiring beyond the
count; sold-out flips at 0) · SKU stays · sizes chooser only if the model
already carries sizes (it does — `sizes?: string[]`, editor + BuyPanel
already consume it) · the shelf table shows sats · $ · status · category.
Every field has words next to it; validation in words, never color-only.
No invented rate: USD never derives sats or vice versa; BuyPanel offers
only the rails whose price exists (display USD when present — display
only).
Does NOT touch `.env.local`, :3000/:4100 (the operator's live processes),
the live site/vault, the main checkout, any other lane's worktree, or any
deployment. Dev server on :3151 only, killed by recorded listener PID
(`ss -tlnp`), never the npx wrapper.
LAW: LANE-CLAIM before building (K5 ruling 1). Commit at gates. Never merge
to main, never push, never archive. Never `git stash`. ENGLISH-PIN. No new
dependencies. BFT dating in comments. Love design laws: no serif faces,
contrast ≥ 4.5:1, words not color for state. Module law. Derive-or-dash.
No secrets.

Files this lane touches (the spec's OWNS list, nothing else):
- `WORK-CLAIM.md` (this claim)
- `src/lib/store.ts` — ADDITIVE fields only: `category?`, `inventory?`,
  `sale?.fiat` validation; inventory counts down on a paid (settled) order
  via the ONE sanctioned state flip; sold-out flips at 0
- `src/app/a/store/page.tsx` — the form (sale USD + sats, type in words,
  category free text with suggestions, inventory) and the shelf table
  (sats · $ · status · category · inventory) + the Items/Categories tabs
- `src/components/store/BuyPanel.tsx` — show USD when present, display
  only (no new rail behavior)
- `tests/store-item-editor.test.ts` (new) — dollars→cents round-trip,
  fiat saved+read back, sale fiat validated, USD-only live item valid,
  inventory decrements on a paid-order fixture, categories derived

Brief: `~/dev/kimi/inbox/TASK-145-oc-item-editor-shine.md`
(cut 0018.06.17 a₿, SCOPE UPDATE same cut)
Gates: `npx vitest run` (270 on base, must grow) · ALL
`node scripts/*.test.mjs` (calendar 70, cartridge 183, square-payments 36
confirmed on base) · `npm run lint` = 0 · `npx tsc --noEmit` ·
`npx next build` exit 0 · shots: item form empty + filled (USD + sats),
the shelf list, both themes, 1440 + 390 (harness borrowed per the
task-148 outbox idiom — shoot.cjs + run-shots.sh, puppeteer by
require-path, NEVER a dependency) → `~/dev/kimi/outbox/task-145/shots/` ·
SUMMARY.md in `~/dev/kimi/outbox/task-145/`, ending LANE-DONE.
Questions → Number One.
