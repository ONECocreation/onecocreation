# WORK-CLAIM — TASK-169 (the Cards card's empty gaps + the rail switches on /a/money)

CLAIMED-BY: **kimi** (Kimi Code CLI, guest builder lane for Pac)
CLAIMED-AT: 0018.06.18 a₿ · block 966,101
BRANCH: `feat/task-169-cards-polish`
WORKTREE: `~/dev/worktrees/task-169`
BASE: main tip `909e2cd` (spec floor ffc1d21 — well past).
ROOM: /a/money polish (T-167 follow-up): (1) the Cards card's ~80px dead
gaps — under the "Cards" header before "Square", and after each folded
"How to set this up" — found and removed; a folded walk takes no room; the
Square "live" chip line and the Test button share one row on 1440, stacked
cleanly on 390. (2) The rail on/off switches return to /a/money: the Bitcoin
card AND the Cards card each carry the switch itself — the SAME PUT
/api/admin/site the /a/site page uses (one truth, no second store) — with
the words "this rail is ON/OFF for visitors · also on /a/site".
OWNS: `src/components/console/CardsRailCard.tsx`, the Bitcoin rail card on
/a/money (inline in `src/app/a/money/page.tsx`), the /a/money page (mount
only) (+ one render test if natural — tests/money-cards.test.ts).
CONCURRENCY: lanes T-182, T-184, T-185 run in their own worktrees off the
same base — disjoint file sets. This lane never touches another worktree,
the main checkout, or the live site. Never pushes, never merges, never
stashes.
