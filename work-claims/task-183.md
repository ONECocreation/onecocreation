# TASK-183 — the /classes room cards: uniform, doors hug the bottom, Commons first, straight to the Stage

- LANE: kimi
- HOUSE: ONE Cocreation (`~/dev/onecocreation`)
- BRANCH: feat/task-183-classes-cards (worktree ~/dev/worktrees/task-183)
- BASE: 72bf77f (OC main at dispatch — the spec's floor is d86a116 or newer; 72bf77f sits on it)
- STAMP: 0018.06.18 a₿ · block 966098

OWNS: `src/components/rooms/PackageRoomsCard.tsx` ·
`src/components/rooms/RoomsShelf.tsx` (the /classes shelf component) ·
the card CSS (`src/app/house.css`: an additive `.room-card` block) · tests ·
`work-claims/task-183.md`

Two exits for anything outside OWNS: flag-and-stop, or minimal forced edit + one-line
justification in the SUMMARY. Sibling lanes T-176 / T-177 / T-178 / T-179 run concurrently
on disjoint OWNS (T-176 owns the store shelf + NavMenu).
