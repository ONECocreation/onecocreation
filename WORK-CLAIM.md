# WORK-CLAIM — TASK-157

LANE: home (sonnet, Number One orchestrating)
TASK: TASK-157 — ONE Cocreation: the item page's price line follows the live rails
WORKTREE: ~/dev/worktrees/task-157
BRANCH: feat/task-157-price-line-rails
BASE: main @ 2facbacae8921d9f8f71b7a394ba2e5ed6361d0e
BFT STAMP: 0018.06.17 a₿ (derived from live tip height 966016 — mempool.space/api/blocks/tip/height —
  year=⌊966016/52416⌋=18, rem=22528, month=⌊22528/4032⌋+1=6, rem2=2368, day=⌊2368/144⌋+1=17)

OWNS (nothing else):
- src/app/store/[id]/page.tsx — price line only
- src/components/store/StoreItemCard.tsx — the same rule
- src/components/Sheet.tsx — comment only (drop the retired QuickView mention)
- tests/price-line.test.ts — new, pure

Reported to ~/dev/home/outbox/task-157/SUMMARY.md.
