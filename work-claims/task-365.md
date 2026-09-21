# work-claim — task-365 (OC · three small fixes from the Admiral's production walk)

Lane: the home crew (Sonnet builder, under Number One's gate). Base = onecocreation main
**68c227e40820ce8a6ef7889ff0aa4b9c665aea36** (T-362 merged, PR #29 — Number One's verify
note re-pinned this base at block 967,926, superseding the brief's original `326dac1`;
`git diff --stat 326dac1 68c227e` over the five OWNS source files was empty, so every
anchor in the brief holds unchanged). Branch `feat/task-365-walk-polish`. Worktree cut by
Number One at `~/dev/worktrees/task-365`, `npm ci` already done there. Lane ports
**4562–4565**. Brief: `~/dev/home/inbox/TASK-365-oc-walk-polish.md`. RULED by the Admiral,
block 967,927 (Part 2's Named decision 2): suppress the WHOLE package card on the room the
visitor is already reading — not just its own ENTER button — closed, not re-opened.

Three small, independent, low-risk fixes from one production walk: (1) the flat/grey night
band under `/login`'s door and `/me`'s field swaps `sky-night` → `sky-glass`, a one-word
CSS-class change in four places (two page files, two Puck-seed `band()` calls); (2) the
"rooms" strip beneath a classroom's calendar (`CircleView.tsx`'s `RoomCardsGrid`) stops
offering a package card whose own ENTER door would land the visitor back on the page
they're already reading — found to hit 4 of 7 room pages (Heart Field + the three
tier-primary classrooms), not only Heart Field; (3) `/me` → Purchases → Quick doors moves
onto the kit's button classes (equal width, guaranteed no-wrap) and drops the redundant
three-times-duplicated "Community & Classes" classroom loop, keeping the four real,
distinct doors.

## OWNS

`src/app/login/page.tsx` (Part 1, one class-name), `src/app/me/page.tsx` (Part 1, one
class-name), `src/lib/puck-seeds.ts` (Part 1, two `band()` calls + the one optional
stale-comment correction — Pre-allowed seam), `src/components/rooms/CircleView.tsx` (Part
2, `RoomCardsGrid` filter + heading placement — `PackageRoomsCard`'s own import/mount call
stays, only the array handed to `.map()` changes), `src/components/me/MemberQuickCards.tsx`
(Part 3, quick-doors classes/layout, classroom loop removed, dead `classes`/`ROOMS`-filter
code removed), `work-claims/task-365.md` (this file, first commit), NEW
`tests/task-365-walk-polish.test.ts`.

READ-ONLY (per brief, untouched): `src/app/cartridge.css`, `src/app/cartridges.css`,
`src/app/kit.css`, `src/app/house.css` (every token/class consumed, none edited),
`src/components/kit/Button.tsx` (consumed via raw class names only, never imported here),
`src/components/me/ConstellationCard.tsx` (T-358's OWNS — no overlap, no file shared),
`src/components/door/DoorSheet.tsx`, `src/components/door/SignInCard.tsx`,
`src/lib/puck-blocks/login-door.tsx` (called/read, not edited beyond the one optional
comment line), `src/lib/matrix-rooms.ts` (`shelfRoomsForRoom`/`groupRoomsByPackage`, called
not edited), `src/components/rooms/PackageRoomsCard.tsx` (called, not edited — the filter
lives in its caller), `src/components/rooms/RoomsShelf.tsx` and `src/app/classes/page.tsx`
(confirmed unaffected), `src/app/rooms/[slug]/page.tsx` and
`src/components/rooms/ClassroomView.tsx` (thread `activeSlug` down unchanged, not edited),
`scripts/check-usability.mjs` / `scripts/usability-exceptions.mjs` (run, not edited), every
other `tests/**` file not named above (must pass unedited).

## Gates

`npx vitest run` · each live `scripts/*.test.mjs` · `npx eslint src tests
--max-warnings=0` · `npx tsc --noEmit` · `npx next build` (Number One's gate, after
`git merge main`).

## What is NOT in this lane

No token-value edit anywhere. No `ConstellationCard.tsx` edit (T-358's). No
`shelfRoomsForRoom`/`groupRoomsByPackage`/`PackageRoomsCard.tsx` edit. No `kit/Button.tsx`
change. No `/classes` copy/route change. No new API route, no auth change, no
email→key linking/explainer work (T-358's). No per-room (`/rooms/[slug]`) destination
added to the dropped classroom loop.

## Cut note

Stamp per the brief, block 967,919 (drafted) / 967,926 (base re-pinned) / 967,927 (Part 2
ruled).
