# TASK-176 — the Store's Meditations door opens the meditations shelf, and the free one is a card there

- LANE: kimi
- HOUSE: ONE Cocreation (`~/dev/onecocreation`)
- BRANCH: feat/task-176-meditations-shelf (worktree ~/dev/worktrees/task-176)
- BASE: 72bf77f (OC main at cut — the spec's floor was 047a8c0 or newer; T-173/T-174/T-175 merged in base)
- STAMP: 0018.06.18 a₿ · block 966098

OWNS: NEW `src/app/store/meditations/page.tsx` · NEW `src/app/store/memberships/page.tsx` ·
`src/app/store/page.tsx` (the free card in the section; section grid extracted to
NEW `src/components/store/ShelfSection.tsx`) · `src/components/NavMenu.tsx` (the two hrefs +
migration + the nav-underline pin) · `src/lib/site-config.ts` (KNOWN_NAV_HREFS + the
read-migration) · NEW `src/components/store/FreeMeditationCard.tsx` · tests ·
`work-claims/task-176.md`

Two exits for anything outside OWNS: flag-and-stop, or minimal forced edit + one-line
justification in the SUMMARY. Sibling lanes T-177 / T-178 / T-179 / T-183 run concurrently
on disjoint OWNS — their worktrees and files are never touched.

Baseline at cut: `npx vitest run` → 378 passed (40 files). The suite must grow.
