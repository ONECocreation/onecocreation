# WORK-CLAIM — TASK-228 — ONE Cocreation: the magical book beneath "Join the Weekly Reading"

CLAIMED-BY: **Number One**
CLAIMED-AT: 0018.06.23 a₿ · 12:50 · block 966,893
BRANCH: `lane/task-228` · WORKTREE: `~/dev/worktrees/task-228` · BASE: main @ `3fc5c80`

Love's own Weekly Reading art (an open book whose pages curl into a heart, a light-drawn
fairy on the left page, a gold-violet dragon on the right, black ground) goes under the
"Join the Weekly Reading" door on the home hero, and becomes the Read-with-Love card's
habitat art in place of the 📖 emoji.

OWNS: `public/images/reading-book*.webp` (new), `src/components/sections.tsx` (the hero
door column only — `weeklyReadingDoor()` untouched), `src/components/ReadWithLove.tsx`,
`src/app/cartridge.css` (`.habitat` rules only), tests.

Gates: `npx vitest run` (baseline before, must grow ≥ 2) · `node scripts/calendar-view.test.mjs` ·
`node scripts/cartridge-identity.test.mjs` (stays at its count) · `node scripts/square-payments.test.mjs` ·
`npx eslint` 0 · `npx tsc --noEmit` · `npx next build`. Shots: `/` hero guest + signed-in, and the
three-doors band, dark + dawn, 1440 + 390.

LAW: no serif; never push; never archive; the door's href/words untouched.
